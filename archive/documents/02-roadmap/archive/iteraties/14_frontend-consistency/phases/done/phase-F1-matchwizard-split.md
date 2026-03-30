# F1 — MatchWizard Split

**Status:** ✅ Done
**Track:** F — File Splitting
**Effort:** 2 uur
**Dependencies:** Geen
**Afgerond:** 2026-06-18

---

## Doel

Split `MatchWizard.tsx` (461 regels) naar orchestrator <300 regels met step components apart.

## Aanpak

4 nieuwe step components geëxtraheerd (co-located in `demo/src/components/`). State, types, en `MatchWizardLineupStep` waren al apart — alleen de JSX render-blocks misten.

## Wat Gedaan

### `MatchStep.tsx` (nieuw)
Renderblok voor **Step 1: match selectie** — error state, loading, lege lijst, match kaarten.

### `ContentStep.tsx` (nieuw)
Renderblok voor **Step 2: content type** — fase tabs (Voor/Tijdens/Na met icons), sjablonen error state, content type kaarten.

### `OptionsStep.tsx` (nieuw)
Renderblok voor **Step 4: opties** — twee varianten:
- Lineup opties (formation, closeup style, animation, background) → delegeert naar `MembersStep`
- Type-specifieke config (flyer, goal score, match summary) → delegeert naar `ConfirmStep`

### `ReviewStep.tsx` (nieuw)
Renderblok voor **Step 5: review & bevestig** — preview, inhoud label, samenvatting kaart, genereer knop.

### `MatchWizard.tsx` (refactored)
Van 461 → **222 regels**. Puur orchestrator: BottomSheet wrapper + header + step routing via conditionals.

## Verificatie

- ✅ MatchWizard.tsx: 222 regels (< 300 ✅)
- ✅ Geen TypeScript errors in alle 5 bestanden
- ✅ Bestaande imports naar `MatchWizard` werken ongewijzigd (default export blijft)
