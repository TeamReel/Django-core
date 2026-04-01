# H0 — Lineup → Participation Sync

> **Effort:** ~12 uur | **Impact:** Lineup data wordt relationeel en queryable

## Probleem

Lineup wordt opgeslagen als `Activity.metadata.lineup = {goalkeeper: [PM_id, ...], player: [PM_id, ...]}`. Er worden geen `Participation` records aangemaakt. De video builder omzeilt dit door `selected_member_ids` mee te krijgen vanuit de frontend.

## Aanpak

### Backend: Sync service

- [ ] Maak `LineupSyncService` in `src/activities/services/lineup_sync.py`
  - Input: `activity_id`, `formation`, `goalkeeper_ids[]`, `player_ids[]`, `bench{}`
  - Zoekt of maakt `Participation` records per member
  - Zet `role = "starter"` voor lineup, `role = "substitute"` voor bank
  - Zet `data = {position, slot, functional_role, jersey_number}` uit formation layout
  - Verwijdert Participations die niet meer in de lineup staan (soft)
  - Behoudt `metadata.lineup` als snelle cache (backward compatible)

- [ ] Hook `LineupSyncService` in `ActivitySerializer.update()` 
  - Na `instance.save()`, check of `metadata.lineup` is gewijzigd
  - Zo ja: roep `LineupSyncService.sync(activity)` aan
  - Transactioneel: als sync faalt, metadata save ook terugdraaien

### Backend: Video builder migratie

- [ ] Update `LineupSegmentBuilder._gather_lineup_data()`:
  - Primaire bron: `Participation` records met `activity=activity, role__in=["starter"]`
  - Fallback: `selected_member_ids` meegegeven door frontend (voor backward compat)
  - Verwijder dubbele code in `_gather_lineup_from_participations()` vs `_gather_lineup_from_memberships()`

### Data migratie

- [ ] Management command `sync_existing_lineups`
  - Itereer over alle Activities met `metadata.lineup` die Participations missen
  - Draai `LineupSyncService.sync()` per activity
  - Dry-run mode + logging

### Tests

- [ ] Test: lineup save via API → Participation records aangemaakt
- [ ] Test: lineup update → Participations bijgewerkt (add/remove)
- [ ] Test: video builder leest uit Participations
- [ ] Test: backward compat — oude activities zonder Participations werken nog
- [ ] Test: management command migreert bestaande data

## Done criteria

- [ ] `PATCH /activities/{id}/` met lineup data creëert/update Participation records
- [ ] `Participation.objects.filter(activity=match, role="starter")` retourneert lineup spelers
- [ ] Video builder gebruikt Participations als primaire bron
- [ ] Bestaande lineup metadata wordt nog ondersteund als fallback
- [ ] Management command migreert bestaande data zonder errors
- [ ] Alle bestaande dashboard/video tests blijven groen
