# Q015 — Debug print() statements verwijderen

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review / Codebase Audit |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
Er staan 15+ `print()` statements verspreid over productie-code (views, tasks, managers, apps). Dit vervuilt logs, maakt debugging moeilijker, en kan gevoelige informatie lekken. Moet vervangen worden door `logging.getLogger()` calls op het juiste niveau.

## Bestanden
- `src/search/api/views.py` (2× — debug output in search)
- `src/search/tasks.py` (1×)
- `src/accounts/api/views_auth.py` (1×)
- `src/security_baseline/views.py` (2×)
- `src/security_baseline/validators/breach_detector.py` (3×)
- `src/security_baseline/apps.py` (5×)
- `src/permissions/managers.py` (3×)
- `src/tasks/celery.py` (1×)

## Checklist
- [ ] Vervang alle `print()` door `logger.warning()` / `logger.error()` / `logger.debug()`
- [ ] Voeg `logger = logging.getLogger(__name__)` toe per module
- [ ] Verwijder pure debug prints (search count, permissions debug)
- [ ] Tests
- [ ] Verify
