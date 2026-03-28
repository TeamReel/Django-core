/**
 * MyTeamHubPage — Unified "My Team" hub that combines team-level data
 * with season-level content in a single adaptive page.
 *
 * Rendered inside <SeasonProvider> at /:orgId/:clubId/:projectId/:seasonId.
 * Uses useTeamDetailData for team core (org/club/team) and
 * useSeasonDetailPageData for season data (matches/members/content).
 *
 * RBAC tab visibility:
 *   Supporter → Overview, Wedstrijden (2)
 *   Player   → Overview, Wedstrijden, Media, Selectie (4)
 *   Admin    → Overview, Wedstrijden, Media, Selectie, Beheer, Club (6)
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '@django-core/design-system';
import { Pencil, MoreHorizontal, Eye, Trash2, Plus } from 'lucide-react';
import { ShareButton } from '../../components/ShareButton';
import MobileTabBar from '../../components/MobileTabBar';
import { SeasonSwitcher, type SeasonOption } from '../../components/SeasonSwitcher';
import { useSeasonContext } from '../../providers/SeasonProvider';

import { useSetNavTitle } from '../../providers/BackNavigationProvider';
import { periodPathKey } from '../../utils/periodPath';
import { setActiveContext } from '../../utils/activeContext';
import { getMemberAssetSummary } from '../../utils/assetStatus';
import { useTeamDetailData } from './useTeamDetailData';
import { useTeamTabData } from './useTeamTabData';
import { useSeasonDetailPageData } from '../periods/useSeasonDetailPageData';
import type { MatchRecord } from '../periods/SeasonMatchesTab';

// ── Tab components ──
import type { SquadMember } from '../periods/squadTabTypes';
import { HubWedstrijdenTab } from './HubWedstrijdenTab';
import { HubClubTab } from './HubClubTab';
import { HubSelectieTab } from './HubSelectieTab';
import { AssetsTab } from '../../components/AssetsTab';
import type { AssetSheetType } from './AssetDetailSheet';
import { api, creditsApi, projectsApi } from '../../api';
import type { PeriodCreatePayload } from './PeriodCreateModal/types';
import type { Period } from '../../types/season';
import type { ProjectCreditsBalance } from '../../types/api/credits';

import { useMatchSheet } from '../../components/dashboard/useMatchSheet';
import { buildMatchVanityUrl, buildMatchVanityUrlWithTab } from '../../components/dashboard/ActiveMatchCard';
import type { Match } from '../../components/dashboard/ActiveMatchCard';
import { useAppSelection } from '../../hooks/useAppSelection';
import { useBrandProfile } from '../../hooks/useBrandProfile';
import { useAuth } from '@django-core/auth-ui';
import { formatCredits } from './detail/useTeamCreditsData';

// ── Extracted sub-components ──
import { HubOverviewTab } from './HubOverviewTab';
import { HubPageSheets } from './HubPageSheets';
import { HubBeheerTab } from './HubBeheerTab';
import { HubPageModals } from './HubPageModals';

import s from './MyTeamHubPage.module.css';

import { matchRecordToMatch } from './matchRecordToMatch';

// ─── Hub page component ─────────────────────────────────────────────────────

export const MyTeamHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { clubId: clubSlugOrId } = useParams<{ clubId: string }>();
  useSetNavTitle('Mijn Team');

  // ── Team-level data ──
  const team = useTeamDetailData();
  const teamTabData = useTeamTabData({
    activeTabFromUrl: 'overview',
    apiBaseUrl: team.apiBaseUrl,
    teamIdForDirectoryLists: team.teamIdForDirectoryLists,
    clubIdForDirectoryLists: team.clubIdForDirectoryLists,
    orgSlugForDirectoryLists: team.orgSlugForDirectoryLists,
    orgId: String(team.org?.id || ''),
    clubId: team.clubIdForDirectoryLists,
  });

  // ── Season-level data (via SeasonProvider) ──
  const seasonCtx = useSeasonContext();
  const d = useSeasonDetailPageData();

  // ── Unified RBAC ──
  const { isPlayer, isSupporter } = d;
  const isAdmin = !isPlayer && !isSupporter;

  // ── Active tab (RBAC-gated) ──
  const [searchParams] = useSearchParams();
  const activeTab = useMemo(() => {
    const raw = String(searchParams.get('tab') || 'overview').trim().toLowerCase();

    const ALIAS_MAP: Record<string, string> = {
      content: 'assets',
      media: 'assets',
      competitions: 'beheer',
      transactions: 'beheer',
      workflow: 'beheer',
      matches: 'wedstrijden',
      squad: 'selectie',
      team: 'selectie',
      identity: 'club',
      kits: 'club',
      brand: 'club',
    };
    const aliased = ALIAS_MAP[raw] ?? raw;

    const allowed = isSupporter
      ? new Set(['overview', 'wedstrijden'])
      : isPlayer
        ? new Set(['overview', 'wedstrijden', 'assets', 'selectie'])
        : new Set(['overview', 'wedstrijden', 'assets', 'selectie', 'beheer', 'club']);
    return allowed.has(aliased) ? aliased : 'overview';
  }, [searchParams, isPlayer, isSupporter]);

  // ── Tab navigation ──
  const navigateToTab = useCallback(
    (tabId: string) => {
      const url = new URL(window.location.href);
      if (tabId === 'overview') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tabId);
      }
      navigate(`${url.pathname}${url.search}`, { replace: true });
    },
    [navigate],
  );

  // ── Season switcher ──
  const seasonOptions: SeasonOption[] = useMemo(
    () =>
      (seasonCtx.seasonsForSwitcher || []).map((p) => ({
        id: String(p.id || ''),
        name: String(p.name || 'Seizoen'),
        slug: periodPathKey(p) || String(p.id || ''),
      })),
    [seasonCtx.seasonsForSwitcher],
  );

  const handleSeasonSwitch = useCallback(
    (season: SeasonOption) => {
      seasonCtx.setSelectedSeasonId(season.slug);
      setActiveContext('season', season.id).catch(() => {/* ignore */});
    },
    [seasonCtx],
  );

  // ── Overflow menu ──
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node))
        setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  // ── Sheet state ──
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [selectedMember, setSelectedMember] = useState<SquadMember | null>(null);
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);
  const [detailDefaultTab, setDetailDefaultTab] = useState<string | undefined>(undefined);
  const [activeAssetSheet, setActiveAssetSheet] = useState<AssetSheetType | null>(null);

  // ── MatchSheetFlow state ──
  const { user } = useAuth();
  const hierarchy = useAppSelection();
  const matchForSheet: Match | null = useMemo(
    () => selectedMatch
      ? matchRecordToMatch(selectedMatch, d.org ? { id: String(d.org.id), name: d.org.name || '', slug: d.org.slug || '' } : undefined)
      : null,
    [selectedMatch, d.org],
  );
  const matchSheet = useMatchSheet(matchForSheet);

  // Club logo for MatchSheetFlow
  const myClub = user?.projects?.find((p) => p.parent == null);
  const { getAssetUrl: getClubAssetUrl } = useBrandProfile({
    organisationId: d.org?.id ? String(d.org.id) : undefined,
    projectId: myClub?.id || (d.project?.id ? String(d.project.id) : undefined),
  });
  const clubLogoUrl = getClubAssetUrl('logo') ?? undefined;

  const handleSelectMatch = useCallback((m: MatchRecord) => {
    setSelectedMatch(m);
    setTimeout(() => matchSheet.openSheet(), 0);
  }, [matchSheet.openSheet]);

  const handleNavigateToMatch = useCallback((tab?: string) => {
    if (!matchForSheet) return;
    matchSheet.closeSheet();
    const url = tab
      ? buildMatchVanityUrlWithTab(matchForSheet, hierarchy, tab)
      : buildMatchVanityUrl(matchForSheet, hierarchy);
    navigate(url, { state: { from: 'hub' } });
  }, [matchForSheet, hierarchy, navigate, matchSheet.closeSheet]);

  // ── Season Create ──
  const [isCreateSeasonModalOpen, setIsCreateSeasonModalOpen] = useState(false);
  const handleCreateSeason = useCallback(async (payload: PeriodCreatePayload) => {
    const orgId = String(payload.organisation_id || d.org?.id || '').trim();
    const teamId = String(payload.project_id || d.project?.id || '').trim();
    if (!orgId) throw new Error('Selecteer eerst een organisatie');
    if (!teamId) throw new Error('Selecteer eerst een team');
    const created = await api.post<Period>('/periods/', {
      organisation_id: orgId,
      project_id: teamId ? Number(teamId) : undefined,
      parent_period_id: null,
      name: payload.name,
      description: payload.description,
      start_date: payload.start_date,
      end_date: payload.end_date,
      metadata: { type: 'season' },
    });
    setIsCreateSeasonModalOpen(false);
    if (created?.id) {
      seasonCtx.reloadSeason();
      seasonCtx.setSelectedSeasonId(String(created.id));
    }
  }, [d.org?.id, d.project?.id, seasonCtx]);

  // ── Credits balance ──
  const [creditsBalance, setCreditsBalance] = useState<ProjectCreditsBalance | null>(null);
  const [creditsSheetOpen, setCreditsSheetOpen] = useState(false);
  const creditsLabel = creditsBalance ? formatCredits(creditsBalance.remaining_credits) : null;
  useEffect(() => {
    const pid = d.project?.id;
    if (!pid || !isAdmin) return;
    const ac = new AbortController();
    creditsApi.getProjectBalance(pid, ac.signal)
      .then((b) => setCreditsBalance(b))
      .catch(() => { /* ignore */ });
    return () => ac.abort();
  }, [d.project?.id, isAdmin]);

  // Close sheets on tab switch
  useEffect(() => {
    setSelectedMatch(null);
    setSelectedMember(null);
    setDetailMemberId(null);
    setActiveAssetSheet(null);
  }, [activeTab]);

  // ── Member asset summary (needed by both Overview and Sheets) ──
  const memberAssetSummary = useMemo(
    () => getMemberAssetSummary(d.members as Record<string, unknown>[]),
    [d.members],
  );

  // ── Loading / error ──
  if (team.loading || d.loading) {
    return (
      <div className={s.page}>
        <div className={s.headerRow}>
          <div className={s.titleBlock}><h1>My Team</h1></div>
        </div>
        <div className={s.skeleton}>
          <div className={s.skeletonBar} />
          <div className={s.skeletonBarShort} />
          <div className={s.skeletonBarFull} />
          <div className={s.skeletonCard} />
          <div className={s.skeletonCard} />
        </div>
      </div>
    );
  }

  if (team.error || !team.org || !team.club || !team.team) {
    return <Navigate to={team.backToClubHref} replace />;
  }

  if (!d.loading && !team.loading && (seasonCtx.error || !seasonCtx.season)) {
    const teamOnly = `/${team.orgKeyForRoutes}/${team.clubKeyForRoutes}/${team.teamKeyForRoutes}`;
    return <Navigate to={teamOnly} replace />;
  }

  return (
    <>
      <div className={s.page}>

        {/* ── Header ── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <div className={s.titleRow}>
              <h1>{team.team?.name || 'Team'}</h1>
              <div className={s.seasonSwitcherRow}>
                <SeasonSwitcher
                  seasons={seasonOptions}
                  currentSeasonId={String(d.resolvedSeasonId || d.effectiveSeasonId || '')}
                  onSelect={handleSeasonSwitch}
                />
                {isAdmin && (
                  <button
                    type="button"
                    className={s.seasonAddBtn}
                    onClick={() => setIsCreateSeasonModalOpen(true)}
                    aria-label="Seizoen aanmaken"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={s.actions}>
            <ShareButton compact className={s.shareBtn} />
            <div className={s.overflowWrap} ref={overflowRef}>
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setOverflowOpen((o) => !o)}
                aria-label="Meer opties"
              >
                <MoreHorizontal size={16} />
              </button>
              {overflowOpen && (
                <div className={s.overflowMenu}>
                  {d.userCanEditProject && team.team && (
                    <button type="button" onClick={() => {
                      navigate(`/organisations/${team.orgIdForDirectoryLists}/projects/${team.teamIdForDirectoryLists}/edit`);
                      setOverflowOpen(false);
                    }}>
                      <Pencil size={14} /> Bewerken
                    </button>
                  )}
                  <button type="button" onClick={() => { d.setSelectedDetailPeriod(d.season); d.setIsPeriodDetailModalOpen(true); setOverflowOpen(false); }}>
                    <Eye size={14} /> Bekijken
                  </button>
                  {d.userCanDeleteProject && d.userCanEditProject && (
                    <button type="button" className={s.overflowDanger} onClick={() => { d.handleDeleteSeason(); setOverflowOpen(false); }}>
                      <Trash2 size={14} /> Verwijderen
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Modals (extracted) ── */}
        <HubPageModals
          d={d}
          navigateToTab={navigateToTab}
          isCreateSeasonModalOpen={isCreateSeasonModalOpen}
          setIsCreateSeasonModalOpen={setIsCreateSeasonModalOpen}
          handleCreateSeason={handleCreateSeason}
        />

        {/* ── Tab Bar (RBAC) ── */}
        <div className={s.mobileTabBarWrap}>
          <MobileTabBar
            tabs={[
              { id: 'overview', label: 'Overview' },
              { id: 'wedstrijden', label: 'Wedstrijden' },
              ...(!isSupporter ? [{ id: 'assets', label: 'Assets' }] : []),
              ...(!isSupporter ? [{ id: 'selectie', label: 'Selectie' }] : []),
              ...(isAdmin ? [{ id: 'beheer', label: 'Beheer', desktopOnly: true }] : []),
              ...(isAdmin ? [{ id: 'club', label: 'Club', desktopOnly: true }] : []),
            ]}
            activeTab={activeTab}
          />
        </div>

        {/* ── Tab Content ── */}
        <div className={s.tabContent}>
          {d.error && <Alert variant="error">{d.error}</Alert>}

          {activeTab === 'overview' && (
            <HubOverviewTab
              matches={d.matches as MatchRecord[]}
              members={d.members as SquadMember[]}
              competitionsCount={seasonCtx.competitions.length}
              org={d.org}
              club={team.club}
              season={seasonCtx.season}
              batchBrandKits={d.batchBrandKits}
              brandSponsorUrl={d.brandSponsorUrl}
              isAdmin={isAdmin}
              userCanEditProject={d.userCanEditProject}
              orgIdForDirectoryLists={team.orgIdForDirectoryLists}
              teamIdForDirectoryLists={team.teamIdForDirectoryLists}
              creditsLabel={creditsLabel}
              matchDisplayTitle={d.matchDisplayTitle}
              onMatchTap={handleSelectMatch}
              onNavigateToTab={navigateToTab}
              onAssetSheetOpen={setActiveAssetSheet}
              onCreditsSheetOpen={() => setCreditsSheetOpen(true)}
            />
          )}

          {activeTab === 'wedstrijden' && (
            <HubWedstrijdenTab
              matches={d.matches}
              matchesLoading={d.matchesLoading}
              isTeamRoute={d.isTeamRoute}
              seasonsBasePath={d.seasonsBasePath}
              seasonPathKey={d.seasonPathKey}
              canManageContent={isAdmin || d.userCanEditProject}
              matchDisplayTitle={d.matchDisplayTitle}
              setIsCreateMatchModalOpen={d.setIsCreateMatchModalOpen}
              setIsCreateCompetitionModalOpen={d.setIsCreateCompetitionModalOpen}
              onMatchTap={handleSelectMatch}
              seasonName={(d.season?.name || seasonCtx.season?.name) as string | undefined}
              competitions={seasonCtx.competitions}
            />
          )}

          {activeTab === 'assets' && !isSupporter && team.org && team.team && (
            <AssetsTab
              level="team"
              organisationId={team.orgIdForDirectoryLists}
              projectId={team.teamIdForDirectoryLists}
              parentProjectId={team.clubIdForDirectoryLists || undefined}
              entityName={team.team.name}
            />
          )}

          {activeTab === 'selectie' && !isSupporter && (
            <HubSelectieTab
              members={d.members as SquadMember[]}
              membersLoading={d.membersLoading}
              membersError={d.membersError}
              isAdmin={isAdmin}
              memberDetailHref={(mid: string) => {
                const base = d.memberDetailHref(mid);
                return base ? `${base}?from=selectie` : base;
              }}
              teamRoster={d.teamRoster as SquadMember[] | undefined}
              teamRosterLoading={d.teamRosterLoading}
              assignUsersToSeasonSquad={d.assignUsersToSeasonSquad}
              removeFromSquad={d.unassignMembershipsFromSeasonSquad
                ? (id: string) => d.unassignMembershipsFromSeasonSquad([id])
                : undefined}
              onRolesChange={isAdmin && d.project?.id ? async (mid, roles) => {
                const member = (d.members as SquadMember[]).find((m) => String(m.id) === mid);
                const userId = Number(member?.user?.id);
                if (!userId) return;
                const prevDirect = (member as Record<string, unknown>)?.functional_roles;
                const prevRoles = Array.isArray(prevDirect) ? prevDirect.map((r: unknown) => String(r || '').trim()).filter(Boolean) : [];
                const prevSet = new Set(prevRoles);
                const nextSet = new Set(roles);
                const toAdd = roles.filter((r) => !prevSet.has(r));
                const toRemove = prevRoles.filter((r) => !nextSet.has(r));
                if (toRemove.length) await projectsApi.unassignFunctionalRoles(d.project!.id, { user_id: userId, roles: toRemove });
                if (toAdd.length) await projectsApi.assignFunctionalRoles(d.project!.id, { user_id: userId, roles: toAdd });
                d.setMembersReloadToken((t: number) => t + 1);
              } : undefined}
              onMemberTap={setSelectedMember}
            />
          )}

          {activeTab === 'beheer' && isAdmin && (
            <HubBeheerTab
              competitions={d.competitions}
              competitionsLoading={d.competitionsLoading}
              userCanEditProject={d.userCanEditProject}
              userCanDeleteProject={d.userCanDeleteProject}
              apiBaseUrl={d.apiBaseUrl}
              getMatchCountForCompetition={d.getMatchCountForCompetition}
              getCompetitionParticipantsCount={d.getCompetitionParticipantsCount}
              setIsCreateCompetitionModalOpen={d.setIsCreateCompetitionModalOpen}
              setSelectedDetailPeriod={d.setSelectedDetailPeriod}
              setIsPeriodDetailModalOpen={d.setIsPeriodDetailModalOpen}
              setSelectedEditPeriod={d.setSelectedEditPeriod}
              setIsPeriodEditModalOpen={d.setIsPeriodEditModalOpen}
              setCompetitions={d.setCompetitions}
              season={d.season}
              project={d.project}
              org={d.org}
              orgSlugOrId={d.orgSlugOrId}
              club={d.club}
              setSeason={d.setSeason}
              members={d.members as SquadMember[]}
              memberDetailHref={d.memberDetailHref}
              onMemberTap={setSelectedMember}
              resolvedSeasonId={d.resolvedSeasonId}
              effectiveSeasonId={d.effectiveSeasonId}
              pushToast={d.pushToast}
              teamOrg={team.org}
              teamProject={team.team}
              setTeam={team.setTeam}
              brandProfileId={team.brandProfileId ?? undefined}
              teamClub={team.club}
              organisationId={team.orgIdForDirectoryLists}
              teamId={team.teamIdForDirectoryLists}
            />
          )}

          {activeTab === 'club' && isAdmin && team.org && team.club && (
            <HubClubTab
              org={team.org}
              club={team.club}
              orgSlug={team.orgSlugForDirectoryLists}
              clubId={team.clubIdForDirectoryLists}
              orgKeyForRoutes={team.orgKeyForRoutes}
              clubKeyForRoutes={team.clubKeyForRoutes}
              brandProfileId={team.brandProfileId}
              apiBaseUrl={team.apiBaseUrl}
            />
          )}
        </div>
      </div>

      {/* ── Sheets & Overlays (extracted) ── */}
      <HubPageSheets
        matchForSheet={matchForSheet}
        matchSheet={matchSheet}
        selectedMatch={selectedMatch}
        setSelectedMatch={() => setSelectedMatch(null)}
        onNavigateToMatch={handleNavigateToMatch}
        clubLogoUrl={clubLogoUrl}
        selectedMember={selectedMember}
        setSelectedMember={setSelectedMember}
        members={d.members as SquadMember[]}
        clubName={d.club?.name}
        isAdmin={isAdmin}
        activeAssetSheet={activeAssetSheet}
        setActiveAssetSheet={setActiveAssetSheet}
        batchBrandKits={d.batchBrandKits}
        brandLogoUrl={d.brandLogoUrl}
        brandSponsorUrl={d.brandSponsorUrl}
        memberAssetSummary={memberAssetSummary}
        onNavigateToTab={navigateToTab}
        creditsBalance={creditsBalance}
        creditsSheetOpen={creditsSheetOpen}
        setCreditsSheetOpen={setCreditsSheetOpen}
        detailMemberId={detailMemberId}
        setDetailMemberId={setDetailMemberId}
        detailDefaultTab={detailDefaultTab}
        setDetailDefaultTab={setDetailDefaultTab}
        project={d.project}
        org={d.org}
        club={d.club}
        apiBaseUrl={d.apiBaseUrl}
        isTeamRoute={d.isTeamRoute}
        userCanEditProject={d.userCanEditProject}
        clubBrand={d.clubBrand}
        teamBrand={d.teamBrand}
        setMembersReloadToken={d.setMembersReloadToken}
        toasts={d.toasts}
        dismissToast={d.dismissToast}
      />
    </>
  );
};

export default MyTeamHubPage;
