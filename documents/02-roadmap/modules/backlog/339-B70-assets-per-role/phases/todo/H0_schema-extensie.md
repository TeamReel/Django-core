# H0 — Schema Extensie & Backward-Compatible Migratie

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~4 uur |
| Focus | Backend |
| Afhankelijkheid | — |

## Context

`ProjectMembership.metadata.teamreel_assets` is nu een flat structure:
```json
{
  "images": { "closeup": { "home": {...} } }
}
```

Dit moet uitgebreid naar role-scoped:
```json
{
  "roles": {
    "keeper": { "images": { "closeup": {...} } },
    "player": { "images": { "closeup": {...} } }
  },
  // Legacy fallback blijft werken
  "images": { "closeup": { "home": {...} } }
}
```

## Implementatie

### 1. Helper functies voor asset access

**Bestand**: `src/projects/utils/member_assets.py` (nieuw)

```python
from typing import Any, Optional

def get_member_asset(
    metadata: dict,
    asset_type: str,  # "closeup", "fullbody", "intro", etc.
    kit_type: str = "home",
    role: Optional[str] = None,
) -> Optional[dict]:
    """
    Get asset from metadata, checking role-specific first, then fallback.

    Priority:
    1. roles.{role}.images.{asset_type}.{kit_type}
    2. images.{asset_type}.{kit_type} (legacy fallback)
    """
    tr = metadata.get("teamreel_assets", {})

    # Try role-specific first
    if role:
        role_assets = tr.get("roles", {}).get(role, {})
        asset = role_assets.get("images", {}).get(asset_type, {}).get(kit_type)
        if asset:
            return asset

    # Fallback to legacy flat structure
    return tr.get("images", {}).get(asset_type, {}).get(kit_type)


def set_member_asset(
    metadata: dict,
    asset_type: str,
    kit_type: str,
    asset_data: dict,
    role: Optional[str] = None,
) -> dict:
    """
    Set asset in metadata under role-specific path.
    Creates nested structure if needed.
    """
    if "teamreel_assets" not in metadata:
        metadata["teamreel_assets"] = {}
    tr = metadata["teamreel_assets"]

    if role:
        # New role-scoped structure
        if "roles" not in tr:
            tr["roles"] = {}
        if role not in tr["roles"]:
            tr["roles"][role] = {}
        if "images" not in tr["roles"][role]:
            tr["roles"][role]["images"] = {}
        if asset_type not in tr["roles"][role]["images"]:
            tr["roles"][role]["images"][asset_type] = {}
        tr["roles"][role]["images"][asset_type][kit_type] = asset_data
    else:
        # Legacy path (for backward compat)
        if "images" not in tr:
            tr["images"] = {}
        if asset_type not in tr["images"]:
            tr["images"][asset_type] = {}
        tr["images"][asset_type][kit_type] = asset_data

    return metadata


def get_primary_role(membership) -> Optional[str]:
    """Get the primary (first assigned) functional role for a membership."""
    from src.projects.models import ProjectFunctionalRoleAssignment

    assignment = ProjectFunctionalRoleAssignment.objects.filter(
        project=membership.project,
        user=membership.user,
    ).order_by("created_at").first()

    return assignment.role if assignment else None
```

### 2. Update asset upload endpoint

**Bestand**: `src/video/views/job.py`

```python
@action(detail=False, methods=["post"], url_path="process-asset")
def process_asset(self, request: Request) -> Response:
    membership_id = request.data.get("membership_id")
    asset_type = request.data.get("asset_type")
    kit_type = request.data.get("kit_type", "home")
    role = request.data.get("role")  # NEW: optional role parameter

    membership = get_object_or_404(ProjectMembership, id=membership_id)

    # If no role specified, use primary role
    if not role:
        role = get_primary_role(membership)

    # Update metadata using helper
    metadata = dict(membership.metadata or {})
    metadata = set_member_asset(metadata, asset_type, kit_type, asset_data, role=role)
    membership.metadata = metadata
    membership.save(update_fields=["metadata"])
```

### 3. Serializer updates

**Bestand**: `src/projects/api/serializers.py`

```python
class ProjectMembershipSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)

        # Enrich with functional roles
        roles = ProjectFunctionalRoleAssignment.objects.filter(
            project=instance.project, user=instance.user
        ).values_list("role", flat=True)
        data["functional_roles"] = list(roles)

        return data
```

## Tests

```python
def test_get_member_asset_role_specific():
    metadata = {
        "teamreel_assets": {
            "roles": {
                "keeper": {"images": {"closeup": {"home": {"processed": "keeper.jpg"}}}}
            },
            "images": {"closeup": {"home": {"processed": "legacy.jpg"}}}
        }
    }

    # Role-specific takes priority
    assert get_member_asset(metadata, "closeup", "home", role="keeper")["processed"] == "keeper.jpg"

    # Fallback to legacy
    assert get_member_asset(metadata, "closeup", "home", role="player")["processed"] == "legacy.jpg"
    assert get_member_asset(metadata, "closeup", "home")["processed"] == "legacy.jpg"
```

## Acceptatiecriteria

- [ ] `get_member_asset()` helper met role fallback
- [ ] `set_member_asset()` helper voor role-scoped writes
- [ ] Upload endpoint accepteert `role` parameter
- [ ] Geen migratie nodig (schema is JSONField)
- [ ] Unit tests voor helper functies
- [ ] Bestaande assets blijven werken (backward compat)
