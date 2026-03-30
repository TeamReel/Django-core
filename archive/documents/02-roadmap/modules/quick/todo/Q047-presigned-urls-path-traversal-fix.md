# Q047 — Presigned URLs Path Traversal Response Fix

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Code Review / Failing Test |
| Impact | 🔴 critical |
| Effort | ~0.5 uur |

## Wat
De `presigned_urls` endpoint filtert paden met `..` (path traversal) correct uit `valid_paths`, maar retourneert die keys niet in het response. De test `test_path_traversal_blocked` verwacht `urls[path] = None` voor ongeldige paden — maar krijgt een `KeyError` omdat de key ontbreekt.

**Security-impact:** De bescherming werkt (traversal-paden krijgen nooit een URL), maar het response-contract is niet consistent — consumenten weten niet dat hun pad is geweigerd.

## Root Cause
`src/files/views.py` regel ~318-321: ongeldige paden worden uitgefilterd bij `valid_paths` maar niet opgenomen met `None` in het response dict.

## Fix
Na het opbouwen van `valid_paths`, voeg de uitgefilterde paden toe aan `urls` met `None`:

```python
# Collect invalid paths (traversal attempts, non-strings, empty)
invalid_paths = [p for p in paths if p not in valid_paths]

# ... existing logic builds urls dict from valid_paths ...

# Include rejected paths as None in response
for p in invalid_paths:
    if isinstance(p, str) and p:
        urls[p] = None
```

## Checklist
- [ ] Fix response in `src/files/views.py` — include rejected paths as `None`
- [ ] Test: `pytest tests/files/test_presigned_urls.py -x`
- [ ] Verify: `pytest -x` — full suite passes
