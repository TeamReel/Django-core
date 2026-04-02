# Q075 — Thin wrappers opschonen (ronde 2)

| | |
|---|---|
| Status | � DONE |
| Bron | Pipeline analyse (post-Q068) |
| Impact | 🟢 nice-to-have |
| Effort | ~2 uur |

## Wat

Q068 verwijderde de ergste wrappers (volledige kopieën), maar er staan nog **14+ thin 1-line wrappers** verspreid over 6 bestanden. Elke wrapper doet niets meer dan de `_common.py`-functie doorsturen. Dit voegt ruis toe en belemmert code-navigatie.

### Inventaris

**`then_vs_now_composer.py`** (4 wrappers):
- `_get_ffmpeg_path()` → `get_ffmpeg_path()` (16 call sites)
- `_download_file()` → `download_file()` (6 call sites)
- `_resolve_font_path()` → `resolve_ffmpeg_font_path()` (2 call sites)
- `_probe_duration()` → `probe_duration()` (12 call sites)

**`lineup_flyer_generator.py`** (2 wrappers):
- `_get_font()` → `get_pil_font()` (meerdere call sites)
- `_get_ffmpeg_path()` → `get_ffmpeg_path()` (1 call site)

**`lineup_scene_generator.py`** (3 wrappers):
- `_download_image()` → `download_image_cached()` inline
- `_get_font()` → `get_pil_font()` (meerdere call sites)
- `_upload_and_get_url()` → `upload_image_to_storage()` (1 call site)

**`match_flyer_generator.py`** (3 wrappers):
- `_download_image()` → `download_image()` (vele call sites)
- `_get_font()` → `header_generator.get_font()` (extra indirectie!)
- `_clean_logo()` → `header_generator._clean_logo_alpha()` (2 call sites)

**`processors/match_intro.py`** (1 wrapper):
- `_download_image()` → `download_image()` (3 call sites)

**`rvm_processor.py`** (2 wrappers):
- `_get_ffmpeg_path()` → `get_ffmpeg_path()` (4 call sites)
- `_get_ffprobe_path()` → `get_ffprobe_path()` (1 call site)

**`team_poster_generator.py`** (1 alias):
- `_download_image_bytes = download_image_bytes` (module-level alias, 1 call site)

### Bonus: hardcoded canvas dimensies

`then_vs_now_composer.py` regel 1165-1166:
```python
target_w = 1080  # → CANVAS_WIDTH
target_h = 1920  # → CANVAS_HEIGHT
```
Importeert `CANVAS_WIDTH`/`CANVAS_HEIGHT` al maar gebruikt ze hier niet.

## Checklist

- [x] `then_vs_now_composer.py`: 4 wrappers verwijderen, alle call sites direct op `_common` imports
- [x] `then_vs_now_composer.py`: `target_w = 1080` / `target_h = 1920` → constants
- [x] `lineup_flyer_generator.py`: 2 wrappers verwijderen
- [x] `lineup_scene_generator.py`: 2 wrappers verwijderen (`_get_font`, `_upload_and_get_url`), `_download_image` behouden (cache-aware → Q077)
- [x] `match_flyer_generator.py`: 4 wrappers verwijderen (`_download_image`, `_get_font`, `_clean_logo`, `_draw_centered`)
- [x] `processors/match_intro.py`: 1 wrapper verwijderen + `_clean_logo_alpha` → `clean_logo_alpha`
- [x] `rvm_processor.py`: 2 wrappers verwijderen
- [x] `team_poster_generator.py`: alias verwijderen
- [x] `header_generator.py`: public aliases `clean_logo_alpha` + `draw_centered_text` toegevoegd
- [x] Tests: alle 281 video tests slagen
- [x] Verify
