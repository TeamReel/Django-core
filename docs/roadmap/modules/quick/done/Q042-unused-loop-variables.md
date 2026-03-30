# Q042 — Unused Loop Variables (ruff B007)

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat
17 loop control variables die niet worden gebruikt in de loop body. Convention: vervang door `_` om intentie duidelijk te maken.

## Aanpak
- `for category in ...` → `for _ in ...` (als niet gebruikt)
- `for i, item in enumerate(...)` → `for _, item in enumerate(...)` (als `i` niet gebruikt)

## Checklist
- [ ] Alle 17 B007 violations fixen
- [ ] Verify: `ruff check src/ --select=B007` → 0 errors
- [ ] Tests: `pytest -x`
