# U2 — Wizard Entry Points & Context Prefill

**Status:** 🔲 Todo
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

1. [ ] Verbeter `useCreatePrefill()` — automatische context detectie
2. [ ] Creëer `<CreateButton>` component met flow + prefill props
3. [ ] Voeg CreateButton toe aan Team, Season, Competition, Match detail pages
4. [ ] Implementeer step-skipping als context volledig is
5. [ ] Maak TopNavbar CREATE_MENU_ITEMS context-aware
6. [ ] Tests voor useCreatePrefill met diverse URL contexts

## Verificatie

- [ ] Team page → "+Wedstrijd" → wizard opent met team prefilled
- [ ] Season page → "+Content" → wizard opent met team + seizoen prefilled
- [ ] ProjectContextStep wordt overgeslagen als context compleet is
- [ ] TopNavbar create-menu items nemen context mee
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
