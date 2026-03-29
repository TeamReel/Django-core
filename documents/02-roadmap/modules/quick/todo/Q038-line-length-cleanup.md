# Q038 — Line Length Cleanup (ruff E501)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🟢 nice-to-have |
| Effort | ~4 uur |

## Wat
338 regels overschrijden de 100-karakter limiet. Maakt code moeilijker leesbaar in split-view en op kleinere schermen. Niet auto-fixable — vereist handmatige reformatting.

## Scope
Zwaarst getroffen gebieden:
- `video/services/` — veel lange f-strings en FFmpeg commandos
- `accounts/api/views_admin*.py` — lange queryset chains
- `activities/management/commands/` — seed data met lange strings
- `workflows/views/templates.py` — lange URL patterns

## Checklist
- [ ] Focus op top-20 ergste bestanden (>5 violations per bestand)
- [ ] Reformatteer lange regels (line-wrap, variabelen extraheren)
- [ ] Verify: `ruff check src/ --select=E501` → significant minder errors
- [ ] Tests: `pytest -x`
