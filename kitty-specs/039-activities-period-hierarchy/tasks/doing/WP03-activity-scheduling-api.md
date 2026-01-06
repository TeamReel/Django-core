---
lane: "doing"
agent: "claude"
shell_pid: "36572"
---
# Work Package 03: Activity Scheduling API

---
**work_package_id**: WP03
**lane**: doing
**priority**: P1 (User Story 3)
**estimated_effort**: 4 hours
**dependencies**: WP01, WP02
**blocks**: WP04
**subtasks**: T009, T013, T015 (extend), T017
**history**:
  - 2026-01-05: Created during /spec-kitty.tasks generation
---

## Objective

Implement REST API for activity CRUD operations with calendar filtering support. Enable scheduling activities within periods with timezone-aware datetime handling, flexible activity_type field, and JSON outcome data storage.

## Context

From spec User Story 3: Project managers schedule events within time periods. Match "Ajax vs Feyenoord" in December 2023. Activity appears in parent period calendars (inheritance).

Key requirements:
- Timezone-aware start_time/end_time (store UTC, display user timezone)
- Flexible activity_type (match, meeting, training, etc.)
- JSONField data for outcome (score, goals, notes)
- Calendar filtering by period (include descendants)
- Soft warning if activity outside period date range

## Detailed Guidance

### T009: Create ActivitySerializer

```python
# src/activities/api/serializers.py

class ActivitySerializer(serializers.ModelSerializer):
    project = serializers.SerializerMethodField()
    period = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    project_id = serializers.UUIDField(write_only=True)
    period_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Activity
        fields = [
            'id', 'project', 'project_id', 'period', 'period_id',
            'title', 'activity_type', 'start_time', 'end_time',
            'location', 'description', 'data',
            'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if end_time and start_time and end_time <= start_time:
            raise serializers.ValidationError({'end_time': 'End time must be after start time'})

        # Soft warning if activity outside period date range
        period_id = data.get('period_id')
        if period_id and start_time:
            try:
                period = Period.objects.get(id=period_id)
                activity_date = start_time.date()

                if not (period.start_date <= activity_date <= period.end_date):
                    # Non-field warning (doesn't block save)
                    self.warnings = [
                        f"Activity scheduled outside period date range ({period.start_date} to {period.end_date})"
                    ]
            except Period.DoesNotExist:
                raise serializers.ValidationError({'period_id': 'Period does not exist'})

        return data
```

### T013: Create ActivityViewSet

```python
# src/activities/api/views.py

class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.select_related(
        'project', 'period', 'created_by'
    ).prefetch_related('participations__member')
    serializer_class = ActivitySerializer
    permission_classes = [ActivityPermission]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by period (with optional descendants)
        period_id = self.request.query_params.get('period_id')
        include_descendants = self.request.query_params.get('include_descendants', 'false').lower() == 'true'

        if period_id:
            if include_descendants:
                period = Period.objects.get(id=period_id)
                descendant_ids = Period.objects.get_descendants(period.id).values_list('id', flat=True)
                all_period_ids = [period_id] + list(descendant_ids)
                queryset = queryset.filter(period_id__in=all_period_ids)
            else:
                queryset = queryset.filter(period_id=period_id)

        # Filter by activity_type
        activity_type = self.request.query_params.get('activity_type')
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)

        # Filter by date range
        start_time__gte = self.request.query_params.get('start_time__gte')
        start_time__lte = self.request.query_params.get('start_time__lte')

        if start_time__gte:
            queryset = queryset.filter(start_time__gte=start_time__gte)
        if start_time__lte:
            queryset = queryset.filter(start_time__lte=start_time__lte)

        return queryset

    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """Get participants for activity"""
        activity = self.get_object()
        participations = activity.participations.select_related('member').all()
        serializer = ParticipationSerializer(participations, many=True)
        return Response(serializer.data)
```

### T015: Extend API URL Routing

```python
# src/activities/api/urls.py (update existing)

router.register(r'activities', ActivityViewSet, basename='activity')
```

### T017: Add Activity Signals

```python
# src/activities/signals.py (extend existing)

@receiver(post_save, sender=Activity)
def activity_post_save(sender, instance, created, **kwargs):
    try:
        from audit.models import AuditEvent

        event_type = 'activity.created' if created else 'activity.updated'
        AuditEvent.objects.create(
            event_type=event_type,
            actor=instance.created_by,
            target_model='Activity',
            target_id=str(instance.id),
            changes={'title': instance.title, 'activity_type': instance.activity_type}
        )
    except ImportError:
        logger.info(f"Activity {event_type}: {instance.id}")
```

## Test Strategy

```python
# src/activities/tests/test_api_activities.py

@pytest.mark.django_db
def test_create_activity(api_client, project, period, user):
    api_client.force_authenticate(user=user)

    data = {
        'project_id': str(project.id),
        'period_id': str(period.id),
        'title': 'Ajax vs Feyenoord',
        'activity_type': 'match',
        'start_time': '2023-12-15T14:30:00Z',
        'end_time': '2023-12-15T16:15:00Z',
        'location': 'Johan Cruijff Arena',
        'description': 'Top wedstrijd',
        'data': {}
    }

    response = api_client.post('/api/v1/activities/', data, format='json')

    assert response.status_code == status.HTTP_201_CREATED
    assert Activity.objects.filter(title='Ajax vs Feyenoord').exists()

@pytest.mark.django_db
def test_filter_activities_by_period_with_descendants(api_client, organisation, user):
    # Create 2-level hierarchy with activities at both levels
    season = Period.objects.create(...)
    november = Period.objects.create(parent_period=season, ...)

    activity1 = Activity.objects.create(period=season, ...)
    activity2 = Activity.objects.create(period=november, ...)

    api_client.force_authenticate(user=user)
    response = api_client.get(f'/api/v1/activities/?period_id={season.id}&include_descendants=true')

    assert len(response.data) == 2  # Both activities returned
```

## Definition of Done

- [x] ActivitySerializer with timezone enforcement, soft date range warning
- [x] ActivityViewSet with calendar filtering (period, descendants, activity_type, date range)
- [x] /activities/{id}/participants/ endpoint
- [x] B09 audit signals for Activity
- [x] API tests pass

## Risks & Reviewer Guidance

**Risk**: Timezone handling inconsistencies
**Check**: Verify DateTimeField stores UTC, uses timezone.now()

**Reviewer Checklist**:
- [ ] Serializer validates end_time > start_time
- [ ] include_descendants filter uses CTE efficiently (no N+1)
- [ ] Soft warning doesn't block activity creation (info only)

## Activity Log

- 2026-01-06T08:02:59Z – system – shell_pid= – lane=doing – Started implementation of Activity Scheduling API
[2026-01-06T09:05:51Z] Completed WP03: Activity Scheduling API implementation - All subtasks complete
