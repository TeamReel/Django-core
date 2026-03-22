# H3 — Processing Pipeline per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~4 uur |
| Focus | Backend |
| Afhankelijkheid | H1 |

## Context

AI processing pipeline moet rol-context meekrijgen zodat:
1. Closeup voor keeper: detecteert handschoenen, keepers-tenue
2. Closeup voor speler: standaard veld-tenue
3. Video templates weten welke assets te gebruiken

## Implementatie

### 1. Processing parameters uitbreiden

**Bestand**: `src/generative/tasks/image_processing.py`

```python
@celery_app.task(bind=True, queue="ai-processing")
def process_closeup_photo(
    self,
    membership_id: str,
    source_url: str,
    kit_type: str = "home",
    role: str | None = None,  # NEW
):
    """
    Process closeup photo with role-aware AI.

    Role affects:
    - Background removal parameters
    - Kit detection hints
    - Output variants generated
    """
    membership = ProjectMembership.objects.get(id=membership_id)

    # Role-specific processing hints
    processing_hints = get_processing_hints(role)

    # Call AI service with hints
    result = ai_service.process_image(
        source_url=source_url,
        hints=processing_hints,
    )

    # Save to role-specific path
    metadata = set_member_asset(
        membership.metadata or {},
        asset_type="closeup",
        kit_type=kit_type,
        role=role,
        asset_data={
            "raw": source_url,
            "processed": result.processed_url,
            "processing_state": "completed",
        },
    )
    membership.metadata = metadata
    membership.save(update_fields=["metadata"])


def get_processing_hints(role: str | None) -> dict:
    """Get AI processing hints based on role."""
    hints = {
        "keeper": {
            "detect_gloves": True,
            "kit_style": "goalkeeper",
            "allow_long_sleeves": True,
        },
        "player": {
            "detect_gloves": False,
            "kit_style": "field",
            "allow_long_sleeves": False,
        },
        "coach": {
            "detect_gloves": False,
            "kit_style": "casual",
            "allow_tracksuit": True,
        },
    }
    return hints.get(role, hints["player"])
```

### 2. Video generation met rol-assets

**Bestand**: `src/video/services/lineup_video.py`

```python
def get_member_assets_for_video(member: ProjectMembership, role: str) -> dict:
    """
    Get assets for video generation, respecting role.

    Priority:
    1. Role-specific assets
    2. Legacy fallback
    3. Default placeholders
    """
    metadata = member.metadata or {}

    # Try role-specific
    role_assets = get_member_asset(metadata, "closeup", "home", role=role)
    if role_assets and role_assets.get("processed"):
        return {
            "closeup": role_assets["processed"],
            "source": "role",
        }

    # Fallback to any available
    legacy = get_member_asset(metadata, "closeup", "home")
    if legacy and legacy.get("processed"):
        return {
            "closeup": legacy["processed"],
            "source": "legacy",
        }

    # Default placeholder
    return {
        "closeup": None,
        "source": "missing",
    }


def generate_lineup_video(match_id: str):
    """Generate lineup video using role-appropriate assets."""
    match = Match.objects.get(id=match_id)

    for participation in match.participations.all():
        member = participation.membership
        role = participation.functional_role or "player"

        assets = get_member_assets_for_video(member, role)
        # Use assets in video template...
```

## Acceptatiecriteria

- [ ] Processing tasks accept `role` parameter
- [ ] AI hints vary by role (keeper vs player)
- [ ] Video generation uses role-specific assets
- [ ] Fallback to legacy assets when role-specific missing
- [ ] Tests for role-aware processing
