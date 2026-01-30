# Research: Content Templates & Generation (B31)

**Feature**: B31 Content Templates & Generation
**Branch**: `040-content-templates-generation`
**Date**: 2026-01-29

## Research Summary

This document consolidates technical research findings from the planning phase. All architecture decisions have been validated against existing Django Core patterns and confirmed through the planning interrogation process.

## Research Areas

### 1. Async Task Queue (Celery via B15 Tasks)

**Decision**: Use Celery for async content generation via existing B15 Tasks module

**Rationale**:
- B15 Tasks already provides Celery 5.3+ with Redis broker configured
- Content generation is long-running (up to 30 minutes configurable per template)
- Requires progress tracking and status updates
- Celery supports task timeouts, retries, and result backends
- Existing infrastructure avoids introducing new dependencies

**Alternatives Considered**:
- **Django-Q**: Lightweight alternative but would require new dependency and infrastructure
  - Rejected: Adds complexity when B15 already exists
- **Synchronous generation**: Process in request/response cycle
  - Rejected: Timeouts would kill requests; poor UX for long-running tasks
- **Background threads**: Use threading/multiprocessing
  - Rejected: Doesn't scale; no distributed task support; no persistence

**Implementation Pattern**:
```python
# tasks.py
from src.tasks.celery import app as celery_app

@celery_app.task(bind=True, soft_time_limit=1800)  # 30 min default
def generate_content_task(self, content_item_id: int):
    """Async task for content generation"""
    # Fetch ContentItem
    # Update status to 'generating'
    # Call AI workflow via B34
    # Store output via B22
    # Update status to 'completed'/'failed'
    # Send notification via B17
```

**Key Learnings**:
- B15 provides `@shared_task` decorator for app-level tasks
- Task timeout is configurable per-template via `timeout_minutes` field (NULL uses system default of 30 via B10)
- Use soft_time_limit for graceful timeout handling
- Task results stored in Redis for status polling

---

### 2. DRF Permissions via B08 Hierarchical Access Control

**Decision**: Use B08 HasPermission base class with 5 new content_generation permissions

**Rationale**:
- B08 already implements hierarchical role-based permissions (Land > Club > Team)
- Existing 433 role assignments across 5 roles (Land/Club/Team Admin, Team Member, Supporter)
- Permission inheritance ensures Land Admin can manage club/team content
- DRF permission classes integrate cleanly via `permission_classes` attribute

**Alternatives Considered**:
- **Django object-level permissions**: Use `django-guardian` or similar
  - Rejected: B08 already handles hierarchy; would duplicate logic
- **Custom permission middleware**: Build from scratch
  - Rejected: B08 exists and is battle-tested
- **Role checks in views**: Manual `if user.role == 'admin'` checks
  - Rejected: Not reusable; violates DRY; hard to audit

**Implementation Pattern**:
```python
# permissions.py
from src.hierarchical_access.permissions import HasPermission

class CanManageTemplates(HasPermission):
    required_permission = 'content_generation.manage_templates'

class CanGenerateContent(HasPermission):
    required_permission = 'content_generation.generate_content'

class CanApproveContent(HasPermission):
    required_permission = 'content_generation.approve_content'

# views.py
class ContentTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [CanManageTemplates]
```

**New Permissions** (5 total):
1. `content_generation.manage_templates` - Create/edit/toggle templates (Club/Land Admin)
2. `content_generation.generate_content` - Queue content generation (Team Admin+)
3. `content_generation.approve_content` - Approve/reject content (Club Admin+)
4. `content_generation.view_library` - View content library (Team Member+)
5. `content_generation.download_content` - Download approved files (Team Member+)

**Key Learnings**:
- B08 permissions automatically respect organization hierarchy
- Use `HasPermission` base class for consistency
- Permission strings follow `app.action_resource` convention

---

### 3. Real-time Status Updates (WebSocket + Polling Fallback)

**Decision**: Use B23 WebSocket with automatic polling fallback (3s→15s exponential backoff)

**Rationale**:
- Content generation takes 30 seconds to 30 minutes
- Users need real-time progress feedback
- B23 WebSocket Channels already integrated with Django Channels
- Polling fallback ensures reliability when WebSocket unavailable (firewalls, proxies, old browsers)

**Alternatives Considered**:
- **Server-Sent Events (SSE)**: One-way streaming
  - Rejected: No native browser support in IE/Edge; requires additional infrastructure
- **Polling only**: HTTP requests every N seconds
  - Rejected: Inefficient for fast updates; higher server load
- **WebSocket only**: No fallback
  - Rejected: Poor UX when WebSocket fails; not production-safe

**Implementation Pattern**:
```python
# Frontend status check logic
const checkStatus = async (contentItemId) => {
  // Try WebSocket first
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    websocket.send(JSON.stringify({ action: 'subscribe', contentItemId }));
  } else {
    // Fallback to polling with exponential backoff
    const interval = Math.min(3000 * Math.pow(1.5, retryCount), 15000);
    setTimeout(() => pollStatus(contentItemId), interval);
  }
};
```

**Key Learnings**:
- B23 provides WebSocket consumer base classes
- Polling fallback prevents silent failures
- Exponential backoff reduces server load when generation is slow

---

### 4. Soft-Delete Retention Mechanism

**Decision**: Use `deleted_at` timestamp field with configurable retention policies per organization

**Rationale**:
- Failed/rejected content has compliance/debugging value for limited time
- Hard deletes lose audit trail and prevent analysis
- Organization-specific retention policies required for GDPR/compliance
- B10 Feature Flags can store per-org retention settings

**Alternatives Considered**:
- **Hard delete**: Immediately remove from database
  - Rejected: Loses audit trail; can't analyze failure patterns
- **Archive table**: Move to separate `content_items_archive`
  - Rejected: Complicates queries; requires data migration logic
- **Boolean `is_deleted` flag**: Simple soft delete
  - Rejected: Doesn't support retention expiration; requires manual cleanup

**Implementation Pattern**:
```python
# models.py
class ContentItem(models.Model):
    # ... other fields
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['deleted_at']),  # For cleanup queries
        ]

# Custom manager
class ContentItemManager(models.Manager):
    def active(self):
        return self.filter(deleted_at__isnull=True)

# tasks.py (scheduled cleanup)
@celery_app.task
def cleanup_expired_content():
    """Soft-delete expired ContentItems based on org retention policy"""
    now = timezone.now()

    # Fetch org-specific policies from B10
    for org in Organisation.objects.all():
        failed_retention = org.get_feature_flag('content_retention_failed_days', default=30)
        rejected_retention = org.get_feature_flag('content_retention_rejected_days', default=90)

        # Soft-delete failed content older than retention
        ContentItem.objects.filter(
            organisation=org,
            status='failed',
            deleted_at__isnull=True,
            created_at__lt=now - timedelta(days=failed_retention)
        ).update(deleted_at=now)

        # Soft-delete rejected content older than retention
        ContentItem.objects.filter(
            organisation=org,
            status='rejected',
            deleted_at__isnull=True,
            updated_at__lt=now - timedelta(days=rejected_retention)
        ).update(deleted_at=now)
```

**Retention Defaults** (via B10 Feature Flags):
- **Failed content**: 30 days (debugging/retry window)
- **Rejected content**: 90 days (analysis/compliance window)
- **Approved content**: Indefinite (permanent library)
- **Queued/Generating**: Not subject to retention (active state)

**Key Learnings**:
- Use `deleted_at` timestamp instead of boolean for expiration logic
- Index `deleted_at` for efficient cleanup queries
- Scheduled task runs daily via Celery Beat
- B10 Feature Flags provide per-org configuration

---

### 5. Concurrent Generation Detection

**Decision**: Warn user but allow duplicate generations (same template + activity)

**Rationale**:
- Users may legitimately want multiple variations
- Blocking creates confusion when other user's generation is invisible
- Warning provides safety net without enforcing strict uniqueness
- Audit trail captures all generations for analysis

**Alternatives Considered**:
- **Block duplicates**: Return 409 Conflict error
  - Rejected: Too restrictive; prevents valid use cases (re-generation after tweaks)
- **Auto-cancel previous**: Cancel in-progress generation
  - Rejected: Wasteful; user may want both outputs
- **Silent allow**: No warning
  - Rejected: User may not realize duplicate is running; wastes resources

**Implementation Pattern**:
```python
# views.py
class ContentItemViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['post'])
    def generate(self, request):
        template_id = request.data.get('template_id')
        activity_id = request.data.get('activity_id')

        # Check for existing in-progress generation
        existing = ContentItem.objects.filter(
            template_id=template_id,
            activity_id=activity_id,
            status__in=['queued', 'generating']
        ).first()

        if existing:
            return Response({
                'warning': 'A generation for this template and activity is already in progress',
                'existing_item_id': existing.id,
                'existing_status': existing.status,
                'proceed': True  # User can choose to proceed
            }, status=200)

        # Create new ContentItem and queue task
        content_item = ContentItem.objects.create(...)
        generate_content_task.delay(content_item.id)
        return Response({'id': content_item.id}, status=201)
```

**Key Learnings**:
- Frontend shows existing generation with "Generate Anyway?" button
- Warning is informational, not blocking
- Audit trail (B09) logs all generation requests

---

## Technology Stack Summary

| Component | Technology | Version | Source |
|-----------|-----------|---------|--------|
| Language | Python | 3.12+ | Django Core baseline |
| Framework | Django | 5.0+ | Existing |
| API | Django REST Framework | 3.14+ | Existing |
| Task Queue | Celery | 5.3+ | B15 Tasks |
| Message Broker | Redis | Latest | B15 Tasks |
| WebSocket | Django Channels | Latest | B23 WebSocket |
| Database | PostgreSQL | Latest | Django Core |
| File Storage | B22 Files | N/A | Existing module |
| Permissions | B08 HAC | N/A | Existing module |
| Audit | B09 Audit Trail | N/A | Existing module |
| Notifications | B17 Notifications | N/A | Existing module |

---

## Integration Dependencies

| Module | Purpose | Integration Point |
|--------|---------|------------------|
| B08 Hierarchical Access | Permissions | `HasPermission` classes in views |
| B09 Audit Trail | Logging | Log all CRUD + approve/reject actions |
| B10 Feature Flags | Configuration | Org-specific retention policies, timeouts |
| B15 Tasks | Async Jobs | `generate_content_task`, `cleanup_expired_content` |
| B17 Notifications | Alerts | Notify on completion, approval, rejection |
| B22 Files | Storage | Store output files, generate thumbnails |
| B23 WebSocket | Real-time | Broadcast status updates to subscribers |
| B30 Activities | Linking | Optional FK to match/event |
| B32 Sport Config | Filtering | Filter templates by sport type |
| B34 Gen Pipelines | AI Execution | External AI workflow invocation (future) |

---

## Outstanding Questions

*None - all planning questions have been answered and documented in plan.md Technical Context.*

---

## Next Steps

1. Create `data-model.md` with detailed entity schemas
2. Generate API contracts in `/contracts/` folder
3. Create `quickstart.md` with usage examples
4. Update agent context with new technologies
