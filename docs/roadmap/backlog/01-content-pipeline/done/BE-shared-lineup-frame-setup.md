# Q078 — Shared lineup frame setup

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Pipeline analyse |
| Impact | 🟡 important |
| Effort | ~2 uur |

## Wat

De lineup video composer en lineup flyer generator doen dezelfde 3 stappen voor "frame setup":

1. **Background downloaden** → landscape check → opslaan
2. **Header renderen** via `render_header_pil()` met identieke parameters uit `LineupData`
3. **Sponsor downloaden + preppen** → checkerboard strip + crop

### Duplicatie

**`lineup_composer.py`** (regels ~1240-1290):
```python
bg_is_landscape = prepare_background(lineup_data.field_background_url, bg_path)
header_img = render_header_pil(width=WIDTH, height=HEADER_HEIGHT, logo_url=..., ...)
header_img.convert("RGB").save(str(header_path), "PNG")
if lineup_data.sponsor_url:
    if not prepare_sponsor(lineup_data.sponsor_url, sponsor_path):
        sponsor_path = None
```

**`lineup_flyer_generator.py`** (regels ~230-280):
```python
bg_img = _download_image(data.field_background_url)
# ... landscape handling ...
header_img = render_header_pil(width=HEADER_WIDTH, height=HEADER_HEIGHT, logo_url=..., ...)
header_img.convert("RGB").save(str(header_path), "PNG")
sponsor_img = _download_image(data.sponsor_url)
# ... inline strip_checkerboard + crop ...
```

Dit is ~60 regels identieke logica per bestand. Als de header-interface verandert, moeten beide mee.

### Design beslissing

Introduceer `prepare_lineup_frame()` in `_common.py`:

```python
@dataclass
class FrameAssets:
    bg_path: Path
    bg_is_landscape: bool
    header_path: Path
    sponsor_path: Path | None

def prepare_lineup_frame(
    data: LineupData,
    asset_dir: Path,
    brand_primary_hex: str,
) -> FrameAssets:
    """Download bg, render header, prep sponsor. Shared by composer + flyer."""
```

Beide callers reduceren van ~30 regels naar 1 functie-aanroep + resultaat-destructuring.

**Note:** Dit Q-item hangt af van Q076 (sponsor prep uniformering) — daarna gebruiken beide bestanden `prepare_sponsor()` en is de extractie simpel. Kan ook onafhankelijk als de flyer eerst gemigreerd wordt naar `prepare_sponsor()`.

## Checklist

- [ ] `_common.py`: `FrameAssets` dataclass + `prepare_lineup_frame()` toevoegen
- [ ] `lineup_composer.py`: frame setup vervangen door `prepare_lineup_frame()` aanroep
- [ ] `lineup_flyer_generator.py`: frame setup vervangen door `prepare_lineup_frame()` aanroep
- [ ] Fallback-logica behouden: als er geen background is, synthetisch veld genereren (composer) of groen vlak (flyer)
- [ ] Tests: alle bestaande video tests moeten slagen
- [ ] Verify
