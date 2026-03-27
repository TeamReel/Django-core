# Phase M4 -- Seizoen/Periode Create Flow

**Track:** M (Modal Migratie)
**Status:** Todo
**Effort:** Medium (2 sessies)
**Vereist:** E1 afgerond
**Migreert:** `pages/identity/PeriodCreateModal.tsx` (453 regels)

---

## Doel

De PeriodCreateModal migreren naar een sub-flow binnen de CreateWizard. De gebruiker kan via de + knop "Seizoen aanmaken" kiezen en een seizoen/competitie aanmaken.

## Huidige PeriodCreateModal analyse

**Bestand:** `demo/src/pages/identity/PeriodCreateModal.tsx` (453 regels)

### Velden
| Veld | Type | Vereist |
|------|------|--------|
| Organisatie | Select (cascading) | Ja |
| Club | Select (cascading) | Ja |
| Team | Select (cascading) | Ja |
| Naam | Text | Ja |
| Type | Select (seizoen/competitie) | Ja |
| Bovenliggend seizoen | Select | Nee (alleen bij competitie) |
| Sport variant | Select | Nee |
| Startdatum | Date | Ja |
| Einddatum | Date | Ja |

### Hierarchie
- Seizoen (top-level period, `parent_period` = null)
- Competitie (child period, `parent_period` = seizoen)

## Wizard Flow Ontwerp

### Stap 1: Context (Team)
- Pre-filled vanuit CreateWizardProvider.prefill
- Cascading: Org -> Club -> Team
- Skip als team al bekend

### Stap 2: Type + Seizoen
- Type selectie: "Seizoen" of "Competitie"
- Als competitie: selecteer bovenliggend seizoen
- Smart default: als er geen seizoen bestaat voor komend jaar, suggereer "2025/26"

### Stap 3: Details
- Naam (auto-suggest: "[Sport] [Jaar/Jaar]" voor seizoen, "[Competitienaam]" voor competitie)
- Start- en einddatum
- Sport variant (als team er een heeft, pre-fill)

### Stap 4: Bevestiging
- Samenvatting
- Na succes: "Seizoen bekijken" / "Match plannen" / "Nog een competitie"

## Taken

### 1. PeriodCreateFlow component
- [ ] `components/CreateWizard/flows/PeriodCreateFlow.tsx`

### 2. Stap-componenten
- [ ] `steps/PeriodContextStep.tsx` -- team selectie
- [ ] `steps/PeriodTypeStep.tsx` -- seizoen vs competitie + parent seizoen
- [ ] `steps/PeriodDetailsStep.tsx` -- naam, datums, sport variant
- [ ] `steps/PeriodConfirmStep.tsx` -- samenvatting + submit

### 3. Smart defaults
- [ ] Naam suggestie op basis van type + sport + jaar
- [ ] Datums suggestie: sep-jun voor seizoen, configureerbaar voor competitie
- [ ] Sport variant: overnemen van team als beschikbaar

### 4. Post-create doorlink
- [ ] "Match plannen" -> switch naar MatchCreateFlow met seizoen pre-filled
- [ ] "Nog een competitie" -> reset, behoud seizoen als parent

### 5. Verificatie
- [ ] Seizoen aanmaken: naam, datums, submit
- [ ] Competitie aanmaken: parent seizoen selectie werkt
- [ ] Pre-fill vanuit team-pagina
- [ ] Post-create doorlink naar match flow
## Backend Integratie

Zie ook: [backend-integratie.md](../../../wizard-optimization/backend-integratie.md#3-period-seizoencompetitie)

### API Endpoint
```
POST /api/v1/periods/
```

### POST Body (Seizoen)
```json
{
  "organisation_id": "uuid",
  "project_id": 123,
  "parent_period_id": null,
  "name": "Seizoen 2026/27",
  "start_date": "2026-09-01",
  "end_date": "2027-06-30",
  "metadata": { "type": "season" }
}
```

### POST Body (Competitie)
```json
{
  "organisation_id": "uuid",
  "project_id": 123,
  "parent_period_id": "seizoen-uuid",
  "name": "Eredivisie",
  "start_date": "2026-09-01",
  "end_date": "2027-06-30",
  "sport_id": 1,
  "metadata": { "type": "competition" }
}
```

Let op: `organisation_id` zit WEL in de POST body (anders dan Project!).

### FK-chain
```
Seizoen:     Organisation -> Project (team) -> Period
Competitie:  Organisation -> Project (team) -> Period (seizoen) -> Period (competitie)
```

### Validatie (backend)
- `end_date > start_date` (serializer + DB constraint)
- `parent_period_id`: parent moet in dezelfde `organisation_id` zitten
- Unique: `(organisation, project, name, start_date)`
- FKs zijn immutable na creatie (update stript ze)

### Side effects
- AuditEvent `period.created` (post_save signal)
- Verwijderen geblokkeerd als period children of activities heeft

### Metadata conventie
- Seizoen: `{ "type": "season" }`
- Competitie: `{ "type": "competition" }`
- De wizard moet dit automatisch meesturen op basis van de type-keuze

### Error handling in wizard
| Status | Betekenis | Actie |
|--------|-----------|-------|
| 201 | Aangemaakt | Success -> doorlink opties |
| 400 | Validatie | "Einddatum moet na startdatum liggen" |
| 409 | Duplicate | "[Naam] bestaat al voor dit team in dit seizoen" |

---
## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/components/CreateWizard/flows/PeriodCreateFlow.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/PeriodContextStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/PeriodTypeStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/PeriodDetailsStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/PeriodConfirmStep.tsx` |
| REF | `demo/src/pages/identity/PeriodCreateModal.tsx` (behouden als fallback) |
