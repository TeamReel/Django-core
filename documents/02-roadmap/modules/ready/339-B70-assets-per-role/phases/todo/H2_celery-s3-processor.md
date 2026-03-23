# H2 — Celery + S3 Paden + Processor

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H1 |

## Doel

Celery task en AssetProcessor uitbreiden met `role` parameter. S3 padstructuur herstructureren.

## Implementatie

### 1. `process_member_asset` Celery task

**Bestand**: `src/video/tasks/asset_processing.py`

```python
@shared_task(bind=True, ...)
def process_member_asset(
    self,
    membership_id: str,
    asset_type: str,
    kit_type: str,
    raw_url: str,
    variant_id: str = "default",  # ← was: str | None
    bg_removal_backend: str = "default",
    role: str | None = None,       # ← NEW
) -> dict:
```

- `variant_id` default naar `"default"` i.p.v. `None`
- `role` doorgeven aan `_update_variant_metadata()`

### 2. `AssetProcessor.process_asset()`

**Bestand**: `src/video/services/asset_processor.py`

- Nieuwe parameter `role: str | None = None`

### 3. S3 padstructuur (5 locaties)

**Was**: `members/{id}/processed/{type}/{kit}{_variant}_{hash}.{ext}`
**Wordt**: `members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}`

Alle 5 locaties in `asset_processor.py`:
- Lijn 247: PNG images
- Lijn 479: MP4 passthrough
- Lijn 582: MOV/WebM RVM
- Lijn 788: MP4 preview
- Lijn 1025: WebM rembg

```python
# Nieuw pad:
if role:
    storage_path = f"members/{membership_id}/processed/{role}/{asset_type}/{kit_type}/{variant}_{hash}.{ext}"
else:
    # Legacy: oud pad formaat
    storage_path = f"members/{membership_id}/processed/{asset_type}/{kit_type}/{variant}_{hash}.{ext}"
```

**Let op**: bestaande S3 objecten worden NIET verplaatst. De URL in metadata verwijst naar het juiste object.

### 4. Callers updaten

Alle plekken die `process_member_asset.delay()` aanroepen:
- Stuur `variant_id="default"` als default
- Stuur `role` mee als beschikbaar

## Tests

- Test task met role → S3 pad bevat role segment
- Test task zonder role → legacy pad (backward compat)
- Test variant_id="default" → correct pad
- Test variant_id="arms_crossed" → correct pad

## Acceptatiecriteria

- [ ] Celery task accepteert `role` + `variant_id="default"` defaults
- [ ] AssetProcessor accepteert `role`
- [ ] S3 paden bevatten `{role}/{type}/{kit}/{variant}` structuur
- [ ] Bestaande callers blijven werken (role=None → legacy pad)
- [ ] Tests
