---
lane: "doing"
agent: "claude"
shell_pid: "36572"
---
# Work Package 04: Participation Tracking API

---
**work_package_id**: WP04
**lane**: doing
**priority**: P1-P2 (User Stories 2, 4)
**estimated_effort**: 4 hours
**dependencies**: WP01, WP02, WP03
**blocks**: None
**subtasks**: T010, T014, T015 (complete), T018
**history**:
  - 2026-01-05: Created during /spec-kitty.tasks generation
---

## Objective

Implement REST API for participation CRUD operations enabling dual-level tracking (period squads + activity lineups). Enforce CHECK constraint validation (activity XOR period) at serializer level.

## Context

From spec User Stories 2 & 4:
- Add team members to period with roles (squad_member, captain) and metadata (jersey_number, position)
- Build activity lineups from period members (starter, substitute)
- Status tracking (confirmed, tentative, declined, no_response)

Key constraint: Participation must link to EITHER activity OR period, never both or neither.

## Detailed Guidance

### T010: Create ParticipationSerializer

```python
# src/activities/api/serializers.py

class ParticipationSerializer(serializers.ModelSerializer):
    member = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()
    period = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    member_id = serializers.UUIDField(write_only=True)
    activity_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    period_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Participation
        fields = [
            'id', 'member', 'member_id', 'activity', 'activity_id',
            'period', 'period_id', 'role', 'status', 'notes', 'data',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Enforce activity XOR period constraint"""
        activity_id = data.get('activity_id')
        period_id = data.get('period_id')

        # XOR logic: exactly one must be set
        if (activity_id and period_id) or (not activity_id and not period_id):
            raise serializers.ValidationError({
                'non_field_errors': 'Participation must link to exactly one of (activity, period)'
            })

        # Verify member organisation matches activity/period organisation
        member_id = data.get('member_id')
        if member_id:
            try:
                from organisations.models import Membership
                member = Membership.objects.get(id=member_id)

                if activity_id:
                    activity = Activity.objects.get(id=activity_id)
                    if member.organisation_id != activity.project.organisation_id:
                        raise serializers.ValidationError({
                            'member_id': 'Member must belong to same organisation as activity'
                        })

                if period_id:
                    period = Period.objects.get(id=period_id)
                    if member.organisation_id != period.organisation_id:
                        raise serializers.ValidationError({
                            'member_id': 'Member must belong to same organisation as period'
                        })

            except (Membership.DoesNotExist, Activity.DoesNotExist, Period.DoesNotExist) as e:
                raise serializers.ValidationError({'error': str(e)})

        return data
```

### T014: Create ParticipationViewSet

```python
# src/activities/api/views.py

class ParticipationViewSet(viewsets.ModelViewSet):
    queryset = Participation.objects.select_related(
        'member', 'activity', 'period', 'created_by'
    )
    serializer_class = ParticipationSerializer
    permission_classes = [ParticipationPermission]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by member_id
        member_id = self.request.query_params.get('member_id')
        if member_id:
            queryset = queryset.filter(member_id=member_id)

        # Filter by activity_id
        activity_id = self.request.query_params.get('activity_id')
        if activity_id:
            queryset = queryset.filter(activity_id=activity_id)

        # Filter by period_id
        period_id = self.request.query_params.get('period_id')
        if period_id:
            queryset = queryset.filter(period_id=period_id)

        # Filter by role
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)

        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset
```

### T015: Complete API URL Routing

```python
# src/activities/api/urls.py (final version)

router.register(r'periods', PeriodViewSet, basename='period')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'participations', ParticipationViewSet, basename='participation')
```

### T018: Add Participation Signals

```python
# src/activities/signals.py (extend)

@receiver(post_save, sender=Participation)
def participation_post_save(sender, instance, created, **kwargs):
    try:
        from audit.models import AuditEvent

        event_type = 'participation.created' if created else 'participation.updated'
        AuditEvent.objects.create(
            event_type=event_type,
            actor=instance.created_by,
            target_model='Participation',
            target_id=str(instance.id),
            changes={'role': instance.role, 'status': instance.status}
        )
    except ImportError:
        logger.info(f"Participation {event_type}: {instance.id}")
```

## Test Strategy

```python
# src/activities/tests/test_api_participations.py

@pytest.mark.django_db
def test_create_period_participation(api_client, period, member, user):
    api_client.force_authenticate(user=user)

    data = {
        'period_id': str(period.id),
        'member_id': str(member.id),
        'role': 'squad_member',
        'status': 'confirmed',
        'data': {'jersey_number': 10, 'position': 'striker'}
    }

    response = api_client.post('/api/v1/participations/', data, format='json')

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['role'] == 'squad_member'

@pytest.mark.django_db
def test_create_participation_with_both_ids_fails(api_client, activity, period, member, user):
    """Test XOR constraint enforced"""
    api_client.force_authenticate(user=user)

    data = {
        'activity_id': str(activity.id),
        'period_id': str(period.id),  # Both set - should fail
        'member_id': str(member.id),
        'role': 'starter',
        'status': 'confirmed'
    }

    response = api_client.post('/api/v1/participations/', data, format='json')

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'exactly one' in str(response.data).lower()
```

## Definition of Done

- [x] ParticipationSerializer with XOR validation
- [x] ParticipationViewSet with filtering (member, activity, period, role, status)
- [x] B09 audit signals for Participation
- [x] API tests pass for both participation types
- [x] XOR constraint validation works at both serializer and database level

## Risks & Reviewer Guidance

**Risk**: unique_together may conflict with XOR constraint
**Check**: Verify duplicate participations prevented correctly

**Reviewer Checklist**:
- [ ] Serializer validates XOR before database save
- [ ] Organisation matching validated for member
- [ ] Status choices match spec (confirmed/tentative/declined/no_response)

## Activity Log

- 2026-01-06T08:09:52Z – system – shell_pid= – lane=doing – Started implementation of Participation Tracking API
[2026-01-06T09:13:25Z] Completed WP04: Participation Tracking API implementation - All subtasks complete
