/**
 * routes.ts — Type-safe route helpers (single source of truth)
 *
 * Every canonical URL pattern in the app is defined here as a typed function.
 * Import `routes` anywhere instead of constructing URL strings manually.
 *
 * @example
 *   import { routes } from '@/routes';
 *   navigate(routes.season({ orgId, clubId, projectId, seasonId }));
 */

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                    */
/* ------------------------------------------------------------------ */

function qs(params: Record<string, string | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Safely encode a single path segment (slug or ID) */
function seg(value: string): string {
  return encodeURIComponent(String(value || '').trim());
}

/* ------------------------------------------------------------------ */
/*  Route definitions                                                  */
/* ------------------------------------------------------------------ */

export const routes = {
  // ── Core navigation ──────────────────────────────────────────────
  home: () => '/' as const,
  dashboard: () => '/dashboard' as const,
  recents: () => '/recents' as const,
  favorites: () => '/favorites' as const,
  search: (params?: { q?: string; types?: string }) =>
    `/search${qs({ q: params?.q, types: params?.types })}`,
  directory: (params?: { tab?: string; orgId?: string }) =>
    `/directory${qs({ tab: params?.tab, org_id: params?.orgId })}`,
  myTeams: () => '/my-teams' as const,

  // ── Auth ─────────────────────────────────────────────────────────
  login: () => '/login' as const,
  register: () => '/register' as const,

  // ── Content & Studio ─────────────────────────────────────────────
  content: () => '/content' as const,
  studio: (params?: { tab?: string }) =>
    `/studio${qs({ tab: params?.tab })}`,
  studioVideos: (params?: { tab?: string }) =>
    `/studio/videos${qs({ tab: params?.tab })}`,
  medialib: () => '/medialib' as const,
  approvals: (params?: { tab?: string }) =>
    `/approvals${qs({ tab: params?.tab })}`,

  // ── Organisation ─────────────────────────────────────────────────
  orgDetail: (p: { orgId: string }) =>
    `/${seg(p.orgId)}`,
  orgClubs: (p: { orgId: string }) =>
    `/${seg(p.orgId)}/clubs`,
  orgTeams: (p: { orgId: string }) =>
    `/${seg(p.orgId)}/teams`,
  orgSeasons: (p: { orgId: string }) =>
    `/${seg(p.orgId)}/seasons`,
  orgCompetitions: (p: { orgId: string }) =>
    `/${seg(p.orgId)}/competitions`,
  orgMatches: (p: { orgId: string }) =>
    `/${seg(p.orgId)}/matches`,
  orgUsers: (p: { orgId: string }) =>
    `/${seg(p.orgId)}/users`,
  orgHierarchy: (p: { orgId: string }) =>
    `/${seg(p.orgId)}?tab=hierarchy`,

  // /organisations/... helpers — exception routes that remain at this prefix (R2)
  /** @deprecated Use routes.orgDetail() — URL now redirects via wildcard */
  orgDetailLegacy: (p: { orgId: string }) =>
    `/${seg(p.orgId)}`,
  orgProjects: (p: { orgId: string }) =>
    `/organisations/${seg(p.orgId)}/projects`,
  /** @deprecated Use routes.club() or routes.projectDetail() */
  orgProjectDetailLegacy: (p: { orgId: string; projectId: string }) =>
    `/${seg(p.orgId)}/projects/${seg(p.projectId)}`,
  orgProjectCreate: (p: { orgId: string }) =>
    `/organisations/${seg(p.orgId)}/projects/create`,
  orgProjectEdit: (p: { orgId: string; projectId: string }) =>
    `/organisations/${seg(p.orgId)}/projects/${seg(p.projectId)}/edit`,
  orgMemberDetail: (p: { orgId: string; memberId: string }) =>
    `/organisations/${seg(p.orgId)}/members/${seg(p.memberId)}`,
  orgCreate: () => '/organisations/create' as const,
  orgEdit: (p: { orgId: string }) =>
    `/organisations/${seg(p.orgId)}/edit`,

  // ── Hierarchy (canonical vanity URLs) ────────────────────────────
  club: (p: { orgId: string; clubId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}`,
  team: (p: { orgId: string; clubId: string; projectId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}`,
  /** Team hub (3-seg) — canonical team page. Alias for team(). */
  teamHub: (p: { orgId: string; clubId: string; projectId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}`,
  /** Team hub with tab query param. */
  teamHubWithTab: (p: { orgId: string; clubId: string; projectId: string; tab: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}${qs({ tab: p.tab })}`,
  /** Club hub (2-seg) — for F25. */
  clubHub: (p: { orgId: string; clubId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}`,
  teamSeasons: (p: { orgId: string; clubId: string; projectId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}/seasons`,
  season: (p: { orgId: string; clubId: string; projectId: string; seasonId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}/${seg(p.seasonId)}`,
  seasonWithTab: (p: { orgId: string; clubId: string; projectId: string; seasonId: string; tab: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}/${seg(p.seasonId)}${qs({ tab: p.tab })}`,
  competition: (p: { orgId: string; clubId: string; projectId: string; seasonId: string; competitionId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}/${seg(p.seasonId)}/${seg(p.competitionId)}`,
  match: (p: { orgId: string; clubId: string; projectId: string; seasonId: string; competitionId: string; matchId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}/${seg(p.seasonId)}/${seg(p.competitionId)}/${seg(p.matchId)}`,
  member: (p: { orgId: string; clubId: string; projectId: string; seasonId: string; memberId: string }) =>
    `/${seg(p.orgId)}/${seg(p.clubId)}/${seg(p.projectId)}/${seg(p.seasonId)}/members/${seg(p.memberId)}`,

  // ── Project hierarchy (non-vanity, with /projects/ segment) ──────
  projectSeasons: (p: { orgId: string; projectId: string }) =>
    `/${seg(p.orgId)}/projects/${seg(p.projectId)}/seasons`,
  projectSeason: (p: { orgId: string; projectId: string; seasonId: string }) =>
    `/${seg(p.orgId)}/projects/${seg(p.projectId)}/${seg(p.seasonId)}`,
  projectCompetition: (p: { orgId: string; projectId: string; seasonId: string; competitionId: string }) =>
    `/${seg(p.orgId)}/projects/${seg(p.projectId)}/${seg(p.seasonId)}/${seg(p.competitionId)}`,
  projectMatch: (p: { orgId: string; projectId: string; seasonId: string; competitionId: string; matchId: string }) =>
    `/${seg(p.orgId)}/projects/${seg(p.projectId)}/${seg(p.seasonId)}/${seg(p.competitionId)}/${seg(p.matchId)}`,

  // ── Settings & Config ────────────────────────────────────────────
  settings: () => '/settings' as const,
  preferences: (params?: { tab?: string }) =>
    `/preferences${qs({ tab: params?.tab })}`,
  profile: () => '/profile' as const,
  credits: () => '/credits' as const,
  memberships: () => '/memberships' as const,
  billing: () => '/billing' as const,

  // ── Config (admin) ───────────────────────────────────────────────
  contentTemplates: () => '/content-templates' as const,
  workflowTemplates: () => '/workflow-templates' as const,
  appBackgrounds: () => '/app-backgrounds' as const,
  permissions: () => '/permissions' as const,
  audit: () => '/audit' as const,
  orgAudit: () => '/organisation/audit' as const,
  flags: () => '/flags' as const,
  routingLogs: () => '/routing-logs' as const,
  routingRules: () => '/routing-rules' as const,
  usageEvents: () => '/usage-events' as const,

  // ── Platform (superadmin) ────────────────────────────────────────
  health: () => '/health' as const,
  constitution: () => '/constitution' as const,
  security: () => '/security' as const,
  observability: () => '/observability' as const,
  platformStats: () => '/platform-stats' as const,
  apiDocs: () => '/api-docs' as const,
  demoWebsockets: () => '/demo/websockets' as const,
  demoPerformance: () => '/demo/performance' as const,

  // ── Frontend resource pages ──────────────────────────────────────
  designSystem: () => '/design-system' as const,
  authFlows: () => '/auth-flows' as const,
  context: () => '/context' as const,
  resources: () => '/resources' as const,
  templates: () => '/templates' as const,
  theme: () => '/theme' as const,
  integration: () => '/integration' as const,

  // ── Documentation ────────────────────────────────────────────────
  docs: () => '/docs' as const,
  tasks: () => '/tasks' as const,
  notifications: () => '/notifications' as const,
  deployment: () => '/deployment' as const,

  // ── Files & Media ────────────────────────────────────────────────
  files: () => '/demo/files' as const,

  // ── Work hierarchy list pages ────────────────────────────────────
  federations: () => '/federations' as const,
  clubs: (params?: { orgId?: string }) =>
    `/clubs${qs({ org_id: params?.orgId })}`,
  teams: () => '/teams' as const,
  seasons: () => '/seasons' as const,
  competitions: () => '/competitions' as const,
  apps: () => '/apps' as const,

  // ── Matches ──────────────────────────────────────────────────────
  matches: () => '/matches' as const,
  matchById: (p: { matchId: string }) =>
    `/matches/${seg(p.matchId)}`,
  matchWithTab: (p: { matchId: string; tab: string }) =>
    `/matches/${seg(p.matchId)}${qs({ tab: p.tab })}`,

  // ── Users ────────────────────────────────────────────────────────
  users: () => '/users' as const,
  userDetail: (p: { userId: string }) =>
    `/users/${seg(p.userId)}`,

  // ── Error pages ──────────────────────────────────────────────────
  forbidden: () => '/403' as const,
  notFound: () => '/404' as const,
} as const;

/* ------------------------------------------------------------------ */
/*  Type exports for consumers that need parameter shapes              */
/* ------------------------------------------------------------------ */

export type Routes = typeof routes;
export type RouteName = keyof Routes;
