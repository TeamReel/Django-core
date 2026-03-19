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
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert } from '@django-core/design-system';
import {
  Pencil, Check, MoreHorizontal, Eye, Trash2,
} from 'lucide-react';
import { ShareButton } from '../../components/ShareButton';
import MobileTabBar from '../../components/MobileTabBar';
import { SeasonSwitcher, type SeasonOption } from '../../components/SeasonSwitcher';
import { isSeasonPeriod, useSeasonContext } from '../../providers/SeasonProvider';
import { useSetBackNavigation } from '../../providers/BackNavigationProvider';
import { periodPathKey } from '../../utils/periodPath';
import { useTeamDetailData } from './useTeamDetailData';
import { useTeamTabData } from './useTeamTabData';
import { useSeasonDetailPageData } from '../periods/useSeasonDetailPageData';
import SeasonDetailModals from '../periods/SeasonDetailModals';
import { ContentStreakWidget } from '../../components/dashboard/ContentStreakWidget';
import { useContentStreak } from '../../hooks/useContentStreak';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Settings } from 'lucide-react';

// ── Tab components (reuse existing) ──
import SeasonOverviewTab from '../periods/SeasonOverviewTab';
import SeasonContentTab from '../periods/SeasonContentTab';
import SeasonSquadTab from '../periods/SeasonSquadTab';
import SeasonMediaTab from '../periods/SeasonMediaTab';
import SeasonCompetitionsTab from '../periods/SeasonCompetitionsTab';
import SeasonMatchesTab from '../periods/SeasonMatchesTab';
import SeasonAssetsSettingsTab from '../periods/SeasonAssetsSettingsTab';
import { TeamOverviewTab } from './TeamOverviewTab';
import { TeamBeheerTab } from './TeamBeheerTab';
import { HubClubTab } from './HubClubTab';

import s from './MyTeamHubPage.module.css';

// ─── Hub page component ─────────────────────────────────────────────────────

export const MyTeamHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { clubId: clubSlugOrId } = useParams<{ clubId: string }>();

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

  // ── Content streak ──
  const projectId = d.project?.id != null ? String(d.project.id) : undefined;
  const { data: streakData, isLoading: streakLoading } = useContentStreak(projectId);

  // ── Unified RBAC ──
  const { isPlayer, isSupporter } = d;
  const isAdmin = !isPlayer && !isSupporter;

  // ── Responsive: 4 tabs on mobile, 6 on desktop ──
  const isMobile = useIsMobile();

  // ── Back navigation: Hub → Club ──
  useSetBackNavigation({
    label: team.club?.name || 'Club',
    path: team.backToClubHref,
  });

  // ── Active tab (RBAC-gated) ──
  const [searchParams] = useSearchParams();
  const activeTab = useMemo(() => {
    const raw = String(searchParams.get('tab') || 'overview').trim().toLowerCase();

    // Tab aliasing — maps Panel B / legacy tab names to Hub tabs
    const ALIAS_MAP: Record<string, string> = {
      content: 'media',
      competitions: 'beheer',
      assets: 'beheer',
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
        ? new Set(['overview', 'wedstrijden', 'media', 'selectie'])
        : isMobile
          ? new Set(['overview', 'wedstrijden', 'media', 'selectie'])
          : new Set(['overview', 'wedstrijden', 'media', 'selectie', 'beheer', 'club']);
    return allowed.has(aliased) ? aliased : 'overview';
  }, [searchParams, isPlayer, isSupporter, isMobile]);

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
      // Navigate to the same hub but with different season segment
      const basePath = seasonCtx.seasonsBasePath || '';
      if (!basePath) return;
      navigate(`${basePath}/${encodeURIComponent(season.slug)}`);
    },
    [navigate, seasonCtx.seasonsBasePath],
  );

  // ── Active context check ──
  const isActiveContext =
    d.activeContext &&
    String((d.activeContext as { season?: { id?: string } } | null)?.season?.id || '').trim() ===
      String(d.resolvedSeasonId || d.effectiveSeasonId || '').trim();

  // ── Overflow menu ──
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);
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
    return (
      <div className={s.page}>
        <div className={s.errorBox}>
          <div className={s.errorMsg}>{team.error || 'Team niet gevonden'}</div>
          <button type="button" className={s.backBtn} onClick={() => navigate(team.backToClubHref)}>
            Terug
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={s.page}>
        {/* ── Header ── */}
        <div className={s.headerRow}>
          <div className={s.titleBlock}>
            <Link to={team.backToClubHref.split('?')[0]} className={s.parentLink}>
              ‹ {team.club?.name || 'Club'}
            </Link>
            <div className={s.titleRow}>
              <h1>{team.team?.name || 'Team'}</h1>
              <SeasonSwitcher
                seasons={seasonOptions}
                currentSeasonId={String(d.resolvedSeasonId || d.effectiveSeasonId || '')}
                onSelect={handleSeasonSwitch}
              />
            </div>
          </div>

          <div className={s.actions}>
            {/* Activate context */}
            <button
              type="button"
              className={`${s.activeBtn} ${isActiveContext ? s.activeBtnOn : ''}`}
              disabled={d.activatingContext || (isActiveContext ?? false)}
              onClick={d.handleActivateContext}
              title="Stel dit seizoen in als actieve context"
            >
              {isActiveContext && <Check size={14} />}
              {isActiveContext ? 'Actief' : 'Activeren'}
            </button>

            {/* Edit (admin) */}
            {d.userCanEditProject && (
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => {
                  d.setSelectedEditPeriod(d.season);
                  d.setIsPeriodEditModalOpen(true);
                }}
                title="Seizoen bewerken"
              >
                <Pencil size={16} />
              </button>
            )}

            {/* Share */}
            <ShareButton compact className={s.shareBtn} />

            {/* Overflow */}
            {d.userCanEditProject && (
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
                    <button type="button" onClick={() => { d.setSelectedDetailPeriod(d.season); d.setIsPeriodDetailModalOpen(true); setOverflowOpen(false); }}>
                      <Eye size={14} /> Bekijken
                    </button>
                    {d.userCanDeleteProject && (
                      <button type="button" className={s.overflowDanger} onClick={() => { d.handleDeleteSeason(); setOverflowOpen(false); }}>
                        <Trash2 size={14} /> Verwijderen
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Modals ── */}
        <SeasonDetailModals
          transactionModal={{
            isOpen: d.isCreateTxnModalOpen,
            onClose: () => d.setIsCreateTxnModalOpen(false),
            onCreated: () => navigateToTab('beheer'),
            orgId: String(d.org?.id || '').trim(),
            projectId: d.project?.id != null ? String(d.project.id) : '',
            seasonId: String(d.resolvedSeasonId || d.effectiveSeasonId || '').trim(),
            currentUserId: Number(d.user?.id),
            walletOptions: d.seasonWalletOptions,
          }}
          periodEdit={{
            isOpen: d.isPeriodEditModalOpen,
            onClose: () => { d.setIsPeriodEditModalOpen(false); d.setSelectedEditPeriod(null); },
            selected: d.selectedEditPeriod,
            isSeasonPeriod,
            organisationSportId: d.organisationSportId,
            onSave: d.savePeriodEdits,
          }}
          periodDetail={{
            isOpen: d.isPeriodDetailModalOpen,
            onClose: () => { d.setIsPeriodDetailModalOpen(false); d.setSelectedDetailPeriod(null); },
            selected: d.selectedDetailPeriod,
          }}
          matchDetail={{
            isOpen: d.isMatchDetailModalOpen,
            onClose: () => { d.setIsMatchDetailModalOpen(false); d.setSelectedDetailMatch(null); },
            selected: d.selectedDetailMatch,
          }}
          matchEdit={{
            isOpen: d.isMatchEditModalOpen,
            onClose: () => { d.setIsMatchEditModalOpen(false); d.setSelectedEditMatch(null); },
            selected: d.selectedEditMatch,
            onSave: d.saveMatchEdits,
          }}
          competitionCreate={{
            isOpen: d.isCreateCompetitionModalOpen,
            onClose: () => d.setIsCreateCompetitionModalOpen(false),
            onCreate: d.handleCreateCompetition,
            organisations: d.createModalOrganisations,
            clubs: d.createModalClubs,
            teams: d.createModalTeams,
            initialOrganisationId: String(d.org?.id || ''),
            initialClubId: String(d.club?.id || ''),
            initialTeamId: String(d.project?.id || ''),
            initialSeasonId: String(d.resolvedSeasonId || d.season?.id || ''),
          }}
          matchCreate={{
            isOpen: d.isCreateMatchModalOpen,
            onClose: () => d.setIsCreateMatchModalOpen(false),
            onCreate: d.handleCreateMatch,
            apiBaseUrl: d.apiBaseUrl,
          }}
          squadAddMember={{
            isOpen: d.isAddSquadMemberModalOpen,
            onClose: () => d.setIsAddSquadMemberModalOpen(false),
            onAdd: d.handleAddSquadMember,
            seasonId: String(d.resolvedSeasonId || '').trim(),
          }}
        />

        {/* ── Tab Bar (RBAC) ── */}
        <MobileTabBar
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'wedstrijden', label: 'Wedstrijden' },
            ...(!isSupporter ? [{ id: 'media', label: 'Media' }] : []),
            ...(!isSupporter ? [{ id: 'selectie', label: 'Selectie' }] : []),
            ...(isAdmin ? [{ id: 'beheer', label: 'Beheer', desktopOnly: true }] : []),
            ...(isAdmin ? [{ id: 'club', label: 'Club', desktopOnly: true }] : []),
          ]}
          activeTab={activeTab}
        />

        {/* ── Tab Content ── */}
        <div className={s.tabContent}>
          {d.error && <Alert variant="error">{d.error}</Alert>}

          {/* Overview — merged team + season overview */}
          {activeTab === 'overview' && (
            <>
              {streakData && (
                <ContentStreakWidget
                  streak={streakData}
                  hasHistory={streakData.totalMatchesChecked >= 2}
                  loading={streakLoading}
                  compact
                />
              )}
              <SeasonOverviewTab
              season={d.season}
              competitions={d.competitions}
              members={d.members}
              matches={d.matches}
              matchesLoading={d.matchesLoading}
              navigateToTab={navigateToTab}
              isTeamRoute={d.isTeamRoute}
              seasonsBasePath={d.seasonsBasePath}
              seasonPathKey={d.seasonPathKey}
              matchDisplayTitle={d.matchDisplayTitle}
              teamRosterCount={d.teamRoster?.length}
              brandLogoUrl={d.brandLogoUrl}
              brandSponsorUrl={d.brandSponsorUrl}
              batchBrandKits={d.batchBrandKits}
            />

            {/* Admin: inline Beheer section (mobile replacement for Beheer tab) */}
            {isAdmin && (
              <section className={s.adminSection}>
                <button
                  type="button"
                  className={s.adminSectionToggle}
                  onClick={() => setAdminSectionOpen((o) => !o)}
                  aria-expanded={adminSectionOpen}
                >
                  <Settings size={16} />
                  <span>Instellingen</span>
                  <span className={s.adminSectionChevron} data-open={adminSectionOpen}>&#8250;</span>
                </button>
                {adminSectionOpen && (
                  <div className={s.adminSectionContent}>
                    {/* Competitions management */}
                    <div className={s.beheerSection}>
                      <h3 className={s.beheerSectionTitle}>Competities</h3>
                      <SeasonCompetitionsTab
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
                      />
                    </div>

                    {/* Season assets & settings */}
                    {d.season && d.project && (
                      <div className={s.beheerSection}>
                        <h3 className={s.beheerSectionTitle}>Assets & Instellingen</h3>
                        <SeasonAssetsSettingsTab
                          season={d.season}
                          project={d.project}
                          org={d.org}
                          orgSlugOrId={d.orgSlugOrId}
                          club={d.club}
                          userCanEditProject={d.userCanEditProject}
                          apiBaseUrl={d.apiBaseUrl}
                          onSeasonUpdate={d.setSeason}
                        />
                      </div>
                    )}

                    {/* Team-level admin */}
                    {team.org && team.team && team.teamIdForDirectoryLists && (
                      <div className={s.beheerSection}>
                        <h3 className={s.beheerSectionTitle}>Team instellingen</h3>
                        <TeamBeheerTab
                          org={team.org}
                          team={team.team}
                          setTeam={team.setTeam}
                          brandProfileId={team.brandProfileId ?? undefined}
                          club={team.club}
                          organisationId={team.orgIdForDirectoryLists}
                          teamId={team.teamIdForDirectoryLists}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
            </>
          )}

          {/* Wedstrijden — season matches */}
          {activeTab === 'wedstrijden' && (
            <SeasonMatchesTab
              matches={d.matches}
              matchesLoading={d.matchesLoading}
              isTeamRoute={d.isTeamRoute}
              seasonsBasePath={d.seasonsBasePath}
              seasonPathKey={d.seasonPathKey}
              userCanEditProject={d.userCanEditProject}
              userCanDeleteProject={d.userCanDeleteProject}
              apiBaseUrl={d.apiBaseUrl}
              matchDisplayTitle={d.matchDisplayTitle}
              setIsCreateMatchModalOpen={d.setIsCreateMatchModalOpen}
              setSelectedDetailMatch={d.setSelectedDetailMatch}
              setIsMatchDetailModalOpen={d.setIsMatchDetailModalOpen}
              setSelectedEditMatch={d.setSelectedEditMatch}
              setIsMatchEditModalOpen={d.setIsMatchEditModalOpen}
              setMatches={d.setMatches}
            />
          )}

          {/* Media — content generations + media per member */}
          {activeTab === 'media' && !isSupporter && (
            <>
              <SeasonContentTab
                org={d.org}
                projectId={String(d.project?.id || '')}
                seasonId={d.resolvedSeasonId || d.effectiveSeasonId || ''}
                apiBaseUrl={d.apiBaseUrl}
                members={d.members}
                pushToast={d.pushToast}
              />
            </>
          )}

          {/* Selectie — season squad */}
          {activeTab === 'selectie' && !isSupporter && (
            <SeasonSquadTab
              members={d.members}
              membersLoading={d.membersLoading}
              membersError={d.membersError}
              userCanEditProject={d.userCanEditProject}
              bulkSubmitting={d.bulkSubmitting}
              isTeamRoute={d.isTeamRoute}
              apiBaseUrl={d.apiBaseUrl}
              projectId={String(d.project?.id || '')}
              memberDetailHref={(mid: string) => {
                const base = d.memberDetailHref(mid);
                return base ? `${base}?from=selectie` : base;
              }}
              unassignMembershipsFromSeasonSquad={d.unassignMembershipsFromSeasonSquad}
              setIsAddSquadMemberModalOpen={d.setIsAddSquadMemberModalOpen}
              onMemberUpdated={() => d.setMembersReloadToken((t: number) => t + 1)}
              teamRosterData={{
                teamRoster: d.teamRoster,
                teamRosterLoading: d.teamRosterLoading,
                teamRosterError: d.teamRosterError,
                assignUsersToSeasonSquad: d.assignUsersToSeasonSquad,
                getBestRoleForUser: d.getBestRoleForUser,
                getFunctionalRolesForUser: d.getFunctionalRolesForUser,
              }}
            />
          )}

          {/* Beheer — admin panel: competitions + assets + settings */}
          {activeTab === 'beheer' && isAdmin && (
            <div className={s.beheerSections}>
              {/* Competitions management */}
              <section className={s.beheerSection}>
                <h2 className={s.beheerSectionTitle}>Competities</h2>
                <SeasonCompetitionsTab
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
                />
              </section>

              {/* Season assets & settings */}
              {d.season && d.project && (
                <section className={s.beheerSection}>
                  <h2 className={s.beheerSectionTitle}>Assets & Instellingen</h2>
                  <SeasonAssetsSettingsTab
                    season={d.season}
                    project={d.project}
                    org={d.org}
                    orgSlugOrId={d.orgSlugOrId}
                    club={d.club}
                    userCanEditProject={d.userCanEditProject}
                    apiBaseUrl={d.apiBaseUrl}
                    onSeasonUpdate={d.setSeason}
                  />
                </section>
              )}

              {/* Team-level admin (brand profile, team settings) */}
              {team.org && team.team && team.teamIdForDirectoryLists && (
                <section className={s.beheerSection}>
                  <h2 className={s.beheerSectionTitle}>Team instellingen</h2>
                  <TeamBeheerTab
                    org={team.org}
                    team={team.team}
                    setTeam={team.setTeam}
                    brandProfileId={team.brandProfileId ?? undefined}
                    club={team.club}
                    organisationId={team.orgIdForDirectoryLists}
                    teamId={team.teamIdForDirectoryLists}
                  />
                </section>
              )}
            </div>
          )}

          {/* Club — admin-only, club management sub-tabs */}
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

      {/* Toast notifications */}
      {d.toasts.length > 0 && (
        <div className={s.toastContainer}>
          {d.toasts.map((toast) => (
            <div
              key={toast.id}
              className={s.toast}
              style={{
                background:
                  toast.type === 'success' ? 'var(--color-green-800)'
                    : toast.type === 'error' ? 'var(--color-red-800)'
                      : toast.type === 'warning' ? 'var(--color-amber-700)'
                        : 'var(--color-blue-800)',
              }}
            >
              <span className="flex-1">{toast.message}</span>
              <button onClick={() => d.dismissToast(toast.id)} className={s.toastDismiss}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MyTeamHubPage;
