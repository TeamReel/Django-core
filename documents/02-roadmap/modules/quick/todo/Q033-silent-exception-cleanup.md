# Q033 — Silent Exception Cleanup (Fase 1: Video + Generative)

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
30+ plekken in de codebase waar `except Exception: pass` fouten stilletjes negeert. Hierdoor verdwijnen fouten in video-generatie, branding en asset-verwerking zonder spoor. Resultaat: gebruikers krijgen soms fout gegenereerde content zonder uitleg.

Fase 1 focust op de ergste bestanden:
- `video/services/video_service.py` (8×)
- `video/services/processors/then_vs_now.py` (7×)
- `generative/_asset_helpers.py` (3×)
- `accounts/api/views_admin_detail.py` (5×)

## Checklist
- [ ] Vervang `except Exception: pass` door `except Exception: logger.exception(...)` in video_service.py
- [ ] Idem voor then_vs_now.py
- [ ] Idem voor _asset_helpers.py
- [ ] Idem voor views_admin_detail.py
- [ ] Tests
- [ ] Verify
