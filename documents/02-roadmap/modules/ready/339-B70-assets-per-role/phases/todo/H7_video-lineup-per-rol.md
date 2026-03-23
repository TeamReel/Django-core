# H7 — Video Lineup per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | H0, H2 |

## Doel

Video lineup composer selecteert automatisch de juiste assets op basis van de functionele rol van het lid in de activiteit.

## Implementatie

### 1. Lineup asset resolution

**Bestand**: `src/video/` — lineup/composition service

Bij het samenstellen van een video lineup:
1. Haal `Participation` op → lid + rol in die activiteit
2. Gebruik `get_assets_for_role(metadata, role)` (H0) om assets te resolven
3. Fallback: als role-specifieke assets ontbreken → root-level assets

```python
def resolve_lineup_assets(participation, asset_type, kit_type):
    """Resolve best available asset for a participation."""
    membership = participation.membership
    role = participation.functional_role  # of primary role

    # Try role-specific first
    role_asset = get_asset_variant(membership.metadata, role, asset_type, kit_type)
    if role_asset:
        return role_asset

    # Fallback to root
    return get_asset_variant(membership.metadata, None, asset_type, kit_type)
```

### 2. Video template role awareness

- Keeper positie in lineup → keeper tenue asset
- Spelers → home/away tenue based on context (thuis/uit)
- Staf → training/casual tenue (of excluded from lineup visual)

### 3. Frontend lineup preview

- Lineup preview component toont correcte assets per positie
- Visual indicator als fallback asset gebruikt wordt (geen role-specifiek)

### Tests

- Test lineup met keeper → goalkeeper assets
- Test lineup met speler → home kit assets
- Test fallback: role-specifiek ontbreekt → root asset
- Test mixed lineup: keeper + spelers correct

## Acceptatiecriteria

- [ ] Lineup composer resolved assets per rol
- [ ] Keeper krijgt goalkeeper tenue in video
- [ ] Spelers krijgen correcte tenue (home/away)
- [ ] Fallback naar root als role-assets ontbreken
- [ ] Preview toont correcte assets
- [ ] Tests voor resolution logica
