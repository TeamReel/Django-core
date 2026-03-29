import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@django-core/auth-ui';
import { api, creditsApi } from '../../api';
import { useMatchSheet } from '../../components/dashboard/useMatchSheet';
import { buildMatchVanityUrl, buildMatchVanityUrlWithTab } from '../../components/dashboard/ActiveMatchCard';
import type { Match } from '../../components/dashboard/ActiveMatchCard';
import { useAppSelection } from '../../hooks/useAppSelection';
import { useBrandProfile } from '../../hooks/useBrandProfile';
import type { SeasonOption } from '../../components/SeasonSwitcher';
import { periodPathKey } from '../../utils/periodPath';
import { setActiveContext } from '../../utils/activeContext';
import { getMemberAssetSummary } from '../../utils/assetStatus';
import { formatCredits } from './detail/useTeamCreditsData';
import { matchRecordToMatch } from './matchRecordToMatch';
import type { MatchRecord } from '../periods/SeasonMatchesTab';
import type { SquadMember } from '../periods/squadTabTypes';
import type { AssetSheetType } from './AssetDetailSheet';
import type { PeriodCreatePayload } from './PeriodCreateModal/types';
import type { Period } from '../../types/season';
import type { ProjectCreditsBalance } from '../../types/api/credits';
import type { SeasonContextValue } from '../../providers/SeasonProvider';
import type { UseSeasonDetailPageDataReturn } from '../periods/useSeasonDetailPageData';

interface HubStateDeps {
  d: UseSeasonDetailPageDataReturn;
  seasonCtx: SeasonContextValue;
  isAdmin: boolean;
  isPlayer: boolean;
  isSupporter: boolean;
}

export function useMyTeamHubState({ d, seasonCtx, isAdmin, isPlayer, isSupporter }: HubStateDeps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── Active tab (RBAC-gated) ──
  const activeTab = useMemo(() => {
    const raw = String(searchParams.get('tab') || 'overview').trim().toLowerCase();
    const ALIAS_MAP: Record<string, string> = {
      content: 'assets', media: 'assets',
      competitions: 'beheer', transactions: 'beheer', workflow: 'beheer',
      matches: 'wedstrijden', squad: 'selectie', team: 'selectie',
      identity: 'club', kits: 'club', brand: 'club',
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
      if (tabId === 'overview') { url.searchParams.delete('tab'); }
      else { url.searchParams.set('tab', tabId); }
      navigate(`${url.pathname}${url.search}`, { replace: true });
    },
    [navigate],
  );

  // ── Season switcher ──
  const seasonOptions: SeasonOption[] = useMemo(
    () => (seasonCtx.seasonsForSwitcher || []).map((p) => ({
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

  // ── MatchSheetFlow ──
  const { user } = useAuth();
  const hierarchy = useAppSelection();
  const matchForSheet: Match | null = useMemo(
    () => selectedMatch
      ? matchRecordToMatch(selectedMatch, d.org ? { id: String(d.org.id), name: d.org.name || '', slug: d.org.slug || '' } : undefined)
      : null,
    [selectedMatch, d.org],
  );
  const matchSheet = useMatchSheet(matchForSheet);

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

  // ── Member asset summary ──
  const memberAssetSummary = useMemo(
    () => getMemberAssetSummary(d.members as Record<string, unknown>[]),
    [d.members],
  );

  return {
    activeTab, navigateToTab,
    seasonOptions, handleSeasonSwitch,
    overflowOpen, setOverflowOpen, overflowRef,
    selectedMatch, setSelectedMatch,
    selectedMember, setSelectedMember,
    detailMemberId, setDetailMemberId,
    detailDefaultTab, setDetailDefaultTab,
    activeAssetSheet, setActiveAssetSheet,
    matchForSheet, matchSheet, clubLogoUrl,
    handleSelectMatch, handleNavigateToMatch,
    isCreateSeasonModalOpen, setIsCreateSeasonModalOpen, handleCreateSeason,
    creditsBalance, creditsSheetOpen, setCreditsSheetOpen, creditsLabel,
    memberAssetSummary,
  };
}
