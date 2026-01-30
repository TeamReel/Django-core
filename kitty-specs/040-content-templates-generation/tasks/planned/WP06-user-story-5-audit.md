---
work_package_id: WP06
title: User Story 5 - Audit Trail
lane: planned
subtasks: [T033, T034, T035]
priority: P3
estimated_effort: 0.5 days
dependencies: [WP03]
---

# WP06: Audit Trail Integration

## Objective
Integrate B09 Audit Trail for all CRUD operations, expose approval history.

## Implementation

### T033: ContentItem Audit Logging
```python
from src.audit.utils import log_audit_event

class ContentItem(models.Model):
    def save(self, *args, **kwargs):
        action = 'created' if not self.pk else 'updated'
        super().save(*args, **kwargs)
        log_audit_event(
            action=f'content_item.{action}',
            resource=self,
            actor=self.created_by,
            metadata={'status': self.status}
        )
```

### T034: ContentApproval Audit Logging
```python
class ContentApproval(models.Model):
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        log_audit_event(
            action='content_approval.created',
            resource=self,
            actor=self.reviewer,
            metadata={'status': self.status, 'feedback': self.feedback_text}
        )
```

### T035: Approval History in Serializer
Already implemented in T007 `ContentItemSerializer`:
```python
approval_history = serializers.SerializerMethodField()

def get_approval_history(self, obj):
    return ContentApprovalSerializer(
        obj.contentapproval_set.all().order_by('-reviewed_at'),
        many=True
    ).data
```

## Done When
- [ ] B09 audit logs created for all status changes
- [ ] B09 logs created for all approvals
- [ ] `GET /items/{id}/` includes approval_history array
- [ ] Audit queryable via B09 API
