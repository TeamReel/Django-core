# H2 — Celery Task Role Parameter

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H1 |

## Doel

De Celery task `process_member_asset` en `AssetProcessor` uitbreiden met een `role` parameter zodat assets per rol verwerkt en opgeslagen worden.

## Implementatie

### 1. `process_member_asset` task

**Bestand**: `src/video/tasks/asset_processing.py`

```python
@shared_task(bind=True, ...)
def process_member_asset(
    self,
    membership_id: str,
    asset_type: str,
    kit_type: str,
    raw_url: str,
    variant_id: str | None = None,
    bg_removal_backend: str = "default",
    role: str | None = None,  # ← NEW
) -> dict:
```

- Pass `role` door naar `_update_variant_metadata()`
- S3-pad uitbreiden: `members/{id}/processed/{role}/{type}/{kit}_{variant}.png`

### 2. `AssetProcessor.process_asset()`

**Bestand**: `src/video/services/asset_processor.py`

- Nieuwe parameter `role: str | None = None`
- S3 key builder: als role meegegeven, nesting onder role folder
- Backward compat: zonder role → huidige pad structuur

### 3. API trigger endpoints

Alle plekken die `process_member_asset.delay()` aanroepen moeten `role` meesturen:

- Upload endpoints in `src/files/` of `src/projects/api/`
- AI generation triggers in `src/generative/`
- Inventariseer met `grep_search` welke callers er zijn

### Tests

- Test task met role parameter → S3 key bevat role
- Test task zonder role → backward compat S3 key
- Test dat `_update_variant_metadata` role doorgeeft
- Mock S3 upload verificatie

## Acceptatiecriteria

- [ ] `process_member_asset` accepteert `role` kwarg
- [ ] `AssetProcessor.process_asset()` accepteert `role` kwarg
- [ ] S3-pad bevat role indien meegegeven
- [ ] Alle bestaande callers blijven werken (role=None default)
- [ ] Tests voor task + processor met/zonder role
