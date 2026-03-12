# R3 — Legacy Redirect Consolidation

**Status:** 🔲 Todo
**Track:** R — Route Architecture
**Effort:** 4 uur
**Dependencies:** R1 (route constants), R2 (/organisations/ prefix)

---

## Doel

Vervang 17 individuele redirect-componenten en ~40 redirect-routes door een universeel `HierarchyResolver` patroon. Consolideer de logica die bepaalt of een URL canonical is (→ render page) of legacy (→ redirect).

## Huidige Staat

### 17 Redirect Componenten in appRedirects.tsx

| Component | Functie |
|-----------|---------|
| `LegacyDirectoryRedirect` | directory + tab param |
| `LegacyOrgContextRedirect` | `/organisations/:orgId/<section>` → `/:orgId/<section>` |
| `OrgHierarchyRedirect` | → `/:orgId?tab=hierarchy` |
| `OrgProjectsRedirect` | → `/directory?tab=clubs` |
| `SeasonSquadRedirect` | → season URL + `?tab=squad` |
| `CompetitionMatchesRedirect` | → competition URL + `?tab=matches` |
| `CompetitionUsersRedirect` | → competition URL + `?tab=users` |
| `ClubDetailRedirect` | `/projects/:id` → `/:orgId/:id` |
| `TeamDetailRedirect` | `/projects/:clubId/teams/:id` → `/:orgId/:clubId/:id` |
| `TeamSeasonsRedirect` | → team + `?tab=seasons` |
| `TeamSeasonRedirect` | season met `/seasons/` segment → canonical |
| `ProjectSeasonRedirect` | project-path season → canonical |
| `ProjectCompetitionRedirect` | project-path competition → canonical |
| `ProjectMatchRedirect` | project-path match → canonical |
| `TeamCompetitionRedirect` | → season + `?tab=competitions` |
| `TeamMatchRedirect` | team-path match → canonical vanity |
| `OrganisationDetailRedirect` | `/organisations/:id` → `/:id` |

### Patroon: 90% doet hetzelfde

Bijna alle redirects doen: **extract params → bouw canonical URL → `<Navigate replace>`**.

## Target

### Optie A: Universeel `HierarchyResolver` component

Eén component dat URL-segmenten analyseert en de juiste canonical URL bepaalt:

```tsx
function HierarchyResolver() {
  const params = useParams();
  const location = useLocation();

  // Bepaal entiteit-type op basis van segment-count
  const canonical = resolveCanonicalUrl(params, location);

  if (canonical === location.pathname) {
    // Al canonical → render de juiste page
    return <HierarchyPageSwitch params={params} />;
  }

  // Legacy URL → redirect naar canonical
  return <Navigate to={`${canonical}${location.search}`} replace />;
}
```

### Optie B: Tab-redirects als query-param middleware

De "squad", "matches", "users", "seasons", "competitions" redirects voegen alleen een `?tab=X` toe. Dit kan een generieke functie zijn:

```tsx
function TabRedirect({ tab }: { tab: string }) {
  const location = useLocation();
  const sp = new URLSearchParams(location.search);
  sp.set('tab', tab);
  // Strip het laatse segment (/squad, /matches, etc.)
  const basePath = location.pathname.replace(/\/[^/]+$/, '');
  return <Navigate to={`${basePath}?${sp.toString()}`} replace />;
}
```

## Scope

### 1. Categoriseer redirects

| Categorie | Components | Consolidatie |
|-----------|-----------|-------------|
| **Prefix strip** | `LegacyOrgContextRedirect`, `OrganisationDetailRedirect`, `OrgProjectsRedirect`, `OrgHierarchyRedirect` | Afgehandeld door R2 wildcard |
| **Path reshape** | `ClubDetailRedirect`, `TeamDetailRedirect`, `TeamSeasonRedirect`, `ProjectSeasonRedirect`, `ProjectCompetitionRedirect`, `ProjectMatchRedirect`, `TeamMatchRedirect` | → `HierarchyResolver` |
| **Tab inject** | `TeamSeasonsRedirect`, `SeasonSquadRedirect`, `CompetitionMatchesRedirect`, `CompetitionUsersRedirect`, `TeamCompetitionRedirect` | → `TabRedirect` |
| **Generic** | `LegacyDirectoryRedirect` | Behouden (uniek) |

### 2. Consolideer naar 3 componenten

Na R2 (prefix eliminatie) + R3:
- `HierarchyResolver` — vangt alle `/projects/...` varianten
- `TabRedirect` — generiek tab-toevoeg component
- `LegacyDirectoryRedirect` — behouden

### 3. Reduceer route definities

Van ~40 redirect-routes → ~8 catch-all patterns.

## Acties

1. [ ] Categoriseer alle 17 redirects (prefix/reshape/tab/generic)
2. [ ] Creëer `HierarchyResolver` component
3. [ ] Creëer generiek `TabRedirect` component
4. [ ] Vervang individuele redirect-routes in `appRouteGroups.tsx`
5. [ ] Verwijder overtollige redirect-componenten uit `appRedirects.tsx`
6. [ ] Alle redirects gebruiken `routes.*` helpers (uit R1)
7. [ ] Test alle legacy URLs nog correct redirecten

## Verificatie

- [ ] Redirect componenten: 17 → ~3
- [ ] Redirect routes: ~40 → ~8
- [ ] Alle legacy URL patterns uit productie werken nog
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
