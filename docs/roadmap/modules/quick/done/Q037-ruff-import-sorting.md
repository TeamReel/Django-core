# Q037 — Import Sorting (ruff I001)

| | |
|---|---|
| Status | � DOING |
| Bron | Code Review |
| Impact | 🟢 nice-to-have |
| Effort | ~0.5 uur |

## Wat
365 Python-bestanden hebben ongesorteerde imports. Automatisch te fixen met `ruff check src/ --select=I001 --fix`. Geen functionele impact, maar maakt code consistent en diffs kleaner.

## Checklist
- [x] `ruff check src/ --select=I001 --fix`
- [x] Verify: `ruff check src/ --select=I001` → 0 errors
- [x] Tests: `pytest -x`
