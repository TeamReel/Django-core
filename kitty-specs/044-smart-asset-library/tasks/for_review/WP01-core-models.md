---
work_package_id: WP01
work_package_name: Core Models & API
priority: P1
estimated_hours: 4
dependencies:
  - B22 File Storage
  - B07 Projects
lane: doing
agent: claude
shell_pid: "10500"
assignee: GitHub Copilot
started_at: 2026-02-02T17:30:00Z
activity_log:
  - timestamp: 2026-02-02T17:30:00Z
    agent: claude
    shell_pid: "10500"
    lane: doing
    note: Started implementation of Core Models & API
  - timestamp: 2026-02-02T19:05:00Z
    agent: claude
    shell_pid: "10500"
    lane: doing
    note: Completed implementation - all models, serializers, views, admin, and migrations created
subtasks:
  - id: T001
    title: Create MediaItem model with required fields
    priority: P1
    status: completed
  - id: T002
    title: Create MediaTag model with hybrid scope
    priority: P1
    status: completed
  - id: T003
    title: Create Collection model with membership M2M
    priority: P1
    status: completed
  - id: T004
    title: Create MediaItemSerializer with nested output
    priority: P1
    status: completed
  - id: T005
    title: Create MediaItemViewSet with project scoping
    priority: P1
    status: completed
  - id: T006
    title: Create MediaTagViewSet with scope filtering
    priority: P1
    status: completed
  - id: T007
    title: Add admin configuration for debugging
    priority: P2
    status: completed
lane: "doing"
agent: "claude"
shell_pid: "10500"
---

# WP01: Core Models & API

## Goal
Build the foundation models (MediaItem, MediaTag, Collection) and basic CRUD API endpoints for the Smart Asset Library.

## Context

### Design Documents
- **Data Model**: See `data-model.md` for complete field specifications
- **API Contract**: See `contracts/openapi.yaml` for endpoint specs
- **Spec**: See `spec.md` for functional requirements FR-001 through FR-020

### Module Dependencies
- **B22 File Storage**: MediaItem.file is FK to FileAsset
- **B07 Projects**: MediaItem.project for scoping
- **B08 Authentication**: User ownership

## Implementation Details

### T001: MediaItem Model
Create the core media asset model at `src/assets/models.py`:

```python
class MediaItemState(models.TextChoices):
    PENDING = "pending", "Pending Processing"
    PROCESSING = "processing", "Processing"
    READY = "ready", "Ready"
    ERROR = "error", "Error"

class MediaItem(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, related_name="media_items")
    file = models.ForeignKey("storage.FileAsset", on_delete=models.CASCADE)

    # Metadata
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    mime_type = models.CharField(max_length=127)
    file_size_bytes = models.BigIntegerField()

    # Media-specific (populated by extraction)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration_seconds = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Processing
    state = models.CharField(max_length=20, choices=MediaItemState.choices, default=MediaItemState.PENDING)
    extraction_metadata = models.JSONField(default=dict, blank=True)

    # Ownership
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    # Optional context (explicit FKs for performance)
    activity = models.ForeignKey("activities.Activity", on_delete=models.SET_NULL, null=True, blank=True)
    generation_request = models.ForeignKey("generative.GenerationRequest", on_delete=models.SET_NULL, null=True, blank=True)

    # Tags
    tags = models.ManyToManyField("MediaTag", related_name="items", blank=True)

    class Meta:
        ordering = ["-created"]
        indexes = [
            models.Index(fields=["project", "-created"]),
            models.Index(fields=["state"]),
        ]
```

### T002: MediaTag Model
Create the tag model with hybrid scope support:

```python
class MediaTag(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE, null=True, blank=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        unique_together = [("project", "slug"), ("slug",)]  # Global slugs unique when project=NULL
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
```

**Scope Logic**:
- `project=NULL, is_system=True` → System global tag (admin-created)
- `project=<uuid>` → Project-scoped user tag

### T003: Collection Model
Create the collection model:

```python
class Collection(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    project = models.ForeignKey("projects.Project", on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    items = models.ManyToManyField(MediaItem, through="CollectionMembership", related_name="collections")

class CollectionMembership(models.Model):
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE)
    media_item = models.ForeignKey(MediaItem, on_delete=models.CASCADE)
    position = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("collection", "media_item")]
        ordering = ["position", "added_at"]
```

### T004: Serializers
Create serializers at `src/assets/serializers.py`:

```python
class MediaTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = MediaTag
        fields = ["id", "name", "slug", "is_system"]
        read_only_fields = ["id", "slug", "is_system"]

class MediaItemSerializer(serializers.ModelSerializer):
    tags = MediaTagSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MediaItem
        fields = [
            "id", "title", "description", "mime_type", "file_size_bytes",
            "width", "height", "duration_seconds", "state",
            "tags", "file_url", "created", "modified"
        ]

    def get_file_url(self, obj):
        return obj.file.get_presigned_url() if obj.file else None
```

### T005-T006: ViewSets
Create ViewSets at `src/assets/views.py`:

```python
class MediaItemViewSet(viewsets.ModelViewSet):
    serializer_class = MediaItemSerializer
    permission_classes = [IsAuthenticated, HasProjectAccess]

    def get_queryset(self):
        return MediaItem.objects.filter(
            project__memberships__user=self.request.user
        ).select_related("file").prefetch_related("tags")
```

### T007: Admin
Register models in `src/assets/admin.py` for debugging.

## Acceptance Criteria

- [ ] All 3 models created with proper fields
- [ ] Migrations generated and applied successfully
- [ ] API endpoints return correct data
- [ ] Project scoping enforced
- [ ] Admin accessible and functional

## Testing Notes

- Test project isolation (user A can't see user B's media)
- Test file relationship integrity
- Test tag scoping (system vs project)

## Activity Log

- 2026-02-02T18:56:46Z – claude – shell_pid=10500 – lane=doing – Started implementation of Core Models & API
