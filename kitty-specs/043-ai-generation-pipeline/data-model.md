# Data Model: B34 Generative Pipelines

**Feature**: AI Content Generation Factory
**Date**: 2026-02-01
**Module**: `src/generative/`

## Entity-Relationship Diagram

```
┌─────────────────────────────┐
│   GenerationTemplate        │
│  (Content Type Definition)  │
├─────────────────────────────┤
│ id: bigint (PK)             │
│ organisation_id: bigint (FK)│
│ name: varchar(200)          │
│ slug: varchar(100) unique   │
│ version: varchar(20)        │◄───┐ versioning
│ parent_template_id: bigint  │────┘ (FK self)
│ is_latest: boolean          │
│ description: text           │
│ input_schema: jsonb         │     JSON Schema format
│ pipeline_config: jsonb      │     provider, model, estimated_cost
│ retention_days: int nullable│     file lifecycle policy
│ is_active: boolean          │
│ created_at: timestamp       │
│ updated_at: timestamp       │
│ created_by_id: bigint (FK)  │
└─────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────┐
│   GenerationRequest         │
│   (Job Lifecycle)           │
├─────────────────────────────┤
│ id: bigint (PK)             │
│ template_id: bigint (FK)    │────► specific version
│ template_version: varchar   │      denormalized
│ requester_id: bigint (FK)   │────► accounts_user
│ project_id: bigint (FK)     │────► projects_project (nullable)
│ status: varchar(20)         │      pending/processing/completed/failed
│ input_data: jsonb           │      validated against input_schema
│ retry_count: int default=0  │
│ error_category: varchar(20) │      transient/permanent/unknown
│ error_message: text         │
│ estimated_cost: decimal     │
│ actual_cost: decimal        │
│ transaction_id: bigint (FK) │────► transactions_transaction
│ created_at: timestamp       │
│ started_at: timestamp       │
│ completed_at: timestamp     │
└─────────────────────────────┘
              │
              │ 1:N
              ▼
┌─────────────────────────────┐
│   GenerationOutput          │
│   (Result Storage)          │
├─────────────────────────────┤
│ id: bigint (PK)             │
│ request_id: bigint (FK)     │
│ file_id: bigint (FK)        │────► files_filestorage or files_file
│ text_content: text          │      for text/json outputs
│ output_type: varchar(20)    │      image/video/text/json
│ metadata: jsonb             │      provider-specific data
│ expires_at: timestamp       │      computed: created_at + retention_days
│ created_at: timestamp       │
└─────────────────────────────┘
```

## Models

### GenerationTemplate

**Purpose**: Defines reusable content generation patterns with input requirements and pipeline configuration.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-incrementing primary key |
| `organisation` | ForeignKey(Organisation) | NOT NULL, CASCADE | Template ownership scope |
| `name` | CharField(200) | NOT NULL | Human-readable template name |
| `slug` | SlugField(100) | NOT NULL, UNIQUE | URL-safe identifier |
| `version` | CharField(20) | NOT NULL, default="1.0.0" | Semantic versioning (1.0.0, 1.1.0, 2.0.0) |
| `parent_template` | ForeignKey(self) | NULL, SET_NULL | Previous version (for version chain) |
| `is_latest` | BooleanField | default=True | Current active version flag |
| `description` | TextField | blank=True | Template purpose and usage notes |
| `input_schema` | JSONField | NOT NULL | JSON Schema for input validation |
| `pipeline_config` | JSONField | NOT NULL | Provider config (provider, model, estimated_cost, graph_id) |
| `retention_days` | IntegerField | NULL, positive | Days until output deletion (NULL=forever) |
| `is_active` | BooleanField | default=True | Soft delete flag |
| `created_at` | DateTimeField | auto_now_add | Timestamp |
| `updated_at` | DateTimeField | auto_now | Timestamp |
| `created_by` | ForeignKey(User) | NOT NULL, PROTECT | Creator reference |

**Indexes**:
- `(organisation_id, slug)` - Unique constraint per org
- `(organisation_id, is_active, is_latest)` - Active template lookup
- `(parent_template_id)` - Version chain traversal

**Example Data**:
```python
# Simple completion template
{
    "name": "Instagram Caption",
    "slug": "instagram-caption",
    "version": "1.0.0",
    "input_schema": {
        "type": "object",
        "properties": {
            "match_id": {"type": "integer"},
            "mvp": {"type": "string"}
        },
        "required": ["match_id"]
    },
    "pipeline_config": {
        "provider": "openai",
        "model": "gpt-4",
        "prompt_template": "Create Instagram caption for match...",
        "estimated_cost": 50.00,
        "cost_last_updated": "2026-01-15T10:30:00Z",
        "cost_sample_size": 15
    },
    "retention_days": 30  # Delete after 30 days
}

# Complex workflow template
{
    "name": "Match Analysis Report",
    "slug": "match-analysis-report",
    "version": "2.0.0",
    "parent_template_id": 123,  # Link to v1.0.0
    "input_schema": {
        "type": "object",
        "properties": {
            "match_id": {"type": "integer"}
        },
        "required": ["match_id"]
    },
    "pipeline_config": {
        "provider": "langgraph",
        "graph_id": "match_analysis_v2",  # Pre-programmed graph
        "llm_provider": "openai",
        "llm_model": "gpt-4",
        "estimated_cost": 300.00
    },
    "retention_days": null  # Keep forever
}
```

---

### GenerationRequest

**Purpose**: Tracks individual generation job lifecycle from submission to completion/failure.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-incrementing primary key |
| `template` | ForeignKey(GenerationTemplate) | NOT NULL, PROTECT | Template version used |
| `template_version` | CharField(20) | NOT NULL | Denormalized for quick access |
| `requester` | ForeignKey(User) | NOT NULL, CASCADE | User who submitted request |
| `project` | ForeignKey(Project) | NULL, CASCADE | Project context (optional) |
| `status` | CharField(20) | NOT NULL, choices | pending/processing/completed/failed |
| `input_data` | JSONField | NOT NULL | User-provided inputs (validated against template.input_schema) |
| `retry_count` | IntegerField | default=0, positive | Number of retry attempts |
| `error_category` | CharField(20) | NULL, choices | transient/permanent/unknown (for failed requests) |
| `error_message` | TextField | blank=True | Detailed error description |
| `estimated_cost` | DecimalField(10,4) | NOT NULL | Reserved credits amount |
| `actual_cost` | DecimalField(10,4) | NULL | Final API cost (settled on completion) |
| `transaction_id` | ForeignKey(Transaction) | NULL, SET_NULL | B11 credit transaction reference |
| `created_at` | DateTimeField | auto_now_add | Submission timestamp |
| `started_at` | DateTimeField | NULL | When Celery worker picked up task |
| `completed_at` | DateTimeField | NULL | When execution finished |

**Status Choices**:
- `pending`: Queued, waiting for Celery worker
- `processing`: Celery worker executing
- `completed`: Success, output created
- `failed`: Permanent failure or max retries exceeded

**Error Category Choices**:
- `transient`: Retry eligible (rate limit, timeout)
- `permanent`: No retry (bad request, auth error)
- `unknown`: Conservative retry (unexpected errors)

**Indexes**:
- `(requester_id, status, created_at)` - User's request history
- `(project_id, status, created_at)` - Project's request history
- `(template_id, status)` - Template usage stats
- `(status, created_at)` - Admin monitoring

**State Transitions**:
```
pending ──┬──► processing ──┬──► completed
          │                 └──► failed (permanent)
          │                       │
          └─────────────────────► failed (transient, retry_count >= 3)
```

**Example Data**:
```python
{
    "id": 12345,
    "template_id": 5,
    "template_version": "2.0.0",
    "requester_id": 42,
    "project_id": 789,
    "status": "completed",
    "input_data": {
        "match_id": 1001,
        "mvp": "Brobbey"
    },
    "retry_count": 1,  # Succeeded after 1 retry
    "estimated_cost": 300.00,
    "actual_cost": 275.50,  # Settled amount
    "transaction_id": 9876,
    "created_at": "2026-02-01T10:00:00Z",
    "started_at": "2026-02-01T10:00:05Z",
    "completed_at": "2026-02-01T10:00:35Z"
}
```

---

### GenerationOutput

**Purpose**: Stores generated content (file references or text) with metadata and expiration tracking.

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | BigAutoField | PK | Auto-incrementing primary key |
| `request` | ForeignKey(GenerationRequest) | NOT NULL, CASCADE | Parent request |
| `file` | ForeignKey(File/FileStorageRecord) | NULL, CASCADE | Media output (B22/B35 integration) |
| `text_content` | TextField | blank=True | Text/JSON output (if not file) |
| `output_type` | CharField(20) | NOT NULL, choices | image/video/text/json |
| `metadata` | JSONField | default=dict | Provider-specific metadata |
| `expires_at` | DateTimeField | NULL | Computed: created_at + template.retention_days |
| `created_at` | DateTimeField | auto_now_add | Output generation timestamp |

**Output Type Choices**:
- `image`: PNG, JPEG (stored in B35/B22)
- `video`: MP4 (stored in B35/B22)
- `text`: Plain text (stored in text_content)
- `json`: Structured data (stored in text_content)

**Indexes**:
- `(request_id)` - Fetch outputs for request
- `(expires_at)` - Cleanup job query (WHERE expires_at < NOW())

**Expiration Logic**:
```python
# On creation
if request.template.retention_days:
    output.expires_at = output.created_at + timedelta(days=request.template.retention_days)
else:
    output.expires_at = None  # Keep forever

# Daily cron job
expired = GenerationOutput.objects.filter(
    expires_at__lt=now(),
    expires_at__isnull=False
)
for output in expired:
    output.file.delete()  # Delete from storage
    output.delete()  # Soft delete record
```

**Example Data**:
```python
# Image output
{
    "id": 67890,
    "request_id": 12345,
    "file_id": 5555,  # FK to B35 FileStorageRecord
    "output_type": "image",
    "metadata": {
        "resolution": "1920x1080",
        "format": "PNG",
        "size_bytes": 524288
    },
    "expires_at": "2026-03-03T10:00:35Z",  # 30 days after creation
    "created_at": "2026-02-01T10:00:35Z"
}

# Text output
{
    "id": 67891,
    "request_id": 12346,
    "text_content": "Ajax defeated PSV 3-1 in a thrilling match...",
    "output_type": "text",
    "metadata": {
        "word_count": 250,
        "language": "en",
        "sentiment": "positive"
    },
    "expires_at": null,  # Keep forever
    "created_at": "2026-02-01T10:05:12Z"
}
```

---

## Relationships

### GenerationTemplate ← GenerationRequest (1:N)
- One template spawns many requests
- Requests are linked to specific version (immutable)
- Cascade: PROTECT (cannot delete template if requests exist)

### GenerationTemplate ← GenerationTemplate (1:N) [Self-referential]
- One template can have multiple versions
- `parent_template` links to previous version
- Cascade: SET_NULL (deletion breaks version chain but preserves data)

### GenerationRequest ← GenerationOutput (1:N)
- One request produces one or more outputs (e.g., image + text)
- Cascade: CASCADE (delete outputs when request deleted)

### User ← GenerationRequest (1:N)
- One user creates many requests
- Cascade: CASCADE (delete requests when user deleted)

### Project ← GenerationRequest (1:N, optional)
- Requests can be scoped to a project
- Cascade: CASCADE (delete requests when project deleted)

### Organisation ← GenerationTemplate (1:N)
- Templates are scoped to organisation
- Cascade: CASCADE (delete templates when org deleted)

### Transaction ← GenerationRequest (1:1, optional)
- Each request links to credit transaction (B11 integration)
- Cascade: SET_NULL (preserve request history if transaction deleted)

### File ← GenerationOutput (1:1, optional)
- Outputs with media link to file storage (B35/B22)
- Cascade: CASCADE (delete file when output deleted)

---

## Validation Rules

### GenerationTemplate
1. `slug` must be unique per organisation
2. `version` must follow semantic versioning (regex: `^\d+\.\d+\.\d+$`)
3. `input_schema` must be valid JSON Schema
4. `pipeline_config['provider']` must be in `["openai", "langgraph"]`
5. `retention_days` must be positive if not NULL
6. Only one version can have `is_latest=True` per slug

### GenerationRequest
1. `input_data` must validate against `template.input_schema` (jsonschema library)
2. `status` transitions must follow state machine (pending → processing → completed/failed)
3. `retry_count` must be ≤ max_retries (default 3)
4. `actual_cost` can only be set when status="completed"

### GenerationOutput
1. Either `file` OR `text_content` must be set (not both)
2. `output_type="image|video"` requires `file` to be set
3. `output_type="text|json"` requires `text_content` to be set
4. `expires_at` must be NULL if `request.template.retention_days` is NULL

---

## Migration Strategy

### Initial Migration
```python
# migrations/0001_initial.py
class Migration(migrations.Migration):
    dependencies = [
        ('organisations', '0001_initial'),
        ('accounts', '0001_initial'),
        ('projects', '0001_initial'),
        ('transactions', '0001_initial'),
        ('files', '0001_initial'),  # B22 or B35
    ]

    operations = [
        migrations.CreateModel(
            name='GenerationTemplate',
            fields=[...],
            options={'db_table': 'generative_generationtemplate'},
        ),
        migrations.CreateModel(
            name='GenerationRequest',
            fields=[...],
            options={'db_table': 'generative_generationrequest'},
        ),
        migrations.CreateModel(
            name='GenerationOutput',
            fields=[...],
            options={'db_table': 'generative_generationoutput'},
        ),
        migrations.AddIndex(
            model_name='generationtemplate',
            index=models.Index(fields=['organisation', 'slug'], name='generative_org_slug_idx'),
        ),
        # ... more indexes
    ]
```

### Future Migrations
- **0002_add_template_versioning**: Add `parent_template`, `is_latest`, `version` fields
- **0003_add_retention_policy**: Add `retention_days`, `expires_at` fields
- **0004_add_cost_metadata**: Enhance `pipeline_config` with cost tracking fields

---

## Query Patterns

### Common Queries

```python
# 1. Get active templates for organisation
templates = GenerationTemplate.objects.filter(
    organisation_id=org_id,
    is_active=True,
    is_latest=True
).select_related('created_by')

# 2. Get user's request history
requests = GenerationRequest.objects.filter(
    requester_id=user_id
).select_related('template', 'requester', 'project').order_by('-created_at')

# 3. Get request with outputs
request = GenerationRequest.objects.prefetch_related(
    'generation_outputs__file'
).get(id=request_id)

# 4. Find expired outputs for cleanup
expired = GenerationOutput.objects.filter(
    expires_at__lt=now(),
    expires_at__isnull=False
).select_related('file')

# 5. Get template version history
versions = GenerationTemplate.objects.filter(
    Q(id=template_id) | Q(parent_template_id=template_id)
).order_by('-version')
```

### Performance Optimizations
- Use `select_related()` for single FK lookups (template, requester, project)
- Use `prefetch_related()` for reverse FK lookups (generation_outputs)
- Add compound indexes for common filter combinations
- Use `only()` to reduce payload size for list views

---

## Business Logic Constraints

### Credit Reservation Rules
1. Cannot submit request if user's available credits < estimated_cost
2. Transaction must be created with status="pending" before queueing
3. On completion: settle transaction at actual_cost
4. On failure: cancel transaction (full refund)

### Retry Logic
1. TRANSIENT errors: retry max 3× with exponential backoff (30s, 300s, 900s)
2. PERMANENT errors: no retry, immediate refund
3. UNKNOWN errors: retry 1× with conservative backoff (60s)

### Versioning Rules
1. Template updates create new version with incremented semver
2. `is_latest` flag moved to new version (only one latest per slug)
3. Old versions remain accessible but marked `is_latest=False`
4. Requests always reference specific version (immutable)

### Retention Policy Enforcement
1. Daily cron job scans `expires_at < now()`
2. Soft delete output record + hard delete file from storage
3. Preserve request record for audit trail (only delete output)

---

## Extension Points

### Custom Providers
```python
# Downstream products can register custom executors
from src.generative.executors import BasePipelineExecutor

class CustomProviderExecutor(BasePipelineExecutor):
    def execute(self, request):
        # Custom implementation
        pass

# Register in pipeline_config
{
    "provider": "custom_provider",
    "api_endpoint": "https://custom.api.com",
    "estimated_cost": 150.00
}
```

### Custom Templates
```python
# TeamReel adds templates via fixtures
GenerationTemplate.objects.create(
    organisation=teamreel_org,
    slug="match-lineup-video",
    pipeline_config={
        "provider": "langgraph",
        "graph_id": "teamreel_lineup_video_v1"
    }
)
```

### Custom Graphs (LangGraph)
```python
# teamreel/graphs/lineup_video.py
from langgraph.graph import StateGraph
from src.generative.graphs.registry import register_graph

@register_graph("teamreel_lineup_video_v1")
def create_lineup_video_graph():
    # Custom multi-step workflow
    return graph.compile()
```
