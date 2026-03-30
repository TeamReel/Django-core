# H4 — Celery + S3 + Management Commands

| | |
|---|---|
| Fase | H4 |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H2 |

## Doel

S3-padstructuur updaten en alle Celery tasks / management commands die asset processing triggeren omzetten naar role-aware geneste structuur.

## Scope

### S3 padstructuur (5 locaties in `asset_processor.py`)

**Was**: `members/{id}/processed/{type}/{kit}{_variant}_{hash}.{ext}`
**Wordt**: `members/{id}/processed/{role}/{type}/{kit}/{variant}_{hash}.{ext}`

Voorbeeld:
- Was: `members/abc123/processed/intro/home_arms_crossed_f7a2b1.webm`
- Wordt: `members/abc123/processed/player/intro/home/arms_crossed_f7a2b1.webm`

**Locaties:**

| Lijn | Type | Huidig |
|------|------|--------|
| :247 | PNG images | `{type}/{kit}{_variant}_{hash}.png` |
| :479 | MP4 passthrough | `{type}/{kit}{_variant}_{hash}.mp4` |
| :582 | MOV/WebM RVM | `{type}/{kit}{_variant}_{hash}.webm` |
| :788 | MP4 preview | `{type}/{kit}{_variant}_{hash}.mp4` |
| :1025 | WebM rembg | `{type}/{kit}{_variant}_{hash}.webm` |

Alle worden:
```python
s3_key = f"members/{member_id}/processed/{role}/{asset_type}/{kit}/{variant}_{content_hash}.{ext}"
```

**Let op**: Bestaande S3 objecten worden NIET verplaatst. URLs in metadata verwijzen al naar het juiste object.

### Celery tasks

**`process_member_asset` task** — Moet `role` als argument accepteren:
```python
@shared_task
def process_member_asset(membership_id, asset_type, kit_type, variant_id, role):
    ...
```

**`batch_process_assets` task** — Idem, role meegeven per item.

### Management commands

**`process_teamreel_assets.py`** — `--role` flag toevoegen:
```bash
python manage.py process_teamreel_assets --role player --kit home
```

## Checklist

- [ ] Alle 5 S3-pad locaties omgezet naar `{role}/{type}/{kit}/{variant}_{hash}.{ext}`
- [ ] `process_member_asset` task accepteert `role` parameter
- [ ] Celery task signatures bijgewerkt
- [ ] `process_teamreel_assets` command: `--role` flag
- [ ] S3 pad helper functie (geen inline string building)
- [ ] Bestaande S3 objects blijven bereikbaar (URL in metadata ongewijzigd)
- [ ] Tests voor S3 pad generatie
- [ ] `pytest` groen
