# N2 — Breadcrumb & Back-navigation System

**Status:** 🔲 Todo
**Track:** N — Navigation Surfaces
**Effort:** 6 uur
**Dependencies:** R1 (route constants), R3 (hierarchy resolver — begrijpt de hiërarchie)

---

## Doel

Implementeer een automatisch breadcrumb-systeem dat de hiërarchie reflecteert, en maak back-navigatie consistent over alle pagina's.

## Huidige Staat

### Back-navigatie

- `BackNavigationProvider` bestaat → `useBackNavigation()` / `useSetBackNavigation()`
- Elke pagina moet zelf `useSetBackNavigation(target)` aanroepen
- Inconsistent: niet alle pagina's doen dit
- TopNavbar toont back-button alleen als een pagina het expliciet instelt

### Breadcrumbs

- **Geen breadcrumb systeem aanwezig**
- Gebruiker navigeert via sidebar of back-button, maar bij diep geneste hiërarchie (org → club → team → season → match) is er geen visueel pad zichtbaar

### Probleem

Een gebruiker op een match-detail page ziet:
- ✅ Back-button (naar vorige pagina)
- ❌ Geen context: bij welk team/seizoen/competitie hoort deze match?
- ❌ Geen snelle navigatie naar tussenliggende niveaus

## Target

### Automatische breadcrumbs op detail pages

```
KNVB > FC Utrecht > U19 > 2025-26 > Eredivisie U19 > speelronde 12
```

Met klikbare links naar elk niveau.

### Consistent back-nav

Back-navigatie wordt automatisch afgeleid uit de route-hiërarchie (niet meer per pagina ingesteld).

## Scope

### 1. Creëer `useBreadcrumbs()` hook

```tsx
interface BreadcrumbItem {
  label: string;
  path: string;
}

function useBreadcrumbs(): BreadcrumbItem[] {
  const params = useParams();
  const { orgId, clubId, projectId, seasonId, competitionId, matchId } = params;

  // Bouw breadcrumb trail op basis van beschikbare params
  const crumbs: BreadcrumbItem[] = [];
  if (orgId) crumbs.push({ label: orgName, path: routes.orgDetail({ orgId }) });
  if (clubId) crumbs.push({ label: clubName, path: routes.club({ orgId, clubId }) });
  // ... etc.

  return crumbs;
}
```

### 2. Creëer `<Breadcrumbs>` component

- Responsive: volledig pad op desktop, collapsed (... > parent > current) op mobile
- Integratie in TopNavbar of als standalone component onder de navbar
- Styling via design tokens

### 3. Automatische back-nav

```tsx
// In plaats van elke pagina handmatig:
useSetBackNavigation('/some/path');

// Automatisch: back = voorlaatste breadcrumb
const crumbs = useBreadcrumbs();
const backTarget = crumbs.length > 1 ? crumbs[crumbs.length - 2].path : '/dashboard';
```

### 4. Label resolution

Breadcrumbs hebben namen nodig (niet IDs). Opties:
- **A:** API call voor elk niveau → traag, veel requests
- **B:** Context/cache — de sidebar kent al de namen → hergebruik
- **C:** Slug-based — als URLs slugs gebruiken ipv UUIDs, is de slug het label

**Aanbevolen:** Combinatie B+C. De `useAppSelection()` hook in sidebar kent al de actieve org/club/team/season. Gebruik die data + URL slugs als fallback.

## Acties

1. [ ] Creëer `demo/src/hooks/useBreadcrumbs.ts`
2. [ ] Creëer `demo/src/components/Breadcrumbs.tsx` + `Breadcrumbs.module.css`
3. [ ] Integreer breadcrumbs in detail pages (Season, Match, Team, Club, Member)
4. [ ] Maak back-navigatie automatisch (afgeleid uit breadcrumbs)
5. [ ] Responsive design: desktop (vol pad) vs mobile (collapsed)
6. [ ] Tests voor useBreadcrumbs hook
7. [ ] Visuele test op mobile + desktop

## Verificatie

- [ ] Breadcrumbs zichtbaar op Season, Match, Team, Club, Member detail pages
- [ ] Elk breadcrumb-item is klikbaar en navigeert correct
- [ ] Back-button in TopNavbar werkt consistent (altijd naar parent level)
- [ ] Mobile: breadcrumbs collapsed (max 2-3 items zichtbaar)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
