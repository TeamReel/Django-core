# R2 — /organisations/ Prefix Elimination

**Status:** 🔲 Todo
**Track:** R — Route Architecture
**Effort:** 2 uur
**Dependencies:** R1 (route constants)

---

## Doel

Vervang 24 duplicate `/organisations/`-prefix routes door 1 wildcard catch-all. Dit is de snelste route-reductie: -24 routes met minimaal risico.

## Huidige Staat

Elke route met `/:orgId/...` patroon bestaat ook als `/organisations/:orgId/...`:

```tsx
// In appRouteGroups.tsx — TWEE keer dezelfde pagina:
<Route path="/:orgId/:clubId/:projectId/:seasonId" element={<SeasonDetailPage />} />
<Route path="/organisations/:orgId/:clubId/:projectId/:seasonId" element={<SeasonDetailPage />} />
```

**24 routes** zijn pure 1:1 duplicaten met `/organisations/` prefix.

## Target

```tsx
// 1 wildcard vervangt 24 routes:
<Route path="/organisations/*" element={<StripOrganisationsPrefix />} />
```

## Scope

### 1. Creëer `StripOrganisationsPrefix` component

```tsx
function StripOrganisationsPrefix() {
  const location = useLocation();
  // /organisations/abc/clubs → /abc/clubs
  const newPath = location.pathname.replace(/^\/organisations/, '');
  return <Navigate to={`${newPath}${location.search}${location.hash}`} replace />;
}
```

### 2. Verwijder alle `h-org-*` routes uit appRouteGroups.tsx

Specifiek deze keys:
- `h-org-proj-seasons` t/m `h-org-proj-team-comp-squad` (12 routes)
- `h-org-vanity-team` t/m `h-org-vanity-match` (6 routes)
- `h-org-bc-season` t/m `h-org-bc-match` (4 routes)
- `i-org-clubs` t/m `i-org-users-legacy` (6 routes) → deze gaan ook via de wildcard

### 3. Behoud uitzonderingen

Routes die **alleen** onder `/organisations/` bestaan (geen root equivalent):
- `/organisations/create` → `OrganisationCreatePage` (behouden als expliciete route)
- `/organisations/:id/edit` → `OrganisationEditPage` (behouden)
- `/organisations/:id/members/:memberId` → `MemberDetailPage` (behouden)

De wildcard moet deze uitzonderingen vóór zichzelf laten matchen:

```tsx
// Expliciete /organisations/ routes BOVEN de wildcard:
<Route path="/organisations/create" element={<OrganisationCreatePage />} />
<Route path="/organisations/:id/edit" element={<OrganisationEditPage />} />
<Route path="/organisations/:id/members/:memberId" element={<MemberDetailPage />} />
// Dan de catch-all:
<Route path="/organisations/*" element={<StripOrganisationsPrefix />} />
```

## Acties

1. [ ] Inventariseer welke `/organisations/` routes een root-level equivalent hebben (→ wildcard)
2. [ ] Inventariseer welke `/organisations/` routes GEEN equivalent hebben (→ behouden)
3. [ ] Creëer `StripOrganisationsPrefix` component in `appRedirects.tsx`
4. [ ] Verwijder ~24 duplicate routes uit `appRouteGroups.tsx`
5. [ ] Voeg wildcard + uitzonderingen toe in `App.tsx`
6. [ ] Update `routes.ts` — geen enkele helper genereert `/organisations/` URLs
7. [ ] Test alle legacy `/organisations/` URLs redirect correct

## Verificatie

- [ ] `/organisations/abc/clubs` → redirect naar `/abc/clubs` ✅
- [ ] `/organisations/create` → OrganisationCreatePage (geen redirect) ✅
- [ ] `/organisations/:id/edit` → OrganisationEditPage (geen redirect) ✅
- [ ] Route count: -24 (van ~142 → ~118)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
