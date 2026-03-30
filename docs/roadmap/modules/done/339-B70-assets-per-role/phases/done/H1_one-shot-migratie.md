# H1 — One-Shot Migratie Command

| | |
|---|---|
| Fase | H1 |
| Effort | ~4 uur |
| Laag | Backend |
| Afhankelijkheid | H0 |

## Doel

Management command dat ALLE bestaande metadata (4 legacy formaten) in één keer converteert naar het nieuwe geneste formaat. Na deze migratie is er één formaat in productie.

## Scope

### `migrate_asset_metadata` command

```python
# src/video/management/commands/migrate_asset_metadata.py

class Command(BaseCommand):
    help = "Migrate all teamreel_assets metadata to nested role/kit/variant format"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--org", type=str, help="Migrate single org")

    def handle(self, *args, **options):
        # 1. Query all ProjectMemberships with teamreel_assets
        # 2. For each membership:
        #    a. Detect role(s) from membership.functional_roles
        #    b. Parse existing data (handle all 4 formats)
        #    c. Build new nested structure
        #    d. Backup original in _legacy_assets
        #    e. Write new structure
        # 3. Report: migrated, skipped, errors
```

### Formaat-detectie en conversie

**Format 1 — Flat media** (`media.kit.url`):
```python
# Input:  {"media": {"kit": {"url": "s3://..."}}}
# Output: roles.{primary_role}.images.fullbody.{kit}.default = {"raw": url}
```

**Format 2 — Bare keys** (`videos.intro.arms_crossed`):
```python
# Input:  {"videos": {"intro": {"arms_crossed": {...}}}}
# Kit is missing → infer from membership kit_types or use "home"
# Output: roles.{role}.videos.intro.home.arms_crossed = {...}
```

**Format 3 — Composite string** (`videos.intro.home_arms_crossed = "url"`):
```python
# Input:  {"videos": {"intro": {"home_arms_crossed": "s3://..."}}}
# Split key, normalize value string → object
# Output: roles.{role}.videos.intro.home.arms_crossed = {raw: url, ...}
```

**Format 4 — Composite object** (`videos.intro.home_arms_crossed = {raw, processed, ...}`):
```python
# Input:  {"videos": {"intro": {"home_arms_crossed": {"raw": "...", ...}}}}
# Split key, keep object
# Output: roles.{role}.videos.intro.home.arms_crossed = {raw, processed, ...}
```

### Rol-toewijzing

```python
def determine_role(membership, kit_key=None):
    """Bepaal rol o.b.v. membership + kit context."""
    roles = membership.functional_roles  # Lijst uit F26
    if kit_key == "goalkeeper":
        return "keeper"
    if "keeper" in roles and kit_key == "goalkeeper":
        return "keeper"
    # Default: primaire rol (eerste in lijst)
    return roles[0] if roles else "player"
```

### Backup

```python
# Elk gemigreerd membership krijgt:
metadata["teamreel_assets"]["_legacy_assets"] = {
    "images": original_images,
    "videos": original_videos,
    "media": original_media,
    "migrated_at": "2025-01-15T12:00:00Z"
}
# Root-level images/videos worden VERWIJDERD na succesvolle migratie
```

### `verify_asset_metadata` command

```python
# src/video/management/commands/verify_asset_metadata.py
# Controleert:
# - Alle memberships met _legacy_assets hebben ook roles.* data
# - Geen root-level images/videos meer (behalve media.* aliases)
# - Alle variant values zijn dicts met raw/processed keys
# - Alle rollen matchen met membership.functional_roles
```

## Checklist

- [ ] `migrate_asset_metadata` command met `--dry-run` en `--org` flags
- [ ] Alle 4 formaten correct gedetecteerd en geconverteerd
- [ ] `_legacy_assets` backup voor ieder gemigreerd membership
- [ ] Root-level `images`/`videos` verwijderd na succesvolle conversie
- [ ] `verify_asset_metadata` command
- [ ] `--dry-run` rapporteert aantallen per formaat
- [ ] Idempotent: opnieuw draaien veroorzaakt geen dubbele data
- [ ] Batch size + progress logging (100 per batch)
- [ ] Tests met fixtures van alle 4 formaten
- [ ] Performance: max 30 sec voor ~5000 memberships
