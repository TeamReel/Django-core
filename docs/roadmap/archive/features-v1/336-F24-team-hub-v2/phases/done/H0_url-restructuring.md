# H0 — URL-herstructurering: 3-segment hub

| | |
|---|---|
| Status | TODO |
| Effort | ~8 uur |
| Blokkeerd door | — |

## Doel

Hub draait op `/:org/:club/:team` zonder seizoen in het URL-pad. Seizoen wordt intern geselecteerd via active context of auto-resolve. Dit is het fundament waarop alle andere fases bouwen.

## Context

**Nu:**
- 3-seg `/:org/:club/:team` → `TeamDetailPage` (redirect naar 4-seg met meest recente seizoen)
- 4-seg `/:org/:club/:team/:season` → `SeasonDetailPage → SeasonProvider → MyTeamHubPage`
- Seizoen switch = `navigate()` naar nieuwe 4-seg URL

**Na H0:**
- 3-seg `/:org/:club/:team` → `SeasonProvider → MyTeamHubPage` (direct)
- 4-seg `/:org/:club/:team/:season` → `Navigate` redirect naar 3-seg (met `?season=X` hint)
- Seizoen switch = `setState()` + `setActiveContext()`, geen navigate

## Taken

### 1. Route wijziging (`appRouteGroups.tsx`)
- [ ] 3-seg route `/:orgId/:clubId/:projectId` rendert direct `<SeasonProvider><MyTeamHubPage /></SeasonProvider>`
- [ ] Verwijder de import van `TeamDetailPage` uit de 3-seg route
- [ ] 4-seg route `/:orgId/:clubId/:projectId/:seasonId` → redirect naar 3-seg met `?season={seasonId}` hint
- [ ] **Subroutes — breaking change uitwerken:**
  - Huidige: `/:org/:club/:team/:season/members/:memberId`
  - Nieuwe route: `/:org/:club/:team/members/:memberId` (seizoen niet in pad)
  - Of: behoud 4-seg voor subroutes (`/:org/:club/:team/:season/members/:memberId`) en pas alleen de hub-root aan
  - **Aanbeveling:** Behoud seizoen in het pad voor subroutes (member, match) — dit zijn directe links vanuit de hub naar een specifiek seizoen-context. Alleen de hub-root wordt 3-seg.
  - Subroutes in `appRouteGroups.tsx` aanpassen zodat ze vanuit de 3-seg hub werken (gebruik `context.season.id` voor links vanuit hub-componenten)

### 2. `useSeasonData.ts` aanpassen — optionele seasonId
- [ ] Parameter `seasonId` wordt optioneel: `seasonId?: string`
- [ ] Als geen `seasonId`: haal alle seizoenen op → selecteer meest recente (of via active context in H1)
- [ ] Seizoen beschikbaar als mutable state via `useState` (niet URL-gebonden)
- [ ] Exporteer `setSelectedSeasonId` functie voor externe switching

### 3. `SeasonProvider.tsx` aanpassen — volledige context interface

De `SeasonContext` interface wijzigt. Alle consumers van `useSeasonContext()` moeten geüpdated worden:

```ts
// Huidige interface (conceptueel):
interface SeasonContext {
  season: Period;
  competitions: Period[];
  brandProfile: BrandProfile | null;
  // ... meer
}

// Nieuwe interface (toevoegen):
interface SeasonContext {
  season: Period | null;           // null tijdens initieel laden
  selectedSeasonId: string | null;
  setSelectedSeasonId: (id: string) => void;
  seasonsForSwitcher: Period[];    // al aanwezig via SeasonSwitcher
  competitions: Period[];
  brandProfile: BrandProfile | null;
  isLoadingSeason: boolean;        // nieuw: voor loading states
}
```

- [ ] Lees `seasonId` niet meer uit URL params (`useParams`)
- [ ] Accepteer optionele `initialSeasonId` prop (voor deep-link via `?season=X`)
- [ ] Geef `setSelectedSeasonId` en `isLoadingSeason` door via context
- [ ] Controleer alle consumers van `useSeasonContext()` in de codebase en update type usage
- [ ] `HubTeamOnlyView` fallback: SeasonProvider rendert dit als `seasonsForSwitcher.length === 0`

### 4. SeasonSwitcher integratie
- [ ] `handleSeasonSwitch(newSeasonId)` in `MyTeamHubPage.tsx`:
  - wijzigt interne state via `setSelectedSeasonId()`
  - roept `setActiveContext('season', newSeasonId)` aan (komt in H1)
  - geen `navigate()` aanroep meer
- [ ] SeasonSwitcher in header blijft visueel identiek

### 5. Route helpers updaten (`routes.ts`)
- [ ] Voeg `teamHub(orgSlug, clubSlug, teamSlug): string` toe → `/${orgSlug}/${clubSlug}/${teamSlug}`
- [ ] Voeg `teamHubWithTab(orgSlug, clubSlug, teamSlug, tab: string): string` toe → `?tab=${tab}`
- [ ] Behoud bestaande `season()` helper voor backward compat

### 6. `TeamDetailPage.tsx` omgebouwd
- [ ] Niet meer auto-redirect, maar legacy redirect naar 3-seg
- [ ] Of: volledig verwijderd (route bestaat niet meer)

### 7. Deep-link support via query param
- [ ] `SeasonProvider` leest `?season=X` query param als initieel seizoen hint
- [ ] `useSearchParams()` → `initialSeasonId = searchParams.get('season') ?? undefined`

## Verificatie

- [ ] `/knvb/asc/helden-6` → hub laadt met auto-geselecteerd seizoen (meest recent)
- [ ] `/knvb/asc/helden-6/2025-2026` → redirect naar `/knvb/asc/helden-6?season=<id>` (geen loop)
- [ ] Seizoen switcher → data update, URL blijft `/knvb/asc/helden-6`
- [ ] `?season=some-season-id` query param → dat seizoen wordt initieel geselecteerd
- [ ] Member detail route bereikbaar vanuit hub (link gebruikt `season.id` uit context)
- [ ] Match detail route bereikbaar vanuit hub
- [ ] Geen TypeScript errors op SeasonContext consumers (`grep -r "useSeasonContext"` — alle gevonden files compileren)
- [ ] `npx tsc --noEmit` clean
- [ ] `npx vite build` clean
- [ ] 0 console errors
- [ ] `HubTeamOnlyView` toont wanneer team geen seizoenen heeft (test met leeg team)
