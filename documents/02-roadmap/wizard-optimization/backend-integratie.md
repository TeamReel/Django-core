# Backend Integratie -- Wizard API Referentie

Dit document beschrijft de backend-vereisten per create-flow in de CreateWizard: API endpoints, vereiste velden, FK-relaties, validatie, permissies en side effects.

---

## Data Hierarchie (volgorde van afhankelijkheid)

```
Organisation (moet bestaan)
  -> Project [club] (parent_project = null)
       side effect: auto-creëert "Heren 1" team + BrandProfile + 6 DesignTokens
     -> Project [team] (parent_project = club)
       -> Period [seizoen] (parent_period = null)
         -> Period [competitie] (parent_period = seizoen)
           -> Activity [match] (project + period vereist)
             -> ActivityParticipation (activity + member)
  -> Membership [org] (user + organisation)
     -> ProjectMembership (user + project, optioneel: period)
```

Een entity kan alleen aangemaakt worden als alle bovenliggende entities bestaan. De wizard moet dit afdwingen en doorlinken naar de juiste sub-flow als er iets ontbreekt.

---

## 1. Activity (Match)

### Endpoint
```
POST /api/v1/activities/
```

### Vereiste velden
| Veld | Type | Verplicht | Bron in wizard |
|------|------|-----------|---------------|
| `project_id` | int | Ja | Team selectie (cascading) |
| `period_id` | UUID | Ja | Seizoen/competitie selectie |
| `title` | string(200) | Ja | Auto: "[Team] vs [Tegenstander]" |
| `activity_type` | string | Ja | Hardcoded: `"match"` |
| `start_time` | datetime (TZ) | Ja | Datum + tijd picker |
| `end_time` | datetime (TZ) | Ja | Auto: start_time + 2h (of handmatig) |
| `location` | string(200) | Nee | Locatie input |
| `description` | string | Nee | Optioneel |
| `metadata` | JSON | Nee | `{ venue, is_home }` |
| `opponent_project_id` | int | Nee | Tegenstander project (als bekend) |

### Validatie
- `end_time > start_time` (serializer + DB CheckConstraint)
- Period's organisation moet matchen met project's organisation
- Soft warning als activity datum buiten period datumrange valt (blokkeert NIET)

### Permissies
- `match.create` op het target project (RBAC via `permissions.evaluator`)
- Fallback: `match.create` op parent project (club admin voor team)
- System admins bypassen

### Side effects
- AuditEvent `activity.created` (post_save signal)
- Slug auto-gegenereerd in `Activity.save()` (title + datum)

### FK-chain
```
Organisation -> Project (team) -> Period -> Activity
```

---

## 2. Project (Club/Team)

### Endpoint
```
POST /api/v1/organisations/{org_slug}/projects/
```
Let op: geneste URL -- `org_slug` komt uit de URL, niet uit de POST body.

### Vereiste velden
| Veld | Type | Verplicht | Bron in wizard |
|------|------|-----------|---------------|
| `name` | string(200) | Ja | Naam input |
| `description` | string(2000) | Nee | Optioneel |
| `parent_project_id` | int | Nee | Club selectie (voor teams) |
| `is_private` | boolean | Nee | Default: false |
| `team_type` | string(20) | Nee | Default: "regular" |
| `metadata` | JSON | Nee | Optioneel |

Niet in POST body (auto-inject):
- `organisation` -- uit URL slug
- `creator` -- uit `request.user`

### Validatie
- Naam: niet leeg, max 200 chars
- Case-insensitive uniqueness within scope:
  - Root (club): `(lower(name), organisation)` unique
  - Child (team): `(lower(name), organisation, parent_project)` unique
- `parent_project_id` moet binnen dezelfde organisatie vallen

### Side effects bij Club (parent_project = null)
- Auto-creëert child team "Heren 1"
- Auto-creëert `BrandProfile` met 6 default `DesignToken`s (kleuren, fonts, border-radius)
- `notify_project_created` notification

### Side effects bij Team (parent_project != null)
- `notify_project_created` notification
- Geen auto-creatie van sub-entities

### FK-chain
```
Club:  Organisation -> Project
Team:  Organisation -> Project (club) -> Project (team)
```

---

## 3. Period (Seizoen/Competitie)

### Endpoint
```
POST /api/v1/periods/
```

### Vereiste velden
| Veld | Type | Verplicht | Bron in wizard |
|------|------|-----------|---------------|
| `organisation_id` | UUID | Ja | Uit selectie of pre-fill |
| `name` | string(200) | Ja | Naam input |
| `start_date` | date | Ja | Datum picker |
| `end_date` | date | Ja | Datum picker |
| `project_id` | int | Nee | Team selectie |
| `parent_period_id` | UUID | Nee | Seizoen selectie (voor competitie) |
| `sport_id` | int | Nee | Sport variant selectie |
| `period_type` | string(20) | Nee | Default: "regular" |
| `description` | string | Nee | Optioneel |
| `metadata` | JSON | Nee | `{ type: "season" }` of `{ type: "competition" }` |

Let op: `organisation_id` zit WEL in de POST body (anders dan Project).

### Validatie
- `end_date > start_date` (serializer + DB constraint)
- Als `parent_period_id` gezet: parent moet in dezelfde `organisation_id` zitten
- FKs zijn immutable na creatie (update stript ze)
- Unique constraint: `(organisation, project, name, start_date)`

### Side effects
- AuditEvent `period.created` (post_save signal)
- Verwijderen geblokkeerd als period children of activities heeft

### FK-chain
```
Seizoen:     Organisation -> Project (team) -> Period
Competitie:  Organisation -> Project (team) -> Period (seizoen) -> Period (competitie)
```

---

## 4. Member (Org + Project Membership)

### Member toevoegen is een CASCADE van API calls

De frontend voert tot 4 calls uit, afhankelijk van context:

#### Stap 1: User aanmaken (alleen bij "Nieuw lid")
```
POST /api/v1/admin/users/
Body: { first_name, last_name, email, password, password_confirm }
```

#### Stap 2: Organisation Membership
```
POST /api/v1/organisations/{org_slug}/members/
Body: { email, role: "member"|"admin" }
```
- Gebruikt `update_or_create` -- reactivates soft-deleted memberships
- Admin-only permissie

#### Stap 3: Club ProjectMembership (als club context)
```
POST /api/v1/projects/{club_project_id}/members/
Body: { user_id: int, role: "viewer"|"editor"|"admin" }
```

#### Stap 4: Team ProjectMembership (als team context)
```
POST /api/v1/projects/{team_project_id}/members/
Body: { user_id: int, role: "viewer"|"editor"|"admin", period_id?: UUID }
```

### Idempotent cascade
- "Already exists" errors worden geswallowd (bestaande membership = OK)
- `MembershipService.add_member()` auto-creëert org membership als die ontbreekt

### ProjectMembership velden
| Veld | Type | Verplicht | Bron in wizard |
|------|------|-----------|---------------|
| `user_id` | int | Ja | User selectie of net aangemaakt |
| `role` | string(20) | Nee | Default: "viewer" |
| `period_id` | UUID | Nee | Seizoen scope |
| `metadata` | JSON | Nee | `{ position, shirt_number, teamreel_assets }` |

### Permissies
- `_check_can_manage_members` op het target project
- Org membership: admin-only

### Soft-delete
- ProjectMembership heeft `deleted_at` veld
- Unique constraint: `(project, user, period)` WHERE `deleted_at IS NULL`

---

## 5. ActivityParticipation (Match Lineup)

### Endpoints
```
POST /api/v1/participations/           -- enkel
POST /api/v1/participations/bulk/      -- meerdere tegelijk
```

### Vereiste velden
| Veld | Type | Verplicht | Notes |
|------|------|-----------|-------|
| `activity` | UUID FK | XOR | Mutually exclusive met `period` |
| `period` | UUID FK | XOR | Mutually exclusive met `activity` |
| `member` | UUID FK | Ja | `organisations.Membership` |
| `role` | string(50) | Ja | starter, substitute, squad_member |
| `status` | string(20) | Nee | Default: "confirmed" |
| `data` | JSON | Nee | `{ jersey_number, position }` |

### Bulk formaat
```json
{
  "activity_id": "uuid",
  "member_ids": ["uuid", "uuid"],
  "role": "starter",
  "status": "confirmed"
}
```
Of:
```json
{
  "participations": [
    { "activity_id": "uuid", "member_id": "uuid", "role": "starter", "data": { "position": "GK" } }
  ]
}
```

### DB Constraint
- XOR: exact 1 van `(activity, period)` moet gezet zijn
- Unique: `(member, activity)` en `(member, period)`

### Permissies
- `match.edit_own_team` voor match participations
- Member's org moet matchen met activity/period org

---

## Wizard Implicaties

### 1. Cascade-bewustzijn
De wizard moet weten welke entities al bestaan voordat een create-flow kan starten:

```
Content genereren  -> vereist: team + seizoen + match (of maak ze aan)
Match aanmaken     -> vereist: team + seizoen (of maak ze aan)
Lid toevoegen      -> vereist: org (+ optioneel club/team)
Team aanmaken      -> vereist: org (+ optioneel club als parent)
Seizoen aanmaken   -> vereist: org + team
```

### 2. Cross-flow doorlinks
Als een vereiste ontbreekt, navigeert de wizard naar de juiste sub-flow:
- "Match aanmaken" maar geen seizoen? -> PeriodCreateFlow -> terug naar MatchCreateFlow
- "Content" maar geen match? -> MatchCreateFlow -> terug naar ContentFlow

### 3. Auto-generated velden
De wizard hoeft deze NIET te tonen:
- `slug` -- auto-gegenereerd in `save()`
- `created_by` -- auto-inject vanuit `request.user`
- `organisation` (bij Project) -- uit URL slug
- `end_time` (bij Activity) -- suggestie: start_time + 2 uur

### 4. Metadata conventies
Gebruik `metadata` JSON velden consistent:
- Activity: `{ venue: string, is_home: boolean }`
- Period: `{ type: "season" | "competition" }`
- ProjectMembership: `{ position: string, shirt_number: number }`

### 5. Error handling per entity
| HTTP Status | Betekenis | Wizard actie |
|------------|-----------|-------------|
| 201 | Aangemaakt | Success state, doorlink opties |
| 400 | Validatie error | Toon inline per veld |
| 403 | Geen permissie | Melding "Je hebt geen rechten voor [actie]" |
| 409 | Duplicate | Melding "[Entity] bestaat al" + link naar bestaande |
| 500 | Server error | Retry knop |
