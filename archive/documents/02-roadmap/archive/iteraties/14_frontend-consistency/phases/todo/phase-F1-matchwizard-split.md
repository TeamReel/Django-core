# F1 — MatchWizard Split

**Status:** 🔲 Todo
**Track:** F — File Splitting
**Effort:** 2 uur
**Dependencies:** Geen

---

## Doel

Split `MatchWizard.tsx` (435 regels) naar component <300 regels met step components apart.

## Huidige Staat

```
demo/src/components/MatchWizard.tsx — 435 regels
├── MatchWizard component
├── Step 1: Match type selection
├── Step 2: Team selection
├── Step 3: Match details
├── Step 4: Opponent
└── Step 5: Confirmation
```

Alle wizard steps zitten in 1 file, wat het moeilijk maakt om te navigeren en onderhouden.

## Target

```
demo/src/components/MatchWizard/
├── index.tsx — Main wizard orchestrator (~150 regels)
├── MatchTypeStep.tsx — Step 1
├── TeamSelectionStep.tsx — Step 2
├── MatchDetailsStep.tsx — Step 3
├── OpponentStep.tsx — Step 4
├── ConfirmationStep.tsx — Step 5
├── useMatchWizardState.ts — State management
└── types.ts — Shared types
```

## Acties

1. [ ] Creëer `MatchWizard/` folder
2. [ ] Extract wizard state naar `useMatchWizardState.ts`
3. [ ] Extract elk step naar apart component
4. [ ] Houd `MatchWizard/index.tsx` als orchestrator
5. [ ] Update imports in consumers
6. [ ] Verwijder oude `MatchWizard.tsx`

## Verificatie

- [ ] Geen file >300 regels
- [ ] Wizard werkt identiek
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
