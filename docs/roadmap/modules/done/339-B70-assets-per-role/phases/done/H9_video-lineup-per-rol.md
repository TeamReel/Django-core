# H9 — Video Lineup per Rol

| | |
|---|---|
| Fase | H9 |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H2 |

## Doel

Video lineup generatie selecteert assets o.b.v. functionele rol van het lid in de lineup.

## Scope

### Lineup asset selectie

**Huidige situatie**: Lineup pakt assets van member, geen rol-context.
**Nieuw**: Lineup kent de rol van elk lid en selecteert bijpassende assets.

```python
def get_lineup_assets(lineup_member):
    """Haal assets op voor een lid in een lineup, o.b.v. hun rol."""
    membership = lineup_member.membership
    role = lineup_member.functional_role  # "keeper" of "player"

    assets = membership.metadata.get("teamreel_assets", {})
    role_assets = assets.get("roles", {}).get(role, {})

    return {
        "intro": get_best_variant(role_assets, "videos", "intro"),
        "celebration": get_best_variant(role_assets, "videos", "celebration"),
        "fullbody": get_variant_value(
            assets, role, "images", "fullbody",
            ROLE_KIT_MAP[role]["default"], "default"
        ),
    }
```

### `get_best_variant()` — Variant selectie voor video

```python
def get_best_variant(role_assets, media_type, asset_type):
    """Selecteer de beste variant (voorkeur: default, anders eerste beschikbare)."""
    kits = role_assets.get(media_type, {}).get(asset_type, {})
    for kit, variants in kits.items():
        if "default" in variants and variants["default"].get("processed"):
            return variants["default"]
        # Eerste variant met processed video
        for variant in variants.values():
            if variant.get("processed"):
                return variant
    return None
```

### Video template rendering

Templates die assets gebruiken:
- Lineup intro: selecteert intro video per rol
- Goal celebration: selecteert celebration per rol
- Team presentation: alle leden met juiste tenue per rol

### Safeguard: missing assets

Als een rol geen processed assets heeft:
- Log warning (niet crashen)
- Gebruik placeholder/fallback afbeelding (geen data fallback)

## Checklist

- [ ] Lineup asset selectie o.b.v. functionele rol
- [ ] `get_best_variant()` helper
- [ ] Keeper in lineup → keeper assets
- [ ] Speler in lineup → speler assets
- [ ] Video templates gebruiken role-based assets
- [ ] Safeguard bij ontbrekende assets (placeholder, geen crash)
- [ ] Tests voor lineup met mixed roles
- [ ] `pytest` groen
