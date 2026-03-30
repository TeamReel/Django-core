# H2 — Backend Write-Path (alle 8 locaties)

| | |
|---|---|
| Fase | H2 |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H0 |

## Doel

Alle 8 write-locaties omzetten van suffix-based naar geneste structuur met role-scoping. Geen dual-write — alleen nieuw formaat.

## Scope

### Locatie 1-2: `src/video/tasks/asset_processing.py`

**`_update_variant_metadata()` (lijn ~54)**
```python
# WAS:
composite_key = f"{kit_type}_{variant_id}" if variant_id != kit_type else kit_type
cat[composite_key] = variant_value

# WORDT:
from src.video.utils.asset_metadata import set_variant_value
variant = variant_id if variant_id and variant_id != kit_type else "default"
set_variant_value(membership, role, media_type, asset_type, kit_type, variant, variant_value)
```

**`_get_variant_state()` (lijn ~100)**
```python
# WAS:
composite_key = f"{kit_type}_{variant_id}"
return cat.get(composite_key, {}).get("processing_state")

# WORDT:
from src.video.utils.asset_metadata import get_variant_value
variant = variant_id or "default"
value = get_variant_value(membership, role, "videos", asset_type, kit_type, variant)
return value.get("processing_state") if value else None
```

### Locatie 3-5: `src/video/views/job.py`

**`process_asset()` (lijn ~637)** — Nu `role` verplicht in request data
**`_set_variant_metadata()` (lijn ~1331)** — Vervangen door `set_variant_value()`
**`_get_variant_metadata()` (lijn ~1377)** — Vervangen door `get_variant_value()`

### Locatie 6-7: `src/generative/views_asset.py`

**Image approval propagation (lijn ~3697)**
```python
# WAS:
cat[f"{kit_type}_{style_variant}"] = variant_value

# WORDT:
set_variant_value(membership, role, "images", asset_type, kit_type, variant, variant_value)
```

**Video approval propagation (lijn ~3846)** — Idem

### Locatie 8: `src/video/management/commands/process_teamreel_assets.py`

Management command gebruikt `set_variant_value()`.

### API wijziging

`process_asset()` endpoint:
- `role` wordt verplicht veld (was: niet aanwezig)
- `variant_id` default `"default"` (was: optioneel, soms None)
- Serializer validatie: role moet in membership.functional_roles

## Checklist

- [ ] `_update_variant_metadata()` schrijft genest via `set_variant_value()`
- [ ] `_get_variant_state()` leest genest via `get_variant_value()`
- [ ] `process_asset()` accepteert en valideert `role` veld
- [ ] `_set_variant_metadata()` en `_get_variant_metadata()` vervangen
- [ ] AI pipeline writes (approval propagation) omgezet
- [ ] Management command omgezet
- [ ] `media.*` aliases nog steeds geschreven (voor legacy frontend reads)
- [ ] Tests voor alle 8 locaties
- [ ] `pytest` groen
