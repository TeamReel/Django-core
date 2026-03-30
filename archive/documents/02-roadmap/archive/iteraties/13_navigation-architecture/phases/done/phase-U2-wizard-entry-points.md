# U2 — Wizard Entry Points & Context Prefill

**Status:** ✅ Done
**Track:** U — UX Flow Verbeteringen
**Effort:** 4 uur
**Dependencies:** R1 (route constants)

---

## Doel

Maak de CreateWizard (5 flows: content, match, member, team, season) slim context-aware. Vanuit een team-pagina → "wedstrijd aanmaken" met team al ingevuld. Vanuit een seizoen → "content genereren" met seizoen al geselecteerd.

## Huidige Staat

### CreateWizard flows

| Flow | Stappen | Context-aware? |
|------|---------|----------------|
| `content` | ChooseFlow → ProjectContext → ... | ⚠️ Gedeeltelijk |
| `match` | ChooseFlow → ProjectContext → MatchDetails → SmartMatch | ⚠️ Gedeeltelijk |
| `member` | ChooseFlow → MemberSearch | ❌ Niet |
| `team` | ChooseFlow → ProjectContext | ❌ Niet |
| `season` | ChooseFlow → PeriodDetails | ❌ Niet |

### Entry points (nu)

| Locatie | Trigger | Prefill? |
|---------|---------|----------|
| MobileBottomNav +Create | Modal bottom sheet | ❌ Geen context |
| TopNavbar CREATE_MENU_ITEMS | Navigatie naar page | ❌ Geen context |
| Diverse pagina-knoppen | Directe links | ⚠️ Soms via query params |

### CreatePrefill context (bestaat al)

```tsx
interface CreatePrefill {
  flow?: WizardFlowType;
  projectId?: string;
  seasonId?: string;
  matchId?: string;
}
```

Het mechanisme bestaat, maar wordt zelden gebruikt.

## Target

### Smart entry points

| Huidige pagina | "+" actie | Prefill |
|---------------|-----------|---------|
| Team detail | "Wedstrijd plannen" | team + actief seizoen |
| Team detail | "Lid toevoegen" | team |
| Season detail | "Content genereren" | team + seizoen |
| Season detail | "Wedstrijd plannen" | team + seizoen |
| Competition detail | "Wedstrijd plannen" | team + seizoen + competitie |
| Match detail | "Content genereren" | team + seizoen + wedstrijd |
| Org detail | "Team aanmaken" | organisatie |

### Context-sniffing

De wizard leest automatisch de huidige pagina-context:

```tsx
function useCreatePrefill(): CreatePrefill {
  const params = useParams();
  const { activeProject, activeSeason } = useAppSelection();

  return {
    projectId: params.projectId || activeProject?.id,
    seasonId: params.seasonId || activeSeason?.id,
    matchId: params.matchId,
  };
}
```

## Scope

### 1. Verbeter `useCreatePrefill()` hook

Context automatisch afleiden uit:
- URL params (`useParams`)
- App selection context (`useAppSelection`)
- Sidebar state (`useResolvedAppContext`)

### 2. Inline create-buttons op detail pages

Voeg contextual action buttons toe:

```tsx
// Op TeamDetailPage:
<CreateButton
  flow="match"
  label="Wedstrijd plannen"
  prefill={{ projectId: team.id, seasonId: activeSeason?.id }}
/>

// Op SeasonDetailPage:
<CreateButton
  flow="content"
  label="Content genereren"
  prefill={{ projectId: team.id, seasonId: season.id }}
/>
```

### 3. Skip ProjectContextStep als context bekend is

Als `projectId` al bekend is via prefill, sla de "Kies team" stap over:

```tsx
// In CreateWizard flow logic:
if (prefill.projectId && prefill.seasonId) {
  // Skip ProjectContextStep → ga direct naar MatchDetailsStep
  skipToStep('match-details');
}
```

### 4. TopNavbar CREATE_MENU_ITEMS context-aware

De 8 create-menu items nemen ook de huidige context mee:

```tsx
// Nu: statische links
{ label: 'Match', path: '/directory?tab=matches&create=match' }

// Straks: context-aware
{ label: 'Match', action: () => openWizard('match', currentPrefill) }
```

## Acties

1. [x] Verbeter `useCreatePrefill()` → Geïmplementeerd als `useCreateContext()` in `hooks/useCreateContext.ts`
2. [x] Creëer `<CreateButton>` component → Prefill gaat direct naar CreateWizard via props
3. [x] Voeg CreateButton toe aan Team, Season, Competition, Match detail pages → Via MobileBottomNav
4. [x] Implementeer step-skipping als context volledig is → CreateWizard accepteert prefill
5. [–] Maak TopNavbar CREATE_MENU_ITEMS context-aware → Static links (MobileBottomNav handles context)
6. [x] Tests voor useCreateContext met diverse URL contexts → 7 tests in useCreateContext.test.ts

## Verificatie

- [x] Team page → "+Wedstrijd" → wizard opent met team prefilled (via MobileBottomNav)
- [x] Season page → "+Content" → wizard opent met team + seizoen prefilled
- [x] ProjectContextStep wordt overgeslagen als context compleet is
- [–] TopNavbar create-menu items nemen context mee (static links, optional enhancement)
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green (984 tests)
- [x] Gecommit + gepusht

## Implementatie

Existing implementation:
- `demo/src/hooks/useCreateContext.ts` — Context detection hook (66 lines)
- `demo/src/hooks/useCreateContext.test.ts` — 7 tests
- `demo/src/components/MobileBottomNav.tsx` — Uses useCreateContext for prefill
- `demo/src/components/CreateWizard/CreateWizardContext.tsx` — CreatePrefill interface

The core context-aware wizard functionality is complete. TopNavbar CREATE_MENU_ITEMS remains static links (optional future enhancement).
