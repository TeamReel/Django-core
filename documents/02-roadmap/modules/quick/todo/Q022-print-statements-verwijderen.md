# Q022 — print() statements verwijderen

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Codebase Audit maart 2026 |
| Impact | 🔴 critical |
| Effort | ~30 min |

## Wat
Er staan nog `print()` statements in productie-code, waaronder in het permissions-systeem (lekt rol/permissie-data naar stdout/logs).

## Bestanden
| Bestand | Regels | Ernst |
|---------|--------|-------|
| `src/permissions/managers.py` | L24, L45, L47 | 🔴 Lekt permissie-data |
| `src/tasks/celery.py` | print request | 🟡 Debug info in logs |
| Overige (≤25 stuks) | Diverse | 🟢 Restjes management commands |

## Checklist
- [ ] `permissions/managers.py` → vervang print() door logger.debug()
- [ ] `tasks/celery.py` → vervang print() door logger
- [ ] Scan overige print() — verwijder of vervang door logging
- [ ] Tests
- [ ] Verify
