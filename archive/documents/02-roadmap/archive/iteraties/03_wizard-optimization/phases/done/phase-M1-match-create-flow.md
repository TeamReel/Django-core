# Phase M1 -- Match Create Flow

**Track:** M (Modal Migratie)
**Status:** Todo
**Effort:** Medium (2 sessies)
**Vereist:** E1 afgerond
**Migreert:** `pages/identity/MatchCreateModal.tsx` (389 regels)

---

## Doel

De MatchCreateModal migreren naar een sub-flow binnen de CreateWizard. De gebruiker kan via de + knop "Match aanmaken" kiezen en het formulier invullen als wizard-stappen in dezelfde BottomSheet.

## Huidige MatchCreateModal analyse

**Bestand:** `demo/src/pages/identity/MatchCreateModal.tsx` (389 regels)

### Velden
| Veld | Type | Vereist | Bron |
|------|------|--------|------|
| Organisatie | Select (cascading) | Ja | API: organisations |
| Club | Select (cascading) | Ja | API: club projects |
| Team | Select (cascading) | Ja | API: team projects |
| Seizoen | Select (cascading) | Ja | API: periods |
| Competitie | Select (cascading) | Nee | API: child periods |
| Titel | Text input | Ja | Vrij invullen |
| Tegenstander | Text input | Ja | Vrij invullen |
| Datum | Date picker | Ja | - |
| Tijd | Time picker | Nee | - |
| Locatie | Text input | Nee | Vrij invullen |

### Dependencies
- `useMatchCreateData` hook -- haalt org/club/team/seizoen/competitie data op
- Cascading selects: club filtert op org, team filtert op club, etc.
- Submit: POST naar activities API

## Wizard Flow Ontwerp

### Stap 1: Context (Team + Seizoen)
- Pre-filled vanuit CreateWizardProvider.prefill
- Cascading selects: Org -> Club -> Team -> Seizoen -> Competitie
- Als alles pre-filled: toon als samenvatting met "Wijzig" knop
- Skip-logica: als team + seizoen al bekend, ga direct naar stap 2

### Stap 2: Match Details
- Tegenstander (text input, autocomplete op eerdere tegenstanders)
- Datum + tijd (date/time picker)
- Locatie (text input, autocomplete op eerdere locaties)
- Titel wordt auto-gegenereerd: "[Team] vs [Tegenstander]"

### Stap 3: Bevestiging
- Samenvatting van alle ingevulde velden
- "Aanmaken" knop
- Na succes: optie "Match bekijken" of "Content genereren voor deze match"

## Taken

### 1. MatchCreateFlow component
- [ ] `components/CreateWizard/flows/MatchCreateFlow.tsx`
- [ ] 2-3 WizardStep componenten
- [ ] Hergebruik `useMatchCreateData` hook (bestaand)

### 2. Stap-componenten
- [ ] `steps/MatchContextStep.tsx` -- team/seizoen selectie met pre-fill
- [ ] `steps/MatchDetailsStep.tsx` -- tegenstander, datum, locatie
- [ ] `steps/MatchConfirmStep.tsx` -- samenvatting + submit

### 3. State management
- [ ] Match create state in CreateWizardProvider
- [ ] Validatie per stap (next knop disabled tot vereiste velden ingevuld)

### 4. Post-create actie
- [ ] Na succesvol aanmaken: toon opties
  - "Match bekijken" -> navigeer naar match detail
  - "Content genereren" -> switch naar content flow met deze match pre-filled
  - "Nog een match" -> reset form

### 5. Verificatie
- [ ] Pre-fill vanuit team-pagina: team + seizoen auto-ingevuld
- [ ] Cascading selects werken correct
- [ ] Submit maakt match aan via API
- [ ] Post-create "Content genereren" opent content flow
## Backend Integratie

Zie ook: [backend-integratie.md](../../../wizard-optimization/backend-integratie.md#1-activity-match)

### API Endpoint
```
POST /api/v1/activities/
```

### POST Body
```json
{
  "project_id": 123,
  "period_id": "uuid",
  "title": "Heren 1 vs FC Tegenstander",
  "activity_type": "match",
  "start_time": "2026-03-14T14:30:00+01:00",
  "end_time": "2026-03-14T16:30:00+01:00",
  "location": "Sportpark De Toekomst",
  "metadata": { "venue": "home", "is_home": true }
}
```

### FK-chain (moet bestaan voor submit)
```
Organisation -> Project (team) -> Period (seizoen/competitie) -> Activity
```

### Velden die de wizard auto-genereert
| Veld | Logica |
|------|--------|
| `title` | Auto: "[Team] vs [Tegenstander]" |
| `activity_type` | Hardcoded: `"match"` |
| `end_time` | Default: `start_time + 2 uur` (gebruiker kan aanpassen) |
| `slug` | Backend auto-genereert in `Activity.save()` |
| `created_by` | Backend inject vanuit `request.user` |

### Validatie (backend)
- `end_time > start_time` (serializer + DB CheckConstraint)
- Period's org moet matchen met project's org
- Soft warning als datum buiten period range valt (blokkeert niet)

### Permissies
- `match.create` op target project (RBAC)
- Fallback: `match.create` op parent project (club admin)

### Side effects
- AuditEvent `activity.created` (post_save signal)
- Slug auto-gegenereerd

### Error handling in wizard
| Status | Betekenis | Actie |
|--------|-----------|-------|
| 201 | Aangemaakt | Success -> doorlink opties |
| 400 | Validatie | Inline error per veld |
| 403 | Geen rechten | "Je hebt geen rechten om matches aan te maken" |

---
## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/components/CreateWizard/flows/MatchCreateFlow.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/MatchContextStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/MatchDetailsStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/MatchConfirmStep.tsx` |
| REF | `demo/src/pages/identity/MatchCreateModal.tsx` (behouden als fallback) |
