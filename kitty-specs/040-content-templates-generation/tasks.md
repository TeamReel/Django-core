# Implementation Tasks: Content Templates & Generation (B31)

**Feature**: B31 Content Templates & Generation
**Branch**: `040-content-templates-generation`
**Date**: 2026-01-29
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Task Overview

**Total Work Packages**: 8
**Total Subtasks**: 45
**MVP Scope**: WP01-WP04 (Setup + User Stories 1-2)

### Work Package Distribution

- **Setup & Foundation** (WP01): 6 subtasks
- **User Story 1 - Generation** (WP02): 8 subtasks
- **User Story 2 - Approval** (WP03): 7 subtasks
- **User Story 3 - Templates** (WP04): 6 subtasks
- **User Story 4 - Library** (WP05): 5 subtasks
- **User Story 5 - Audit** (WP06): 3 subtasks
- **Integrations & Polish** (WP07): 6 subtasks
- **Deployment & Ops** (WP08): 4 subtasks

---

## Work Package: WP01 - Foundation & Data Models

**Priority**: P0 (Prerequisite for all other work)
**Estimated Effort**: 1-2 days
**Dependencies**: None
**Prompt**: [WP01-foundation-data-models.md](tasks/planned/WP01-foundation-data-models.md)

### Goal

Establish Django app structure, implement the 3 core models (ContentTemplate, ContentItem, ContentApproval), and create database migrations. This provides the data foundation for all subsequent features.

### Included Subtasks

- [x] **T001** - Create Django app `src/content_generation/` with standard structure (models, views, serializers, tasks, permissions, admin, urls)
- [x] **T002** - Implement `ContentTemplate` model with fields, enums (TemplateType), validators, indexes
- [x] **T003** - Implement `ContentItem` model with status enum (ContentStatus), soft-delete manager, state transition validation
- [x] **T004** - Implement `ContentApproval` model with status enum (ApprovalStatus), FK constraints
- [x] **T005** - Create initial migration for all 3 models with indexes and constraints
- [x] **T006** - Register models in Django Admin with list filters, search fields, readonly fields

### Implementation Sketch

1. Run `python manage.py startapp content_generation` in `src/`
2. Define enums (TemplateType, ContentStatus, ApprovalStatus) as `models.TextChoices`
3. Implement models following [data-model.md](data-model.md) specifications
4. Add custom manager `ContentItemManager.active()` for soft-delete filtering
5. Create migration: `python manage.py makemigrations content_generation`
6. Configure Admin classes with appropriate permissions

### Parallel Opportunities

- **[P]** T001-T002-T003-T004 can be written in parallel (separate model files if needed)
- T005-T006 must run sequentially after models are complete

### Risks & Dependencies

- **Risk**: Foreign key references to B22 FileAsset, B30 Activity must exist
- **Mitigation**: Verify B22 and B30 migrations are applied before creating B31 migration
- **Dependency**: Requires Django 5.0+, PostgreSQL configured

### Success Criteria

- [x] All 3 models importable: `from src.content_generation.models import ContentTemplate, ContentItem, ContentApproval`
- [x] Migration runs cleanly: `python manage.py migrate content_generation`
- [x] Django Admin shows all 3 models with proper list views and filters
- [x] Model tests pass (create, retrieve, soft-delete, state transitions)

---

## Work Package: WP02 - User Story 1: Content Generation

**Priority**: P1 (Core value proposition)
**Estimated Effort**: 2-3 days
**Dependencies**: WP01 (models must exist)
**Prompt**: [WP02-user-story-1-generation.md](tasks/planned/WP02-user-story-1-generation.md)

### Goal

Implement the complete content generation flow: create ContentItem from template, queue Celery task, update status via B23 WebSocket, detect duplicate generations, handle failures with retry logic.

### Included Subtasks

- [x] **T007** - Create `ContentItemSerializer` with nested template/activity/output_file, input_data validation
- [x] **T008** - Implement `ContentItemViewSet` with create action, duplicate detection warning logic
- [x] **T009** - Implement custom `@action` for `/items/{id}/status/` (polling endpoint)
- [x] **T010** - Implement custom `@action` for `/items/{id}/retry/` (re-queue failed generation)
- [x] **T011** - Create Celery task `generate_content_task` in `tasks.py` with timeout support, error handling
- [x] **T012** - Integrate B23 WebSocket consumer for real-time status broadcast (subscribe/unsubscribe)
- [x] **T013** - Add B22 FileAsset storage integration for output files (upload, thumbnail generation)
- [x] **T014** - Implement B17 notification triggers (on completion, on failure)

### Implementation Sketch

1. Create serializers with validation for input_data schema (template-specific)
2. Implement ViewSet with `POST /items/` checking for existing in-progress generations
3. Queue Celery task with `generate_content_task.apply_async(countdown=0)`
4. Celery task:
   - Update status to "generating"
   - Call AI workflow (stub for now, B34 integration later)
   - Store output via B22 FileAsset
   - Update status to "completed" or "failed"
   - Broadcast status via B23 WebSocket
   - Trigger B17 notification
5. Implement WebSocket consumer to broadcast `{id, status, progress_percent}` messages

### Parallel Opportunities

- **[P]** T007-T008-T009-T010 (API endpoints) can be implemented in parallel
- **[P]** T011 (Celery task) independent from T007-T010
- T012-T013-T014 (integrations) depend on T011 completion

### Risks & Dependencies

- **Risk**: B23 WebSocket unavailable → polling fallback required
- **Mitigation**: Implement `/items/{id}/status/` endpoint with exponential backoff guidance (3s→15s)
- **Risk**: AI workflow integration undefined (B34 not ready)
- **Mitigation**: Stub AI call with mock response, document integration point
- **Dependency**: Celery + Redis running, B22 FileAsset API available

### Success Criteria

- [x] `POST /api/v1/content-generation/items/` creates ContentItem with status "queued"
- [x] Duplicate detection returns 200 with warning payload (not 409 error)
- [x] Celery task processes queued item, updates status to "generating" → "completed"
- [ ] WebSocket broadcasts status updates to subscribed clients
- [ ] Failed generation stores error_message, allows retry via `POST /items/{id}/retry/`
- [ ] B17 notification sent on completion

---

## Work Package: WP03 - User Story 2: Approval Workflow

**Priority**: P1 (Essential for quality control)
**Estimated Effort**: 2 days
**Dependencies**: WP02 (ContentItem must be completable)
**Prompt**: [WP03-user-story-2-approval.md](tasks/planned/WP03-user-story-2-approval.md)

### Goal

Implement the approval workflow: review completed content, approve/reject/request-revision with feedback, update ContentItem status, trigger notifications, store approval history.

### Included Subtasks

- [x] **T015** - Create `ContentApprovalSerializer` with reviewer, feedback_text, status validation
- [x] **T016** - Implement `ContentApprovalViewSet` with create action, self-approval check (if B10 flag enabled)
- [x] **T017** - Implement custom `@action` on ContentItemViewSet: `POST /items/{id}/approve/`
- [x] **T018** - Implement custom `@action` on ContentItemViewSet: `POST /items/{id}/reject/` (feedback required)
- [x] **T019** - Implement custom `@action` on ContentItemViewSet: `POST /items/{id}/request-revision/` (feedback required)
- [x] **T020** - Update ContentItem status on approval creation (status sync logic)
- [x] **T021** - Integrate B17 notifications (notify creator on approve/reject/revision)

### Implementation Sketch

1. Create serializer with validation:
   - `feedback_text` required for reject/revision_requested
   - Check `content_item.status == 'completed'` before allowing approval
2. Implement shortcut actions on ContentItemViewSet:
   - `approve()` → create ContentApproval with status="approved"
   - `reject()` → create ContentApproval with status="rejected" (validate feedback)
   - `request_revision()` → create ContentApproval with status="revision_requested"
3. Add signal/model method to sync ContentItem.status with latest ContentApproval.status
4. Check B10 feature flag for self-approval policy (default: allowed)
5. Trigger B17 notification with approval decision and feedback

### Parallel Opportunities

- **[P]** T017-T018-T019 (shortcut actions) can be implemented in parallel
- T015-T016 must be completed before T017-T019
- T020-T021 depend on T015-T019 completion

### Risks & Dependencies

- **Risk**: Self-approval policy unclear
- **Mitigation**: Check B10 feature flag `content_approval_allow_self` (default: true)
- **Risk**: Multiple approval records for same ContentItem
- **Mitigation**: Approval history is append-only; latest record by `reviewed_at` determines current status
- **Dependency**: B17 Notifications API available

### Success Criteria

- [ ] `POST /api/v1/content-generation/items/42/approve/` updates status to "approved"
- [ ] Rejection requires feedback_text, returns 400 if missing
- [ ] ContentApproval record created with reviewer, timestamp, feedback
- [ ] Creator receives B17 notification with approval decision
- [ ] Approval history visible via `GET /items/{id}/` (nested approval_history array)

---

## Work Package: WP04 - User Story 3: Template Management

**Priority**: P2 (Templates must exist before generation)
**Estimated Effort**: 1-2 days
**Dependencies**: WP01 (ContentTemplate model must exist)
**Prompt**: [WP04-user-story-3-templates.md](tasks/planned/WP04-user-story-3-templates.md)

### Goal

Implement template CRUD operations: list/filter templates by sport, create/update templates, toggle active status, validate template_settings schema, seed initial templates via data migration.

### Included Subtasks

- [x] **T022** - Create `ContentTemplateSerializer` with template_settings validation, nested organisation/project
- [x] **T023** - Implement `ContentTemplateViewSet` with list/retrieve/create/update/delete actions
- [x] **T024** - Add query filters: `?sport_type=`, `?is_active=`, `?project=`
- [x] **T025** - Implement soft-delete protection (DELETE fails if ContentItems exist)
- [x] **T026** - Create data migration to seed 2-3 initial templates (Line-up Video, Match Highlights)
- [x] **T027** - Add B32 Sport Config integration for sport_type validation

### Implementation Sketch

1. Create serializer with validation:
   - `timeout_minutes` must be 1-1440 if set
   - `template_settings` is valid JSON (schema varies by ai_workflow_id)
   - `name` unique per organisation
2. Implement standard DRF ModelViewSet with filtering via `django_filters`
3. Override `destroy()` method to check `self.contentitem_set.exists()` → return 400 if true
4. Create data migration with initial templates:
   ```python
   ContentTemplate.objects.create(
       name="Line-up Video",
       template_type="pre_match",
       sport_type="football",
       ai_workflow_id="workflow_lineup_v2",
       ...
   )
   ```
5. Validate `sport_type` against B32 Sport Config choices (if B32 exists)

### Parallel Opportunities

- **[P]** T022-T023-T024 (API implementation) can be done in parallel
- T025-T026-T027 (validations and migrations) sequential after T022-T023

### Risks & Dependencies

- **Risk**: B32 Sport Config not implemented yet
- **Mitigation**: Use string field with optional validation; B32 integration is enhancement
- **Risk**: Template deletion cascade vs. protection
- **Mitigation**: Use ON DELETE PROTECT in ContentItem.template FK; soft-archive templates instead

### Success Criteria

- [ ] `GET /api/v1/content-generation/templates/?sport_type=football` filters correctly
- [ ] `PATCH /templates/{id}/` with `is_active: false` toggles template off
- [ ] `DELETE /templates/{id}/` fails with 400 if ContentItems exist
- [ ] Data migration seeds 2+ templates visible in Django Admin
- [ ] Template settings JSON validated (basic structure check)

---

## Work Package: WP05 - User Story 4: Content Library

**Priority**: P2 (Archive becomes valuable as content grows)
**Estimated Effort**: 1 day
**Dependencies**: WP02 (ContentItem API must exist)
**Prompt**: [WP05-user-story-4-library.md](tasks/planned/WP05-user-story-4-library.md)

### Goal

Implement content library browsing: list ContentItems with pagination (50/page), filter by project/status/template/activity, display thumbnails via B22, implement download action.

### Included Subtasks

- [ ] **T028** - Add pagination to ContentItemViewSet (DRF PageNumberPagination, page_size=50)
- [ ] **T029** - Add query filters: `?project=`, `?status=`, `?template=`, `?activity=`
- [ ] **T030** - Optimize query with `select_related()` for template, project, activity, output_file
- [ ] **T031** - Implement custom `@action` for `/items/{id}/download/` (proxy to B22 FileAsset download URL)
- [ ] **T032** - Add thumbnail_url to serializer (from B22 FileAsset.thumbnail_url)

### Implementation Sketch

1. Configure pagination in ViewSet:
   ```python
   pagination_class = PageNumberPagination
   page_size = 50
   ```
2. Add filtering with `django_filters.FilterSet`:
   - `project`, `status`, `template`, `activity` fields
3. Optimize queryset:
   ```python
   queryset = ContentItem.objects.active().select_related(
       'template', 'project', 'activity', 'output_file', 'created_by'
   )
   ```
4. Add download action:
   ```python
   @action(detail=True, methods=['get'])
   def download(self, request, pk=None):
       item = self.get_object()
       return redirect(item.output_file.download_url)
   ```
5. Extend serializer with `thumbnail_url` from `output_file.thumbnail_url`

### Parallel Opportunities

- **[P]** T028-T029-T030 (list optimizations) can be done in parallel
- T031-T032 (download/thumbnail) independent of T028-T030

### Risks & Dependencies

- **Risk**: Large content libraries (10K+ items) slow queries
- **Mitigation**: Pagination limits page size; indexes on (project, status, deleted_at)
- **Dependency**: B22 FileAsset.thumbnail_url must be available

### Success Criteria

- [ ] `GET /api/v1/content-generation/items/?project=5&status=approved&page=2` returns correct subset
- [ ] Response includes `count`, `next`, `previous` pagination links
- [ ] Each item includes `thumbnail_url` for preview
- [ ] `GET /items/42/download/` redirects to B22 file download URL
- [ ] Query performance <2s for 1000 items (verified with Django Debug Toolbar)

---

## Work Package: WP06 - User Story 5: Audit Trail

**Priority**: P3 (Compliance and debugging)
**Estimated Effort**: 0.5 days
**Dependencies**: WP03 (ContentApproval history must exist)
**Prompt**: [WP06-user-story-5-audit.md](tasks/planned/WP06-user-story-5-audit.md)

### Goal

Implement audit trail logging for all ContentItem and ContentApproval actions via B09 Audit Trail, expose approval_history in ContentItem serializer.

### Included Subtasks

- [ ] **T033** - Integrate B09 Audit Trail logging for ContentItem CRUD (create, update status, delete)
- [ ] **T034** - Integrate B09 Audit Trail logging for ContentApproval CRUD (approve, reject, request revision)
- [ ] **T035** - Add `approval_history` nested field to ContentItemSerializer (read-only)

### Implementation Sketch

1. Add B09 audit logging in model save methods or signals:
   ```python
   from src.audit.utils import log_audit_event

   def save(self, *args, **kwargs):
       super().save(*args, **kwargs)
       log_audit_event(
           action='content_item.status_change',
           resource=self,
           actor=self.created_by,
           metadata={'old_status': old, 'new_status': self.status}
       )
   ```
2. Add audit logging to approval actions (approve/reject/revision)
3. Extend ContentItemSerializer:
   ```python
   approval_history = ContentApprovalSerializer(
       source='contentapproval_set',
       many=True,
       read_only=True
   )
   ```

### Parallel Opportunities

- **[P]** T033-T034 (audit integrations) can be done in parallel
- T035 (serializer field) independent of T033-T034

### Risks & Dependencies

- **Risk**: B09 Audit Trail API unclear
- **Mitigation**: Check B09 documentation for `log_audit_event()` signature
- **Dependency**: B09 Audit Trail module must be implemented

### Success Criteria

- [ ] B09 audit log entries created for all ContentItem status changes
- [ ] B09 audit log entries created for all ContentApproval actions
- [ ] `GET /items/42/` response includes `approval_history` array with all approval records
- [ ] Audit trail queryable via B09 API: `GET /audit/?resource_type=ContentItem&resource_id=42`

---

## Work Package: WP07 - Integrations & Polish

**Priority**: P2 (Enhances UX and reliability)
**Estimated Effort**: 1-2 days
**Dependencies**: WP02-WP06 (core features must exist)
**Prompt**: [WP07-integrations-polish.md](tasks/planned/WP07-integrations-polish.md)

### Goal

Implement remaining integrations (B08 permissions, B10 retention policies, B15 cleanup task), add error handling, implement WebSocket fallback logic, optimize queries.

### Included Subtasks

- [ ] **T036** - Implement 5 B08 permission classes (`CanManageTemplates`, `CanGenerateContent`, `CanApproveContent`, `CanViewLibrary`, `CanDownloadContent`)
- [ ] **T037** - Create B10 Feature Flag integration for org-specific retention policies (failed_days, rejected_days)
- [ ] **T038** - Implement Celery Beat scheduled task `cleanup_expired_content` (runs daily, soft-deletes based on retention)
- [ ] **T039** - Add comprehensive error handling (validation errors, permission errors, task failures)
- [ ] **T040** - Implement WebSocket fallback logic (frontend polling guidance in API docs)
- [ ] **T041** - Add query optimization: indexes, select_related(), prefetch_related()

### Implementation Sketch

1. Create permission classes inheriting from `HasPermission` (B08):
   ```python
   class CanManageTemplates(HasPermission):
       required_permission = 'content_generation.manage_templates'
   ```
2. Add B10 feature flag checks:
   ```python
   failed_retention = org.get_feature_flag('content_retention_failed_days', default=30)
   ```
3. Implement cleanup task:
   ```python
   @celery_app.task
   def cleanup_expired_content():
       for org in Organisation.objects.all():
           failed_cutoff = now - timedelta(days=get_retention_days('failed', org))
           ContentItem.objects.filter(...).update(deleted_at=now)
   ```
4. Add comprehensive DRF exception handlers for 400/403/404/500 responses
5. Document polling fallback pattern in quickstart.md (already done)

### Parallel Opportunities

- **[P]** T036-T037-T038 (permissions, flags, cleanup) can be done in parallel
- **[P]** T039-T040-T041 (polish) can be done in parallel

### Risks & Dependencies

- **Risk**: B08 permission registration unclear
- **Mitigation**: Check B08 docs for permission registration process (migrations or settings)
- **Risk**: Celery Beat schedule configuration
- **Mitigation**: Add to `CELERY_BEAT_SCHEDULE` in settings (daily run at 2 AM)

### Success Criteria

- [ ] All API endpoints check appropriate B08 permissions (401/403 for unauthorized)
- [ ] Org-specific retention policies respected (verified with test org configs)
- [ ] Cleanup task soft-deletes expired items (verified with `deleted_at` timestamps)
- [ ] API returns clear error messages with appropriate HTTP status codes
- [ ] WebSocket failure automatically triggers polling (frontend integration)

---

## Work Package: WP08 - Deployment & Operations

**Priority**: P3 (Production readiness)
**Estimated Effort**: 1 day
**Dependencies**: WP01-WP07 (all features must be complete)
**Prompt**: [WP08-deployment-ops.md](tasks/planned/WP08-deployment-ops.md)

### Goal

Prepare for production deployment: configure Celery Beat schedule, add health checks, configure logging, update Railway deployment config, write deployment documentation.

### Included Subtasks

- [ ] **T042** - Configure Celery Beat schedule for `cleanup_expired_content` task (daily at 2 AM)
- [ ] **T043** - Add health check endpoint `/api/v1/content-generation/health/` (check Celery, Redis, DB)
- [ ] **T044** - Configure structured logging for generation tasks (log to B18 Observability)
- [ ] **T045** - Update Railway deployment config (environment variables, Celery worker process)

### Implementation Sketch

1. Add to `settings.py`:
   ```python
   CELERY_BEAT_SCHEDULE = {
       'cleanup-expired-content': {
           'task': 'src.content_generation.tasks.cleanup_expired_content',
           'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
       },
   }
   ```
2. Create health check view:
   ```python
   @api_view(['GET'])
   def health(request):
       celery_ok = celery_app.control.inspect().ping()
       redis_ok = redis_client.ping()
       return Response({'celery': celery_ok, 'redis': redis_ok})
   ```
3. Add structured logging:
   ```python
   logger.info('content_generation.started', extra={'item_id': item.id, 'template_id': template.id})
   ```
4. Update Railway config:
   - Add `CELERY_BROKER_URL` env var
   - Add worker process: `celery -A config worker -B -l info`

### Parallel Opportunities

- **[P]** All 4 subtasks (T042-T045) can be done in parallel

### Risks & Dependencies

- **Risk**: Railway Celery worker not configured
- **Mitigation**: Add separate Procfile entry or Railway service for Celery worker
- **Risk**: Health check exposes sensitive info
- **Mitigation**: Return only boolean status, no connection strings

### Success Criteria

- [ ] Celery Beat schedule shows in `celery -A config beat` output
- [ ] `GET /api/v1/content-generation/health/` returns 200 with status indicators
- [ ] Logs visible in Railway dashboard with structured format
- [ ] Celery worker process running on Railway (visible in process list)
- [ ] Deployment documentation updated in `documents/07-operations/`

---

## Implementation Order

**Recommended sequence for MVP (WP01-WP04):**

1. **Week 1**: WP01 (Foundation) → WP02 (Generation) → WP03 (Approval)
2. **Week 2**: WP04 (Templates) → WP05 (Library) → WP06 (Audit)
3. **Week 3**: WP07 (Integrations) → WP08 (Deployment)

**Critical path**: WP01 → WP02 → WP03 (MVP can ship after WP03)

**Parallelization opportunities**:
- WP04 and WP05 can be done in parallel after WP02
- WP06 and WP07 can be done in parallel after WP03

---

## Testing Strategy

Testing tasks are **not included** in subtasks per spec-kitty guidelines. If tests are required:

- Model tests: Create, retrieve, soft-delete, state transitions, validation
- Serializer tests: Validation, nested fields, permission checks
- View tests: CRUD operations, custom actions, filtering, pagination
- Task tests: Celery task execution, timeouts, retries, error handling
- Integration tests: E2E flow from template → generate → approve → download

Target coverage: 80% for models, serializers, views, tasks

---

## Rollback Plan

If production issues occur:

1. **Feature flag rollback**: Disable B31 endpoints via B10 feature flag `content_generation_enabled=false`
2. **Database rollback**: Migrations are backward-compatible (no data loss)
3. **Celery task rollback**: Stop worker, purge queue: `celery -A config purge`
4. **Monitoring**: Watch B18 Observability metrics for task failures, API errors

---

## Next Steps

1. Review work packages WP01-WP08 and task prompts
2. Run `/spec-kitty.implement WP01` to start foundation implementation
3. Test each work package before moving to next
4. Deploy MVP (WP01-WP03) to staging for validation
