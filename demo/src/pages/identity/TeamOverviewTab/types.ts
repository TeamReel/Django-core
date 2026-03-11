/**
 * TeamOverviewTab - Type definitions
 */

export interface AssetStat {
  id: string;
  label: string;
  icon?: string;
  done: number;
  total: number;
  pct: number;
}

export interface BrandAssetItem {
  label: string;
  present: boolean;
}

/** Match / activity record */
export interface MatchRecord {
  id?: string | number;
  slug?: string;
  name?: string;
  date?: string;
  start_time?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

export interface HierarchyData {
  seasons: Array<{
    id?: string | number;
    slug?: string;
    name?: string;
  }>;
  competitionsBySeasonId: Record<string, Record<string, unknown>[]>;
  matchesCountBySeasonId: Record<string, number>;
  loading: boolean;
  error: string | null;
}

export interface OverviewMember {
  id: string | number;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: any;
}

export interface OverviewMembersData {
  members: OverviewMember[];
  count: number | null;
  loading: boolean;
  error: string | null;
}

export interface RouteKeys {
  orgKey: string;
  clubKey: string;
  teamKey: string;
}

export interface BrandContentData {
  brandAssets: BrandAssetItem[];
  assetStats: AssetStat[];
  fullMembersLoading: boolean;
  contentCount: number | null;
  contentCountLoading: boolean;
}

export interface TeamMatchData {
  matches: MatchRecord[];
  loading: boolean;
}

export interface Organisation {
  id?: string | number;
  name?: string;
  slug?: string;
}

export interface Project {
  id?: string | number;
  name?: string;
  slug?: string;
  team_type?: string;
}

export interface TeamOverviewTabProps {
  hierarchy: HierarchyData;
  overviewMembers: OverviewMembersData;
  routeKeys: RouteKeys;
  team: Project;
  club: Project;
  org: Organisation;
  makeTabHref: (tab: string) => string;
  brand: BrandContentData;
  matchData: TeamMatchData;
}

// Helper functions
export function getInitials(m: OverviewMember): string {
  const f = String(m?.first_name || '').trim();
  const l = String(m?.last_name || '').trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  if (m?.email) return m.email[0].toUpperCase();
  return '?';
}

export function getLabel(m: OverviewMember): string {
  const name = `${String(m?.first_name || '').trim()} ${String(m?.last_name || '').trim()}`.trim();
  return name || String(m?.email || '').trim() || `User ${m.id}`;
}

export function fmtDate(m: MatchRecord): string {
  const raw = m?.start_time || m?.date || m?.metadata?.date;
  if (!raw) return '—';
  const d = new Date(raw);
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtTime(m: MatchRecord): string {
  const raw = m?.start_time || m?.date || m?.metadata?.date;
  if (!raw) return '';
  const d = new Date(raw);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export function matchDisplayTitle(m: MatchRecord): string {
  const name = String(m?.name || '').trim();
  if (name) return name;
  const home = m?.metadata?.home_team || m?.metadata?.team_home || '';
  const away = m?.metadata?.away_team || m?.metadata?.team_away || '';
  if (home && away) return `${home} — ${away}`;
  return `Wedstrijd ${String(m?.id || '').slice(0, 8)}`;
}
