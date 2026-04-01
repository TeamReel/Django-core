# H4 — Competition Name from Period Hierarchy

> **Effort:** ~4 uur | **Impact:** Data consistency — competition_name uit model i.p.v. metadata string

## Probleem

`LineupSegmentBuilder` haalt `competition_name` uit `activity.metadata.teamreel.vars.competition_name` (een handmatig ingevulde string). Als die ontbreekt, fallback naar `activity.period.name`. De Period hiërarchie (Season → Competition) wordt niet traversed.

## Aanpak

### Backend: Period-aware name resolution

- [ ] Update `LineupSegmentBuilder._gather_lineup_data()`:
  - `season_name`: climb naar root period (via `parent_period` chain)
  - `competition_name`: als period.parent_period exists → period is competition, parent is season
  - Fallback: metadata string als period hiërarchie niet ingesteld
  - Helper: `get_season_and_competition_names(period: Period) -> tuple[str|None, str|None]`

- [ ] Maak utility in `src/activities/utils.py`:
  ```python
  def get_season_and_competition(period: Period | None) -> tuple[str | None, str | None]:
      if not period:
          return None, None
      if period.parent_period:
          # Period is competition level, parent is season
          return period.parent_period.name, period.name
      # Period is season level (root), no competition
      return period.name, None
  ```

- [ ] Update `LineupComposer` en `LineupSceneGenerator`:
  - Geen wijzigingen nodig — ze consumeren `LineupData.season_name` en `.competition_name`
  - Deze worden nu correct gezet door de builder

### Frontend: Optioneel

- [ ] Match detail / wizard: toon competition name uit period i.p.v. metadata veld
  - Minder prioriteit — metadata veld kan nog als override fungeren

### Tests

- [ ] Test: Activity met Period(parent=Season) → correcte season + competition names
- [ ] Test: Activity met root Period → season name, competition = None
- [ ] Test: Activity zonder Period → None, None (graceful)
- [ ] Test: metadata override heeft voorrang als expliciet gezet

## Done criteria

- [ ] Competition/season names afgeleid uit Period hiërarchie
- [ ] Metadata string als fallback als hiërarchie niet ingesteld
- [ ] Video overlay toont correcte competitie naam
- [ ] Geen breaking changes voor bestaande video's
