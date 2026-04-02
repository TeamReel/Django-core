# Q086 — Unificeer upload functie-signatures

| | |
|---|---|
| Status | � DONE |
| Bron | Pipeline DONE — drie upload-implementaties |
| Impact | 🟢 nice-to-have |
| Effort | ~1 uur |

## Wat
Er zijn drie verschillende upload-functies met elk een eigen signature en return type:

- `_common.py → upload_image_to_storage(img, prefix)` → retourneert URL string
- `match_flyer_generator.py → _upload_flyer(img, activity_id)` → retourneert dict met metadata
- `lineup_flyer_generator.py → _upload_flyer(file_path, activity_id)` → retourneert URL string
- `team_poster_generator.py → _upload_poster(image_bytes, activity_id)` → retourneert URL string

Elk heeft een iets ander storage pad en iets andere input. Dit maakt de codebase moeilijker te begrijpen.

## Checklist
- [ ] DONE welke specifieke metadata/paden elke upload nodig heeft
- [ ] Maak een generieke `upload_generated_image(data, path_prefix, *, activity_id=None)` in `_common.py`
- [ ] Refactor `match_flyer_generator.py` → gebruik generieke functie
- [ ] Refactor `lineup_flyer_generator.py` → gebruik generieke functie
- [ ] Refactor `team_poster_generator.py` → gebruik generieke functie
- [ ] Tests
- [ ] Verify
