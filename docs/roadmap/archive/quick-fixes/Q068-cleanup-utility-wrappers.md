# Q068 — FFmpeg path en utility wrappers opschonen

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review — pipeline analyse Q063-Q065 |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat
Na Q065 importeren de meeste files hun utilities uit `_common.py`, maar er blijven onnodige wrappers bestaan. Erger: `processors/match_intro.py` heeft een **volledige kopie** van `_get_ffmpeg_path()` (~20 regels) in plaats van de import te gebruiken.

Overige thin wrappers (`_download_image`, `_get_font`, `_download_file`) zijn functioneel correct maar voegen ruis toe.

## Checklist
- [x] Vervang `_get_ffmpeg_path()` in `match_intro.py` door import uit `_common.py`
- [x] Verwijder onnodige thin wrappers in `match_flyer_generator.py`, `then_vs_now_composer.py`
- [x] Verplaats `_hex_to_rgb()`/`_hex_to_rgba()` naar `_common.py` (3 kopieën)
- [x] Verplaats `ffmpeg_escape()` naar `_common.py` (2 kopieën)
- [x] Tests
- [x] Verify
