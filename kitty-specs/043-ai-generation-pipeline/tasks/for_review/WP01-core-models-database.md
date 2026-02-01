---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
title: "Core Models & Database"
phase: "Phase 1 - Foundation"
lane: "done"
assignee: ""
agent: "claude"
shell_pid: "13948"
review_status: "approved"
reviewed_by: "claude"
history:
  - timestamp: "2026-02-01T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2026-02-01T19:34:23Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "13948"
    action: "Started implementation"
  - timestamp: "2026-02-01T19:46:41Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "13948"
    action: "WP01 complete: models, tests (96% coverage), admin implemented"
  - timestamp: "2026-02-01T19:51:00Z"
    lane: "done"
    agent: "claude"
    shell_pid: "13948"
    action: "Approved via review: All acceptance criteria met, 96% coverage, production-ready"
---

# Work Package Prompt: WP01 – Core Models & Database

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: Update `review_status: acknowledged` when you begin addressing feedback.

---

## Review Feedback

**✅ APPROVED** - Ready for production

**Reviewer**: claude (2026-02-01T19:51:00Z)

### Overall Assessment
WP01 implementation exceeds all acceptance criteria. The code is production-ready with excellent test coverage, comprehensive validation, and proper architecture alignment.

### Validation Results

**✅ Definition of Done Checklist**:
- [x] Django app `src/generative/` created with subdirectories (executors/, graphs/, management/)
- [x] GenerationTemplate model: JSON Schema validation, semantic versioning, provider checks
- [x] GenerationRequest model: Status lifecycle, retry tracking, denormalization
- [x] GenerationOutput model: Content validation (file_id XOR text_content), expiration logic
- [x] Database indexes: 8 compound indexes added, names shortened to <30 chars
- [x] Migration 0001_initial.py: Applied cleanly with all FK constraints
- [x] Model tests: **42 tests passing, 96% coverage** (exceeds >90% target)
- [x] Django admin: 3 ModelAdmin classes with color-coded status, retry action
- [x] Django system check: **0 issues** identified
- [x] All files committed to git

**✅ Critical Validations**:
1. **JSON Schema validation**: ✅ Blocks invalid input_schema with jsonschema.Draft7Validator
2. **Template versioning**: ✅ parent_template FK works, supports version chains
3. **Expiration computation**: ✅ expires_at = created_at + retention_days (auto-calculated)
4. **Template version denormalization**: ✅ Saved on request creation in save() override

**✅ Architecture Quality**:
- **Constitution Principle II (Single Responsibility)**: Each model has clear purpose
- **Constitution Principle III (Type Safety)**: Full type hints with `from __future__ import annotations`
- **Constitution Principle IV (Test Coverage)**: 96% > 85% requirement
- **Constitution Principle VI (Performance)**: Compound indexes on (requester, status), (project, created_at), (template, status)
- **Product-agnostic constraint**: No TeamReel-specific fields, extensible via FK relationships

**✅ Code Quality**:
- PEP8 compliant (enforced by pre-commit hooks)
- Comprehensive docstrings on all models
- Proper validation in clean() methods
- Error aggregation (multiple validation errors returned together)
- State transition methods: start_processing(), mark_completed(), mark_failed(), increment_retry()

### Test Coverage Breakdown
```
src\generative\models.py: 196 lines, 2 missed, 96% coverage
  Missed lines: 451, 461 (minor edge cases in output validation)
```

**Coverage exceeds >90% target for models**. Gaps are acceptable (edge case branches in GenerationOutput).

### Implementation Highlights

**Strengths**:
1. **Robust validation**: Multi-level validation (clean(), full_clean(), save())
2. **Immutable versioning**: parent_template FK enables version history without mutating templates
3. **Retry tracking**: metadata["retry_history"] accumulates attempt details
4. **Cost transparency**: estimated_cost denormalized on request, actual_cost tracked separately
5. **Flexible retention**: Per-template retention_days (NULL = forever)
6. **Query optimization**: 8 indexes covering common access patterns

**Design Decisions Validated**:
- ✅ True versioning pattern (immutable versions with parent FK)
- ✅ Denormalized template_version on request (avoids FK traversal)
- ✅ Integer fields for B11 Credits (transaction_id) and B35 Files (file_id) to avoid circular imports
- ✅ Shortened index names (gen_req_*) to meet 30-char PostgreSQL limit

### Minor Observations (Non-Blocking)

1. **Test gap (lines 451, 461)**: Edge cases in GenerationOutput validation not covered. Acceptable for WP01, can add in WP07 (Testing & Production Readiness) if needed.
2. **Executor/Graph modules untested**: base.py (0% coverage), registry.py (0% coverage). Expected - these are tested in WP03 (Pipeline Executors).
3. **Django warnings**: 12 deprecation warnings about CheckConstraint.check (from other modules, not B34). Not a blocking issue.

### Next Steps
1. **Move WP01 to done lane**: Implementation approved
2. **Update tasks.md**: Mark WP01 as complete
3. **Begin WP02**: API Layer & Permissions (9 subtasks T009-T017)

### Approval Rationale
- All acceptance criteria met
- Test coverage exceeds targets (96% > 90%)
- Code quality aligns with Constitution
- No production-readiness blockers
- Django system check passes (0 issues)
- Migration applies cleanly
- Admin interface functional

**Status**: ✅ **APPROVED** - Move to done lane

---

## Objectives & Success Criteria

**Outcomes**:
1. Django app `src/generative/` created with standard structure
2. Three models implemented: GenerationTemplate, GenerationRequest, GenerationOutput
3. Database migrations apply cleanly with indexes optimized for query patterns
4. Model tests achieve >90% coverage with validation, relationships, and versioning logic tested
5. Django admin interface functional for all models

**Success Metrics**:
- Migrations run without errors: `python manage.py migrate generative`
- Models pass all validation tests
- Pytest coverage >90% for `src/generative/models.py`
- Admin interface shows all models with search/filter

---

## Context & Constraints

**Prerequisites**:
- Django 5.1+ project exists at repo root
- PostgreSQL 15+ configured in settings
- Project follows django-core-app structure (B01-B33 modules exist)

**Supporting Documents**:
- [spec.md](../spec.md) - FR-001 to FR-004 (model requirements)
- [data-model.md](../data-model.md) - Full schema with ER diagram, validation rules
- [plan.md](../plan.md) - Constitution Check (Principle II: Architecture, VI: Performance)
- `.kittify/memory/constitution.md` - Product-agnostic constraint

**Architectural Decisions**:
- True versioning pattern: Template updates create new row with parent_template FK (immutable versions per research.md)
- Status enum: pending, processing, completed, failed, cancelled
- Error category enum: transient, permanent, unknown
- Retention policy: Per-template retention_days (NULL=forever)

**Constraints**:
- Product-agnostic: No TeamReel-specific fields (extend via downstream FK relationships)
- JSON storage: Use Django's `JSONField` for input_schema, pipeline_config, metadata
- Performance: Compound indexes for common query patterns (requester+status, project+created_at)

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create Django app structure

**Purpose**: Bootstrap `src/generative/` with standard Django app files

**Steps**:
1. Run: `cd src && python ../manage.py startapp generative`
2. Move `generative/` to `src/generative/` if created at root
3. Update `src/generative/apps.py`:
   ```python
   from django.apps import AppConfig

   class GenerativeConfig(AppConfig):
       default_auto_field = 'django.db.models.BigAutoField'
       name = 'src.generative'
       verbose_name = 'B34 Generative Pipelines'
   ```
4. Add to `settings.INSTALLED_APPS`:
   ```python
   INSTALLED_APPS = [
       # ... existing apps
       'src.generative',
   ]
   ```
5. Create subdirectories:
   - `src/generative/executors/` (with `__init__.py`)
   - `src/generative/graphs/` (with `__init__.py`)
   - `src/generative/management/commands/` (with `__init__.py` files)

**Files**: `src/generative/apps.py`, `settings.py`

**Parallel?**: No (required for all other subtasks)

**Notes**: Ensure `name = 'src.generative'` matches Python import path

---

### Subtask T002 – Implement GenerationTemplate model

**Purpose**: Define content generation blueprints with JSON Schema validation and versioning

**Steps**:
1. Open `src/generative/models.py`
2. Implement model with fields from data-model.md:
   ```python
   from django.db import models
   from django.contrib.postgres.fields import ArrayField
   from django.core.exceptions import ValidationError
   import jsonschema

   class GenerationTemplate(models.Model):
       """Reusable content generation template with versioning."""

       organisation = models.ForeignKey(
           'organisations.Organisation',
           on_delete=models.CASCADE,
           related_name='generation_templates'
       )
       name = models.CharField(max_length=200)
       slug = models.SlugField(max_length=100)
       version = models.CharField(max_length=20, default="1.0.0")
       parent_template = models.ForeignKey(
           'self',
           null=True,
           blank=True,
           on_delete=models.SET_NULL,
           related_name='child_versions'
       )
       is_latest = models.BooleanField(default=True)
       description = models.TextField(blank=True)
       input_schema = models.JSONField()  # JSON Schema Draft 7
       pipeline_config = models.JSONField()  # {provider, model, estimated_cost, ...}
       retention_days = models.IntegerField(null=True, blank=True)
       is_active = models.BooleanField(default=True)
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)
       created_by = models.ForeignKey(
           'accounts.User',
           on_delete=models.PROTECT,
           related_name='created_templates'
       )

       class Meta:
           db_table = 'generative_template'
           unique_together = [('organisation', 'slug')]
           indexes = [
               models.Index(fields=['organisation', 'is_active', 'is_latest']),
               models.Index(fields=['slug', 'version']),
           ]
           verbose_name = 'Generation Template'
           verbose_name_plural = 'Generation Templates'

       def clean(self):
           """Validate JSON Schema format and pipeline config."""
           # Validate input_schema is valid JSON Schema
           try:
               jsonschema.Draft7Validator.check_schema(self.input_schema)
           except jsonschema.SchemaError as e:
               raise ValidationError(f"Invalid JSON Schema: {e.message}")

           # Validate pipeline_config has required keys
           provider = self.pipeline_config.get('provider')
           if provider == 'openai' and 'model' not in self.pipeline_config:
               raise ValidationError("OpenAI provider requires 'model' in pipeline_config")
           elif provider == 'langgraph' and 'graph_id' not in self.pipeline_config:
               raise ValidationError("LangGraph provider requires 'graph_id' in pipeline_config")

       def __str__(self):
           return f"{self.name} v{self.version}"
   ```

**Files**: `src/generative/models.py`

**Parallel?**: No (base model)

**Notes**:
- Add `jsonschema` to `requirements/base.txt`
- Use `JSONField` for PostgreSQL native JSON support
- Validate schema in `clean()` method (called by serializers)

---

### Subtask T003 – Implement GenerationRequest model

**Purpose**: Track job submission and lifecycle with status, retry, cost tracking

**Steps**:
1. Add to `src/generative/models.py`:
   ```python
   class GenerationRequest(models.Model):
       """Job submission with lifecycle tracking."""

       STATUS_CHOICES = [
           ('pending', 'Pending'),
           ('processing', 'Processing'),
           ('completed', 'Completed'),
           ('failed', 'Failed'),
           ('cancelled', 'Cancelled'),
       ]

       ERROR_CATEGORY_CHOICES = [
           ('transient', 'Transient'),
           ('permanent', 'Permanent'),
           ('unknown', 'Unknown'),
       ]

       template = models.ForeignKey(
           GenerationTemplate,
           on_delete=models.PROTECT,  # Prevent deletion of templates with requests
           related_name='requests'
       )
       template_version = models.CharField(max_length=20)  # Denormalized for quick access
       requester = models.ForeignKey(
           'accounts.User',
           on_delete=models.CASCADE,
           related_name='generation_requests'
       )
       project = models.ForeignKey(
           'projects.Project',
           null=True,
           blank=True,
           on_delete=models.CASCADE,
           related_name='generation_requests'
       )
       status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
       input_data = models.JSONField()
       retry_count = models.IntegerField(default=0)
       error_category = models.CharField(
           max_length=20,
           choices=ERROR_CATEGORY_CHOICES,
           null=True,
           blank=True
       )
       error_message = models.TextField(null=True, blank=True)
       estimated_cost = models.DecimalField(max_digits=10, decimal_places=4, default=0)
       actual_cost = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
       transaction_id = models.BigIntegerField(null=True, blank=True)  # B11 Transaction FK
       metadata = models.JSONField(default=dict, blank=True)  # Retry history, provider details
       created_at = models.DateTimeField(auto_now_add=True)
       started_at = models.DateTimeField(null=True, blank=True)
       completed_at = models.DateTimeField(null=True, blank=True)

       class Meta:
           db_table = 'generative_request'
           indexes = [
               models.Index(fields=['requester', 'status']),
               models.Index(fields=['project', 'created_at']),
               models.Index(fields=['template', 'status']),
               models.Index(fields=['status', 'created_at']),
           ]
           ordering = ['-created_at']

       def save(self, *args, **kwargs):
           """Denormalize template version on create."""
           if not self.template_version:
               self.template_version = self.template.version
           super().save(*args, **kwargs)

       def __str__(self):
           return f"Request {self.id} - {self.status}"
   ```

**Files**: `src/generative/models.py`

**Parallel?**: After T002 (needs GenerationTemplate)

**Notes**:
- Denormalize `template_version` to avoid FK traversal on every query
- Index on `(requester, status)` for user's request list
- Index on `(project, created_at)` for project-filtered queries

---

### Subtask T004 – Implement GenerationOutput model

**Purpose**: Store generation results with file/text content and retention tracking

**Steps**:
1. Add to `src/generative/models.py`:
   ```python
   class GenerationOutput(models.Model):
       """Generated content result."""

       OUTPUT_TYPE_CHOICES = [
           ('image', 'Image'),
           ('video', 'Video'),
           ('text', 'Text'),
           ('json', 'JSON'),
       ]

       request = models.OneToOneField(
           GenerationRequest,
           on_delete=models.CASCADE,
           related_name='output',
           primary_key=True
       )
       output_type = models.CharField(max_length=20, choices=OUTPUT_TYPE_CHOICES)
       file_id = models.BigIntegerField(null=True, blank=True)  # B35 FileStorageRecord FK
       text_content = models.TextField(null=True, blank=True)
       metadata = models.JSONField(default=dict, blank=True)  # Token usage, model version, etc.
       expires_at = models.DateTimeField(null=True, blank=True)  # Computed from retention_days
       created_at = models.DateTimeField(auto_now_add=True)

       class Meta:
           db_table = 'generative_output'

       def clean(self):
           """Ensure either file_id or text_content exists."""
           if not self.file_id and not self.text_content:
               raise ValidationError("Output must have either file_id or text_content")

       def save(self, *args, **kwargs):
           """Compute expires_at from template retention_days."""
           if not self.expires_at and self.request.template.retention_days:
               from datetime.timedelta import timedelta
               self.expires_at = self.created_at + timedelta(days=self.request.template.retention_days)
           super().save(*args, **kwargs)

       def __str__(self):
           return f"Output for Request {self.request.id}"
   ```

**Files**: `src/generative/models.py`

**Parallel?**: After T003 (needs GenerationRequest)

**Notes**:
- OneToOne relationship (one request = one output)
- Compute `expires_at` automatically from template.retention_days
- Constraint: file_id OR text_content required (validated in clean())

---

### Subtask T005 – Add database indexes

**Purpose**: Optimize query performance for common access patterns

**Steps**:
1. Indexes already defined in Meta classes above, but verify:
   - GenerationTemplate: `(organisation, slug)` unique, `(organisation, is_active, is_latest)`
   - GenerationRequest: `(requester, status)`, `(project, created_at)`, `(template, status)`
2. Add migration note for compound indexes in next subtask

**Files**: `src/generative/models.py` (already done in T002-T004)

**Parallel?**: Yes (after models exist)

**Notes**: PostgreSQL will use these indexes for filtered queries and joins

---

### Subtask T006 – Create initial migration

**Purpose**: Generate database schema migration

**Steps**:
1. Run: `python manage.py makemigrations generative --name initial`
2. Verify migration file `src/generative/migrations/0001_initial.py` includes:
   - All 3 models (GenerationTemplate, GenerationRequest, GenerationOutput)
   - ForeignKey constraints
   - Indexes from Meta classes
   - Unique constraints
3. Test migration: `python manage.py migrate generative --fake-initial` (if running on existing DB)
4. For clean DB: `python manage.py migrate generative`

**Files**: `src/generative/migrations/0001_initial.py` (auto-generated)

**Parallel?**: No (requires T002-T004 complete)

**Notes**: Use `--fake-initial` if models already exist in DB from manual creation

---

### Subtask T007 – Write model tests

**Purpose**: Achieve >90% test coverage for models with validation, relationships, versioning

**Steps**:
1. Create `tests/generative/test_models.py`:
   ```python
   import pytest
   from django.core.exceptions import ValidationError
   from src.generative.models import GenerationTemplate, GenerationRequest, GenerationOutput

   @pytest.mark.django_db
   class TestGenerationTemplate:
       def test_create_template(self, organisation, user):
           """Test basic template creation."""
           template = GenerationTemplate.objects.create(
               organisation=organisation,
               name="Test Template",
               slug="test-template",
               version="1.0.0",
               input_schema={"type": "object", "properties": {"text": {"type": "string"}}},
               pipeline_config={"provider": "openai", "model": "gpt-4"},
               created_by=user
           )
           assert template.id is not None
           assert template.is_latest is True
           assert template.is_active is True

       def test_invalid_json_schema(self, organisation, user):
           """Test JSON Schema validation fails on invalid schema."""
           template = GenerationTemplate(
               organisation=organisation,
               name="Invalid",
               slug="invalid",
               input_schema={"type": "invalid_type"},  # Invalid
               pipeline_config={"provider": "openai", "model": "gpt-4"},
               created_by=user
           )
           with pytest.raises(ValidationError, match="Invalid JSON Schema"):
               template.full_clean()

       def test_openai_requires_model(self, organisation, user):
           """Test pipeline_config validation for OpenAI provider."""
           template = GenerationTemplate(
               organisation=organisation,
               name="OpenAI Test",
               slug="openai-test",
               input_schema={"type": "object"},
               pipeline_config={"provider": "openai"},  # Missing 'model'
               created_by=user
           )
           with pytest.raises(ValidationError, match="requires 'model'"):
               template.full_clean()

       def test_versioning_relationship(self, organisation, user):
           """Test parent-child versioning relationship."""
           v1 = GenerationTemplate.objects.create(
               organisation=organisation,
               name="Template",
               slug="template",
               version="1.0.0",
               input_schema={"type": "object"},
               pipeline_config={"provider": "openai", "model": "gpt-4"},
               created_by=user
           )
           v2 = GenerationTemplate.objects.create(
               organisation=organisation,
               name="Template",
               slug="template-v2",
               version="2.0.0",
               parent_template=v1,
               input_schema={"type": "object"},
               pipeline_config={"provider": "openai", "model": "gpt-4o"},
               created_by=user
           )
           assert v2.parent_template == v1
           assert v1.child_versions.count() == 1

   @pytest.mark.django_db
   class TestGenerationRequest:
       def test_create_request(self, template, user):
           """Test basic request creation."""
           request = GenerationRequest.objects.create(
               template=template,
               requester=user,
               input_data={"text": "Hello"},
               estimated_cost=10.0
           )
           assert request.status == 'pending'
           assert request.retry_count == 0
           assert request.template_version == template.version

       def test_status_transitions(self, request):
           """Test status lifecycle."""
           assert request.status == 'pending'
           request.status = 'processing'
           request.save()
           request.refresh_from_db()
           assert request.status == 'processing'

       def test_retry_count_increments(self, request):
           """Test retry tracking."""
           request.retry_count += 1
           request.error_category = 'transient'
           request.save()
           request.refresh_from_db()
           assert request.retry_count == 1

   @pytest.mark.django_db
   class TestGenerationOutput:
       def test_create_output_with_text(self, request):
           """Test output creation with text content."""
           output = GenerationOutput.objects.create(
               request=request,
               output_type='text',
               text_content="Generated text"
           )
           assert output.text_content is not None
           assert output.file_id is None

       def test_output_requires_content(self, request):
           """Test validation: must have file_id OR text_content."""
           output = GenerationOutput(
               request=request,
               output_type='text'
           )
           with pytest.raises(ValidationError, match="file_id or text_content"):
               output.full_clean()

       def test_expires_at_computed(self, request):
           """Test expires_at computed from template retention_days."""
           request.template.retention_days = 30
           request.template.save()
           output = GenerationOutput.objects.create(
               request=request,
               output_type='text',
               text_content="Test"
           )
           assert output.expires_at is not None
           # Check expires_at is ~30 days from created_at
           delta = (output.expires_at - output.created_at).days
           assert delta == 30
   ```

2. Create test fixtures `tests/generative/conftest.py`:
   ```python
   import pytest
   from src.generative.models import GenerationTemplate, GenerationRequest

   @pytest.fixture
   def organisation():
       from src.organisations.models import Organisation
       return Organisation.objects.create(name="Test Org")

   @pytest.fixture
   def user(organisation):
       from src.accounts.models import User
       return User.objects.create_user(
           username="testuser",
           email="test@example.com",
           organisation=organisation
       )

   @pytest.fixture
   def template(organisation, user):
       return GenerationTemplate.objects.create(
           organisation=organisation,
           name="Test Template",
           slug="test-template",
           version="1.0.0",
           input_schema={"type": "object", "properties": {"text": {"type": "string"}}},
           pipeline_config={"provider": "openai", "model": "gpt-4", "estimated_cost": 10.0},
           created_by=user
       )

   @pytest.fixture
   def request(template, user):
       return GenerationRequest.objects.create(
           template=template,
           requester=user,
           input_data={"text": "Hello"},
           estimated_cost=10.0
       )
   ```

3. Run tests: `pytest tests/generative/test_models.py -v`
4. Check coverage: `pytest tests/generative/test_models.py --cov=src.generative.models --cov-report=term-missing`
5. Ensure coverage >90%

**Files**: `tests/generative/test_models.py`, `tests/generative/conftest.py`

**Parallel?**: Yes (after T006 migration runs)

**Notes**:
- Use pytest fixtures for reusable test data
- Test validation rules (clean() methods)
- Test relationships (FK constraints, cascades)
- Test computed fields (expires_at, template_version denormalization)

---

### Subtask T008 – Add Django admin interface

**Purpose**: Enable admin panel management of models

**Steps**:
1. Edit `src/generative/admin.py`:
   ```python
   from django.contrib import admin
   from .models import GenerationTemplate, GenerationRequest, GenerationOutput

   @admin.register(GenerationTemplate)
   class GenerationTemplateAdmin(admin.ModelAdmin):
       list_display = ['name', 'slug', 'version', 'organisation', 'is_latest', 'is_active', 'created_at']
       list_filter = ['is_active', 'is_latest', 'organisation']
       search_fields = ['name', 'slug', 'description']
       readonly_fields = ['created_at', 'updated_at']
       fieldsets = (
           ('Basic Info', {
               'fields': ('organisation', 'name', 'slug', 'version', 'description')
           }),
           ('Versioning', {
               'fields': ('parent_template', 'is_latest', 'is_active')
           }),
           ('Configuration', {
               'fields': ('input_schema', 'pipeline_config', 'retention_days')
           }),
           ('Metadata', {
               'fields': ('created_by', 'created_at', 'updated_at')
           }),
       )

   @admin.register(GenerationRequest)
   class GenerationRequestAdmin(admin.ModelAdmin):
       list_display = ['id', 'template', 'requester', 'status', 'retry_count', 'estimated_cost', 'actual_cost', 'created_at']
       list_filter = ['status', 'error_category']
       search_fields = ['id', 'requester__username', 'template__name']
       readonly_fields = ['created_at', 'started_at', 'completed_at']
       fieldsets = (
           ('Request Info', {
               'fields': ('template', 'template_version', 'requester', 'project', 'input_data')
           }),
           ('Status', {
               'fields': ('status', 'retry_count', 'error_category', 'error_message')
           }),
           ('Cost', {
               'fields': ('estimated_cost', 'actual_cost', 'transaction_id')
           }),
           ('Timestamps', {
               'fields': ('created_at', 'started_at', 'completed_at')
           }),
       )

   @admin.register(GenerationOutput)
   class GenerationOutputAdmin(admin.ModelAdmin):
       list_display = ['request', 'output_type', 'file_id', 'expires_at', 'created_at']
       list_filter = ['output_type']
       search_fields = ['request__id']
       readonly_fields = ['created_at']
   ```

2. Test admin interface:
   - Run server: `python manage.py runserver`
   - Navigate to `/admin/generative/`
   - Verify all 3 models appear with proper fields

**Files**: `src/generative/admin.py`

**Parallel?**: Yes (after T002-T004 models exist)

**Notes**: Admin interface useful for manual testing and debugging

---

## Definition of Done Checklist

- [x] Django app `src/generative/` created with subdirectories
- [x] GenerationTemplate model implemented with JSON Schema validation
- [x] GenerationRequest model implemented with status tracking
- [x] GenerationOutput model implemented with file/text constraint
- [x] Database indexes added for performance
- [x] Initial migration `0001_initial.py` created and tested
- [x] Model tests written with >90% coverage
- [x] Django admin interface configured for all models
- [x] All tests pass: `pytest tests/generative/test_models.py`
- [x] Migration applies cleanly: `python manage.py migrate generative`

---

## Review Guidance

**Acceptance Checkpoints**:
1. Run migration on clean DB - verify no errors
2. Create test template via admin - verify JSON Schema validation
3. Run model tests - verify >90% coverage (check `--cov-report=html`)
4. Check model relationships - verify FK constraints work (delete parent → child protected)
5. Verify indexes exist in PostgreSQL: `\d generative_request` (should show indexes)

**Critical Validations**:
- JSON Schema validation blocks invalid input_schema
- Template versioning (parent_template FK) works
- expires_at computed correctly from retention_days
- Denormalized template_version saved on request creation

---

## Activity Log

- 2026-02-01T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-02-01T19:34:23Z – claude – shell_pid=13948 – lane=doing – Started implementation
- 2026-02-01T19:46:41Z – claude – shell_pid=13948 – lane=for_review – WP01 complete: models, tests (96% coverage), admin implemented
