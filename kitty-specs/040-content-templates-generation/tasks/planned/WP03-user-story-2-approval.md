---
work_package_id: WP03
title: User Story 2 - Approval Workflow
lane: planned
subtasks:
  - T015
  - T016
  - T017
  - T018
  - T019
  - T020
  - T021
priority: P1
estimated_effort: 2 days
dependencies: [WP02]
history:
  - date: 2026-01-29
    action: created
    author: spec-kitty
---

# WP03: User Story 2 - Approval Workflow

## Objective

Implement approval workflow: review completed content, approve/reject/request-revision with feedback, update ContentItem status, trigger B17 notifications, validate self-approval policy via B10.

## Context

**User Story**: Review and Approve Generated Content (Priority P1)
**Dependencies**: WP02 (ContentItem must be completable), B10 Feature Flags, B17 Notifications

Essential for quality control. Content without approval has no production value.

---

## Subtasks

### T015: ContentApprovalSerializer

```python
from rest_framework import serializers
from .models import ContentApproval, ApprovalStatus

class ContentApprovalSerializer(serializers.ModelSerializer):
    reviewer_detail = serializers.SerializerMethodField()
    content_item_detail = serializers.SerializerMethodField()

    class Meta:
        model = ContentApproval
        fields = ['id', 'content_item', 'content_item_detail', 'reviewer', 'reviewer_detail',
                  'status', 'feedback_text', 'reviewed_at']
        read_only_fields = ['reviewer', 'reviewed_at']

    def get_reviewer_detail(self, obj):
        return {'id': obj.reviewer.id, 'username': obj.reviewer.username}

    def get_content_item_detail(self, obj):
        return {
            'id': obj.content_item.id,
            'template': {'id': obj.content_item.template.id, 'name': obj.content_item.template.name}
        }

    def validate(self, data):
        content_item = data.get('content_item')
        status = data.get('status')
        feedback_text = data.get('feedback_text', '').strip()

        # Validation: content_item must be completed
        if content_item.status != 'completed':
            raise serializers.ValidationError({
                'content_item': ['Content item must be in "completed" status to approve']
            })

        # Validation: feedback required for reject/revision
        if status in [ApprovalStatus.REJECTED, ApprovalStatus.REVISION_REQUESTED]:
            if not feedback_text:
                raise serializers.ValidationError({
                    'feedback_text': ['Feedback text is required for rejected/revision_requested status']
                })

        return data

    def create(self, validated_data):
        # Check self-approval policy
        request = self.context.get('request')
        content_item = validated_data['content_item']

        from src.feature_flags.utils import get_feature_flag
        allow_self_approval = get_feature_flag(
            content_item.project.organisation,
            'content_approval_allow_self',
            default=True
        )

        if not allow_self_approval and content_item.created_by == request.user:
            raise serializers.ValidationError({
                'error': 'Self-approval is not allowed (configured via B10 feature flag)'
            })

        return super().create(validated_data)
```

---

### T016: ContentApprovalViewSet

```python
class ContentApprovalViewSet(viewsets.ModelViewSet):
    queryset = ContentApproval.objects.select_related('content_item', 'reviewer')
    serializer_class = ContentApprovalSerializer
    filterset_fields = ['content_item', 'status', 'reviewer']

    def perform_create(self, serializer):
        approval = serializer.save(reviewer=self.request.user)

        # Sync ContentItem status with approval (see T020)
        self.sync_content_item_status(approval)

        # Trigger notification (see T021)
        self.send_approval_notification(approval)

    def sync_content_item_status(self, approval):
        """Update ContentItem status to match approval"""
        content_item = approval.content_item
        content_item.status = approval.status
        content_item.save()

    def send_approval_notification(self, approval):
        """Send B17 notification to content creator"""
        from src.notifications.utils import send_notification

        notification_types = {
            'approved': 'content_approved',
            'rejected': 'content_rejected',
            'revision_requested': 'content_revision_requested'
        }

        send_notification(
            user=approval.content_item.created_by,
            notification_type=notification_types.get(approval.status),
            message=f'Your content has been {approval.get_status_display()}: {approval.content_item.template.name}',
            related_object=approval.content_item,
            metadata={'feedback': approval.feedback_text}
        )
```

---

### T017-T019: Shortcut Actions on ContentItemViewSet

Add to `ContentItemViewSet` (views.py):

```python
@action(detail=True, methods=['post'], url_path='approve')
def approve(self, request, pk=None):
    """Approve content item (shortcut)"""
    item = self.get_object()

    if item.status != ContentStatus.COMPLETED:
        return Response({
            'error': 'Content item must be completed before approval'
        }, status=status.HTTP_400_BAD_REQUEST)

    feedback_text = request.data.get('feedback_text', '')

    # Create approval
    from .models import ContentApproval, ApprovalStatus
    approval = ContentApproval.objects.create(
        content_item=item,
        reviewer=request.user,
        status=ApprovalStatus.APPROVED,
        feedback_text=feedback_text
    )

    # Update item status
    item.status = ContentStatus.APPROVED
    item.save()

    # Send notification
    from src.notifications.utils import send_notification
    send_notification(
        user=item.created_by,
        notification_type='content_approved',
        message=f'Your content has been approved: {item.template.name}',
        related_object=item
    )

    from .serializers import ContentApprovalSerializer
    return Response({
        'id': item.id,
        'status': item.status,
        'approval': ContentApprovalSerializer(approval).data
    })


@action(detail=True, methods=['post'], url_path='reject')
def reject(self, request, pk=None):
    """Reject content item (shortcut)"""
    item = self.get_object()

    if item.status != ContentStatus.COMPLETED:
        return Response({
            'error': 'Content item must be completed before rejection'
        }, status=status.HTTP_400_BAD_REQUEST)

    feedback_text = request.data.get('feedback_text', '').strip()
    if not feedback_text:
        return Response({
            'error': 'Feedback text is required for rejection'
        }, status=status.HTTP_400_BAD_REQUEST)

    from .models import ContentApproval, ApprovalStatus
    approval = ContentApproval.objects.create(
        content_item=item,
        reviewer=request.user,
        status=ApprovalStatus.REJECTED,
        feedback_text=feedback_text
    )

    item.status = ContentStatus.REJECTED
    item.save()

    from src.notifications.utils import send_notification
    send_notification(
        user=item.created_by,
        notification_type='content_rejected',
        message=f'Your content has been rejected: {item.template.name}',
        related_object=item,
        metadata={'feedback': feedback_text}
    )

    from .serializers import ContentApprovalSerializer
    return Response({
        'id': item.id,
        'status': item.status,
        'approval': ContentApprovalSerializer(approval).data
    })


@action(detail=True, methods=['post'], url_path='request-revision')
def request_revision(self, request, pk=None):
    """Request content revision (shortcut)"""
    item = self.get_object()

    if item.status != ContentStatus.COMPLETED:
        return Response({
            'error': 'Content item must be completed before requesting revision'
        }, status=status.HTTP_400_BAD_REQUEST)

    feedback_text = request.data.get('feedback_text', '').strip()
    if not feedback_text:
        return Response({
            'error': 'Feedback text is required for revision request'
        }, status=status.HTTP_400_BAD_REQUEST)

    from .models import ContentApproval, ApprovalStatus
    approval = ContentApproval.objects.create(
        content_item=item,
        reviewer=request.user,
        status=ApprovalStatus.REVISION_REQUESTED,
        feedback_text=feedback_text
    )

    item.status = ContentStatus.REVISION_REQUESTED
    item.save()

    from src.notifications.utils import send_notification
    send_notification(
        user=item.created_by,
        notification_type='content_revision_requested',
        message=f'Revision requested for your content: {item.template.name}',
        related_object=item,
        metadata={'feedback': feedback_text}
    )

    from .serializers import ContentApprovalSerializer
    return Response({
        'id': item.id,
        'status': item.status,
        'approval': ContentApprovalSerializer(approval).data
    })
```

---

### T020: Status Sync Logic

Already implemented in T016-T019 via:
1. Approval creation triggers `item.status = approval.status`
2. Shortcut actions directly update ContentItem.status

**Validation**: Latest ContentApproval by `reviewed_at` determines current status.

---

### T021: B17 Notification Integration

Already implemented in T016-T019 via `send_notification()` calls.

**Notification Types**:
- `content_approved`
- `content_rejected`
- `content_revision_requested`

---

## Definition of Done

- [ ] All 7 subtasks (T015-T021) completed
- [ ] `POST /items/42/approve/` updates status to "approved"
- [ ] Rejection requires feedback_text (400 if missing)
- [ ] ContentApproval record created with reviewer, timestamp
- [ ] Creator receives B17 notification
- [ ] Approval history visible via `GET /items/{id}/`
- [ ] Self-approval check respects B10 feature flag
- [ ] Integration tests pass

---

## Testing

```bash
# Approve content
curl -X POST http://localhost:8000/api/v1/content-generation/items/42/approve/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"feedback_text": "Excellent work"}'

# Reject content
curl -X POST http://localhost:8000/api/v1/content-generation/items/42/reject/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"feedback_text": "Quality too low, regenerate"}'

# Request revision
curl -X POST http://localhost:8000/api/v1/content-generation/items/42/request-revision/ \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"feedback_text": "Adjust timing at 0:45"}'
```

---

## Next: WP04 - Template Management
