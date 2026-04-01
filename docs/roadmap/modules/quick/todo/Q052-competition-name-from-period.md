# Q052 — Competition Name from Period Hierarchy

| | |
|---|---|
| Status | 📋 TODO |
| Bron | F35 Reverse Engineering Analyse |
| Impact | 🟢 nice-to-have |
| Effort | ~4 uur |

## Wat
Competition name wordt als hardcoded string opgeslagen in `activity.metadata.teamreel.vars.competition_name` i.p.v. afgeleid uit de Period hiërarchie (Season → Competition → Week). De CTE-based Period tree is gebouwd maar wordt niet gebruikt hiervoor.

## Checklist
- [ ] Backend: `get_season_and_competition(period)` utility in `src/activities/utils.py`
- [ ] Backend: Update `LineupSegmentBuilder` om competition/season names uit Period tree te halen
- [ ] Backend: Metadata string als fallback als hiërarchie niet ingesteld
- [ ] Tests
- [ ] Verify
