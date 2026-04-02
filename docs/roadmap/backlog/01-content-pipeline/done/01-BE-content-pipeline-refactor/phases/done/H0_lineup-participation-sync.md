# H0 — Lineup → Participation Sync + Formation uit DB

> **Effort:** ~14 uur | **Impact:** Lineup + formatie + posities worden relationeel en queryable, formaties uit stamdata

## Probleem

1. Lineup wordt opgeslagen als `Activity.metadata.lineup` JSON — geen Participation records
2. Formaties zijn hardcoded in frontend (`FORMATION_LAYOUTS`) en backend (`FORMATION_SPLITS`)
3. Het `Formation` model (B32) bestaat al maar wordt niet gebruikt
4. `Participation.member` linkt naar `organisations.Membership` i.p.v. `ProjectMembership`
5. Posities (LB, CB, ST) worden nergens in de database opgeslagen

## Aanpak

### 1. Seed Formation stamdata

- [ ] Management command `seed_formations`:
  - Maak `SportConfiguration` voor Football 11v11 (als die nog niet bestaat)
  - Seed 3 Formation records met `positions` uit huidige `FORMATION_LAYOUTS`:
    - 4-3-3: `[{slot: 1, position: "GK", x: 50, y: 90, line: "keeper"}, {slot: 2, position: "LB", x: 15, y: 72, line: "defender"}, ...]`
    - 4-4-2: idem met LM, CM, CM, RM etc.
    - 3-4-3: idem met LWB, CM, CM, RWB etc.
  - Voeg `line` veld toe aan elke positie: `keeper`, `defender`, `midfielder`, `attacker`
  - Idempotent: `update_or_create` op `(sport_config, code)`
  - Zet 4-3-3 als `is_default=True`

### 2. Model wijzigingen

- [ ] `Activity` model: voeg `formation` FK toe
  ```python
  formation = models.ForeignKey(
      "sport_configuration.Formation",
      on_delete=models.SET_NULL,
      null=True, blank=True,
      related_name="activities",
      help_text="Formation/tactiek gebruikt voor deze wedstrijd",
  )
  ```

- [ ] `Participation` model: voeg `project_membership` FK toe
  ```python
  project_membership = models.ForeignKey(
      "projects.ProjectMembership",
      on_delete=models.CASCADE,
      null=True, blank=True,
      related_name="participations",
      help_text="Project membership (team + seizoen) — primaire FK voor lineup",
  )
  ```
  - Behoud oud `member` veld voorlopig (backward compat)

- [ ] Migraties: `AddField` operations (veilig, geen data loss)

### 3. LineupSyncService

- [ ] Maak `LineupSyncService` in `src/activities/services/lineup_sync.py`
  - Input: `activity`, `formation: Formation`, `goalkeeper_ids: list[str]`, `player_ids: list[str]`, `bench: dict[str, str]`
  - Haal positie-info uit `Formation.positions` (niet hardcoded):
    ```python
    formation_positions = {p["slot"]: p for p in formation.positions}
    # slot 1 = {"position": "GK", "line": "keeper", "x": 50, "y": 90}
    ```
  - **Starters:**
    - Slot 1 = goalkeeper_ids[0] → `role="starter"`, `data={slot: 1, position: "GK", line: "keeper", formation_id: formation.id}`
    - Slots 2-11 = player_ids in volgorde → `data={slot: N, position: "CB", line: "defender", ...}`
  - **Bankspelers:**
    - `role="substitute"`, `data={bench_status: "available"|"injured"|...}`
  - **Verwijderde spelers:** soft-delete Participations die niet meer in lineup staan
  - Zet `Activity.formation = formation` FK
  - Behoudt `metadata.lineup` als snelle cache (backward compatible)

### 4. Hook in ActivitySerializer

- [ ] In `ActivitySerializer.update()`:
  - Na `instance.save()`, check of `metadata.lineup` is gewijzigd
  - Resolve `Formation` via `metadata.lineup.formation` code → `Formation.objects.get(code=code, sport_config=project.sport.configuration)`
  - Roep `LineupSyncService.sync(activity, formation, ...)` aan
  - Transactioneel: als sync faalt, metadata save ook terugdraaien

### 5. Video builder migratie

- [ ] Update `LineupSegmentBuilder`:
  - Vervang `FORMATION_SPLITS` hardcoded dict door `Formation.positions` uit DB
  - Primaire bron: `Participation` records met `role="starter"`
  - Lees `project_membership` FK voor asset resolution
  - Fallback: `selected_member_ids` + `FORMATION_SPLITS` voor backward compat

### 6. Frontend: Formation uit API

- [ ] Vervang `FORMATION_LAYOUTS` imports door API data:
  - `useLineupSheet.ts` → haal formations via `masterData.getFormations()`
  - `MatchLineupField.tsx` → idem
  - `LineupSquadStep.tsx` → idem
  - `MembersStep.tsx` → idem
  - `FormationPicker.tsx` → render formaties uit API i.p.v. hardcoded object
  - `useMatchDataFetching.ts` → idem
- [ ] `FORMATION_LAYOUTS` constant mag blijven als fallback (voor als API nog niet geladen)
- [ ] Stuur `formation_id` (UUID) mee bij lineup save i.p.v. alleen formation code string

### 7. Data migratie

- [ ] Management command `sync_existing_lineups`:
  - Itereer Activities met `metadata.lineup` die Participations missen
  - Resolve formation code → Formation record
  - Draai `LineupSyncService.sync()` per activity
  - Zet `Activity.formation` FK
  - Dry-run mode + logging

### Tests

- [ ] Test: seed command maakt 3 Formation records met correcte positions
- [ ] Test: lineup save via API → Participation records met correcte posities uit Formation.positions
- [ ] Test: 4-3-3 lineup → slot 2 = LB/defender, slot 7 = CDM/midfielder, slot 10 = ST/attacker
- [ ] Test: 4-4-2 lineup → correcte positie-mapping
- [ ] Test: 3-4-3 lineup → correcte positie-mapping
- [ ] Test: Activity.formation FK wordt gezet
- [ ] Test: bankspelers → Participation met role="substitute"
- [ ] Test: lineup update → Participations bijgewerkt (add/remove/soft-delete)
- [ ] Test: video builder leest Formation.positions uit DB
- [ ] Test: backward compat — oude activities zonder Formation FK werken nog
- [ ] Test: management command migreert bestaande data

## Done criteria

- [ ] `Formation` records bestaan in DB voor 4-3-3, 4-4-2, 3-4-3 (Football 11v11)
- [ ] `Activity.formation` FK wordt gezet bij lineup save
- [ ] Elke starter-Participation bevat `data.slot`, `data.position`, `data.line` (uit Formation.positions)
- [ ] `Participation.project_membership` linkt naar correcte ProjectMembership
- [ ] Video builder gebruikt Formation uit DB + Participations als primaire bron
- [ ] Frontend rendert formaties uit API (niet hardcoded)
- [ ] Bestaande lineup metadata + `FORMATION_SPLITS` als fallback
- [ ] Alle bestaande dashboard/video tests blijven groen
