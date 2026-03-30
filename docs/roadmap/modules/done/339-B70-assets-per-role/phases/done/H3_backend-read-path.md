# H3 — Backend Read-Path + Fallback Opruimen

| | |
|---|---|
| Fase | H3 |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H0 |

## Doel

Alle 6 read-locaties omzetten van suffix-parsing/fallback naar directe dict-lookups. De 5-staps fallback chain in `job.py` wordt volledig verwijderd.

## Scope

### Locatie 9: `src/video/views/job.py:640-682` — FALLBACK CHAIN VERWIJDEREN

```python
# WAS (5-staps fallback):
# Step 1:  cat.get(f"{kit_type}_{variant_id}")     — composite
# Step 1b: cat.get(variant_id)                      — bare variant
# Step 1c: cat.get(kit_type)                        — bare kit
# Step 2:  startswith(kit_type) loop                 — wildcard
# Step 3:  non-kit-prefixed bare key                 — escape hatch

# WORDT:
from src.video.utils.asset_metadata import get_variant_value
value = get_variant_value(membership, role, media_type, asset_type, kit_type, variant)
# Klaar. Geen fallbacks.
```

### Locatie 10-11: `src/video/views/job.py` — `split("_", 1)` VERWIJDEREN

**`process_all_variants()` (lijn ~912)**
```python
# WAS:
for composite_key, value in cat.items():
    kit, variant = composite_key.split("_", 1)

# WORDT:
for kit, variant_id, value in iter_variants(membership, role, media_type, asset_type):
    ...
```

**`active_processing_jobs()` (lijn ~1262)** — Idem met `iter_variants()`

### Locatie 12-13: Management commands — `split("_", 1)` VERWIJDEREN

**`reprocess_pending_assets.py:343`**
**`reset_processed_teamreel_assets.py:371`**

Beide gaan `iter_variants()` gebruiken.

### Locatie 14: `src/generative/views_asset.py:3957` — `startswith()` VERWIJDEREN

```python
# WAS:
for key in cat:
    if key.startswith(kit_type):
        ...

# WORDT:
for kit, variant_id, value in iter_variants(membership, role, media_type, asset_type, kit=kit_type):
    ...
```

### `normalize_variant_value()` — VEREENVOUDIGEN

Na migratie zijn alle variant values al genormaliseerd. De functie wordt een simpele assert/validator i.p.v. een convertor.

## Checklist

- [ ] 5-staps fallback chain in `job.py:640-682` VERWIJDERD
- [ ] `split("_", 1)` verwijderd uit `process_all_variants()` (lijn ~912)
- [ ] `split("_", 1)` verwijderd uit `active_processing_jobs()` (lijn ~1262)
- [ ] `split("_", 1)` verwijderd uit `reprocess_pending_assets.py`
- [ ] `split("_", 1)` verwijderd uit `reset_processed_teamreel_assets.py`
- [ ] `startswith()` loop verwijderd uit `views_asset.py:3957`
- [ ] `normalize_variant_value()` vereenvoudigd
- [ ] Geen `split("_", 1)` meer in hele codebase (grep check)
- [ ] Tests voor alle 6 locaties
- [ ] `pytest` groen
