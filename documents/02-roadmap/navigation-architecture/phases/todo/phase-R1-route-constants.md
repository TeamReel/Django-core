# R1 — Route Constants & Type-safe Builder

**Status:** 🔲 Todo
**Track:** R — Route Architecture
**Effort:** 4 uur
**Dependencies:** Geen (start-fase)

---

## Doel

Creëer een centraal `routes.ts` bestand dat alle canonical routes definieert als type-safe functies. Elimineer handmatige URL-string constructie in 70+ bestanden.

## Huidige Staat

```tsx
// Overal in de codebase — error-prone, geen autocomplete
navigate(`/${orgId}/${clubId}/${projectId}/${seasonId}`);
navigate(`/${orgId}/clubs`);
navigate(`/directory?tab=clubs&org_id=${orgId}`);
```

**Probleem:** 70+ pages bouwen URLs handmatig. Typos, inconsistenties en refactoring-risico's.

## Target

```tsx
// Nieuw: type-safe, autocomplete, refactor-proof
import { routes } from '@/routes';

navigate(routes.season({ orgId, clubId, projectId, seasonId }));
navigate(routes.orgClubs({ orgId }));
navigate(routes.directory({ tab: 'clubs', orgId }));
```

## Scope

### 1. Creëer `demo/src/routes.ts`

Canonical route helpers voor alle URL patterns:

```tsx
// ─── Static routes ───
export const routes = {
  // Core
  dashboard: () => '/dashboard',
  directory: (params?: { tab?: string; orgId?: string }) => {
    const sp = new URLSearchParams();
    if (params?.tab) sp.set('tab', params.tab);
    if (params?.orgId) sp.set('org_id', params.orgId);
    const qs = sp.toString();
    return `/directory${qs ? `?${qs}` : ''}`;
  },
  recents: () => '/recents',
  favorites: () => '/favorites',
  search: () => '/search',

  // Content
  content: () => '/content',
  studio: (params?: { tab?: string }) => `/studio${params?.tab ? `?tab=${params.tab}` : ''}`,
  medialib: () => '/medialib',
  approvals: (params?: { tab?: string }) => `/approvals${params?.tab ? `?tab=${params.tab}` : ''}`,

  // Identity
  orgDetail: (p: { orgId: string }) => `/${p.orgId}`,
  orgClubs: (p: { orgId: string }) => `/${p.orgId}/clubs`,
  orgTeams: (p: { orgId: string }) => `/${p.orgId}/teams`,
  orgSeasons: (p: { orgId: string }) => `/${p.orgId}/seasons`,
  orgCompetitions: (p: { orgId: string }) => `/${p.orgId}/competitions`,
  orgMatches: (p: { orgId: string }) => `/${p.orgId}/matches`,
  orgUsers: (p: { orgId: string }) => `/${p.orgId}/users`,

  // Hierarchy (canonical vanity)
  club: (p: { orgId: string; clubId: string }) =>
    `/${p.orgId}/${p.clubId}`,
  team: (p: { orgId: string; clubId: string; projectId: string }) =>
    `/${p.orgId}/${p.clubId}/${p.projectId}`,
  season: (p: { orgId: string; clubId: string; projectId: string; seasonId: string }) =>
    `/${p.orgId}/${p.clubId}/${p.projectId}/${p.seasonId}`,
  match: (p: { orgId: string; clubId: string; projectId: string; seasonId: string; competitionId: string; matchId: string }) =>
    `/${p.orgId}/${p.clubId}/${p.projectId}/${p.seasonId}/${p.competitionId}/${p.matchId}`,
  member: (p: { orgId: string; clubId: string; projectId: string; seasonId: string; memberId: string }) =>
    `/${p.orgId}/${p.clubId}/${p.projectId}/${p.seasonId}/members/${p.memberId}`,

  // Settings / Config
  preferences: () => '/preferences',
  profile: () => '/profile',
  settings: () => '/settings',
  credits: () => '/credits',

  // Admin
  audit: () => '/audit',
  flags: () => '/flags',
  health: () => '/health',
} as const;
```

### 2. Migreer redirect componenten (appRedirects.tsx)

Alle 17 redirect componenten gebruiken `routes.*` ipv handmatige template literals.

### 3. Migreer pagina's (gefaseerd)

- Prioriteit: pages met meeste `navigate()` calls
- Start met: sidebar data, CreateWizard, detail pages

### 4. Lint regel

ESLint custom rule of grep-check: geen bare `navigate(\`/` patterns meer.

## Acties

1. [ ] Creëer `demo/src/routes.ts` met alle canonical route helpers
2. [ ] Creëer `demo/src/routes.test.ts` — unit tests voor alle helpers
3. [ ] Migreer `appRedirects.tsx` → gebruik `routes.*`
4. [ ] Migreer `sidebarData.ts` + `useSidebarData.tsx` → `routes.*`
5. [ ] Migreer `MobileBottomNav.tsx` → `routes.*`
6. [ ] Migreer `topNavbarHelpers.ts` → `routes.*`
7. [ ] Migreer top-20 pages met meeste navigate calls
8. [ ] Voeg grep-check toe aan CI: `navigate(\`/` moet 0 hits geven

## Verificatie

- [ ] `routes.ts` bevat alle canonical URL patterns
- [ ] Alle redirect componenten gebruiken `routes.*`
- [ ] Alle navigatie-componenten (sidebar, navbar, bottom nav) gebruiken `routes.*`
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
