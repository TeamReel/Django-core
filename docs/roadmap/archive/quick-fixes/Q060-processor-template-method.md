# Q060 — Processor template method pattern

| | |
|---|---|
| Status | � REVIEW |
| Bron | Pipeline analyse — processor duplicatie |
| Impact | 🔴 critical |
| Effort | ~2 uur |

## Wat
Alle 4 processors (`LineupProcessor`, `MatchIntroProcessor`, `GoalCelebrationProcessor`, `ThenVsNowProcessor`) overschrijven `execute()` volledig met identieke lifecycle code (~40 regels per processor = ~160 regels duplicatie):

1. `_ensure_temp_dir()`
2. Status → PROCESSING
3. Compositie uitvoeren
4. Status → COMPLETED
5. `JobCancelledError` handler
6. Exception → FAILED handler
7. `_cleanup()` in finally

**Refactor `BaseVideoProcessor.execute()` naar template method pattern** met één abstract `_process()` method die elke processor implementeert. Upload path configureerbaar maken via `_get_storage_prefix()`.

## Checklist
- [x] Refactor `BaseVideoProcessor.execute()` → template method met `_process()`
- [x] Voeg `_get_storage_prefix()` hook toe (default + override voor match-types)
- [x] Refactor `LineupProcessor` → implementeer alleen `_process()`
- [x] Refactor `GoalCelebrationProcessor` → idem
- [x] Refactor `MatchIntroProcessor` → idem + custom `_get_storage_prefix()`
- [x] Refactor `ThenVsNowProcessor` → idem
- [x] Tests
- [x] Verify
