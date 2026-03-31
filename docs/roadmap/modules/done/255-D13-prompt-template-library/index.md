# 255 – D13 – Prompt Template Library

| | |
|---|---|
| Status | ✅ DONE |
| Spec-Kitty | `kitty-specs/002-prompt-template-library/` |
| Effort | ~10 uur |

## Doel

Migreer 10 hardcoded prompt templates van `teamreel_prompts.py` naar database-opslag door het bestaande `GenerationTemplate` model uit te breiden. Vervang alle `importlib` aanroepen door database lookups. Bied Django Admin UI voor prompt editing en read-only DRF API voor frontend.

## Delivery Checklist

- [x] Migrations: Applied (0009 schema + 0010 seed)
- [x] Tests: pytest passes (70+ tests WP01-WP04)
- [x] Admin: GenerationTemplateAdmin met fieldsets voor prompt editing
- [x] API: ViewSet met CRUD + clone + org-scoping
- [x] Documentation: generative-pipeline.md, api-reference.md, data-model.md
