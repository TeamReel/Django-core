import React, { useMemo } from 'react';
import { getAssetUrl } from '../../hooks/useBrandProfile';

import type { WalletOption } from '../../components/transactions/CreateTransactionModal';
import type { Participation, ActivityEvent, MatchDetail } from './matchDetailTypes';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseMatchDerivedParams {
  effectiveCompetitionIdVal: string;
  effectiveMatchIdVal: string;
  seasonKeyOrId: string | null;
  seasonsBasePath: string;
  location: any;
  isPlayer: boolean;
  isSupporter: boolean;
  project: any;
  match: MatchDetail | null;
  club: any;
  opponentClub: any;
  opponentClubBrand: any;
  brandLogoUrl: string | null;
}

// ─── Hook: derived / memo values ─────────────────────────────────────────────

export function useMatchDerived(params: UseMatchDerivedParams) {
  const {
    effectiveCompetitionIdVal, effectiveMatchIdVal, seasonKeyOrId, seasonsBasePath,
    location, isPlayer, isSupporter, project, match, club, opponentClub, opponentClubBrand, brandLogoUrl,
  } = params;

  // ── Paths ──
  const competitionBasePath = useMemo(() => {
    const sk = String(seasonKeyOrId || '').trim();
    const ck = String(effectiveCompetitionIdVal || '').trim();
    if (!sk || !ck) return '';
    return `${seasonsBasePath}/${sk}/${ck}`;
  }, [effectiveCompetitionIdVal, seasonKeyOrId, seasonsBasePath]);

  const matchBasePath = useMemo(() => {
    if (!competitionBasePath || !effectiveMatchIdVal) return '';
    return `${competitionBasePath}/${effectiveMatchIdVal}`;
  }, [competitionBasePath, effectiveMatchIdVal]);

  // ── Active tab ──
  const activeTab = useMemo(() => {
    const p = new URLSearchParams(location.search);
    const raw = String(p.get('tab') || 'overview').trim().toLowerCase();
    /* RBAC: Supporter → overview only, Member → + lineup, Admin → all */
    const allowed = isSupporter
      ? new Set(['overview'])
      : isPlayer
        ? new Set(['overview', 'lineup'])
        : new Set(['overview', 'content', 'lineup', 'transactions']);
    if (allowed.has(raw)) return raw;
    const legacyMap: Record<string, string> = { hierarchy: 'details', match: 'details', date: 'details' };
    return legacyMap[raw] || 'overview';
  }, [location.search, isPlayer, isSupporter]);

  // ── Wallet options ──
  const matchWalletOptions = useMemo<WalletOption[]>(() => {
    const opts: WalletOption[] = [{ kind: 'default', label: 'Default (recommended)' }];
    opts.push({ kind: 'organization', label: 'Federation/Organisation wallet' });
    if (project?.id != null) {
      opts.push({ kind: 'project', label: 'Team wallet', projectId: String(project.id) });
    }
    opts.push({ kind: 'me', label: 'My user wallet' });
    return opts;
  }, [project?.id]);

  // ── Display values ──
  const date = match?.start_time ? new Date(match.start_time) : null;
  const status = String(match?.metadata?.status || 'scheduled');

  const isHome = match?.metadata?.teamreel?.match_context?.is_home
    ?? match?.metadata?.is_home
    ?? (match?.metadata?.teamreel?.match_context?.venue || match?.metadata?.venue || 'Home') === 'Home';

  const ownTeamName = club?.name || match?.project?.name || 'Eigen team';
  const opponentName = opponentClub?.name || match?.opponent_project?.name || 'Tegenstander';
  const homeTeamName = isHome ? ownTeamName : opponentName;
  const awayTeamName = isHome ? opponentName : ownTeamName;

  const ownLogoUrl = brandLogoUrl;
  const opponentLogoUrl = opponentClubBrand.getAsset?.('logo_upload')
    ? getAssetUrl(opponentClubBrand.getAsset('logo_upload')!.url)
    : opponentClubBrand.getAsset?.('logo')
      ? getAssetUrl(opponentClubBrand.getAsset('logo')!.url)
      : null;
  const homeLogoUrl = isHome ? ownLogoUrl : opponentLogoUrl;
  const awayLogoUrl = isHome ? opponentLogoUrl : ownLogoUrl;

  const scoreDisplay = status === 'finished'
    ? `${match?.metadata?.home_score ?? 0} - ${match?.metadata?.away_score ?? 0}`
    : 'vs';

  // ── Lineup sort + derived participations ──
  const sortLineup = (a: Participation, b: Participation) => {
    const isStarterA = String(a.role || '').toLowerCase() === 'starter';
    const isStarterB = String(b.role || '').toLowerCase() === 'starter';
    if (isStarterA && !isStarterB) return -1;
    if (!isStarterA && isStarterB) return 1;
    if (isStarterA) {
      if (a.data?.position === 'GK') return -1;
      if (b.data?.position === 'GK') return 1;
    }
    return (a.data?.jersey_number || 99) - (b.data?.jersey_number || 99);
  };

  const allParticipations = match?.participations || [];
  const homeParticipations = allParticipations
    .filter(p => p.data?.side === 'home' || String(p.data?.team_id || '') === String(match?.project?.id || ''))
    .sort(sortLineup);
  const awayParticipations = allParticipations
    .filter(p =>
      p.data?.side === 'away' ||
      (match?.opponent_project && String(p.data?.team_id || '') === String(match.opponent_project.id))
    )
    .sort(sortLineup);

  const matchEvents = (match?.events || []).slice().sort((a, b) => (a.minute || 0) - (b.minute || 0));

  return {
    competitionBasePath, matchBasePath, activeTab,
    matchWalletOptions,
    date, status, isHome: !!isHome,
    ownTeamName, opponentName, homeTeamName, awayTeamName,
    ownLogoUrl, opponentLogoUrl, homeLogoUrl, awayLogoUrl,
    scoreDisplay, homeParticipations, awayParticipations, matchEvents,
  };
}
