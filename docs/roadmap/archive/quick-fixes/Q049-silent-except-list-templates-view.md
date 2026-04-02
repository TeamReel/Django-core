# Q049 — Silent except in list_asset_templates_view

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review WP03 |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
`list_asset_templates_view()` in `views_generate.py` heeft een bare `except Exception` die alle errors slikt en een leeg templates response teruggeeft — zonder logging. Als de database down is of template data corrupt, ziet de frontend "geen templates" zonder enige foutmelding.

## Checklist
- [x] Voeg `logger.exception()` toe in het except-blok
- [x] Overweeg specifiekere exception types (bijv. `DatabaseError`, `GenerationTemplateNotFoundError`)
- [x] Tests
- [x] Verify
