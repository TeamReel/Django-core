# Q084 — Unificeer field_background fallback dimensies

| | |
|---|---|
| Status | � DONE |
| Bron | Pipeline DONE — inconsistente fallbacks |
| Impact | 🟡 important |
| Effort | ~0.5 uur |

## Wat
Wanneer een club geen eigen achtergrondafbeelding heeft, genereert de pipeline een synthetisch voetbalveld via `generate_field_background()`. Maar de dimensies zijn **inconsistent** per caller:

- `lineup_flyer_generator.py` → `1920×1080` (landscape)
- `lineup_builder.py` → `1080×1620`
- `then_vs_now_builder.py` → `1080×1620`
- `lineup_composer.py` → `WIDTH × (HEIGHT - HEADER_HEIGHT)` (berekend)
- `goal_celebration_composer.py` → `WIDTH × (HEIGHT - HEADER_HEIGHT)` (berekend)

Dit kan leiden tot onverwachte resultaten. De fallback dimensies moeten aansluiten bij het verwachte formaat per content type.

## Checklist
- [ ] Definieer constanten: `FALLBACK_BG_PORTRAIT = (CANVAS_WIDTH, 1620)`, `FALLBACK_BG_LANDSCAPE = (1920, CANVAS_HEIGHT)`, `FALLBACK_BG_VIDEO = (CANVAS_WIDTH, CANVAS_HEIGHT - HEADER_HEIGHT)` in `_common.py`
- [ ] Vervang hardcoded dimensies in alle callers door juiste constante
- [ ] Tests
- [ ] Verify
