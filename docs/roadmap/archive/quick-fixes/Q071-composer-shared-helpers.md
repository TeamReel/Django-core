# Q071 — Composer shared helpers (background prep + sponsor overlay)

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review — pipeline analyse Q063-Q065 |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
Drie composers (`then_vs_now_composer.py`, `lineup_composer.py`, `goal_celebration_composer.py`) herhalen dezelfde patronen:

1. **Background preparation** (~15 regels elk): download → check orientatie → rotate als landscape → scale naar 1080×1920 → darken overlay
2. **Sponsor overlay** (~20 regels elk): download → strip checkerboard → positioneer bottom-left
3. **Video probe** (`_probe_duration()`): 2 verschillende implementaties

Totaal ~100+ gedupliceerde regels over 3 bestanden.

## Checklist
- [x] Extraheer `prepare_background()` naar `_common.py`
- [x] Extraheer `prepare_sponsor()` naar `_common.py` (incl. strip checkerboard + autocrop)
- [x] Consolideer `probe_duration()` naar `_common.py`
- [x] Refactor alle 3 composers (`then_vs_now`, `lineup`, `goal_celebration`)
- [x] Tests (11/11 pass — `tests/video/test_composer_helpers.py`)
- [x] Verify (215/215 video tests pass)

## Gewijzigde bestanden
- `src/video/services/_common.py` — 3 nieuwe helpers: `probe_duration()`, `prepare_background()`, `prepare_sponsor()`
- `src/video/services/then_vs_now_composer.py` — verwijderd: lokale `_probe_duration()`, inline bg download
- `src/video/services/lineup_composer.py` — verwijderd: inline bg/sponsor prep
- `src/video/services/goal_celebration_composer.py` — verwijderd: inline ffprobe, bg/sponsor prep, `subprocess`/`PIL.Image` imports
- `tests/video/test_composer_helpers.py` — NIEUW: 11 tests voor shared helpers
