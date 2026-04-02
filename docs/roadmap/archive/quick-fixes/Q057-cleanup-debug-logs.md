# Q057 — Cleanup DEBUG log statements in lineup_builder.py

| | |
|---|---|
| Status | 📋 DONE |
| Bron | Code Review — media pipeline |
| Impact | 🟢 nice-to-have |
| Effort | ~30 min |

## Wat
`lineup_builder.py` bevat 17 log statements met `"DEBUG: ..."` prefix op `logger.info()` level. Dit zijn development-logs die in productie ruis veroorzaken in CloudWatch/Railway logs.

**Omzetten naar `logger.debug()` (zonder "DEBUG:" prefix) of verwijderen.**

De `_debug_trace` list is wél nuttig voor diagnostiek — die kan blijven.

## Checklist
- [x] Alle 8 `logger.info("DEBUG: ...")` → `logger.debug(...)` (zonder prefix)
- [x] Behoud `_debug_trace` als interne diagnostiek
- [x] Verify: `pytest tests/video/ -v --no-cov` (194 passed)
