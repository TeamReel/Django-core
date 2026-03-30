# Phase C3 -- Content Flow Integratie (MatchWizardV2 in CreateWizard)

**Track:** C (Content / Smart)
**Status:** Todo
**Effort:** Medium (2-3 sessies)
**Vereist:** C1 + C2 afgerond

---

## Doel

De bestaande MatchWizardV2 flow (template keuze -> customization -> generatie) embedden als sub-flow binnen de CreateWizard. Na match selectie (C1) en fase selectie (C2) neemt de content generatie flow het over.

## Architectuur

De MatchWizardV2 heeft een eigen `MatchWizardProvider` (domain state). Deze wordt genest binnen de `CreateWizardProvider`:

```
CreateWizardProvider (universeel)
  WizardProvider (navigatie)
    WizardShell (BottomSheet)
      Step 0: Keuze (-> "Content genereren")
      Step 1: SmartMatchStep (C1)
      Step 2: PhaseSelectStep (C2)
      Step 3+: MatchWizardV2 steps (bestaand)
        -> TemplateStep
        -> CustomizeStep
        -> GenerateStep
```

### Wat hergebruikt wordt van MatchWizardV2
- `MatchWizardProvider` -- state management voor content generatie
- Alle step-componenten (TemplateStep, CustomizeStep, etc.)
- Hooks (useTemplates, useGeneration, etc.)

### Wat aangepast wordt
- MatchWizardV2 stappen lezen `selectedMatch` uit CreateWizardProvider i.p.v. eigen match selector
- Navigatie gaat via de parent WizardProvider (niet eigen routing)
- "Terug" vanuit TemplateStep gaat terug naar PhaseSelectStep (niet sluiten)

## Taken

### 1. MatchWizardV2 steps ontkoppelen van eigen shell
- [ ] Extract steps als standalone componenten (los van MatchWizardV2 shell)
- [ ] Steps accepteren match + fase als props (niet alleen via eigen context)
- [ ] Behoud backward compatibility: MatchWizardV2 blijft ook standalone werken

### 2. Content sub-flow bouwen
- [ ] `components/CreateWizard/flows/ContentFlow.tsx`
- [ ] Orkestreert: SmartMatchStep -> PhaseSelectStep -> MatchWizardV2 steps
- [ ] Leest/schrijft naar CreateWizardProvider state
- [ ] Initialiseert MatchWizardProvider met geselecteerde match + fase

### 3. CreateWizard registratie
- [ ] `selectedFlow === 'content'` -> laad ContentFlow steps
- [ ] Dynamisch steps toevoegen aan WizardProvider na flow selectie

### 4. Navigatie
- [ ] "Terug" vanuit stap 1 van content flow -> terug naar keuze-stap
- [ ] "Terug" vanuit latere stappen -> vorige stap binnen content flow
- [ ] Sluiten -> bevestiging als er unsaved state is

### 5. Verificatie
- [ ] Content flow: keuze -> match -> fase -> template -> customize -> generate
- [ ] Terug navigatie werkt door hele flow heen
- [ ] Pre-fill: match-detail pagina skipt keuze + match stap
- [ ] Standalone MatchWizardV2 werkt nog (backward compat)

## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/components/CreateWizard/flows/ContentFlow.tsx` |
| WIJZIG | `demo/src/components/MatchWizardV2/` (steps ontkoppelen) |
| WIJZIG | `demo/src/components/CreateWizard/CreateWizardProvider.tsx` |
| WIJZIG | `demo/src/components/CreateWizard/CreateWizard.tsx` |
