# Q085 — Extract presign_if_needed() naar _common.py

| | |
|---|---|
| Status | � DONE |
| Bron | Pipeline DONE — duplicatie |
| Impact | 🟢 nice-to-have |
| Effort | ~0.5 uur |

## Wat
Twee builders hebben elk een eigen implementatie van "check of URL al HTTP is, zo niet → presign":

- `then_vs_now_builder.py` → `_presign_if_needed()` (static method, 6× aangeroepen)
- `lineup_builder.py` → `_get_presigned_url()` (instance method, 10× aangeroepen)

Beide doen exact hetzelfde: `if url and not url.startswith("http"): return get_presigned_url(url)`.

## Checklist
- [ ] Verplaats `presign_if_needed(url)` naar `_common.py` of `brand_resolver.py`
- [ ] Refactor `then_vs_now_builder.py` → import en gebruik
- [ ] Refactor `lineup_builder.py` → import en gebruik
- [ ] Tests
- [ ] Verify
