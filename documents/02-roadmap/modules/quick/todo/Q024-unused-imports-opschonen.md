# Q024 — Unused imports opschonen (43 bestanden)

| | |
|---|---|
| Status | 📋 TODO |
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
- [ ] Scan alle src/ bestanden op ongebruikte imports
- [ ] Verwijder ongebruikte imports
- [ ] Tests
- [ ] Verify
