# H8 — Data Migratie Command

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H0, H1 |

## Doel

Management command om bestaande root-level assets te migreren naar per-role structuur.

## Implementatie

### 1. Management command

**Bestand**: `src/projects/management/commands/migrate_assets_to_roles.py`

```python
class Command(BaseCommand):
    help = "Migrate root-level assets to per-role structure in metadata"

    def add_arguments(self, parser):
        parser.add_argument("--org", type=str, help="Only migrate specific org")
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--batch-size", type=int, default=100)

    def handle(self, *args, **options):
        # For each membership with teamreel_assets:
        # 1. Read functional_roles for that user+project
        # 2. Copy root assets to roles.{role} for each role
        # 3. Keep root assets intact (dual-read still works)
```

### 2. Migratie logica

```python
def migrate_membership(membership, roles):
    """Copy root-level assets into roles.{role} for each assigned role."""
    tr = membership.metadata.get("teamreel_assets", {})
    if not tr:
        return False

    roles_dict = tr.setdefault("roles", {})

    for role in roles:
        role_data = roles_dict.setdefault(role, {})

        # Copy images (filter by role-appropriate types)
        if "images" in tr:
            applicable_types = ROLE_ASSET_TYPES.get(role, [])
            applicable_kits = ROLE_KIT_TYPES.get(role, [])
            role_images = {}
            for asset_type, kits in tr["images"].items():
                if asset_type in applicable_types:
                    for kit, value in kits.items():
                        if kit in applicable_kits or not applicable_kits:
                            role_images.setdefault(asset_type, {})[kit] = value
            if role_images:
                role_data["images"] = role_images

        # Same for videos
```

### 3. Safeguards

- `--dry-run`: log wat er zou gebeuren, niets wijzigen
- Batch processing met `iterator()` — geen memory issues
- Idempotent: opnieuw draaien overschrijft niet
- Progress logging: `self.stdout.write()` per batch
- Transaction per batch

### 4. Verificatie command

```python
# verify_role_assets.py
# Check dat alle memberships met functional_roles ook role-assets hebben
```

### Tests

- Test migratie van membership met 2 rollen → assets gekopieerd naar beide
- Test migratie van membership zonder assets → skip
- Test dry-run → geen wijzigingen
- Test idempotentie → 2x draaien = zelfde resultaat
- Test --org filter

## Acceptatiecriteria

- [ ] `migrate_assets_to_roles` command werkt
- [ ] `--dry-run` mode
- [ ] `--org` filter
- [ ] Batch processing (geen OOM)
- [ ] Idempotent
- [ ] Verificatie command
- [ ] Tests
