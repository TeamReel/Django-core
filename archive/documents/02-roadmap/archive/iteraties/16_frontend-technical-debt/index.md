# Frontend Technical Debt — Type Safety, State & API Roadmap

**Status:** ✅ Compleet (15/15 fases)
**Aangemaakt:** 2026-03-13
**Vorige roadmaps:**
- `design-system-adoption/` (11/11 ✅)
- `frontend-tech-debt/` (12/12 ✅)
- `frontend-structural-debt/` (17/17 ✅)
- `frontend-final-cleanup/` (12/12 ✅)
- `frontend-hardening/` (12/12 ✅)
- `frontend-consistency/` (12/12 ✅)
- `navigation-architecture/` (10/10 ✅)
- `8pt-grid-alignment/` (7/7 ✅)
- `repo-hygiene/` (5/5 ✅)
- `docs-hygiene/` (4/4 ✅)
- `docs-refactor/` (5/5 ✅)
- `frontend-ux-debt/` (13/15 🔄)

---

## Context

Na 11 afgeronde roadmaps is de codebase structureel solide: gecentraliseerde API client, feature-area organisatie, 0 console.* leaks, 1 `@ts-ignore`, volledige CSS Modules, en 892 tests. Een **codebase health audit** (13 maart 2026) toont echter 4 grote resterende probleemgebieden:

| Categorie | Files | Hits | Ernst |
|-----------|------:|-----:|-------|
| **`<any>` generic params** | **162** | **384** | 🔴 Kritiek — #1 type-safety lek |
| **useState explosie (>8/file)** | **68** | — | 🔴 Kritiek — state complexiteit |
| **`alert()` calls** | **39** | **80** | 🔴 Hoog — geen toast/notificatie |
| **Hardcoded `/api/v1/`** | **43** | **95** | 🔴 Hoog — API client omzeild |
| **`getApiBaseUrl()` direct** | **27** | **63** | 🟠 Medium |
| **`window.location`** | **26** | **30** | 🟠 Medium |
| **`fetchAllPages` los** | **24** | **76** | 🟠 Medium |
| **`as any` casts** | **19** | **20** | 🟡 Laag |
| **`: any` annotaties** | **11** | **18** | 🟡 Laag |
| **Raw `fetch()`** | **9** | — | 🟡 Laag |

**Totaal:** 176 van 849 productiebestanden (20,7%) hebben nog een vorm van `any`.

### Kernprobleem

De API client (`api.get/list/listAll`) is gecentraliseerd, maar **callsites typen hun responses niet** — overal `api.get<any>()`. De state management groeit organisch met `useState` en sommige hooks hebben 30-50 state variables. Error/success feedback gaat via rauwe `alert()` i.p.v. een notificatiesysteem.

---

## Fasering — 5 Tracks, 15 Fases

### Track T — Type Safety (`<any>` → typed responses)

**Doel:** Alle 384 `<any>` generic parameters vervangen door typed interfaces. Puur mechanisch — geen logica wijzigingen.

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **T1** | Core Hook Response Types | `useBreadcrumbsData` (9), `useMatchesData/fetchers` (5), `useAppSelection` (5), `useVideoJobs` (5), `useCompetitionsData/fetchers` (5) | -29 `<any>` | ✅ Done |
| **T2** | Identity & Org Response Types | `useClubOrgHierarchy` (6), `useSeasonSquadAddMemberData` (5), `orgModalHandlers` (5), `useSeasonDataFetching` (6) | -22 `<any>` | ✅ Done |
| **T3** | Batch, Components & Page Types | `batchExecution` (6), `LegacyMatchRedirectPage` (9), `useDirectoryFilters` (6+) | -21 `<any>` | ✅ Done |
| **T4** | Remaining `<any>` Sweep | ~55 files, ~110 hits — batch per feature-area | -109 `<any>` (1 behouden: idiomatic React) | ✅ Done |
| **T5** | `as any` & `: any` Cleanup | 19 files `as any` (20 hits) + 11 files `: any` (18 hits) | 0 `any` in codebase | ✅ Done |

### Track S — State Management (useState → useReducer/forms)

**Doel:** Files met >15 useState calls migreren naar `useReducer` of form library. Reduceer cognitieve complexiteit.

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **S1** | Match & Org Form Reducers | `useMatchFormState` (50), `useOrgFormState` (39), identity `useMatchFormState` (38) | -127 useState → 3 useReducer | ✅ Done |
| **S2** | Data State Reducers | `useCompetitionDetailData/state` (35), `useUsersData/state` (27), `useUserEditData` (26), `useMatchWizardData` (26) | -114 useState → 4 useReducer | ✅ Done |
| **S3** | Filter & Modal State | `useOrgFilters` (25), `useCascadingEntitySelection` (24), `useUserDetailData` (24), `useProfileModals` (21), `useOrgModals` (19) | -113 useState → 5 useReducer | ✅ Done |
| **S4** | Remaining State Consolidation | Overige 48 files met 8-18 useState — triage: useReducer of acceptabel | 18 hooks migrated to useReducer | ✅ Done |

### Track A — API Centralisatie (hardcoded URLs → api client)

**Doel:** Alle directe URL-constructie elimineren. Alles via `api.get/list/post/patch/delete`.

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **A1** | Top URL Hotspots → API Client | `main.tsx` (7), `useMatchesData/fetchers` (6), `useDirectoryFilters` (5), `useUserDetailApi` (5), `useSeasonBulkActions` (4), `useAppSelection` (4), `useCompetitionsData/fetchers` (4) | -35 hardcoded URLs | ✅ Done |
| **A2** | Remaining URLs + getApiBaseUrl | Overige ~28 files met `/api/v1/` + 27 files met `getApiBaseUrl()` direct | 0 directe URL constructie | ✅ Done |
| **A3** | Raw fetch() Elimination | 9 files met raw `fetch()` buiten wrappers → `api.*` of `apiFetch` | 0 raw fetch | ✅ Done |

### Track U — UX Modernisatie (alert → toast, window.location)

**Doel:** Professionele feedback patterns. Geen browser-native dialogs.

| Fase | Naam | Scope | Target | Effort |
|------|------|-------|--------|--------|
| **U1** | Toast Notificatie Systeem | Bouw `useToast` hook + `ToastContainer` component. Integreer in AppShell | Toast systeem beschikbaar | ✅ Done |
| **U2** | alert() Migratie | Alle 39 files (80 hits) migreren van `alert()` → `toast.success/error`. Top: `useOrgActions` (5), `UserDetailMembershipTabs` (5), `useUserDetailApi` (4) | 0 `alert()` calls | ✅ Done |
| **U3** | window.location Audit | 26 files met `window.location` — triage: `navigate()` waar mogelijk, documenteer waar nodig (OAuth, external links) | Gedocumenteerd + gemigreerd | ✅ Done |

---

## Volgorde & Dependencies

```
T1 (core types) ──── T2 (identity types) ──── T3 (batch/page types) ──── T4 (sweep) ──── T5 (any cleanup)
                                                                                           │
S1 (match/org forms) ──── S2 (data state) ──── S3 (filters/modals) ──── S4 (remaining)    │
                                                                                           │
U1 (toast systeem) ──── U2 (alert migratie) ──── U3 (window.location)                     │
                                                                                           │
A1 (top URLs) ──── A2 (remaining URLs) ──── A3 (raw fetch)                                │
                                                                                           ▼
                                                                               ✅ 0 any, 0 alert, 0 hardcoded URLs
```

**Aanbevolen volgorde:**
1. **T1-T3** eerst — grootste type-safety winst, geen risico
2. **U1** (toast systeem) — enabler voor U2
3. **A1** — API centralisatie afronden
4. **S1-S2** — complexste state reducers
5. Rest in willekeurige volgorde

---

## Effort Schatting

| Track | Fases | Geschatte uren |
|-------|------:|---------------:|
| **T** — Type Safety | 5 | 19 uur |
| **S** — State Management | 4 | 21 uur |
| **A** — API Centralisatie | 3 | 11 uur |
| **U** — UX Modernisatie | 3 | 11 uur |
| **Totaal** | **15** | **~62 uur** |

---

## Eindresultaat

| Metric | Nu | Na Roadmap |
|--------|---:|----------:|
| `<any>` generics | 384 | **0** |
| `as any` + `: any` | 38 | **0** |
| Files met any `any` | 176 | **0** |
| useState >8 per file | 68 | **<10** |
| `alert()` calls | 80 | **0** |
| Hardcoded `/api/v1/` | 95 | **0** |
| Raw `getApiBaseUrl()` | 63 | **0** |
| Raw `fetch()` | 9 | **0** |
