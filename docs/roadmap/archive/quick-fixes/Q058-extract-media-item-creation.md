# Q058 — Extract _create_media_item_for_completed_job

| | |
|---|---|
| Status | 📋 DONE |
| Bron | Code Review — media pipeline |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat
`_create_media_item_for_completed_job()` (~100 regels) zit in `tasks/lineup.py` maar wordt door meerdere task-types gebruikt (en zal nodig zijn voor alle toekomstige content types). De functie bouwt rijk `extraction_metadata` en maakt MediaItem aan na job completion.

**Extract naar `src/video/tasks/_shared.py`** (samen met Q054's workflow transition).

## Checklist
- [x] Move `create_media_item_for_completed_job` + `JOB_TYPE_TO_ASSET_TYPE` naar `_shared.py`
- [x] Importeer in `lineup.py`, `match_intro.py`, `goal_celebration.py`
- [x] Verwijder oude definitie + ongebruikte imports uit `lineup.py` (-144 regels)
- [x] Tests (194 passed)
- [x] Verify
