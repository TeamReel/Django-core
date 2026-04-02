# 08-FE — Modal & Wizard Refactoring

| | |
|---|---|
| Status | 📋 TODO |
| Categorie | Frontend (Refactoring) |
| Impact | 🔴 critical |
| Effort | ~40 uur |
| Prefix | FE- |

## Wat

Volledige opruiming van de modal-, wizard- en sheet-architectuur in de React frontend (`demo/src/`). De codebase bevat **87 overlay-componenten** waarvan ~30 duplicaten, inconsistente patterns, en dead code.

## Waarom nu

Elke nieuwe feature die een modal of wizard nodig heeft, leidt tot verwarring: welke pattern gebruik je? Welke component pak je? Het resultaat is copy-paste en nóg meer duplicaten. Dit moet opgeruimd worden vóór nieuwe feature-ontwikkeling.

## Inventaris (huidige staat)

| Categorie | Aantal | Probleem |
|-----------|--------|----------|
| Shared infra (Modal, Sheet, Wizard) | 10 | ✅ Goed opgezet, maar te weinig gebruikt |
| Identity modals | 25+ | 🔴 Geen enkele gebruikt shared `Modal` — allemaal eigen overlay |
| Member edit modals | 3 | 🔴 3x bijna-identieke modal (`MembershipEditModal`, `EditMemberModal`, `CompetitionMembershipEditModal`) |
| Follow-up modals | 3 | 🟡 Dubbel: approvals-page + navbar variant |
| Match preview modals | 4 | 🟡 2x dubbel (`ContentPreviewModal` + `SavedAssetPreviewModal` in 2 locaties) |
| Wizards | 5 | 🟡 v1 is dead code, OnboardingWizard niet op shared system |
| Dead code | ~15 files | 🔴 MatchWizard v1 (10+ files), AddMemberWizard example |

## Gefaseerd plan

| Fase | Naam | Scope | Effort | Impact |
|------|------|-------|--------|--------|
| R1 | Dead code opruimen | Verwijder MatchWizard v1, AddMemberWizard, dubbele MatchModals | ~4u | 🟢 Laag risico |
| R2 | Identity modals → shared Modal | Migreer 25+ identity modals naar `ui/Modal` | ~12u | 🔴 Grootste winst |
| R3 | Member edit modals consolideren | 3 modals → 1 generieke `MemberRoleEditModal` | ~6u | 🟡 3→1 |
| R4 | Wizard cleanup | OnboardingWizard → shared Wizard, opruimen steps | ~6u | 🟡 Consistentie |
| R5 | Follow-up & preview modals consolideren | 3 follow-up → 1, 4 preview → 2 | ~6u | 🟡 Minder duplicaten |
| R6 | Orchestrator pattern standaardiseren | Unified modal state management per pagina | ~6u | 🟢 Consistentie |

## Acceptatiecriteria

- [ ] Zero dead code modals/wizards in de codebase
- [ ] Alle modals gebruiken shared `Modal` of `NavigationSheet` infra
- [ ] Geen dubbele modal-implementaties voor dezelfde functionaliteit
- [ ] Alle wizards gebruiken shared `WizardProvider` + `WizardShell`
- [ ] Consistent orchestrator pattern per pagina
- [ ] `npx tsc --noEmit` + `npx vite build` slagen
- [ ] Bestaande Playwright E2E tests blijven groen
- [ ] WCAG 2.1 AA: focus trap, Escape-key, aria-labels op alle modals

## Sub-fases

Zie individuele specs in `phases/`:
- `R1-dead-code-cleanup.md`
- `R2-identity-modals-migration.md`
- `R3-member-edit-consolidation.md`
- `R4-wizard-cleanup.md`
- `R5-followup-preview-consolidation.md`
- `R6-orchestrator-standardisation.md`
