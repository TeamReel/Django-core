# Q076 — Sponsor prep uniformering

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Pipeline analyse |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat

`prepare_sponsor()` in `_common.py` doet 3 stappen: download → checkerboard strip → auto-crop. Dit is de correcte sponsor-pipeline die voorkomt dat sponsors met transparantie-artefacten (PNG checkerboard) op de video/flyer verschijnen.

**Probleem**: slechts 2 van 6 bestanden gebruiken `prepare_sponsor()`. De andere 4 doen elk iets anders:

| Bestand | Huidige aanpak | Probleem |
|---------|----------------|----------|
| `lineup_composer.py` | ✅ `prepare_sponsor()` | Correct |
| `goal_celebration_composer.py` | ✅ `prepare_sponsor()` | Correct |
| `then_vs_now_composer.py` | `_download_file()` → direct gebruik | ❌ Geen checkerboard strip |
| `lineup_flyer_generator.py` | Download → inline `_strip_checkerboard` + crop | ⚠️ Werkt maar is 8 regels duplicatie |
| `match_flyer_generator.py` | `_clean_logo()` via `header_generator` | ⚠️ Ander pad, geen disk-save |
| `processors/match_intro.py` | `_download_image()` → direct als PIL | ❌ Geen checkerboard strip |

### Design beslissing

`prepare_sponsor()` schrijft nu naar disk (Path). Generators werken met PIL Images. Twee opties:

**A)** PIL-variant toevoegen: `prepare_sponsor_pil(url) -> Image | None` in `_common.py`
**B)** Disk-based pattern: generators schrijven naar temp, openen daarna

★ **Aanbeveling: A** — voeg een `prepare_sponsor_pil()` variant toe die een PIL Image returned. Composers blijven de disk-variant gebruiken, generators de PIL-variant. Beide delen de strip+crop logica.

## Checklist

- [x] `_common.py`: voeg `prepare_sponsor_pil(url: str) -> Image.Image | None` toe — download, strip, crop, return PIL Image
- [x] Refactor de bestaande `prepare_sponsor()` om `prepare_sponsor_pil()` intern te gebruiken (DRY)
- [x] `then_vs_now_composer.py`: sponsor download vervangen door `prepare_sponsor()` (disk variant)
- [x] `lineup_flyer_generator.py`: inline sponsor strip vervangen door `prepare_sponsor_pil()`
- [x] `match_flyer_generator.py`: sponsor handling vervangen door `prepare_sponsor_pil()`
- [x] `processors/match_intro.py`: sponsor download vervangen door `prepare_sponsor_pil()`
- [x] Tests: alle bestaande video tests moeten slagen (281 passed)
- [x] Verify
