# H10 — Data Migratie Command

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H1, H3 |

## Doel

Management command dat bestaande metadata migreert:
1. **Suffix → genest**: `intro.home_arms_crossed` → `intro.home.arms_crossed`
2. **Root → role**: `images.fullbody.home` → `roles.player.images.fullbody.home`

## Implementatie

### Command: `migrate_asset_metadata.py`

```python
class Command(BaseCommand):
    help = "Migrate asset metadata: suffix→nested + root→role"

    def add_arguments(self, parser):
        parser.add_argument("--org", type=str)
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--batch-size", type=int, default=100)
        parser.add_argument("--suffix-only", action="store_true",
                            help="Only migrate suffix→nested, skip role scoping")
        parser.add_argument("--role-only", action="store_true",
                            help="Only migrate root→role, skip variant nesting")
```

### Migratie stappen per membership

```python
def migrate_membership(membership, roles):
    tr = membership.metadata.get("teamreel_assets", {})

    # 1. Suffix → Genest (images + videos)
    for category in ["images", "videos"]:
        for asset_type, kit_data in tr.get(category, {}).items():
            new_kit_data = {}
            for key, value in kit_data.items():
                if is_variant_value(value):
                    # Parse key: "home_arms_crossed" → kit="home", variant="arms_crossed"
                    kit, variant = parse_composite_key(key)
                    new_kit_data.setdefault(kit, {})[variant] = value
                else:
                    # Already nested or unknown format
                    new_kit_data[key] = value
            tr[category][asset_type] = new_kit_data

    # 2. Root → Role (copy to roles.{role})
    for role in roles:
        applicable = filter_assets_for_role(tr, role)
        tr.setdefault("roles", {}).setdefault(role, {}).update(applicable)
```

### Safeguards

- `--dry-run`: log changes zonder schrijven
- Idempotent: 2x draaien = zelfde resultaat
- `parse_composite_key()` herkent al-geneste data (dict value = al genest)
- Batch processing met `iterator()`
- Transaction per batch
- Progress logging

### Verificatie command

```python
# verify_asset_metadata.py
# Check: hoeveel memberships nog suffix-formaat? Hoeveel nog root-only?
```

## Tests

- Test suffix `home_arms_crossed` → genest `home.arms_crossed`
- Test bare `home` → genest `home.default`
- Test root → role copy met 2 rollen
- Test dry-run → geen wijzigingen
- Test idempotentie
- Test al-geneste data → niet opnieuw gemigreerd

## Acceptatiecriteria

- [ ] `migrate_asset_metadata` command werkt
- [ ] Suffix → genest correct voor alle formaten
- [ ] Root → role correct met role filtering
- [ ] `--dry-run`, `--org`, `--suffix-only`, `--role-only` flags
- [ ] Idempotent
- [ ] Verificatie command
- [ ] Tests
