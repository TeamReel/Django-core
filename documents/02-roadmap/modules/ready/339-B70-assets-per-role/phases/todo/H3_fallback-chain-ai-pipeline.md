# H3 — Fallback Chain + AI Pipeline Read-Path

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~4 uur |
| Laag | Backend |
| Afhankelijkheid | H0 |

## Doel

De complexe 5-staps fallback chain in `job.py` vereenvoudigen en de AI pipeline read-logica omzetten naar geneste variant-structuur.

## Implementatie

### 1. Fallback chain vereenvoudigen

**Bestand**: `src/video/views/job.py:640-682`

Huidige chain (5 strategieën):
1. Composite key `home_arms_crossed`
2. Bare variant `arms_crossed`
3. Bare kit `home`
4. Startswith match `home_*`
5. Non-kit-prefixed key

**Nieuwe chain** (3 strategieën, via H0 helpers):
1. Genest: `type.kit.variant` (nieuw formaat)
2. Suffix: `type.{kit}_{variant}` (oud formaat)
3. Root fallback: zonder role scope

```python
# Vervang hele fallback block door:
variant = get_asset_variant(
    membership.metadata,
    role=role,
    asset_type=asset_type,
    kit_type=kit_type,
    variant_id=variant_id or "default",
    fallback_root=True,
)
```

### 2. `process_all_variants()` — lijn 912

**Was**: `split("_", 1)` om kit en variant te scheiden
**Wordt**: itereer over geneste dict `type.{kit}` → dict of variants

### 3. `active_processing_jobs()` — lijn 1262

**Was**: `split("_", 1)` parse
**Wordt**: geneste lookup via helpers

### 4. AI pipeline read-path

**Bestand**: `src/generative/views_asset.py:3957-3968`

**Was**: `startswith()` loop om varianten te vinden
**Wordt**: `get_all_variants(metadata, role, type, kit)` → itereer over dict

### 5. Management commands read-path

**Bestanden**:
- `reprocess_pending_assets.py:343` — `split("_", 1)` → genest
- `reset_processed_teamreel_assets.py:371` — `split("_", 1)` → genest
- `process_teamreel_assets.py:93` — `split("_", 1)` → genest

## Doel: `split("_", 1)` volledig elimineren

Na deze fase mag `split("_", 1)` niet meer voorkomen in asset-gerelateerde code. Alles leest via `get_asset_variant()` of `get_all_variants()`.

## Tests

- Test fallback: genest formaat → direct hit
- Test fallback: suffix formaat → legacy match
- Test fallback: root → found
- Test `get_all_variants()` met mixed formaten → merged resultaat
- Test management commands met oud + nieuw formaat

## Acceptatiecriteria

- [ ] Fallback chain teruggebracht van 5→3 strategieën
- [ ] `split("_", 1)` verdwenen uit asset code
- [ ] AI pipeline leest geneste structuur
- [ ] Management commands lezen geneste structuur
- [ ] Alle legacy formaten nog steeds gelezen (fallback)
- [ ] Tests
