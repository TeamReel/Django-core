# H4 — Management Commands Update

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~2 uur |
| Laag | Backend |
| Afhankelijkheid | H1 |

## Doel

Alle asset-gerelateerde management commands updaten naar geneste variant + role structuur.

## Commands

### 1. `process_teamreel_assets.py`

- Write-path (lijn 125): gebruik `set_asset_variant()` helper
- Read-path (lijn 93): gebruik `get_asset_variant()` helper
- Voeg `--role` CLI argument toe

### 2. `reprocess_pending_assets.py`

- Read iteratie (lijn 343): `split("_", 1)` → geneste dict iteratie
- Re-queue: pass `role` + `variant_id` apart door naar Celery task

### 3. `reset_processed_teamreel_assets.py`

- Iteratie (lijn 371): `split("_", 1)` → geneste dict iteratie
- Reset zowel genest als suffix (voor legacy data)

### 4. Nieuwe: `migrate_variant_format.py` (optioneel, kan ook in H10)

Dry-run support om te testen hoeveel data nog in suffix-formaat staat.

## Tests

- Test elk command met `--dry-run` op test data
- Test dat commands werken met zowel oud als nieuw formaat

## Acceptatiecriteria

- [ ] Alle 3 commands gebruiken helpers i.p.v. `split("_", 1)`
- [ ] `--role` argument beschikbaar waar relevant
- [ ] Backward compat: werkt met oud formaat data
- [ ] Tests
