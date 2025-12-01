---
work_package_id: "WP05"
subtasks: ["T048", "T049", "T050", "T051", "T052", "T053", "T054", "T055", "T056", "T057", "T058", "T059"]
title: "Notification History & Audit API"
phase: "Phase 1 - Core Delivery (P2)"
lane: "planned"
history:
  - timestamp: "2025-12-01T00:00:00Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated via /spec-kitty.tasks"
---

# WP05 – Notification History & Audit API

## Objectives
Provide queryable API for notification history, delivery attempts, and B09 audit logging integration (User Story 3).

## Success Criteria
- API returns paginated notification history
- Filters work: status, type, date_range, recipient
- Queries optimized (select_related, prefetch_related)
- B09 audit events logged for critical transitions
- Recipients hashed before logging (privacy)
- API documentation generated (drf-spectacular)

## Key Subtasks

**T048-T049 - Serializers**: `src/notifications/serializers/`
```python
class DeliveryAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryAttempt
        fields = ['id', 'attempt_number', 'attempted_at', 'outcome', 'error_message', 'duration_ms']

class NotificationSerializer(serializers.ModelSerializer):
    delivery_attempts = DeliveryAttemptSerializer(many=True, read_only=True)
    type_code = serializers.CharField(source='type.code', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'type_code', 'channel', 'recipient', 'status', 'created_at', 'updated_at', 'delivery_attempts']
```

**T050 - NotificationViewSet**: `src/notifications/views/notification_views.py`
```python
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    pagination_class = PageNumberPagination
    filterset_class = NotificationFilter

    def get_queryset(self):
        return super().get_queryset() \
            .select_related('type', 'type__retry_policy') \
            .prefetch_related('delivery_attempts')
```

**T051 - Filters**: Use django-filter for status, type, date_range, recipient
**T052 - Pagination**: DRF PageNumberPagination (default 50, max 100)
**T053 - Query optimization**: Already in get_queryset() above
**T054-T055 - B09 audit**:
```python
from audit.services import AuditService
import hashlib

def log_notification_event(notification, event_type):
    recipient_hash = hashlib.sha256(notification.recipient.encode()).hexdigest()
    AuditService.log_event(
        event_type=event_type,
        actor=notification.created_by,
        metadata={
            'notification_id': str(notification.id),
            'type': notification.type.code,
            'channel': notification.channel,
            'recipient_hash': recipient_hash,
        }
    )
```

**T056-T058 - Tests**: Unit tests for serializers, API tests for viewset, integration tests for audit
**T059 - API docs**: Configure drf-spectacular schema generation

## References
- [spec.md](../spec.md): User Story 3
- B09 audit logging integration

## Definition of Done
- [ ] API returns notification history with filters
- [ ] Pagination works (50/page, max 100)
- [ ] Queries optimized (no N+1)
- [ ] B09 audit events logged
- [ ] Recipients hashed in audit logs
- [ ] API docs generated
- [ ] All tests pass (90%+ coverage)
