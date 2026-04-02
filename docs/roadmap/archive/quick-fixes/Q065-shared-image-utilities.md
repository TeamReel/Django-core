# Q065 â€” Shared image utilities voor generators

| | |
|---|---|
| Status | ï¿½ DONE |
| Bron | Pipeline analyse â€” generator duplicatie |
| Impact | ðŸŸ¢ nice-to-have |
| Effort | ~1 uur |

## Wat
`lineup_flyer_generator.py` en `lineup_scene_generator.py` hebben identieke utility functies:

- `_download_image()` + `_image_cache` dict (~15 regels elk)
- `_upload_and_get_url()` (~15 regels elk)
- `_get_font()` wrapper (~10 regels elk)

Dit staat deels al in `_common.py` maar wordt niet gebruikt. `_common.py` heeft `_download_image_cached()` die hetzelfde doet.

**Consolideer naar `_common.py` en importeer in beide generators.**

## Checklist
- [x] Verifieer welke utilities al in `_common.py` staan
- [x] Voeg ontbrekende toe (`_upload_and_get_url`)
- [x] Refactor `lineup_flyer_generator.py` â†’ importeer uit `_common`
- [x] Refactor `lineup_scene_generator.py` â†’ importeer uit `_common`
- [x] Tests
- [x] Verify

