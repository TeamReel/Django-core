# Phase P3 -- Keyboard + Accessibility

**Track:** P (Polish)
**Status:** Todo
**Effort:** Klein (1 sessie)
**Vereist:** E1 afgerond

---

## Doel

De CreateWizard is volledig bruikbaar met keyboard en voldoet aan WCAG 2.1 AA. Focus management, ARIA labels, en keyboard shortcuts.

## Focus Management

| Gebeurtenis | Focus gedrag |
|------------|-------------|
| Wizard opent | Focus naar eerste interactieve element |
| Volgende stap | Focus naar eerste veld van nieuwe stap |
| Terug stap | Focus naar "Volgende" knop (of laatst actieve element) |
| Modal/sheet opent | Focus trap binnen de sheet |
| Modal/sheet sluit | Focus terug naar + knop in MobileBottomNav |

## ARIA

### BottomSheet
```html
<div role="dialog" aria-modal="true" aria-label="Nieuw aanmaken">
```

### Stap-navigatie
```html
<nav aria-label="Wizard stappen">
  <ol>
    <li aria-current="step">Stap 1: Keuze</li>
    <li>Stap 2: Details</li>
  </ol>
</nav>
```

### Keuze-kaarten
```html
<button role="option" aria-selected="false" aria-label="Content genereren">
```

## Keyboard Shortcuts

| Toets | Actie |
|-------|-------|
| Escape | Sluit wizard (met bevestiging als unsaved) |
| Enter | Submit huidige stap / selecteer optie |
| Tab | Navigeer door velden |
| Shift+Tab | Navigeer terug door velden |

## Taken

### 1. Focus management
- [ ] Auto-focus bij stap-wisseling
- [ ] Focus trap in BottomSheet
- [ ] Focus restore bij sluiten

### 2. ARIA attributen
- [ ] `role="dialog"` + `aria-modal` op BottomSheet
- [ ] `aria-label` op alle interactieve elementen
- [ ] `aria-current="step"` op actieve stap
- [ ] `aria-live="polite"` voor status updates (loading, success, error)

### 3. Keyboard navigatie
- [ ] Escape handler (met unsaved-state check)
- [ ] Enter op keuze-kaart selecteert flow
- [ ] Tab-volgorde is logisch per stap

### 4. Screen reader support
- [ ] Stap-aankondiging bij navigatie: "Stap 2 van 4: Match details"
- [ ] Success/error meldingen via aria-live
- [ ] Alt-text op icons in keuze-stap

### 5. Verificatie
- [ ] Volledige flow alleen met keyboard doorlopen
- [ ] VoiceOver (Mac) of NVDA (Windows) test
- [ ] Geen focus-verlies bij stap-wisseling
- [ ] Escape sluit wizard correct

## Bestanden

| Actie | Bestand |
|-------|---------|
| WIJZIG | `demo/src/components/Wizard/WizardShell.tsx` (focus trap, ARIA) |
| WIJZIG | `demo/src/components/Wizard/WizardStep.tsx` (focus management) |
| WIJZIG | `demo/src/components/CreateWizard/steps/ChooseFlowStep.tsx` (keyboard nav) |
| WIJZIG | Alle step-componenten (ARIA labels) |
