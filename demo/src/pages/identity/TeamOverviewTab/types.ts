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
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface HierarchyData {
  seasons: Array<{
    id?: string | number;
    slug?: string;
    name?: string;
  }>;
  competitionsBySeasonId: Record<string, Record<string, unknown>[]>;
  matchesCountBySeasonId: Record<string, number>;
  matchesCountByCompetitionId: Record<string, number>;
  loading: boolean;
  error: string | null;
}

export interface OverviewMember {
  id: string | number;
  first_name?: string;
  last_name?: string;
  email?: string;
  [key: string]: unknown;
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
  /** Match records grouped by competition period id (for hierarchy drill-down) */
  teamMatchesByPeriodId: Record<string, MatchRecord[]>;
  teamMatchesLoading: boolean;
  /** Full member records for inline media matrix */
  fullMembers: Array<Record<string, unknown>>;
  fullMembersLoading: boolean;
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
  const d = new Date(raw as any);
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtTime(m: MatchRecord): string {
  const raw = m?.start_time || m?.date || m?.metadata?.date;
  if (!raw) return '';
  const d = new Date(raw as any);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export function matchDisplayTitle(m: MatchRecord): string {
  // 1. Explicit name from API
  const name = String(m?.name || '').trim();
  if (name) return name;

  // 2. Title field (e.g. "Team A vs Team B")
  const title = String((m as Record<string, unknown>)?.title || '').trim();
  if (title) return title;

  // 3. Home/away from metadata
  const meta = (m?.metadata || {}) as Record<string, unknown>;
  const home = (meta.home_team || meta.team_home || '') as string;
  const away = (meta.away_team || meta.team_away || '') as string;
  if (home && away) return `${home} — ${away}`;

  // 4. Project names (home project vs opponent project)
  const proj = (m?.project || {}) as Record<string, unknown>;
  const oppProj = (m?.opponent_project || {}) as Record<string, unknown>;
  const homeProject = String(proj.club_name || proj.name || '').trim();
  const awayProject = String(oppProj.club_name || oppProj.name || '').trim();
  if (homeProject && awayProject) return `${homeProject} vs ${awayProject}`;
  if (homeProject) return homeProject;

  // 5. Fallback with date if available
  const date = m?.start_time ? new Date(m.start_time).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) : '';
  if (date) return `Wedstrijd ${date}`;

  return `Wedstrijd ${String(m?.id || '').slice(0, 8)}`;
}
