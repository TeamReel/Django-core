# Phase M3 -- Team/Project Create Flow

**Track:** M (Modal Migratie)
**Status:** Todo
**Effort:** Klein-Medium (1-2 sessies)
**Vereist:** E1 afgerond
**Migreert:** `pages/identity/ProjectCreateModal.tsx` (257 regels)

---

## Doel

De ProjectCreateModal migreren naar een sub-flow binnen de CreateWizard. De gebruiker kan via de + knop "Team aanmaken" kiezen en een nieuw team/club project aanmaken.

## Huidige ProjectCreateModal analyse

**Bestand:** `demo/src/pages/identity/ProjectCreateModal.tsx` (257 regels)

### Velden
| Veld | Type | Vereist |
|------|------|--------|
| Organisatie | Select | Ja |
| Club | Select (gefilterd op org) | Ja (voor team) |
| Naam | Text | Ja |
| Beschrijving | Textarea | Nee |

### Type
- Club-project (direct onder organisatie)
- Team-project (onder een club, `parent_project` = club)

## Wizard Flow Ontwerp

### Stap 1: Type + Context
- Pre-filled org/club vanuit CreateWizardProvider.prefill
- Type selectie: is dit een club of een team?
- Cascading: Org -> Club (alleen bij team)

### Stap 2: Team Details
- Naam (verplicht)
- Beschrijving (optioneel)
- Sport variant suggestie (als club al een sport heeft)

### Stap 3: Bevestiging
- Samenvatting
- Na succes: "Team bekijken" / "Leden toevoegen" / "Seizoen aanmaken"

## Taken

### 1. ProjectCreateFlow component
- [ ] `components/CreateWizard/flows/ProjectCreateFlow.tsx`

### 2. Stap-componenten
- [ ] `steps/ProjectContextStep.tsx` -- org/club selectie + type
- [ ] `steps/ProjectDetailsStep.tsx` -- naam, beschrijving
- [ ] `steps/ProjectConfirmStep.tsx` -- samenvatting + submit

### 3. Post-create doorlink
- [ ] "Leden toevoegen" -> switch naar MemberAddFlow met nieuw team pre-filled
- [ ] "Seizoen aanmaken" -> switch naar PeriodCreateFlow met nieuw team pre-filled
- [ ] Dit is een uniek voordeel van de fat wizard: cross-flow navigatie

### 4. Verificatie
- [ ] Pre-fill vanuit club-pagina: org + club auto-ingevuld
- [ ] Submit maakt project aan via API
- [ ] Post-create doorlink naar member/seizoen flow werkt
## Backend Integratie

Zie ook: [backend-integratie.md](../../../wizard-optimization/backend-integratie.md#2-project-clubteam)

### API Endpoint
```
POST /api/v1/organisations/{org_slug}/projects/
```
Let op: geneste URL -- `org_slug` komt uit de URL, NIET uit de POST body.

### POST Body (Club)
```json
{
  "name": "FC Example",
  "description": "Optionele beschrijving"
}
```

### POST Body (Team)
```json
{
  "name": "Heren 2",
  "description": "Optionele beschrijving",
  "parent_project_id": 456
}
```

### Auto-inject (niet in POST body)
- `organisation` -- uit URL slug
- `creator` -- uit `request.user`

### FK-chain
```
Club:  Organisation -> Project
Team:  Organisation -> Project (club) -> Project (team)
```

### Validatie (backend)
- Naam: niet leeg, max 200 chars
- Case-insensitive uniqueness:
  - Club: `(lower(name), organisation)` unique
  - Team: `(lower(name), organisation, parent_project)` unique
- `parent_project_id` moet binnen dezelfde organisatie vallen

### Side effects -- BELANGRIJK
| Trigger | Side effect |
|---------|-------------|
| Club aangemaakt (parent=null) | Auto-creëert "Heren 1" child team |
| Club aangemaakt (parent=null) | Auto-creëert BrandProfile + 6 DesignTokens |
| Project aangemaakt (any) | `notify_project_created` notification |

De wizard moet de gebruiker hierover informeren: "Bij het aanmaken van een club wordt automatisch een eerste team aangemaakt."

### Error handling in wizard
| Status | Betekenis | Actie |
|--------|-----------|-------|
| 201 | Aangemaakt | Success -> doorlink opties |
| 400 | Validatie | "Naam mag niet leeg zijn" / max length |
| 409 | Duplicate | "[Naam] bestaat al in deze organisatie" |

---
## Bestanden

| Actie | Bestand |
|-------|---------|
| NIEUW | `demo/src/components/CreateWizard/flows/ProjectCreateFlow.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/ProjectContextStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/ProjectDetailsStep.tsx` |
| NIEUW | `demo/src/components/CreateWizard/steps/ProjectConfirmStep.tsx` |
| REF | `demo/src/pages/identity/ProjectCreateModal.tsx` (behouden als fallback) |
