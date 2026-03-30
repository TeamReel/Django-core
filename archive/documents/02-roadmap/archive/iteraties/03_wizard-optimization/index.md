# Create Wizard Optimization — Phase Overview

**Status:** Actief
**Gestart:** 2026-03-08
**Laatste update:** 2026-03-08

---

## Doel

De `+` knop in de MobileBottomNav omvormen tot een universele, modulaire create-wizard. Gebruikers kunnen vanuit 1 plek alles aanmaken: content genereren, wedstrijden plannen, leden toevoegen, teams en seizoenen beheren. Alles in 1 BottomSheet met seamless overgangen.

## Huidige staat (problemen)

| Probleem | Detail |
|----------|--------|
| **Twee + knoppen, twee wizards** | MobileBottomNav importeert nog oude `MatchWizard` (v1). QuickCreateFAB gebruikt `MatchWizardV2`. |
| **Scope te smal** | De + opent direct een wedstrijd-content wizard. Niet al het maken is wedstrijd-gebonden. |
| **Geen funnel** | Geen keuze-stap. Direct in een wedstrijdlijst. Geen progressive disclosure. |
| **Geen context-awareness** | Bekijk je een team-pagina, dan zou het team al geselecteerd moeten zijn. |
| **Geen smart defaults** | Wedstrijd over 2 uur? Niet ge-highlight. Na de wedstrijd? Fase-tab staat op "Voor". |
| **Bestaande modals los** | MatchCreateModal, AddMemberModal, ProjectCreateModal, PeriodCreateModal zijn losse modals met eigen UX patterns. |

## Architectuur

### Aanpak: Fat Wizard

Alle create-flows worden uiteindelijk volledige wizard-flows BINNEN het generieke Wizard-systeem (`WizardProvider` + `WizardShell`). Bestaande modals worden gefaseerd omgebouwd naar Wizard-stappen.

```
+ tik (MobileBottomNav)
  |
  CreateWizard (1 BottomSheet, seamless)
  |
  Step 0: "Wat wil je doen?"
  |   Sparkles   Content genereren   --> MatchWizardV2 flow (bestaand)
  |   Calendar   Wedstrijd plannen   --> MatchCreate flow (nieuw uit MatchCreateModal)
  |   UserPlus   Lid toevoegen       --> AddMember flow (nieuw uit AddMemberModal)
  |   Users      Team aanmaken       --> ProjectCreate flow (nieuw uit ProjectCreateModal)
  |   CalendarDays Seizoen aanmaken  --> PeriodCreate flow (nieuw uit PeriodCreateModal)
  |
  Step 1+: Sub-flow stappen (per type)
  |
  Smart context: pre-fill team/seizoen/match op basis van huidige pagina
```

### Dual-context pattern (bewezen in MatchWizardV2)

```
WizardProvider          -- navigatie, steps, progress (generiek)
  CreateWizardProvider  -- domein-state: welk type, context, form data
    WizardShell         -- BottomSheet container
      WizardStep        -- per stap conditional render
```

### Context-awareness

De wizard leest de huidige app-context en vult defaults in:

| Context | Pre-fills |
|---------|-----------|
| Team-pagina | team geselecteerd, club/org auto-resolved |
| Seizoen-pagina | team + seizoen geselecteerd |
| Wedstrijd-pagina | team + seizoen + match geselecteerd, skip naar content type |
| Wedstrijd < 48u | Match auto-highlighted met 1-tap confirm |
| Na wedstrijd start_time | Content fase-tab auto op "Na" ipv "Voor" |
| Dashboard (geen context) | Alles tonen zonder pre-fills |

## Bestaande modals (om te bouwen naar Wizard steps)

| Modal | Regels | Status | Sub-flow stappen nodig |
|-------|--------|--------|------------------------|
| `MatchCreateModal.tsx` | 389 | Actief, apart modal | Type (team/context) -> Form -> Bevestigen |
| `AddMemberModal.tsx` | 456 | Actief, apart modal | Context (team) -> Zoek/Nieuw -> Rol -> Bevestigen |
| `ProjectCreateModal.tsx` | 257 | Actief, apart modal | Org/Club select -> Naam/beschrijving -> Bevestigen |
| `PeriodCreateModal.tsx` | 453 | Actief, apart modal | Org/Club/Team select -> Type/Sport -> Data -> Bevestigen |
| `MatchWizardV2` | ~2400 (totaal) | Actief, al in Wizard | Match -> Content type -> Lineup -> Options -> Review -> Generate |

## Icons per categorie (bestaande lucide-react icons)

| Categorie | Icon | Toelichting |
|-----------|------|-------------|
| Content genereren | `Sparkles` | Al gebruikt voor "Voorbereiden" en AI-generatie door hele app |
| Wedstrijd plannen | `Calendar` | `CalendarDays` in navbar, `Calendar` in match context |
| Lid toevoegen | `UserPlus` | Al gebruikt in LineupStep gast-toevoegen |
| Team aanmaken | `Users` | Consistent met team/squad displays |
| Seizoen aanmaken | `CalendarDays` | `CalendarDays` in navbar voor seizoen-tab |

## Tracks

| Track | Naam | Focus |
|-------|------|-------|
| **F** | Foundation | Bugs fixen, MobileBottomNav updaten, QuickCreateFAB verwijderen |
| **E** | Entry Point | CreateWizard met keuze-stap (Step 0) + context-awareness |
| **C** | Content Flow | Smart match selection, fase auto-select, MatchWizardV2 verbeteringen |
| **M** | Modal Migration | Bestaande modals omzetten naar Wizard steps binnen CreateWizard |
| **P** | Polish | Animaties, transities, recents/shortcuts |

## Fase-overzicht

### Track F -- Foundation (blokkerend)

| Nr | Fase | Wat | Effort |
|----|------|-----|--------|
| F1 | **MobileBottomNav fix** | Import MatchWizard v1 -> v2, verwijder QuickCreateFAB, 1 entry point | Klein |

### Track E -- Entry Point

| Nr | Fase | Wat | Effort |
|----|------|-----|--------|
| E1 | **CreateWizard shell** | CreateWizardProvider + context + keuze-stap Step 0 | Medium |
| E2 | **Context pre-fill** | useAppSelection/useParams lezen, defaults invullen per sub-flow | Medium |

### Track C -- Content Flow

| Nr | Fase | Wat | Effort |
|----|------|-----|--------|
| C1 | **Smart match** | Match < 48u auto-highlight, 1-tap confirm, skip als maar 1 match | Medium |
| C2 | **Fase auto-select** | Content phase-tab op basis van match start_time vs nu | Klein |
| C3 | **Content flow in CreateWizard** | MatchWizardV2 stappen inbedden in CreateWizard (seamless) | Medium |

### Track M -- Modal Migration

| Nr | Fase | Wat | Effort |
|----|------|-----|--------|
| M1 | **MatchCreate flow** | MatchCreateModal (389 ln) omzetten naar Wizard steps | Groot |
| M2 | **AddMember flow** | AddMemberModal (456 ln) omzetten naar Wizard steps | Groot |
| M3 | **ProjectCreate flow** | ProjectCreateModal (257 ln) omzetten naar Wizard steps | Medium |
| M4 | **PeriodCreate flow** | PeriodCreateModal (453 ln) omzetten naar Wizard steps | Groot |

### Track P -- Polish

| Nr | Fase | Wat | Effort |
|----|------|-----|--------|
| P1 | **Transitie-animaties** | Smooth slide-in/fade bij stap-wissels en sub-flow switches | Medium |
| P2 | **Recents & shortcuts** | "Opnieuw genereren" snelkoppelingen in keuze-stap | Klein |
| P3 | **Keyboard & a11y** | Focus management, escape handling, screenreader labels | Klein |

## Volgorde van uitvoering

```
F1                        (bug fix: 1 sessie)
  |
E1 -> E2                  (entry point: 2 sessies)
  |
C1 -> C2 -> C3            (content flow: 2-3 sessies)
  |
M1 -> M2 -> M3 -> M4      (modal migratie: 4-5 sessies)
  |
P1 -> P2 -> P3             (polish: 2 sessies)
```

Track F is **blokkerend** -- de bug moet eerst gefixt.
Track E is **blokkerend** voor M -- modals kunnen pas ingebouwd als de shell er is.
Track C kan **parallel** aan E -- smart match is onafhankelijk van de entry point.

## Backend Integratie

Elk sub-flow maakt entities aan via de Django REST API. De backend heeft specifieke FK-chains, validatie en side effects die de wizard moet respecteren.

Volledig overzicht: [backend-integratie.md](backend-integratie.md)

### FK-chain (volgorde van afhankelijkheid)
```
Organisation -> Project (club) -> Project (team) -> Period (seizoen) -> Period (competitie) -> Activity (match)
                                                                                               -> ActivityParticipation
               -> OrgMembership -> ProjectMembership
```

### Per entity samenvatting

| Entity | Endpoint | Verplichte FKs | Side effects |
|--------|---------|----------------|-------------|
| Activity | `POST /api/v1/activities/` | project_id + period_id | AuditEvent, auto-slug |
| Project | `POST /api/v1/organisations/{slug}/projects/` | org (uit URL) | Club: auto-team + BrandProfile |
| Period | `POST /api/v1/periods/` | organisation_id | AuditEvent |
| Member | 4-staps cascade (user -> org -> club -> team) | user_id + org context | Idempotent cascade |
| Participation | `POST /api/v1/participations/[bulk/]` | member + (activity XOR period) | XOR constraint |

### Wizard implicaties
- Ontbrekende FK? -> Doorlinken naar juiste sub-flow binnen de wizard
- Error 403? -> "Je hebt geen rechten" melding (niet blokkeren op andere flows)
- Club aanmaken triggert auto-team creatie -> wizard moet dit communiceren

## Principes

1. **Progressive disclosure**: breed beginnen, fijnmaziger per stap
2. **1 BottomSheet**: alle flows in dezelfde sheet, geen modal-op-modal
3. **Context-aware defaults**: pre-fill op basis van huidige pagina, toon alles maar hint de juiste keuze
4. **Generiek Wizard systeem**: WizardProvider + WizardShell hergebruiken, domein-context per flow
5. **Seamless transitions**: gebruiker merkt niet dat er van sub-flow gewisseld wordt
6. **Mobiel-eerst**: touch targets >= 44px, safe areas, bottom nav offset
7. **Bestaande icons**: Sparkles, Calendar, UserPlus, Users, CalendarDays (lucide-react)
8. **Iteratief**: eerst werkend, dan mooi. Stubs voor niet-gebouwde flows.
9. **Backend-aware**: wizard kent de FK-chains en valideert of vereiste entities bestaan voor submit

## Aandachtspunten (cross-cutting concerns)

### 1. API Layer -- Twee patronen in de codebase

De bestaande modals gebruiken **raw fetch** via `orgModalHandlers.ts` met handmatige CSRF/headers. Er bestaat ook een `@django-core/api-client` package (`createApiClient`) en een `apiFetch` utility. De wizard moet kiezen:

| Optie | Pro | Con |
|-------|-----|-----|
| `createApiClient` (api-client package) | Typed, error normalizer, CSRF auto-inject | Minder gebruikt in identity pages |
| `apiFetch` (utils/apiFetch.ts) | Drop-in fetch replacement, al breed gebruikt | Geen typed responses |
| Raw fetch (zoals orgModalHandlers) | Copy-paste bestaande code | Meeste boilerplate, inconsistent |

**Aanbeveling:** `createApiClient` voor nieuwe wizard flows. Migreer niet de oude handlers, maar schrijf nieuwe hooks die deze client gebruiken.

### 2. Cache Invalidatie na Create

Na elk succesvol aanmaken moet de wizard caches invalideren zodat lijsten actueel zijn:

```
invalidateFetchAllPagesCache()   -- wist alle gecachte paginated API calls
fetchClubsPage(1)                -- herlaad clubs lijst
fetchTeamsForOrg({ force: true }) -- herlaad teams
fetchFederationCounts(orgId)     -- herlaad tellers
recomputePeriodCounts(periods)   -- herbereken seizoen-tellers
```

Elk sub-flow heeft zijn eigen invalidatie-set. De `orgModalHandlers.ts` bevat de exacte patronen per entity. De wizard moet deze repliceren of centraliseren in een `useInvalidateAfterCreate` hook.

### 3. Optimistic Updates

De bestaande handlers doen optimistic state updates (entity toevoegen aan lijst VOOR server-response). De wizard moet dit patroon voortzetten:

1. Submit API call
2. Bij success: voeg entity toe aan lokale state (optimistic)
3. Background: invalideer caches + refetch
4. Bij error: rollback optimistic update

### 4. Credits Systeem (Content Flow)

AI content generatie kost credits. De `GenerationCreditService` (backend) doet:
- **Reserve** credits bij submit (reserveert geschatte kosten)
- **Settle** bij completion (verrekent werkelijke kosten)
- **Refund** bij cancel/failure

De content flow (C3) moet:
- [ ] Credits-saldo tonen voor generatie start
- [ ] `InsufficientCreditsException` afhandelen met duidelijke melding
- [ ] Na generatie: bijgewerkt saldo tonen

### 5. Desktop vs Mobile UX

De BottomSheet (design-system package) is mobile-first maar heeft responsive gedrag:
- Mobile (< 640px): full-height sheet met safe area offsets, drag-to-dismiss
- Desktop (>= 640px): `max-height: 90vh`, centered sheet, geen drag

De WizardShell gebruikt al de BottomSheet. Geen extra werk nodig, maar test op desktop dat:
- Kaarten in keuze-stap niet te breed worden (max-width nodig)
- Cascading selects niet buiten viewport vallen
- Keyboard navigatie werkt (geen touch-only patterns)

### 6. Migratiestrategie voor Bestaande Modals

De oude modals (MatchCreateModal, etc.) worden NIET verwijderd totdat de wizard-equivalent volledig werkt:

```
Fase 1: Wizard flow bouwen (naast bestaande modal)
Fase 2: Feature flag: wizard vs modal (A/B test)
Fase 3: Modal deprecated, wizard is default
Fase 4: Modal verwijderen (cleanup)
```

Plekken die de oude modals openen (identity page, team detail, etc.) moeten in Fase 1 ongewijzigd blijven. Alleen de + knop schakelt over.

### 7. Testing Strategie

| Type | Wat | Tool |
|------|-----|------|
| Unit | Hooks (useSmartMatch, useMatchPhase, useCreateContext) | Vitest |
| Component | Wizard steps (render, validatie, navigatie) | Vitest + Testing Library |
| Integration | Volledige flow (keuze -> sub-flow -> submit -> success) | Playwright |
| E2E | + knop -> wizard -> API call -> entity aangemaakt | Playwright |

Per fase-doc: minimaal 1 happy path + 1 error path test.

### 8. State Persistentie (Draft-saving)

Als de gebruiker halverwege de wizard sluit (per ongeluk of bewust):
- **Optie A**: State verliezen (simpel, huidige situatie)
- **Optie B**: Draft opslaan in sessionStorage, herstellen bij heropenen

**Aanbeveling:** Start met A. Als gebruikers klagen over verloren input, implementeer B in een P-track fase.

## Effort

~12-14 sessies totaal (F: 1, E: 2, C: 3, M: 5, P: 2).
