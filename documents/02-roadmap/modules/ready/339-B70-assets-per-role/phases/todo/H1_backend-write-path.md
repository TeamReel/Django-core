# H1 — Backend Write-Path Refactor

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~4 uur |
| Laag | Backend |
| Afhankelijkheid | H0 |

## Doel

Alle 8 write-locaties omzetten van suffix-formaat naar genest formaat + role-scoping.

## Locaties

### 1. `_update_variant_metadata()` — Hoofd write

**Bestand**: `src/video/tasks/asset_processing.py:54`

Was:
```python
composite_key = f"{kit_type}_{variant_id}" if variant_id else kit_type
cat[composite_key] = variant_value
```

Wordt:
```python
variant = variant_id or "default"
# Schrijf genest: type.kit.variant = value
kit_dict = cat.setdefault(kit_type, {})
kit_dict[variant] = variant_value

# Dual-write naar root suffix-formaat (legacy)
if dual_write:
    legacy_key = f"{kit_type}_{variant_id}" if variant_id else kit_type
    cat[legacy_key] = variant_value
```

### 2. `_get_variant_state()` — State lookup

**Bestand**: `src/video/tasks/asset_processing.py:100`

Gebruik `get_asset_variant()` helper uit H0 i.p.v. eigen composite key constructie.

### 3-5. `job.py` — write functies

**Bestand**: `src/video/views/job.py`

- `:637` `process_asset()` — pass `role` + `variant_id` apart door
- `:1331` `_set_variant_metadata()` — gebruik `set_asset_variant()` helper
- `:1377` `_get_variant_metadata()` — gebruik `get_asset_variant()` helper

### 6-7. `generative/views_asset.py` — AI pipeline writes

**Bestand**: `src/generative/views_asset.py`

- `:3697` Propagate image approval — genest schrijven
- `:3846` Propagate video approval — genest schrijven

### 8. `process_teamreel_assets.py` — management command write

**Bestand**: `src/video/management/commands/process_teamreel_assets.py:125`

Gebruik `set_asset_variant()` helper.

## Role-parameter toevoegen

Alle write-functies accepteren nu `role: str | None`:
- Als `role` meegegeven → schrijf naar `roles.{role}.*`
- Als `role` is None → schrijf naar root (legacy) + auto-detect primaire rol

## Tests

- Test `_update_variant_metadata()` met variant → geneste opslag
- Test `_update_variant_metadata()` zonder variant → `"default"` key
- Test dual-write → zowel genest als suffix geschreven
- Test role parameter → `roles.player.images.*` structuur
- Test backward compat → zonder role → root-level

## Acceptatiecriteria

- [ ] Alle 8 write-locaties gebruiken genest formaat
- [ ] `role` parameter beschikbaar op alle writes
- [ ] Dual-write actief (legacy suffix + genest)
- [ ] `"default"` als standaard variant_id
- [ ] Geen regressie op bestaande flows
