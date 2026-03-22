# H1 — Asset Upload API per Rol

| | |
|---|---|
| Status | 📋 TODO |
| Effort | ~6 uur |
| Focus | Backend |
| Afhankelijkheid | H0 |

## Context

Na H0 hebben we helpers voor role-scoped assets. Nu moeten alle asset upload endpoints de `role` parameter ondersteunen.

## Endpoints om aan te passen

| Endpoint | Bestand | Actie |
|----------|---------|-------|
| `POST /video/jobs/process-asset/` | `src/video/views/job.py` | Accept `role` param |
| `POST /branding/kit-photos/` | `src/branding/views.py` | Accept `role` param |
| `POST /files/upload/` | `src/files/views.py` | Accept `role` in metadata |

## Implementatie

### 1. Video job endpoint

```python
# src/video/views/job.py

@action(detail=False, methods=["post"], url_path="process-asset")
def process_asset(self, request: Request) -> Response:
    """
    Process a member asset (image/video).

    New parameter:
    - role: functional role (keeper, player, etc.) — optional, defaults to primary role
    """
    membership_id = request.data.get("membership_id")
    asset_type = request.data.get("asset_type")
    kit_type = request.data.get("kit_type", "home")
    role = request.data.get("role")  # NEW
    source_url = request.data.get("source_url")

    membership = get_object_or_404(ProjectMembership, id=membership_id)

    # Default to primary role if not specified
    if not role:
        role = get_primary_role(membership)

    # Queue processing job
    task = process_member_asset.delay(
        membership_id=str(membership.id),
        asset_type=asset_type,
        kit_type=kit_type,
        role=role,  # Pass to task
        source_url=source_url,
    )

    return Response({"task_id": task.id}, status=202)
```

### 2. Processing task

```python
# src/video/tasks/asset_processing.py

@celery_app.task(bind=True, queue="ai-processing")
def process_member_asset(
    self,
    membership_id: str,
    asset_type: str,
    kit_type: str,
    role: str | None,
    source_url: str,
):
    """Process asset and store under role-specific path."""
    from src.projects.utils.member_assets import set_member_asset

    membership = ProjectMembership.objects.get(id=membership_id)

    # ... processing logic ...

    # Save to role-specific path
    metadata = dict(membership.metadata or {})
    metadata = set_member_asset(
        metadata,
        asset_type=asset_type,
        kit_type=kit_type,
        asset_data={"raw": source_url, "processed": processed_url},
        role=role,
    )
    membership.metadata = metadata
    membership.save(update_fields=["metadata"])
```

### 3. OpenAPI spec update

```yaml
# In process-asset endpoint
parameters:
  - name: role
    in: body
    required: false
    schema:
      type: string
      enum: [keeper, player, coach, assistant, verzorger, supporter, manager]
    description: Functional role for asset storage. Defaults to member's primary role.
```

## Acceptatiecriteria

- [ ] `role` parameter in process-asset endpoint
- [ ] Celery task stores assets under role path
- [ ] Default to primary role when not specified
- [ ] OpenAPI docs updated
- [ ] Integration test: upload → verify stored under role
