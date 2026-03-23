# H9 — Cleanup: Dual-Write Stop & Role-Only

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~2 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | H8 (migratie gedraaid) |

## Doel

Na succesvolle migratie: stop dual-write, schrijf alleen nog naar `roles.{role}.*`. Verwijder root-level fallback reads.

## Implementatie

### 1. Backend: stop dual-write

**Bestand**: `src/video/tasks/asset_processing.py`

- `_update_variant_metadata()`: verwijder root-level write als role meegegeven
- Root-level write alleen nog als `role is None` (legacy edge case)

**Bestand**: `src/projects/utils/role_assets.py`

- `set_asset_for_role()`: verwijder `dual_write` parameter, altijd role-only
- `get_assets_for_role()`: optioneel fallback naar root verwijderen

### 2. Frontend: cleanup fallback

**Bestand**: `demo/src/utils/roleAssets.ts`

- `getAssetsForRole()`: verwijder root-fallback (of maak configurable flag)
- Evt. deprecation warning als root-level assets zonder role gevonden worden

### 3. Serializer cleanup

**Bestand**: `src/projects/api/serializers.py`

- `get_metadata()`: expose `roles` direct, stop root-level asset merging
- API response format: `teamreel_assets.roles.{role}.*`

### 4. Feature flag optie

Overweeg settings flag:

```python
# settings
ASSETS_ROLE_ONLY = True  # False during migration period
```

Zodat rollback mogelijk is als problemen opduiken.

### Tests

- Test dat writes alleen naar role gaan (niet meer naar root)
- Test dat reads zonder fallback werken (alle data in role)
- Test rollback scenario: flag terug naar False → fallback reads weer actief

## Acceptatiecriteria

- [ ] Dual-write gestopt
- [ ] Writes gaan alleen naar `roles.{role}.*`
- [ ] Root-level fallback verwijderd (of achter flag)
- [ ] Serializer exposeert role-based assets
- [ ] Rollback mogelijk via feature flag
- [ ] Tests
