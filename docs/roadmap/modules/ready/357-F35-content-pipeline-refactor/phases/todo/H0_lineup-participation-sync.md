# H0 — Lineup → Participation Sync

> **Effort:** ~12 uur | **Impact:** Lineup + formatie + posities worden relationeel en queryable

## Probleem

Lineup wordt opgeslagen als `Activity.metadata.lineup = {formation: "4-3-3", goalkeeper: [PM_id], player: [PM_id, ...]}`. Er worden geen `Participation` records aangemaakt. Positie-informatie (LB, CB, ST etc.) is impliciet via slot-volgorde maar wordt nergens opgeslagen. De video builder omzeilt dit door `selected_member_ids` + `formation` mee te krijgen vanuit de frontend.

Daarnaast linkt `Participation.member` naar `organisations.Membership` (user ↔ organisatie), terwijl lineup werkt met `ProjectMembership` IDs waar ook de assets en seizoen-scope op zitten.

## Aanpak

### 1. Model wijziging: Participation.member → ProjectMembership

- [ ] Voeg nieuw veld `project_membership` toe aan `Participation` model:
  - `ForeignKey("projects.ProjectMembership", null=True, blank=True, related_name="participations")`
  - Behoud oud `member` veld voorlopig (backward compat, later deprecaten)
- [ ] Maak migratie: `AddField` (veilig, geen data loss)
- [ ] Update `Participation.__str__()` en admin om beide te tonen

### 2. Formation → Positie mapping (backend)

- [ ] Maak `FORMATION_POSITIONS` dict in `src/activities/constants.py`:
  ```python
  FORMATION_POSITIONS = {
      "4-3-3": {
          1: {"position": "GK", "line": "keeper"},
          2: {"position": "LB", "line": "defender"},
          3: {"position": "CB", "line": "defender"},
          4: {"position": "CB", "line": "defender"},
          5: {"position": "RB", "line": "defender"},
          6: {"position": "CM", "line": "midfielder"},
          7: {"position": "CDM", "line": "midfielder"},
          8: {"position": "CM", "line": "midfielder"},
          9: {"position": "LW", "line": "attacker"},
          10: {"position": "ST", "line": "attacker"},
          11: {"position": "RW", "line": "attacker"},
      },
      "4-4-2": { ... },  # LB,CB,CB,RB / LM,CM,CM,RM / ST,ST
      "3-4-3": { ... },  # CB,CB,CB / LWB,CM,CM,RWB / LW,ST,RW
  }
  ```
  - Must match frontend `FORMATION_LAYOUTS` slot ordering exact

### 3. LineupSyncService

- [ ] Maak `LineupSyncService` in `src/activities/services/lineup_sync.py`
  - Input: `activity`, `formation`, `goalkeeper_ids: list[str]`, `player_ids: list[str]`, `bench: dict[str, str]`
  - **Starters (goalkeeper + player):**
    - Per member: maak/update `Participation` record
    - `role = "starter"`
    - `project_membership = ProjectMembership.objects.get(id=pm_id)`
    - `data = { slot: N, position: "CB", formation: "4-3-3", line: "defender" }`
    - Slot 1 = goalkeeper, slots 2-11 = players in volgorde
  - **Bankspelers:**
    - Per member in bench dict: maak/update `Participation` record
    - `role = "substitute"`
    - `data = { bench_status: "available" | "injured" | ... }`
  - **Verwijderde spelers:**
    - Participations die niet meer in lineup/bench staan: soft-delete
  - Behoudt `metadata.lineup` als snelle cache (backward compatible)

### 4. Hook in ActivitySerializer

- [ ] Hook `LineupSyncService` in `ActivitySerializer.update()`
  - Na `instance.save()`, check of `metadata.lineup` is gewijzigd
  - Zo ja: roep `LineupSyncService.sync(activity)` aan
  - Transactioneel: als sync failt, metadata save ook terugdraaien

### 5. Video builder migratie

- [ ] Update `LineupSegmentBuilder._gather_lineup_data()`:
  - Primaire bron: `Participation` records met `activity=activity, role="starter"`
  - Lees `project_membership` ipv `member` FK
  - Formation + posities uit `Participation.data`
  - Fallback: `selected_member_ids` meegegeven door frontend (backward compat)
- [ ] Verwijder dubbele code in `_gather_lineup_from_participations()` vs `_gather_lineup_from_memberships()`

### 6. Data migratie

- [ ] Management command `sync_existing_lineups`
  - Itereer over alle Activities met `metadata.lineup` die Participations missen
  - Draai `LineupSyncService.sync()` per activity
  - Dry-run mode + logging
  - Rapporteer: X activities gemigreerd, Y errors

### Tests

- [ ] Test: lineup save via API → Participation records aangemaakt met correcte posities
- [ ] Test: 4-3-3 lineup → slot 2 = LB/defender, slot 7 = CDM/midfielder, slot 10 = ST/attacker
- [ ] Test: 4-4-2 lineup → correcte positie-mapping
- [ ] Test: 3-4-3 lineup → correcte positie-mapping
- [ ] Test: bankspelers → Participation met role="substitute"
- [ ] Test: lineup update → Participations bijgewerkt (add/remove/soft-delete)
- [ ] Test: video builder leest uit Participations met posities
- [ ] Test: backward compat — oude activities zonder Participations werken nog
- [ ] Test: management command migreert bestaande data

## Done criteria

- [ ] `PATCH /activities/{id}/` met lineup data creëert/update Participation records
- [ ] Elke Participation bevat `data.slot`, `data.position`, `data.formation`, `data.line`
- [ ] `Participation.project_membership` linkt naar correcte ProjectMembership
- [ ] `Participation.objects.filter(activity=match, role="starter")` retourneert lineup spelers
- [ ] Video builder gebruikt Participations als primaire bron
- [ ] Bestaande lineup metadata wordt nog ondersteund als fallback
- [ ] Management command migreert bestaande data zonder errors
- [ ] Alle bestaande dashboard/video tests blijven groen
