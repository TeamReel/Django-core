# Q056 — Verwijder deprecated daemon-thread code uit video_service.py

| | |
|---|---|
| Status | � DONE |
| Bron | Code Review — media pipeline |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat
`video_service.py` bevat ~260 regels deprecated daemon-thread code: `_start_lineup_thread`, `_start_goal_celebration_thread`, `_start_match_intro_thread`, `_start_then_vs_now_thread` + bijbehorende `_process_*_sync` methoden. Deze worden niet meer gebruikt — alles gaat via Celery tasks (`_dispatch_job` methode).

Dead code maakt het bestand 2× zo groot als nodig en verwarrend voor nieuwe ontwikkelaars.

## Checklist
- [x] Grep bevestigen: geen callers van `_start_*_thread` of `_process_*_sync`
- [x] Verwijder alle 8 deprecated methoden
- [x] Verwijder `_transition_workflow_on_completion` method (komt al in Q054)
- [x] video_service.py van 644 → 244 regels (-400 regels dead code)
- [x] Tests (194 passed)
- [x] Verify
