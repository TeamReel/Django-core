# Q024 — Unused imports opschonen (43 bestanden)

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟢 nice-to-have |
| Effort | ~2 uur |

## Wat
43 Python-bestanden bevatten ongebruikte imports. Dit maakt de code moeilijker leesbaar en kan verwarrend zijn bij reviews.

## Aanpak
Gebruik `ruff` of handmatige scan om alle ongebruikte imports te verwijderen.

Notabele bestanden:
- `src/accounts/serializers.py` — `RoleAssignment`
- `src/accounts/api/views_admin_detail.py` — `timezone`
- `src/accounts/api/views_context.py` — `Request`
- `src/accounts/api/views_context_active.py` — `Request`
- `src/projects/api/views_project.py` — `Case`, `When`
- `src/video/services/lineup_composer.py` — `subprocess`
- 6 video service files — unused `requests`

## Checklist
- [x] Scan alle src/ bestanden op ongebruikte imports
- [x] Verwijder ongebruikte imports (44 automatisch gefixt met ruff)
- [x] Tests
- [x] Verify

## Resultaat
- **47 ongebruikte imports** gevonden door ruff
- **44 automatisch verwijderd** met `ruff check src/ --select=F401 --fix`
- **3 false positives** in `src/accounts/serializers.py` — imports in try/except blokken die wel gebruikt worden
