# Frontend Consistency — Codebase Quality Roadmap

**Status:** ✅ Compleet (12/12 fases)
**Aangemaakt:** 2026-03-12
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)
- `navigation-architecture/` (10/10 ✅)

---

## Context

Vorige roadmaps hebben visuele consistentie (tokens), type safety (`any` → typed), en file structuur (splitting) aangepakt. Deze roadmap richt zich op **code patronen en consistentie** — plekken waar dezelfde logica op meerdere manieren is geïmplementeerd, wat onderhoud bemoeilijkt en bugs introduceert.

## Audit Resultaten (12 maart 2026)

| Categorie | Aantal | Ernst |
|-----------|--------|-------|
| **Error handling inconsistentie** | 30+ plekken | 🔴 Hoog — `getErrorMessage()` utility bestaat maar wordt niet gebruikt |
| **API import chaos** | 5+ patronen | 🔴 Hoog — `@/api`, `../../api`, `apiFetch` etc. door elkaar |
| **Resterende `any` types** | 15+ files | 🟡 Medium — nieuwe `any`s na vorige cleanup |
| **Grote files (>300 regels)** | 10+ files | 🟡 Medium — nieuwe grote files |
| **useState explosion** | 5+ files | 🟡 Medium — 10+ useState calls in één hook |
| **Modal duplicatie** | 120+ modal files | 🟡 Medium — geen abstractie |
| **TODO/FIXME comments** | 4 | 🟢 Laag |
| **@ts-expect-error** | 2 | 🟢 Laag |

### Probleembestanden

| Bestand | Probleem |
|---------|----------|
| `usePreferencesData.tsx` | **25+ useState calls** — moet useReducer zijn |
| `MatchWizard.tsx` (435 regels) | Alle wizard steps in 1 file |
| `TeamOrganisationDetailPage.tsx` (410 regels) | Te veel verantwoordelijkheden |
| `SeasonProvider.tsx` (396 regels) | Data fetching + context gemixed |
| `seasonProviderHelpers.ts` | `any` types: `orgForPermissions: any` |
| `AssetGenerationModal.tsx` | `any` types: `generation: any`, `selectedTemplate: any` |

---

## Fasering — 4 Tracks

### Track E — Error Handling Consistency

**Doel:** Alle error handling via `getErrorMessage()` utility

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **E1** | Error Helper Migration | 30+ `err instanceof Error ? err.message` → `getErrorMessage(err)` | 30 min | ✅ Done |

### Track I — Import Standardization

**Doel:** Eén import pattern voor API: `@/api`

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **I1** | API Import Standardization | ~20 files: `../../api` en `apiFetch` → `@/api` | 1 uur | ✅ Done |
| **I2** | Path Alias Consistency | Check andere `../../` imports naar `@/` aliassen | 1 uur | ✅ Done |

### Track T — Type Safety (remaining any)

**Doel:** Nieuwe `any` types → proper types

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **T1** | Provider Types | `seasonProviderHelpers.ts` any → typed | 15 min | ✅ Done |
| **T2** | Modal Types | `AssetGenerationModal.tsx`, `batchTypes.ts` any → typed | 1 uur | ✅ Done |
| **T3** | Handler Types | `handlers.ts`, `useSports.ts` any → typed | 15 min | ✅ Done |
| **T4** | Test Mock Types | `derived.test.ts` etc. `as any[]` → proper mocks | 1 uur | ✅ Done |

### Track S — State Management

**Doel:** Geen file met >10 useState calls

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **S1** | usePreferencesData Refactor | 25+ useState → useReducer of split | 2 uur | ✅ Done |
| **S2** | Form State Hooks | RegisterPage, OrganisationEditPage etc. → useForm pattern | 2 uur | ✅ Done |

### Track F — File Splitting

**Doel:** Geen file >300 regels (buiten test files)

| Fase | Naam | Scope | Effort | Status |
|------|------|-------|--------|--------|
| **F1** | MatchWizard Split | 435 regels → step components | 2 uur | ✅ Done |
| **F2** | TeamOrganisationDetailPage Split | 410 regels → extract tabs/hooks | 2 uur | ✅ Done |
| **F3** | SeasonProvider Split | 396 regels → data hook + context | 1.5 uur | ✅ Done |

---

## Volgorde

```
E1 (error handling) → I1 (api imports) → I2 (path aliases) → T1-T4 (types) → S1-S2 (state) → F1-F3 (splitting)
```

**Rationale:**
- **E1, I1-I2** eerst — Quick wins, geen breaking changes, hoge consistentie impact
- **T1-T4** daarna — Type safety, prevents bugs
- **S1-S2** — State management cleanup, smaller scope
- **F1-F3** als laatst — File splitting is meest invasief, kan merge conflicts veroorzaken

## Totale Effort

| Track | Fases | Uren |
|-------|-------|------|
| **E** — Error Handling | 1 | 1 |
| **I** — Import Standardization | 2 | 2 |
| **T** — Type Safety | 4 | 3 |
| **S** — State Management | 2 | 4 |
| **F** — File Splitting | 3 | 5.5 |
| **Totaal** | **12** | **~15.5 uur** |

---

## Quick Wins (< 1 uur, doe vandaag)

1. **E1** — Error handling: zoek/vervang `err instanceof Error ? err.message` → `getErrorMessage(err)`
2. **I1** — API imports: standardize naar `@/api`
3. **T1** — Fix `seasonProviderHelpers.ts` any types

## Aanpak

Elke fase:
1. Lees phase doc
2. Maak changes
3. Run `tsc --noEmit` + `vitest run`
4. Commit met conventional commit message
5. Verplaats phase doc naar `done/`
