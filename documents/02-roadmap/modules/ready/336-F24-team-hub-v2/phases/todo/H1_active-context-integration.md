# H1 — Active context integratie

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | H0 |

## Doel

Hub gebruikt het bestaande active context systeem van TeamReel voor seizoen-selectie en navigatie. De user ervaart continuïteit: het seizoen dat ze kiezen wordt onthouden.

## Context

**Active Context systeem (al beschikbaar):**
- `getActiveContext()` → `ActiveContext { team: { id, slug }, season: { id, slug }, ... }`
- `setActiveContext('season', seasonId)` → schrijft naar localStorage + backend `PATCH /auth/active-context/`
- `ACTIVE_CONTEXT_CHANGED_EVENT` → window event bij wijzigingen
- localStorage key: `APP_LAST_CTX_KEY = 'demo_app_last_context_v1'`

## Taken

### 1. Initieel seizoen via active context (`useSeasonData.ts`)
- [ ] Bij auto-resolve (geen `initialSeasonId`): lees `getActiveContext().season?.id` eerst
- [ ] Als active context een seizoen heeft dat bij dit team hoort → gebruik dat
- [ ] Fallback als geen match: meest recente seizoen van het team
- [ ] Fallback als geen seizoenen: render `HubTeamOnlyView`

### 2. Seizoen-switch updatet active context (`MyTeamHubPage.tsx`)
- [ ] In `handleSeasonSwitch(newSeasonId)`:
  ```ts
  setSelectedSeasonId(newSeasonId);
  setActiveContext('season', newSeasonId);
  ```
- [ ] Active context event wordt auto-emit door `setActiveContext` (al ingebouwd)

### 3. Bottom nav active context-navigatie (`MobileBottomNav.tsx`)
- [ ] "Mijn Team" link leest active context voor team slug:
  ```ts
  const ctx = getActiveContext();
  const teamPath = ctx.team ? routes.teamHub(ctx.organisation.slug, ctx.club.slug, ctx.team.slug) : '/';
  ```
- [ ] Fallback als geen active team: huidige gedrag (team uit URL context)
- [ ] Label: altijd "Mijn Team" (ongeacht of user ook OrgAdmin is)

### 4. Sidebar "Mijn Team" link sync
- [ ] Sidebar gebruikt ook `routes.teamHub()` helper voor "Mijn Team" navigatie
- [ ] Controleer `SidebarNav.tsx` of `PanelA.tsx` — update link indien nodig

### 5. `?season=X` query param override
- [ ] Als URL `?season=X` bevat → heeft prioriteit boven active context
- [ ] Na mount: update active context met dit seizoen (zodat volgende keer ook dit seizoen)
- [ ] Verwijder `?season=X` uit URL na verwerking (replace in history) om lege URL te houden

## Verificatie

- [ ] Login → navigeer naar team → hub opent met actief seizoen uit active context
- [ ] Wissel seizoen via SeasonSwitcher → network tab toont `PATCH /auth/active-context/`
- [ ] Navigeer weg, terug naar team → zelfde seizoen nog actief
- [ ] `?season=X` query param → dat seizoen wordt geselecteerd + active context bijgewerkt
- [ ] Bottom nav "Mijn Team" navigeert naar juiste team
- [ ] `npx tsc --noEmit` clean
