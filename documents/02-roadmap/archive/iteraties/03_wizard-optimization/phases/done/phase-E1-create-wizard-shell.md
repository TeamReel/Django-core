# Phase E1 -- CreateWizard Shell + Keuze-stap

**Track:** E (Entry)
**Status:** Todo
**Effort:** Medium (2-3 sessies)
**Vereist:** F1 afgerond
**Blokkert:** E2, C1, C3, M1-M4

---

## Doel

Bouw de CreateWizard: een universele wrapper die via de `+` knop opent en de gebruiker laat kiezen WAT ze willen aanmaken (content, match, lid, team, seizoen). Gebruikt het bestaande generic Wizard systeem (WizardProvider + WizardShell).

## Architectuur

```
CreateWizardProvider (domain state)
  WizardProvider (navigation)
    WizardShell (BottomSheet)
      Step 0: Keuze-stap (5 opties)
      Step 1+: Per keuze een sub-flow
```

### Keuze-stap (Step 0) -- opties

| Optie | Icon | Label | Sub-flow |
|-------|------|-------|----------|
| Content genereren | Sparkles | Content | -> C3 (MatchWizardV2 flow) |
| Match aanmaken | Calendar | Match | -> M1 (MatchCreateFlow) |
| Lid toevoegen | UserPlus | Lid | -> M2 (MemberAddFlow) |
| Team aanmaken | Users | Team | -> M3 (ProjectCreateFlow) |
| Seizoen aanmaken | CalendarDays | Seizoen | -> M4 (PeriodCreateFlow) |

Alle icons komen uit `lucide-react` en worden al gebruikt in de app.

### Dual-Context Pattern (bewezen in MatchWizardV2)

```tsx
// CreateWizardProvider.tsx -- domain state
interface CreateWizardState {
  selectedFlow: 'content' | 'match' | 'member' | 'team' | 'season' | null;
  // Context die vanuit de pagina meegeven wordt
  prefill: {
    organisationId?: string;
    clubProjectId?: string;
    teamProjectId?: string;
    periodId?: string;
    activityId?: string;
  };
}

// WizardProvider -- navigation (bestaand, hergebruiken)
```

## Taken

### 1. CreateWizardProvider bouwen
- [ ] `components/CreateWizard/CreateWizardProvider.tsx` -- domain state + actions
- [ ] State: `selectedFlow`, `prefill`, `formData` per flow-type
- [ ] Actions: `selectFlow()`, `setPrefill()`, `resetFlow()`

### 2. Keuze-stap component
- [ ] `components/CreateWizard/steps/ChooseFlowStep.tsx`
- [ ] Grid/lijst van 5 opties met icon + label
- [ ] Klik selecteert flow en navigeert naar sub-flow stap 1
- [ ] Context-aware: pre-fill hint tonen (bv. "Match voor Heren 1 -- Eredivisie")

### 3. CreateWizard wrapper
- [ ] `components/CreateWizard/CreateWizard.tsx` -- entry component
- [ ] Props: `isOpen`, `onClose`, `prefill?`
- [ ] Rendert: `CreateWizardProvider` > `WizardProvider` > `WizardShell`
- [ ] Steps dynamisch op basis van `selectedFlow`

### 4. Barrel export
- [ ] `components/CreateWizard/index.ts`

### 5. MobileBottomNav integratie
- [ ] `MatchWizardV2` vervangen door `CreateWizard`
- [ ] Context doorgeven vanuit huidige route (org/club/team/match)

### 6. Verificatie
- [ ] `npx tsc --noEmit` -- geen type errors
- [ ] Handmatig: + opent keuze-stap met 5 opties
- [ ] Handmatig: terug-knop vanuit sub-flow gaat naar keuze-stap

## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/components/CreateWizard/CreateWizardProvider.tsx` |
| NIEUW | `demo/src/components/CreateWizard/CreateWizard.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/ChooseFlowStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/index.ts` |
| WIJZIG | `demo/src/components/MobileBottomNav.tsx` |

## Referentie

- Generic Wizard: `demo/src/components/Wizard/` (WizardProvider, WizardShell, WizardStep, WizardFooter)
- MatchWizardV2: `demo/src/components/MatchWizardV2/` (voorbeeld dual-context pattern)
