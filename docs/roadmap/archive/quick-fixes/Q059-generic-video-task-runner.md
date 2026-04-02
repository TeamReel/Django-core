# Q059 — Generieke video task runner

| | |
|---|---|
| Status | � REVIEW |
| Bron | Pipeline analyse — task duplicatie |
| Impact | 🔴 critical |
| Effort | ~2 uur |

## Wat
De 4 content-type task files (`lineup.py`, `match_intro.py`, `goal_celebration.py`, `then_vs_now.py`) zijn ~75% identiek. Elk bestand herhaalt dezelfde ~75 regels: job ophalen, status check, processor.execute(), media item aanmaken, workflow transitie, error handling met retry.

**Maak één generieke `run_video_task()` functie in `_shared.py`** die het volledige lifecycle-patroon bevat. Elke task file wordt dan ~15 regels: decorator + aanroep met de juiste Processor class.

## Scope
- Alleen de task files (`src/video/tasks/`), NIET de processors
- `then_vs_now.py` roept momenteel `create_media_item_for_completed_job` NIET aan — bewust of bug? Verifiëren vóór extractie.

## Checklist
- [x] Verifieer of `then_vs_now.py` bewust geen MediaItem aanmaakt
- [x] Schrijf `run_video_task(job_id, processor_class, task_self)` in `_shared.py`
- [x] Refactor `lineup.py` → gebruik `run_video_task`
- [x] Refactor `match_intro.py` → idem
- [x] Refactor `goal_celebration.py` → idem
- [x] Refactor `then_vs_now.py` → idem
- [x] Tests
- [x] Verify
