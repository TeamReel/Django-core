# Q031 — Traceback Leak in Admin API

| | |
|---|---|
| Status | � ? DONE |
| Bron | Code Review |
| Impact | 🔴 critical |
| Effort | ~1 uur |

## Wat
De admin avatar upload endpoint (`src/accounts/api/views_admin.py:155-166`) stuurt een volledige Python stack trace terug in de API response bij een fout. Dit lekt interne paden, code en dependency-versies naar de browser.

## Checklist
- [x] Verwijder `traceback.format_exc()` uit de API response in `views_admin.py`
- [x] Verwijder het `debug` veld uit de error response
- [x] Zoek naar andere plekken waar `traceback.format_exc()` in API responses gebruikt wordt
- [x] Tests
- [x] Verify
