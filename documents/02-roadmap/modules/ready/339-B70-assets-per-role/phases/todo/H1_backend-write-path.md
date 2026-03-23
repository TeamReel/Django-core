# H1 — Backend Write-Path per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~3 uur |
| Laag | Backend |
| Afhankelijkheid | H0 |

## Doel

Modify de backend write-functies zodat assets naar `roles.{role}.*` worden geschreven. Dual-write: ook naar root voor backward compat.

## Implementatie

### 1. `_update_variant_metadata()` uitbreiden

**Bestand**: `src/video/tasks/asset_processing.py`

Huidige functie schrijft naar `metadata.teamreel_assets.images.{type}.{kit}`. Uitbreiden met optionele `role` parameter:

```python
def _update_variant_metadata(
    membership: object,
    *,
    asset_type: str,
    kit_type: str,
    variant_id: str | None,
    variant_value: dict,
    role: str | None = None,  # ← NEW
) -> None:
    # Bestaande write (root level) — behouden voor backward compat
    # ... existing code ...

    # NEW: also write to roles.{role} if role is provided
    if role:
        roles = tr.setdefault("roles", {})
        role_data = roles.setdefault(role, {})
        if asset_type in IMAGE_TYPES:
            images = role_data.setdefault("images", {})
            cat = images.setdefault(asset_type, {})
            cat[kit_type] = variant_value
        else:
            videos = role_data.setdefault("videos", {})
            cat = videos.setdefault(asset_type, {})
            cat[kit_type] = variant_value
```

### 2. Write-helper utility

**Bestand**: `src/projects/utils/role_assets.py` (aanvullen op H0)

```python
def set_asset_for_role(
    metadata: dict,
    role: str,
    asset_type: str,
    kit_type: str,
    value: dict,
    *,
    dual_write: bool = True,
) -> dict:
    """Write asset variant to roles.{role} and optionally to root."""
```

### Tests

- Test dual-write: both root + role populated
- Test role-only write: `dual_write=False`
- Test overschrijven: bestaande variant updated, niet verdubbeld
- Test metadata integrity: andere velden niet aangetast

## Acceptatiecriteria

- [ ] `_update_variant_metadata()` accepteert `role` parameter
- [ ] Dual-write: root + `roles.{role}` beide bijgewerkt
- [ ] `set_asset_for_role()` utility beschikbaar
- [ ] Bestaande writes (zonder role) blijven exact werken
- [ ] Tests voor write-path
