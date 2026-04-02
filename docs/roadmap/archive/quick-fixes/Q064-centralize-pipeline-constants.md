# Q064 â€” Centraliseer pipeline constants

| | |
|---|---|
| Status | ï¿½ DONE |
| Bron | Pipeline analyse â€” hardcoded waarden |
| Impact | ðŸŸ¢ nice-to-have |
| Effort | ~1 uur |

## Wat
Meerdere waarden staan hardcoded op meerdere plekken:

- **Default brand kleur `#D2122E`** â€” 8+ keer in 6 bestanden als fallback primary
- **Canvas 1080Ã—1920** â€” staat in `_common.py` maar wordt opnieuw gedeclareerd in `match_flyer_generator.py` en `processors/match_intro.py`
- **Header hoogte 300px** â€” idem, 3 plekken
- **FPS 30** â€” idem, 2 plekken

`_common.py` definieert al `CANVAS_WIDTH`, `CANVAS_HEIGHT`, `HEADER_HEIGHT`, `FPS` maar niet alle files importeren die.

## Checklist
- [x] Voeg `DEFAULT_PRIMARY_COLOR = "#D2122E"` en `DEFAULT_SECONDARY_COLOR = "#FFFFFF"` toe aan `constants.py`
- [x] Vervang alle hardcoded `#D2122E`/`#FFFFFF` fallbacks door de constante
- [x] Vervang herhaalde canvas/header/fps declaraties door imports uit `_common.py`
- [x] Tests
- [x] Verify

