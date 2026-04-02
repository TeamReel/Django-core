# Q081 — Extract generic _find_best_variant_url

| | |
|---|---|
| Status | � DONE |
| Bron | Pipeline DONE — code duplicatie |
| Impact | 🟡 important |
| Effort | ~0.5 uur |

## Wat
`lineup_builder.py` heeft `_find_best_intro_url()` en `goal_celebration_builder.py` heeft `_find_best_celebration_url()` — exact dezelfde logica, alleen met een ander priority-lijstje. De code in `goal_celebration_builder.py` zegt zelfs letterlijk: *"Same logic as _find_best_intro_url"*.

**Extract een generieke `_find_best_variant_url(variants, kit_type, priority_list, get_url_fn)` naar `_common.py`** en laat beide callers die hergebruiken.

## Checklist
- [ ] Nieuwe functie `find_best_variant_url()` in `_common.py` met `priority_list` parameter
- [ ] `lineup_builder.py` → gebruik `find_best_variant_url` met `_INTRO_STYLE_PRIORITY`
- [ ] `goal_celebration_builder.py` → gebruik `find_best_variant_url` met `_CELEBRATION_STYLE_PRIORITY`
- [ ] Verwijder oude `_find_best_intro_url` en `_find_best_celebration_url`
- [ ] Tests
- [ ] Verify
