---
work_package_id: "WP06"
subtasks: ["T060", "T061", "T062", "T063", "T064", "T065", "T066", "T067", "T068", "T069", "T070"]
title: "In-App Notification Channel"
phase: "Phase 3 - Extended Channels (P3)"
lane: "for_review"
agent: "claude"
shell_pid: "$$PID"
assignee: "claude-agent"
review_status: "ready_for_review"
completion_commit: "86602bf"
tests_passing: "27/27 (100%)"
history:
  - timestamp: "2025-12-01T00:00:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-02T11:15:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "$$PID"
    action: "Started WP06 implementation"
  - timestamp: "2025-12-02T11:30:00Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "$$PID"
    action: "Implementation complete, ready for review"
---

# WP06 – In-App Notification Channel

## Objectives
Implement in-app notifications with read/unread status and user-specific queries (User Story 4).

## Success Criteria
- InAppChannel creates notifications synchronously (no Celery)
- Users query their own notifications (permission checks)
- Mark-as-read endpoint updates read_at timestamp
- Bulk mark-as-read for multiple notifications
- Filters: unread_only, read_only

## Key Subtasks

**T060 - InAppChannel**: `src/notifications/channels/in_app.py`
```python
class InAppChannel(NotificationChannel):
    def send(self, notification: Notification) -> Dict[str, Any]:
        # In-app is synchronous - just update status
        notification.status = 'sent'
        notification.save()
        return {'outcome': 'success'}

    def validate_recipient(self, recipient: str) -> bool:
        # recipient should be user ID, validate recipient_user FK exists
        return notification.recipient_user is not None
```

**T061 - read_at handling**: Already in Notification model
**T062 - InAppNotificationViewSet**: Filter by recipient_user
**T063 - User filtering**: `queryset.filter(recipient_user=request.user)`
**T064 - Mark-as-read**: `PUT /notifications/{id}/mark-read/`
```python
@action(detail=True, methods=['put'])
def mark_read(self, request, pk=None):
    notification = self.get_object()
    notification.read_at = timezone.now()
    notification.save()
    return Response({'status': 'read'})
```

**T065 - Bulk mark-as-read**: `POST /notifications/mark-all-read/`
**T066 - Filters**: unread (read_at__isnull=True), read (read_at__isnull=False)
**T067 - Permissions**: IsOwnerOrAdmin (user can only see their notifications)
**T068-T069 - Tests**: Unit tests for InAppChannel, API tests for endpoints
**T070 - TTL cleanup**: Optional Celery task to delete old in-app notifications

## References
- [spec.md](../spec.md): User Story 4
- B05 User model integration

## Definition of Done
- [ ] InAppChannel implemented (synchronous delivery)
- [ ] User-specific queries work
- [ ] Mark-as-read endpoints functional
- [ ] Permission checks enforce user ownership
- [ ] All tests pass
