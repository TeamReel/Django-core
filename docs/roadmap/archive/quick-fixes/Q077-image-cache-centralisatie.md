# Q077 — Image cache centralisatie

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Pipeline analyse |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat

Twee modules hebben een identiek cache-patroon met module-level mutable state:

**`lineup_flyer_generator.py`:**
```python
_image_cache: dict[str, Image.Image | None] = {}

def _reset_cache() -> None:
    _image_cache.clear()

def _download_image(url: str) -> Image.Image | None:
    return download_image_cached(url, _image_cache)
```

**`lineup_scene_generator.py`:**
```python
_image_cache: dict[str, Image.Image | None] = {}

def reset_image_cache() -> None:
    _image_cache.clear()

def _download_image(url: str) -> Image.Image | None:
    return download_image_cached(url, _image_cache)
```

### Problemen
1. **Module-level mutable state** — gevaarlijk bij concurrent workers (Celery)
2. **Duplicatie** — zelfde 6 regels in 2 bestanden
3. **Naming inconsistentie** — `_reset_cache()` vs `reset_image_cache()`
4. **Koppeling** — `lineup_builder.py` importeert `reset_image_cache` om cache te resetten vóór/na builds

### Design beslissing

Introduceer een lichtgewicht `ImageCache` class in `_common.py`:

```python
class ImageCache:
    """Per-job image download cache. Thread-safe via instance isolation."""

    def __init__(self) -> None:
        self._store: dict[str, Image.Image | None] = {}

    def get(self, url: str) -> Image.Image | None:
        return download_image_cached(url, self._store)

    def clear(self) -> None:
        self._store.clear()
```

Voordelen:
- Geen module-level state meer
- Elke job maakt eigen instance → thread-safe
- `lineup_builder.py` kan `cache = ImageCache()` meegeven aan generators

## Checklist

- [x] `_common.py`: `ImageCache` class toevoegen
- [x] `lineup_flyer_generator.py`: module-level `_image_cache` + `_reset_cache()` vervangen door `ImageCache` instance
- [x] `lineup_scene_generator.py`: module-level `_image_cache` + `reset_image_cache()` vervangen door `ImageCache` instance
- [x] `lineup_builder.py`: `reset_image_cache()` imports vervangen — `ImageCache` wordt doorgegeven aan scene generators
- [x] Tests: alle bestaande video tests moeten slagen (281 passed)
- [x] Verify
