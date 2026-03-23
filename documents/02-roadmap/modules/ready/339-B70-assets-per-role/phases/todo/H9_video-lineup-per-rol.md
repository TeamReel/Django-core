# H9 — Video Lineup per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend + Frontend |
| Afhankelijkheid | H2 |

## Doel

Video lineup composer selecteert assets op basis van de functionele rol (keeper → goalkeeper tenue, speler → home/away).

## Implementatie

### 1. Lineup asset resolution

```python
def resolve_lineup_assets(participation, asset_type, kit_type, variant_id="default"):
    membership = participation.membership
    role = participation.functional_role or get_primary_role(membership)

    # Gebruik H0 helper: genest → suffix fallback → root fallback
    return get_asset_variant(
        membership.metadata, role, asset_type, kit_type, variant_id,
        fallback_root=True,
    )
```

### 2. Role-aware kit selectie

- Keeper positie → `goalkeeper` kit
- Speler posities → `home`/`away` o.b.v. thuis/uit context
- Standaard variant (`"default"`) tenzij expliciet gekozen

### 3. Frontend lineup preview

- Preview toont correcte assets per positie
- Visual indicator als fallback-asset gebruikt wordt

## Acceptatiecriteria

- [ ] Lineup resolved assets per rol
- [ ] Keeper krijgt goalkeeper tenue
- [ ] Spelers krijgen home/away
- [ ] Variant selectie mogelijk (default of specifiek)
- [ ] Fallback naar root als role-asset ontbreekt
- [ ] Tests
