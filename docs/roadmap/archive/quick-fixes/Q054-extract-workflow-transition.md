# Q054 — Extract _transition_workflow_on_completion

| | |
|---|---|
| Status | 🔍 REVIEW |
| Bron | Code Review — media pipeline |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
`_transition_workflow_on_completion()` was identiek gekopieerd in 5 task-bestanden (`transcode.py`, `compose.py`, `thumbnail.py`, `then_vs_now.py`, `lineup.py`). De overige 2 (`goal_celebration.py`, `match_intro.py`) importeerden uit `lineup.py`.

Geëxtraheerd naar `src/video/tasks/_shared.py` met verbeterde comment string (`job.job_type` i.p.v. hardcoded) en `job_type` in log extras.

## Checklist
- [x] Create `src/video/tasks/_shared.py` met `transition_workflow_on_completion()`
- [x] Replace kopieën in 5 task-bestanden door import
- [x] Update imports in `goal_celebration.py` en `match_intro.py`
- [x] Verify: `pytest tests/video/test_tasks.py` — 7/7 passed
- [x] Verify: `pytest tests/video/` — 194 passed (3 pre-existing errors, niet gerelateerd)
