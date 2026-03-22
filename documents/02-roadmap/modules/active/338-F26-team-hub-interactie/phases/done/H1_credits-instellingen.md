# H1 — Credits & Team Instellingen

| | |
|---|---|
| Status | TODO |
| Effort | ~4 uur |
| Blokkeerd door | — |

## Doel

De Beheer-sectie op de Overview tab toont nuttige informatie in plaats van generieke ✅-iconen. "Team instellingen" laat credits saldo en wallet-status zien. "Competities" en "Assets" geven concrete counts met doorlink-actie.

## Context

**Nu:**
- Beheer accordion heeft 3 rijen: Team instellingen (✅), Competities (aantal), Assets (n/m foto's)
- "Team instellingen" toont alleen ✅ — onduidelijk wat dit betekent
- Geen credits/saldo informatie zichtbaar op de hub
- Items zijn `<div>` — niet interactief

**Na H1:**
- "Team instellingen" toont credits saldo: `💰 {n} credits` (live API data)
- Rijen worden tappable → navigeren naar de juiste Beheer sub-tab
- Credits saldo wordt opgehaald via `creditsApi.getProjectBalance()`

## Bestaande API's

| API | Pad | Retourneert |
|-----|-----|------------|
| `creditsApi.getMyBalance()` | `demo/src/api/credits.ts` | `{ current_balance: number }` |
| `creditsApi.getProjectBalance(projectId)` | `demo/src/api/credits.ts` | `ProjectCreditsBalance` |
| `transactionsApi.list()` | `demo/src/api/credits.ts` | Transactie-lijst |
| `seasonWalletOptions` | SeasonProvider | Wallet scope opties |

## Taken

### 1. Credits saldo ophalen
- [ ] In `MyTeamHubPage.tsx`: call `creditsApi.getProjectBalance(project.id)` via `useEffect` of React Query
- [ ] Fallback: als API faalt → toon "—" in plaats van ✅
- [ ] Saldo opslaan in local state: `projectBalance: number | null`

### 2. Beheer accordion items herwerken
- [ ] **Team instellingen:**
  - Verander van `<div>` naar `<button>` met `onClick` → `setActiveTab('beheer')`
  - Status tekst: `💰 {projectBalance} credits` (of `—` bij loading/error)
  - Icoon: `Settings` (behouden) + `ChevronRight`
- [ ] **Competities:**
  - Verander naar `<button>` → `setActiveTab('beheer')` of open SeasonCompetitionsTab
  - Status tekst: `{count} competities` (behouden)
  - Voeg `ChevronRight` toe
- [ ] **Assets:**
  - Verander naar `<button>` → `setActiveTab('assets')`
  - Status tekst: `{complete}/{total} foto's` (behouden)
  - Voeg `ChevronRight` toe

### 3. Styling
- [ ] Consistent chevron-styling met andere accordion items
- [ ] Credits badge: subtiele kleur (groen als >0, grijs als 0)
- [ ] Touch targets ≥ 44×44px

### 4. Loading state
- [ ] Toon skeleton/spinner terwijl credits laden
- [ ] Geen layout shift bij data-aankomst

## Acceptatiecriteria

- [ ] "Team instellingen" toont credits saldo van het project
- [ ] Credits worden live opgehaald bij mount (niet hardcoded)
- [ ] Beheer items zijn tappable en navigeren naar relevante tabs
- [ ] Bij API-fout: graceful fallback (geen crash, toon "—")
- [ ] TypeScript 0 errors, build success
