# 255 – D13 – Prompt Template Library

| | |
|---|---|
| Status | 📐 READY |
| Spec-Kitty | `kitty-specs/001-prompt-template-library/` |
| Effort | ~10 uur |

## Doel

Migreer 10 hardcoded prompt templates van `teamreel_prompts.py` naar database-opslag door het bestaande `GenerationTemplate` model uit te breiden. Vervang alle `importlib` aanroepen door database lookups. Bied Django Admin UI voor prompt editing en read-only DRF API voor frontend.

## Delivery Checklist

- [ ] Migrations: Applied to Railway
- [ ] Tests: pytest passes
- [ ] Admin: GenerationTemplateAdmin bijgewerkt
- [ ] API: Endpoints getest
- [ ] Documentation: Updated
