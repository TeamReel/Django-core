# 299 — F15 — Frontend Form Components

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Frontend (UI Components) |
| Impact | 🟡 important |
| Effort | ~20 uur |

## Wat

Advanced form components: multi-step wizards met progress indicator en step-validatie, conditional fields (toon/verberg op basis van waarden), auto-save met debounce, file upload velden (drag-drop), en rich text velden. Alles met client-side validatie via Zod schemas en server-side error mapping.

## Waarom belangrijk

Complexe formulieren zijn overal in TeamReel: onboarding flows, team-instellingen, content configuratie, member registratie. Zonder goede form components wordt elke pagina een custom implementatie. Multi-step wizards en auto-save verbeteren de UX drastisch voor niet-technische clubvrijwilligers.

## Past in TeamReel / CoreApp

- **TeamReel**: Onboarding van een club vereist 5+ stappen (club info, team setup, branding, eerste leden). Content generatie heeft een wizard met template keuze, parameters, preview. Dit alles vereist goede form components.
- **CoreApp**: Form components zijn universeel — elk SaaS-product met user input heeft multi-step forms, validatie en auto-save nodig. Als shared package bruikbaar voor elk project.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=F15-frontend-form-components

We bouwen advanced form components voor de React 18 + TypeScript frontend.

[feature summary]
Multi-step wizard, conditional fields, auto-save, file upload, en rich text form components met Zod validatie.

[goals]
- MultiStepForm wizard met progress bar, step validatie, 10+ stappen support
- ConditionalFields: show/hide velden op basis van form values
- AutoSaveForm: debounced auto-save (max 1x per 2 seconden)
- FileUploadField: drag-drop via bestaande file API
- Client-side validatie via Zod schemas
- Server-side error mapping (API errors → form field errors)
- Accessibility: keyboard navigation, ARIA labels, screen reader support

[non-goals]
- Form builder (drag-and-drop form creation)
- PDF form generation
- Offline form support

[tech context]
- Frontend: React 18, TypeScript, Vite, CSS Modules
- Forms: react-hook-form + @hookform/resolvers + zod
- File upload: bestaande file API (src/files/)
- Design tokens: demo/src/styles/tokens/
```

### Plan

```
/spec-kitty.plan feature=F15-frontend-form-components

[tech choices]
- Forms: react-hook-form (performant, uncontrolled)
- Validatie: zod schemas + @hookform/resolvers/zod
- Auto-save: custom useAutoSave hook met lodash.debounce
- File upload: bestaande upload API wrapper
- Styling: CSS Modules met design tokens

[components to build]
- MultiStepForm — wizard container met step management
- FormStep — individuele step met validatie
- StepProgress — visuele progress indicator
- ConditionalField — wrapper die children toont/verbergt
- AutoSaveForm — form wrapper met debounced save
- FileUploadField — drag-drop upload component
- FormErrorSummary — server-side error display

[files to create]
- demo/src/components/forms/MultiStepForm.tsx + .module.css
- demo/src/components/forms/FormStep.tsx
- demo/src/components/forms/StepProgress.tsx + .module.css
- demo/src/components/forms/ConditionalField.tsx
- demo/src/components/forms/AutoSaveForm.tsx
- demo/src/components/forms/FileUploadField.tsx + .module.css
- demo/src/hooks/useAutoSave.ts
- demo/src/hooks/useMultiStepForm.ts
```

### Research

```
/spec-kitty.research feature=F15-frontend-form-components

Onderzoek de volgende punten:

1. Welke form patterns worden er nu gebruikt in demo/src/? Is react-hook-form al geïnstalleerd?
2. Zijn er al multi-step flows in de app (onboarding, content creation wizard)?
3. Hoe werkt de bestaande file upload implementatie? Welke API endpoints?
4. Welke Zod schemas bestaan er al? Is @hookform/resolvers al geïnstalleerd?
5. Hoe worden server-side validation errors nu afgehandeld in de frontend?
```
