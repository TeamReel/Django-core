# 342 — F30 Codebase Refactoring & Repository Hygiene

| | |
|---|---|
| Status | 📐 READY |
| Type | Feature (cross-cutting) |
| Impact | 🔴 Kritiek — blokkade voor efficiënt doorontwikkelen |
| Effort | ~42 uur |

## Doel

De volledige codebase opschonen, herstructureren en documentatie actualiseren zodat we vanuit een schone, goed georganiseerde basis kunnen doorontwikkelen. Dit omvat: repository root, roadmap-structuur, `.github/`-configuratie, frontend, backend en documentatie.

## Huidige staat

### Repository root — 🔴 Rommelig
- **~336 screenshot-bestanden** (PNG/JPEG) in de root
- **~21 debug Python scripts** (`check_*.py`, `diagnose_*.py`, `fix_*.py`)
- **~20 log/output bestanden** (`test-*.txt`, `tmp_*.txt`, `brand_results.txt`)
- **~50 test-output folders** (`review-*`, `e2e-*`, `f29-*`, `deploy-*`)
- `kitty-specs/` folder met legacy specs die niet meer gebruikt worden
- Root bevat ~420 losse bestanden, moet terug naar ~60

### Roadmap structuur — 🟡 Inconsistent
- **Duplicaten**: 338-F26 staat in zowel `ready/` als `active/`, 315-B64 in `active/` en `done/`
- **Nummerconflict**: twee modules met nummer 341-F29
- **Q-series inconsistentie**: done/ Q-items staan in `done/` root i.p.v. `quick/done/`
- **79 backlog items** waarvan veel Q-items die eigenlijk in `quick/` horen
- `documents/02-roadmap/done/` folder bestaat naast `modules/done/` — verwarrend

### .github/ configuratie — 🟡 Stale referenties
- `debug.prompt.md` verwijst naar niet-bestaande `debugger.agent.md`
- `refactor.prompt.md` verwijst naar niet-bestaande `refactoring.agent.md`
- `copilot-instructions.md` (1124 regels) bevat verouderde agent-referenties
- `spec-kitty/` prompts mogelijk niet meer in gebruik

### Frontend — 🟡 Technische schuld
- **~80 `as any` casts** in productie-code (buiten tests)
- **3 mega CSS-bestanden**: CreateWizard (1453 LOC), TopNavbar (873), ApprovalsPage (794)
- **Orphaned bestanden**: HeroBanner.tsx + HeroBanner.module.css (niet meer geïmporteerd)
- **Grote hooks**: useTopNavbarData (503), useCreditsData (497), useUsersData (491)

### Backend — 🟡 Test coverage
- Slechts **8 van 27 apps** hebben tests
- Grote serializer-bestanden (activities 500+, organisations 500+)
- 76 TODO/FIXME comments

### Documentatie — 🟡 Verouderd
- `05-demo/` docs reflecteren niet de recente features (match logos, team hub refactor)
- `ai-context-index.md` is niet bijgewerkt na recente wijzigingen
- Sommige feature docs beschrijven code die niet meer bestaat

## Design beslissingen

| Beslissing | Keuze | Reden |
|-----------|-------|-------|
| Root cleanup approach | Batch-move naar `archive/` | Veilig, reversibel, geen bestanden kwijt |
| Roadmap deduplicatie | Canonical locatie = hoogste status | active > ready > backlog |
| Q-items locatie | Q-items in `quick/`, afgeronde Q naar `done/` | Consistent met module lifecycle |
| .github stale refs | Verwijder broken referenties, fix prompts | Minder verwarring voor AI agents |
| `any` type eliminatie | Top 4 bestanden eerst | Meeste impact per tijdsinvestering |
| Mega CSS split | Per component/sectie | Betere co-locatie, makkelijker te onderhouden |
| Orphaned code | Verwijderen + barrel export updaten | Kleinere bundle, minder verwarring |
| Backend test priority | branding, files, transactions, credits, medialib | Meest gebruikte apps zonder tests |

## Fasering

| Fase | Titel | Effort | Status |
|------|-------|--------|--------|
| H0 | Repository root opschonen | ~2 uur | ✅ Done |
| H1 | Roadmap structuur fixen | ~2 uur | ✅ Done |
| H2 | .github/ configuratie opschonen | ~2 uur | ✅ Done |
| H3 | Frontend refactoring (orphans + any elimination) | ~6 uur | ✅ Done |
| H4 | Backend optimalisatie | ~4 uur | 📋 Todo |
| H5 | Documentatie actualiseren | ~4 uur | 📋 Todo |
| H6 | CSS Design Token Migration | ~10 uur | 📋 Todo |
| H7 | Type Consolidatie (User + Project) | ~5 uur | 📋 Todo |
| H8 | API Response Typing | ~4 uur | 📋 Todo |
| H9 | Accessibility & Conventions Cleanup | ~3 uur | 📋 Todo |

## Acceptatiecriteria

- [x] Repository root bevat max 60 bestanden (geen screenshots, debug scripts, logs)
- [x] Geen duplicaten in roadmap modules (elke module op exact één locatie)
- [x] Alle .github/ agent/prompt referenties wijzen naar bestaande bestanden
- [x] Geen orphaned TSX/CSS bestanden in frontend
- [x] `as any` gereduceerd van ~80 naar <30 in productie-code
- [ ] Geen CSS-bestanden >800 LOC (exclusief tokens.css)
- [ ] Test coverage voor branding, files, transactions, credits, medialib
- [ ] `ai-context-index.md` reflecteert huidige codebase staat
- [x] `npx tsc --noEmit` + `npx vite build` slagen zonder nieuwe fouten
- [ ] `pytest` slaagt zonder fouten
- [ ] 0 hardcoded colors/font-sizes/spacing in CSS Modules (design tokens only)
- [ ] Exact 1 `Project` interface, exact 1 `User` interface in de codebase
- [ ] 0 `api.get<any>` / `api.list<any>` calls — alle API responses getypt
- [ ] Alle icon-only buttons hebben `aria-label`
- [ ] 0 emoji in UI tekst
- [ ] `eslint-disable` comments ≤ 4
