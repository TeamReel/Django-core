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
import {
  Pencil, MoreHorizontal, Eye, Trash2, Plus,
  Calendar, MapPin, Trophy, Users, Wallet,
  Building2, Shirt, Camera, Palette, Upload, Settings,
  ChevronRight, ChevronDown,
} from 'lucide-react';
import { ShareButton } from '../../components/ShareButton';
import MobileTabBar from '../../components/MobileTabBar';
import { SeasonSwitcher, type SeasonOption } from '../../components/SeasonSwitcher';
import { isSeasonPeriod, useSeasonContext } from '../../providers/SeasonProvider';

import { periodPathKey } from '../../utils/periodPath';
import { setActiveContext } from '../../utils/activeContext';
import { ListSection } from '../../components/ListSection';
import { AppIcon } from '../../components/AppIcon';
import { getTeamAssetStatus, getMemberAssetSummary } from '../../utils/assetStatus';
import { useTeamDetailData } from './useTeamDetailData';
import { useTeamTabData } from './useTeamTabData';
import { useSeasonDetailPageData } from '../periods/useSeasonDetailPageData';
import SeasonDetailModals from '../periods/SeasonDetailModals';
import type { MatchRecord } from '../periods/SeasonMatchesTab';

// ── Tab components (reuse existing) ──
import SeasonContentTab from '../periods/SeasonContentTab';
import type { SquadMember } from '../periods/squadTabTypes';
import SeasonCompetitionsTab from '../periods/SeasonCompetitionsTab';
import SeasonAssetsSettingsTab from '../periods/SeasonAssetsSettingsTab';
import { HubWedstrijdenTab } from './HubWedstrijdenTab';
import { TeamBeheerTab } from './TeamBeheerTab';
import { HubClubTab } from './HubClubTab';
import { HubSelectieTab } from './HubSelectieTab';
import { HubMediaTab } from './HubMediaTab';
import { MemberAssetMatrix } from './MemberAssetMatrix';
import { MemberDetailPanel } from '../periods/MemberDetailPanel';
import { AssetDetailSheet, type AssetSheetType } from './AssetDetailSheet';
import { NavigationSheet } from '../../components/ui/NavigationSheet';
import { formatCredits } from './detail/useTeamCreditsData';
import { creditsApi } from '../../api';
import type { ProjectCreditsBalance } from '../../types/api/credits';
import { SeasonSection } from './SeasonSection';
import { CompetitionGrid } from './CompetitionGrid';

const MatchSummarySheet = React.lazy(() =>
  import('./MatchSummarySheet').then((m) => ({ default: m.MatchSummarySheet })),
);
const MemberSummarySheet = React.lazy(() =>
  import('./MemberSummarySheet').then((m) => ({ default: m.MemberSummarySheet })),
);

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

  // ── Unified RBAC ──
  const { isPlayer, isSupporter } = d;
  const isAdmin = !isPlayer && !isSupporter;

  // ── Responsive: 4 tabs on mobile, 6 on desktop ──
  // (isMobile no longer gates admin tabs — admin sees all 6 everywhere)

  // ── No back navigation: hub IS the root destination on mobile ──
  // useSetBackNavigation removed — prevents persistent ← Club button on mobile.

  // ── Active tab (RBAC-gated) ──
  const [searchParams] = useSearchParams();
  const activeTab = useMemo(() => {
    const raw = String(searchParams.get('tab') || 'overview').trim().toLowerCase();

    // Tab aliasing — maps Panel B / legacy tab names to Hub tabs
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
      // F24: Switch season via internal state (no URL navigation on 3-seg hub)
      seasonCtx.setSelectedSeasonId(season.slug);
      // H1: Persist choice in active context (fire-and-forget)
      setActiveContext('season', season.id).catch(() => {/* ignore */});
    },
    [seasonCtx],
  );

  // ── Overflow menu ──
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  // ── Overview accordion state (all sections default closed) ──
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([]));
  const toggleSection = useCallback((key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Sheet state ──
  const [selectedMatch, setSelectedMatch] = useState<MatchRecord | null>(null);
  const [selectedMember, setSelectedMember] = useState<SquadMember | null>(null);
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);
  const [activeAssetSheet, setActiveAssetSheet] = useState<AssetSheetType | null>(null);

  // ── Credits balance (H1) ──
  const [creditsBalance, setCreditsBalance] = useState<ProjectCreditsBalance | null>(null);
  const [creditsSheetOpen, setCreditsSheetOpen] = useState(false);
  const creditsLabel = creditsBalance ? formatCredits(creditsBalance.remaining_credits) : null;
  useEffect(() => {
    const pid = d.project?.id;
    if (!pid || !isAdmin) return;
    const ac = new AbortController();
    creditsApi.getProjectBalance(pid, ac.signal)
      .then((b) => setCreditsBalance(b))
      .catch(() => { /* ignore — balance simply not shown */ });
    return () => ac.abort();
  }, [d.project?.id, isAdmin]);

  // ── Overview: in-place expand state ──
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  // Close sheets on tab switch
  useEffect(() => {
    setSelectedMatch(null);
    setSelectedMember(null);
    setDetailMemberId(null);
    setActiveAssetSheet(null);
  }, [activeTab]);

  // Member navigation for MemberSummarySheet
  const selectedMemberIndex = useMemo(() => {
    if (!selectedMember) return -1;
    return (d.members as SquadMember[]).findIndex((m) => String(m.id) === String(selectedMember.id));
  }, [selectedMember, d.members]);

  const handleMemberPrev = useCallback(() => {
    if (selectedMemberIndex > 0)
      setSelectedMember((d.members as SquadMember[])[selectedMemberIndex - 1]);
  }, [selectedMemberIndex, d.members]);

  const handleMemberNext = useCallback(() => {
    if (selectedMemberIndex >= 0 && selectedMemberIndex < d.members.length - 1)
      setSelectedMember((d.members as SquadMember[])[selectedMemberIndex + 1]);
  }, [selectedMemberIndex, d.members]);

  // Compute match detail path for selected match
  const selectedMatchDetailPath = useMemo(() => {
    if (!selectedMatch) return '';
    const compId = String(selectedMatch.period_id || selectedMatch.period?.id || selectedMatch.period || '').trim();
    const compKey = periodPathKey(selectedMatch.period || null) || compId;
    const matchKey = selectedMatch.slug || selectedMatch.id;
    return d.isTeamRoute
      ? `${d.seasonsBasePath}/${d.seasonPathKey}/${compKey}/${String(matchKey)}`
      : `/matches/${String(matchKey)}`;
  }, [selectedMatch, d.isTeamRoute, d.seasonsBasePath, d.seasonPathKey]);

  // ── Overview: next match ──
  const nextMatch = useMemo<MatchRecord | null>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return (d.matches as MatchRecord[])
      .filter((m) => {
        const dt = m.start_time || m.date || m.metadata?.date;
        return dt && new Date(dt) >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.start_time || a.date || a.metadata?.date || 0).getTime();
        const db = new Date(b.start_time || b.date || b.metadata?.date || 0).getTime();
        return da - db;
      })[0] ?? null;
  }, [d.matches]);

  const fmtNextMatchDate = useMemo(() => {
    if (!nextMatch) return '';
    const raw = nextMatch.start_time || nextMatch.date || nextMatch.metadata?.date;
    if (!raw) return '';
    const dt = new Date(raw);
    return dt.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [nextMatch]);

  // ── Overview: asset status ──
  const teamAssetStatus = useMemo(
    () => getTeamAssetStatus(d.batchBrandKits),
    [d.batchBrandKits],
  );
  const hasSponsor = Boolean(d.brandSponsorUrl);
  const hasAnyKit = useMemo(
    () => Object.values(d.batchBrandKits).some(Boolean),
    [d.batchBrandKits],
  );
  const memberAssetSummary = useMemo(
    () => getMemberAssetSummary(d.members as Record<string, unknown>[]),
    [d.members],
  );
  const memberPhotosStatus = memberAssetSummary.complete === memberAssetSummary.total && memberAssetSummary.total > 0
    ? 'complete' as const
    : 'incomplete' as const;
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
    return <Navigate to={team.backToClubHref} replace />;
  }

  // Season not found / failed → fall back to team-only hub
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
              <SeasonSwitcher
                seasons={seasonOptions}
                currentSeasonId={String(d.resolvedSeasonId || d.effectiveSeasonId || '')}
                onSelect={handleSeasonSwitch}
              />
            </div>
          </div>

          <div className={s.actions}>
            {/* Share */}
            <ShareButton compact className={s.shareBtn} />

            {/* Overflow — contains Edit, View, Delete */}
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

        {/* ── Tab Bar (RBAC) — hidden on desktop where Panel B handles nav ── */}
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

          {/* Overview — iOS-style grouped sections */}
          {activeTab === 'overview' && (
            <>
              {/* Next match hero */}
              {nextMatch && (
                <div className={s.nextMatchHero}>
                  <div className={s.nextMatchLabel}>Volgende wedstrijd</div>
                  <div className={s.nextMatchTitle}>{d.matchDisplayTitle(nextMatch)}</div>
                  <div className={s.nextMatchMeta}>
                    <AppIcon icon={Calendar} size={14} />
                    <span>{fmtNextMatchDate}</span>
                  </div>
                  {nextMatch.metadata?.venue && (
                    <div className={s.nextMatchMeta}>
                      <AppIcon icon={MapPin} size={14} />
                      <span>{nextMatch.metadata.venue}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className={s.nextMatchAction}
                    onClick={() => setSelectedMatch(nextMatch)}
                  >
                    <span>Bekijk wedstrijd</span>
                    <AppIcon icon={ChevronRight} size={16} />
                  </button>
                </div>
              )}

              {/* H2: Season hero card + season pills */}
              <SeasonSection
                season={seasonCtx.season}
                seasons={seasonOptions}
                competitionsCount={seasonCtx.competitions.length}
                matchesCount={d.matches.length}
                membersCount={d.members.length}
                selectedSeasonId={String(seasonCtx.resolvedSeasonId || seasonCtx.effectiveSeasonId || '')}
                onSeasonSwitch={handleSeasonSwitch}
              />

              {/* H2: Competition cards grid */}
              <CompetitionGrid
                competitions={seasonCtx.competitions}
                competitionsLoading={seasonCtx.competitionsLoading}
                getMatchCount={d.getMatchCountForCompetition}
                matches={d.matches as MatchRecord[]}
                matchDisplayTitle={d.matchDisplayTitle}
                onMatchTap={setSelectedMatch}
              />

              {/* Wedstrijden — accordion with match items */}
              <div className={s.accordionSection}>
                <button
                  type="button"
                  className={s.accordionHeader}
                  onClick={() => toggleSection('wedstrijden')}
                  aria-expanded={expandedSections.has('wedstrijden')}
                >
                  <AppIcon icon={Trophy} size={18} className={s.accordionIcon} />
                  <span className={s.accordionLabel}>Wedstrijden</span>
                  <span className={s.accordionValue}>{d.matches.length}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      className={s.accordionHeaderAdd}
                      onClick={(e) => { e.stopPropagation(); d.setIsCreateMatchModalOpen(true); }}
                      aria-label="Wedstrijd toevoegen"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                  <AppIcon
                    icon={ChevronDown}
                    size={16}
                    className={`${s.accordionChevron} ${expandedSections.has('wedstrijden') ? s.accordionChevronOpen : ''}`}
                  />
                </button>
                <div className={`${s.accordionBody} ${expandedSections.has('wedstrijden') ? (showAllMatches ? s.accordionBodyOpenLarge : s.accordionBodyOpen) : ''}`}>
                  {(d.matches as MatchRecord[]).slice(0, showAllMatches ? undefined : 5).map((m) => (
                    <button
                      key={String(m.id)}
                      type="button"
                      className={s.accordionItem}
                      onClick={() => setSelectedMatch(m)}
                    >
                      <span className={s.accordionItemLabel}>{d.matchDisplayTitle(m)}</span>
                      <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                    </button>
                  ))}
                  {!showAllMatches && d.matches.length > 5 && (
                    <button type="button" className={s.accordionViewAll} onClick={() => setShowAllMatches(true)}>
                      Toon alle {d.matches.length} wedstrijden
                    </button>
                  )}
                </div>
              </div>

              {/* Selectie — accordion */}
              {!isSupporter && (
                <div className={s.accordionSection}>
                  <button
                    type="button"
                    className={s.accordionHeader}
                    onClick={() => toggleSection('selectie')}
                    aria-expanded={expandedSections.has('selectie')}
                  >
                    <AppIcon icon={Users} size={18} className={s.accordionIcon} />
                    <span className={s.accordionLabel}>Selectie</span>
                    <span className={s.accordionValue}>{d.members.length}</span>
                    <AppIcon
                      icon={ChevronDown}
                      size={16}
                      className={`${s.accordionChevron} ${expandedSections.has('selectie') ? s.accordionChevronOpen : ''}`}
                    />
                  </button>
                  <div className={`${s.accordionBody} ${expandedSections.has('selectie') ? (showAllMembers ? s.accordionBodyOpenLarge : s.accordionBodyOpen) : ''}`}>
                    {(d.members as SquadMember[]).slice(0, showAllMembers ? undefined : 5).map((m) => (
                      <button
                        key={String(m.id)}
                        type="button"
                        className={s.accordionItem}
                        onClick={() => setSelectedMember(m)}
                      >
                        <span className={s.accordionItemLabel}>{String(m.user?.name || m.user?.first_name || 'Lid')}</span>
                        <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                      </button>
                    ))}
                    {!showAllMembers && d.members.length > 5 && (
                      <button type="button" className={s.accordionViewAll} onClick={() => setShowAllMembers(true)}>
                        Toon alle {d.members.length} leden
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Team assets — accordion */}
              <div className={s.accordionSection}>
                <button
                  type="button"
                  className={s.accordionHeader}
                  onClick={() => toggleSection('team-assets')}
                  aria-expanded={expandedSections.has('team-assets')}
                  aria-label="Team assets"
                >
                  <AppIcon icon={Shirt} size={18} className={s.accordionIcon} />
                  <span className={s.accordionLabel}>Team assets</span>
                  <AppIcon
                    icon={ChevronDown}
                    size={16}
                    className={`${s.accordionChevron} ${expandedSections.has('team-assets') ? s.accordionChevronOpen : ''}`}
                  />
                </button>
                <div className={`${s.accordionBody} ${expandedSections.has('team-assets') ? s.accordionBodyOpen : ''}`}>
                  <button type="button" className={s.accordionItem} onClick={() => setActiveAssetSheet('tenue')}>
                    <span className={s.accordionItemLabel}>Tenue</span>
                    <span className={s.accordionItemStatus}>{teamAssetStatus === 'complete' ? '\u2713' : '\u2013'}</span>
                    <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                  </button>
                  <button type="button" className={s.accordionItem} onClick={() => setActiveAssetSheet('sponsor')}>
                    <span className={s.accordionItemLabel}>Sponsor</span>
                    <span className={s.accordionItemStatus}>{hasSponsor ? '\u2713' : '\u2013'}</span>
                    <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                  </button>
                  <button type="button" className={s.accordionItem} onClick={() => setActiveAssetSheet('member-photos')}>
                    <span className={s.accordionItemLabel}>Ledenfoto's</span>
                    <span className={s.accordionItemStatus}>{memberAssetSummary.complete}/{memberAssetSummary.total}</span>
                    <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                  </button>
                </div>
              </div>

              {/* Club assets — accordion (admin only) */}
              {isAdmin && (
                <div className={s.accordionSection}>
                  <button
                    type="button"
                    className={s.accordionHeader}
                    onClick={() => toggleSection('club-assets')}
                    aria-expanded={expandedSections.has('club-assets')}
                    aria-label="Club assets"
                  >
                    <AppIcon icon={Building2} size={18} className={s.accordionIcon} />
                    <span className={s.accordionLabel}>Club assets</span>
                    <AppIcon
                      icon={ChevronDown}
                      size={16}
                      className={`${s.accordionChevron} ${expandedSections.has('club-assets') ? s.accordionChevronOpen : ''}`}
                    />
                  </button>
                  <div className={`${s.accordionBody} ${expandedSections.has('club-assets') ? s.accordionBodyOpen : ''}`}>
                    <button type="button" className={s.accordionItem} onClick={() => setActiveAssetSheet('logo')}>
                      <span className={s.accordionItemLabel}>Logo</span>
                      <span className={s.accordionItemStatus}>{Boolean((team.club as Record<string, unknown> | null)?.logo_url || (team.club as Record<string, unknown> | null)?.crest_url) ? '\u2713' : '\u2013'}</span>
                      <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                    </button>
                    <button type="button" className={s.accordionItem} onClick={() => setActiveAssetSheet('club-sponsor')}>
                      <span className={s.accordionItemLabel}>Sponsor</span>
                      <span className={s.accordionItemStatus}>{hasSponsor ? '\u2713' : '\u2013'}</span>
                      <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                    </button>
                    <button type="button" className={s.accordionItem} onClick={() => setActiveAssetSheet('kits')}>
                      <span className={s.accordionItemLabel}>Kits</span>
                      <span className={s.accordionItemStatus}>{hasAnyKit ? '\u2713' : '\u2013'}</span>
                      <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                    </button>
                  </div>
                </div>
              )}

              {/* Beheer — admin only, quick links */}
              {isAdmin && (
                <div className={s.accordionSection}>
                  <button
                    type="button"
                    className={s.accordionHeader}
                    onClick={() => toggleSection('beheer')}
                    aria-expanded={expandedSections.has('beheer')}
                  >
                    <AppIcon icon={Settings} size={18} className={s.accordionIcon} />
                    <span className={s.accordionLabel}>Beheer</span>
                    <AppIcon
                      icon={ChevronDown}
                      size={16}
                      className={`${s.accordionChevron} ${expandedSections.has('beheer') ? s.accordionChevronOpen : ''}`}
                    />
                  </button>
                  <div className={`${s.accordionBody} ${expandedSections.has('beheer') ? s.accordionBodyOpen : ''}`}>
                    <button type="button" className={s.accordionItem} onClick={() => setCreditsSheetOpen(true)}>
                      <AppIcon icon={Wallet} size={14} className={s.accordionItemIcon} />
                      <span className={s.accordionItemLabel}>Credits & saldo</span>
                      {creditsLabel && (
                        <span className={s.accordionItemStatus}>
                          {creditsLabel}
                        </span>
                      )}
                      <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                    </button>
                    <button type="button" className={s.accordionItem} onClick={() => navigateToTab('wedstrijden')}>
                      <AppIcon icon={Trophy} size={14} className={s.accordionItemIcon} />
                      <span className={s.accordionItemLabel}>Competities</span>
                      <span className={s.accordionItemStatus}>{seasonCtx.competitions.length}</span>
                      <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                    </button>
                    <button type="button" className={s.accordionItem} onClick={() => setActiveAssetSheet('member-photos')}>
                      <AppIcon icon={Upload} size={14} className={s.accordionItemIcon} />
                      <span className={s.accordionItemLabel}>Ledenfoto's</span>
                      <span className={s.accordionItemStatus}>{memberAssetSummary.complete}/{memberAssetSummary.total}</span>
                      <AppIcon icon={ChevronRight} size={14} className={s.accordionItemChevron} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Wedstrijden — iOS-style grouped list */}
          {activeTab === 'wedstrijden' && (
            <HubWedstrijdenTab
              matches={d.matches}
              matchesLoading={d.matchesLoading}
              isTeamRoute={d.isTeamRoute}
              seasonsBasePath={d.seasonsBasePath}
              seasonPathKey={d.seasonPathKey}
              userCanEditProject={d.userCanEditProject}
              matchDisplayTitle={d.matchDisplayTitle}
              setIsCreateMatchModalOpen={d.setIsCreateMatchModalOpen}
              onMatchTap={setSelectedMatch}
              seasonName={d.season?.name as string | undefined}
            />
          )}

          {/* Assets — club assets, team overrides, member photos */}
          {activeTab === 'assets' && !isSupporter && (
            <HubMediaTab>
              {/* Club assets status */}
              <ListSection title="Club assets">
                <ListSection.Row
                  icon={Building2}
                  label="Clublogo"
                  status={Boolean((team.club as Record<string, unknown> | null)?.logo_url || (team.club as Record<string, unknown> | null)?.crest_url) ? 'success' : 'warning'}
                />
                <ListSection.Row
                  icon={Palette}
                  label="Club-sponsor"
                  status={hasSponsor ? 'success' : 'warning'}
                />
                <ListSection.Row
                  icon={Shirt}
                  label="Club kits"
                  status={hasAnyKit ? 'success' : 'warning'}
                />
              </ListSection>

              {/* Team overrides */}
              <ListSection title="Team instellingen">
                <ListSection.Row
                  icon={Shirt}
                  label="Team kits"
                  status={teamAssetStatus === 'complete' ? 'success' : 'warning'}
                />
              </ListSection>

              {/* Member photos */}
              <ListSection title="Ledenfoto's">
                <ListSection.Row
                  icon={Camera}
                  label="Foto's"
                  value={`${memberAssetSummary.complete}/${memberAssetSummary.total}`}
                  status={memberPhotosStatus === 'complete' ? 'success' : 'warning'}
                />
              </ListSection>
            </HubMediaTab>
          )}

          {/* Selectie — iOS-style grouped squad */}
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
              onMemberTap={setSelectedMember}
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

              {/* Member asset matrix (photo readiness per member) */}
              <section className={s.beheerSection}>
                <h2 className={s.beheerSectionTitle}>Ledenfoto's</h2>
                <MemberAssetMatrix
                  members={d.members as SquadMember[]}
                  memberDetailHref={(mid: string) => {
                    const base = d.memberDetailHref(mid);
                    return base ? `${base}?from=beheer` : base;
                  }}
                  onMemberTap={setSelectedMember}
                />
              </section>

              {/* H3: Content pipeline (moved from Media tab) */}
              <section className={s.beheerSection}>
                <h2 className={s.beheerSectionTitle}>Content & Video</h2>
                <SeasonContentTab
                  org={d.org}
                  projectId={String(d.project?.id || '')}
                  seasonId={d.resolvedSeasonId || d.effectiveSeasonId || ''}
                  apiBaseUrl={d.apiBaseUrl}
                  members={d.members}
                  pushToast={d.pushToast}
                />
              </section>

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

      {/* ── Sheets ── */}
      <React.Suspense fallback={null}>
        <MatchSummarySheet
          match={selectedMatch}
          isOpen={!!selectedMatch}
          onClose={() => setSelectedMatch(null)}
          matchDisplayTitle={d.matchDisplayTitle}
          matchDetailPath={selectedMatchDetailPath}
          onEdit={isAdmin ? (m) => {
            setSelectedMatch(null);
            d.setSelectedEditMatch(m);
            d.setIsMatchEditModalOpen(true);
          } : undefined}
        />
        <MemberSummarySheet
          member={selectedMember}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
          onViewProfile={() => {
            setDetailMemberId(String(selectedMember?.id ?? ''));
            setSelectedMember(null);
          }}
          onEdit={isAdmin ? (m) => {
            setSelectedMember(null);
            setDetailMemberId(String(m.id ?? ''));
          } : undefined}
          onPrev={handleMemberPrev}
          onNext={handleMemberNext}
          hasPrev={selectedMemberIndex > 0}
          hasNext={selectedMemberIndex >= 0 && selectedMemberIndex < d.members.length - 1}
          currentIndex={selectedMemberIndex >= 0 ? selectedMemberIndex : undefined}
          totalCount={d.members.length > 0 ? d.members.length : undefined}
        />
      </React.Suspense>

      {/* ── Asset detail sheet ── */}
      <AssetDetailSheet
        isOpen={!!activeAssetSheet}
        onClose={() => setActiveAssetSheet(null)}
        type={activeAssetSheet}
        batchBrandKits={d.batchBrandKits}
        logoUrl={d.brandLogoUrl}
        sponsorUrl={d.brandSponsorUrl}
        memberSummary={memberAssetSummary}
        members={d.members as SquadMember[]}
        onNavigateToTab={(tab) => {
          setActiveAssetSheet(null);
          navigateToTab(tab);
        }}
      />

      {/* ── Credits balance sheet (H4) ── */}
      <NavigationSheet
        isOpen={creditsSheetOpen}
        onClose={() => setCreditsSheetOpen(false)}
        title="Credits & saldo"
        icon={<AppIcon icon={Wallet} size={18} />}
      >
        {creditsBalance ? (
          <div className={s.creditsSheet}>
            <div className={s.creditsRow}>
              <span className={s.creditsRowLabel}>Toegekend</span>
              <span className={s.creditsRowValue}>{formatCredits(creditsBalance.allocated_credits)}</span>
            </div>
            <div className={s.creditsRow}>
              <span className={s.creditsRowLabel}>Verbruikt</span>
              <span className={s.creditsRowValue}>{formatCredits(creditsBalance.used_credits)}</span>
            </div>
            <div className={`${s.creditsRow} ${s.creditsRowTotal}`}>
              <span className={s.creditsRowLabel}>Resterend</span>
              <span className={s.creditsRowValue}>{formatCredits(creditsBalance.remaining_credits)}</span>
            </div>
            <button
              type="button"
              className={s.creditsLink}
              onClick={() => { setCreditsSheetOpen(false); navigateToTab('beheer'); }}
            >
              Volledig overzicht bekijken
              <AppIcon icon={ChevronRight} size={14} />
            </button>
          </div>
        ) : (
          <div className={s.creditsSheet}>
            <p className={s.creditsEmpty}>Geen balansgegevens beschikbaar.</p>
          </div>
        )}
      </NavigationSheet>

      {/* ── Member detail panel overlay ── */}
      {detailMemberId && (
        <div
          className={s.memberPanelOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Lid bewerken"
        >
          <MemberDetailPanel
            membershipId={detailMemberId}
            memberIds={(d.members as SquadMember[]).map((m) => String(m.id))}
            project={d.project}
            org={d.org}
            club={d.club}
            apiBaseUrl={d.apiBaseUrl}
            isTeamRoute={d.isTeamRoute}
            userCanEditProject={d.userCanEditProject}
            clubBrand={d.clubBrand}
            teamBrand={d.teamBrand}
            batchBrandKits={d.batchBrandKits}
            onClose={() => setDetailMemberId(null)}
            onNavigate={(mid) => setDetailMemberId(mid)}
            onMemberUpdated={() => d.setMembersReloadToken((t: number) => t + 1)}
          />
        </div>
      )}

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
