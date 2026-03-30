# H11 — Video Services common utilities extraheren

> **Effort:** ~4 uur | **Impact:** Onderhoudbare video pipeline, bugfixes op 1 plek

## Context

Video services bevatten zware copy-paste code:
- `_get_ffmpeg_path()` gekopieerd in **6 bestanden** (4-stap lookup logica)
- `_download_image()` / `_download_file()` in **9 varianten** (requests.get + PIL/disk)
- Canvas constanten (`WIDTH=1080, HEIGHT=1920, FPS=30`) hardcoded in **7 bestanden**
- Font resolution helpers gedupliceerd

Eén bugfix moet nu op 6-9 plekken. `lineup_flyer_generator` mist zelfs de bundled-FFmpeg path (incomplete kopie).

## To do

### Shared module aanmaken
- [ ] Maak `src/video/services/_common.py` met:
  - `get_ffmpeg_path() → str` — canonical 4-stap versie (bundled → legacy → imageio → system)
  - `download_image(url, timeout=45) → Image` — returns PIL Image
  - `download_file(url, dest, timeout=45) → Path` — streams naar disk
  - Canvas constanten: `CANVAS_WIDTH = 1080`, `CANVAS_HEIGHT = 1920`, `CANVAS_FPS = 30`, `HEADER_HEIGHT`
  - `resolve_font_path(font_name) → Path` — gedeelde font lookup

### Vervang kopieën
- [ ] `lineup_composer.py` — vervang `_get_ffmpeg_path`, `_download_file`
- [ ] `goal_celebration_composer.py` — vervang `_get_ffmpeg_path`, `_download_file`
- [ ] `then_vs_now_composer.py` — vervang `_download_file` (ffmpeg delegeert al)
- [ ] `match_flyer_generator.py` — vervang `_download_image`, canvas constanten
- [ ] `lineup_flyer_generator.py` — vervang `_download_image`, `_get_ffmpeg_path` (bugfix: mist bundled path)
- [ ] `lineup_scene_generator.py` — vervang `_download_image`
- [ ] `team_poster_generator.py` — vervang `_download_image_bytes` (eventueel wrapper)
- [ ] `processors/match_intro.py` — vervang `_get_ffmpeg_path`, `_download_image`
- [ ] `rvm_processor.py` — vervang `_get_ffmpeg_path`
- [ ] `asset_processor.py` — vervang `_download_asset` method

### Bestanden
- `src/video/services/_common.py` (NIEUW)
- `src/video/services/lineup_composer.py`
- `src/video/services/goal_celebration_composer.py`
- `src/video/services/then_vs_now_composer.py`
- `src/video/services/match_flyer_generator.py`
- `src/video/services/lineup_flyer_generator.py`
- `src/video/services/lineup_scene_generator.py`
- `src/video/services/team_poster_generator.py`
- `src/video/services/processors/match_intro.py`
- `src/video/services/rvm_processor.py`
- `src/video/services/asset_processor.py`

## Done criteria

- [ ] Geen duplicate `_get_ffmpeg_path` meer (1 canonical versie)
- [ ] Geen duplicate `_download_image`/`_download_file` meer (1-2 canonical versies)
- [ ] Canvas constanten geïmporteerd uit `_common`, niet hardcoded
- [ ] `lineup_flyer_generator` vindt nu ook bundled FFmpeg (bugfix)
- [ ] Alle bestaande video tests slagen
- [ ] Handmatige smoke test: lineup + flyer generatie werkt
