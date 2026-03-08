# Phase P1 -- Animaties + Transities

**Track:** P (Polish)
**Status:** Todo
**Effort:** Klein (1 sessie)
**Vereist:** E1 + minimaal 1 sub-flow afgerond

---

## Doel

Soepele transities tussen wizard-stappen en flows, zodat de CreateWizard aanvoelt als een native app in plaats van een formulier.

## Transities

### Stap-overgang (binnen een flow)
- **Richting:** slide-left bij "Volgende", slide-right bij "Terug"
- **Duur:** 200-250ms
- **Easing:** ease-out
- **Implementatie:** CSS transform + opacity, of framer-motion als al in gebruik

### Flow-switch (keuze-stap -> sub-flow)
- **Effect:** fade + scale-in (subtiel, 150ms)
- **Reden:** visueel onderscheid tussen "kiezen" en "invullen"

### BottomSheet open/close
- **Open:** slide-up van onderaf, 250ms
- **Close:** slide-down, 200ms (iets sneller voelt responsive)
- **Backdrop:** fade-in 150ms

### Keuze-stap kaarten
- **Hover/press:** subtle scale (1.02) + shadow elevation
- **Geselecteerd:** accent border + check icon

## Taken

### 1. Stap-transitie component
- [ ] `components/Wizard/WizardTransition.tsx` (of uitbreiding van WizardShell)
- [ ] Detecteer navigatie-richting (forward/backward)
- [ ] CSS transition of framer-motion AnimatePresence
- [ ] Geen layout shift tijdens transitie

### 2. BottomSheet polish
- [ ] Slide-up/down animatie verfijnen
- [ ] Gesture: swipe-down om te sluiten (als nog niet geimplementeerd)
- [ ] Backdrop click om te sluiten (met bevestiging als unsaved state)

### 3. Keuze-stap interactie
- [ ] Press-state feedback op kaarten
- [ ] Ripple of scale effect

### 4. Verificatie
- [ ] Transities voelen soepel, geen jank
- [ ] Terug-navigatie heeft omgekeerde animatie
- [ ] Geen flicker bij snelle navigatie

## Bestanden

| Actie | Bestand |
|-------|---------|
| WIJZIG | `demo/src/components/Wizard/WizardShell.tsx` |
| NIEUW/WIJZIG | `demo/src/components/Wizard/WizardTransition.tsx` |
| WIJZIG | `demo/src/components/CreateWizard/steps/ChooseFlowStep.tsx` |
