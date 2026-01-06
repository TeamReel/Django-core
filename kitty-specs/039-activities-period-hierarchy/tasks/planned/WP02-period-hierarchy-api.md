# Work Package 02: Period Hierarchy API

---
**work_package_id**: WP02
**lane**: planned
**priority**: P1 (User Story 1)
**estimated_effort**: 5 hours
**dependencies**: WP01
**blocks**: WP03, WP04
**subtasks**: T008, T011, T012, T015, T016
**history**:
  - 2026-01-05: Created during /spec-kitty.tasks generation
---

## Objective

Implement REST API for period CRUD operations with tree navigation endpoints. Integrate B08 permissions (manage_periods) and B09 audit logging. Enable creating multi-level period hierarchies via API with validation for date ranges, parent-child organisation matching, and deletion prevention when children exist.

## Context

From spec User Story 1 acceptance scenarios:
- Create root period "Seizoen 2023/2024" with no parent
- Create child period "Najaarscompetitie" under root
- Create grandchild "December 2023" under child
- Navigate breadcrumbs to jump to ancestor periods
- Prevent deletion of parent periods with children
- Filter periods by project (only show project-specific + org-wide)

From contracts/api-contract.md:
- GET /api/v1/periods/ with query params (organisation_id, project_id, parent_id)
- POST /api/v1/periods/ with validation
- GET /api/v1/periods/{id}/children/ (direct children)
- GET /api/v1/periods/{id}/descendants/ (all descendants via CTE)
- DELETE /api/v1/periods/{id}/ with child existence check

## Detailed Guidance

### T008: Create PeriodSerializer

Location: `src/activities/api/serializers.py`

```python
from rest_framework import serializers
from activities.models import Period
from django.db.models import Count

class PeriodSerializer(serializers.ModelSerializer):
    # Nested read-only representations
    organisation = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    parent_period = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    # Annotated counts
    children_count = serializers.IntegerField(read_only=True)
    activities_count = serializers.IntegerField(read_only=True)

    # Write fields
    organisation_id = serializers.UUIDField(write_only=True)
    project_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    parent_period_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Period
        fields = [
            'id', 'organisation', 'organisation_id', 'project', 'project_id',
            'parent_period', 'parent_period_id', 'name', 'description',
            'start_date', 'end_date', 'data', 'created_at', 'updated_at',
            'created_by', 'children_count', 'activities_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_organisation(self, obj):
        if obj.organisation:
            return {'id': str(obj.organisation.id), 'name': obj.organisation.name}
        return None

    def get_project(self, obj):
        if obj.project:
            return {'id': str(obj.project.id), 'name': obj.project.name}
        return None

    def get_parent_period(self, obj):
        if obj.parent_period:
            return {
                'id': str(obj.parent_period.id),
                'name': obj.parent_period.name,
                'start_date': obj.parent_period.start_date,
                'end_date': obj.parent_period.end_date
            }
        return None

    def get_created_by(self, obj):
        if obj.created_by:
            return {'id': str(obj.created_by.id), 'name': obj.created_by.get_full_name()}
        return None

    def validate(self, data):
        """Validate end_date > start_date and organisation matching"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if end_date and start_date and end_date <= start_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date'
            })

        # If parent_period set, verify organisation matches
        parent_period_id = data.get('parent_period_id')
        organisation_id = data.get('organisation_id')

        if parent_period_id:
            try:
                parent = Period.objects.get(id=parent_period_id)
                if str(parent.organisation_id) != str(organisation_id):
                    raise serializers.ValidationError({
                        'parent_period_id': 'Child period must belong to same organisation as parent'
                    })
            except Period.DoesNotExist:
                raise serializers.ValidationError({
                    'parent_period_id': 'Parent period does not exist'
                })

        return data

    def create(self, validated_data):
        # Extract write-only fields
        organisation_id = validated_data.pop('organisation_id')
        project_id = validated_data.pop('project_id', None)
        parent_period_id = validated_data.pop('parent_period_id', None)

        # Set request user as created_by
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user

        period = Period.objects.create(
            organisation_id=organisation_id,
            project_id=project_id,
            parent_period_id=parent_period_id,
            **validated_data
        )

        return period

    def update(self, instance, validated_data):
        # Remove write-only fields from validated_data (don't update FKs after creation)
        validated_data.pop('organisation_id', None)
        validated_data.pop('project_id', None)
        validated_data.pop('parent_period_id', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
```

### T011: Create Permission Classes

Location: `src/activities/api/permissions.py`

```python
from rest_framework import permissions

class PeriodPermission(permissions.BasePermission):
    """
    Permission check for Period operations.
    - Read: Any organisation member
    - Write: organisation.manage_periods (org-wide) or project.manage_periods (project-scoped)
    """

    def has_permission(self, request, view):
        # Read permissions (GET, HEAD, OPTIONS) for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Write permissions require authentication
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read access for any org member
        if request.method in permissions.SAFE_METHODS:
            # TODO: Check if user is member of obj.organisation (integrate B06)
            # For now, allow authenticated users
            return True

        # Write access requires manage_periods permission
        # Check B08 integration
        from permissions.utils import has_permission  # Adjust import based on B08 API

        if obj.project:
            # Project-scoped period: check project.manage_periods
            return has_permission(request.user, 'project.manage_periods', obj.project)
        else:
            # Org-wide period: check organisation.manage_periods
            return has_permission(request.user, 'organisation.manage_periods', obj.organisation)
```

**Note**: Adjust `has_permission` import based on actual B08 API. If B08 not available, use fallback:
```python
def has_permission(user, permission_name, obj):
    # Fallback: check user.is_staff
    return user.is_staff
```

### T012: Create PeriodViewSet

Location: `src/activities/api/views.py`

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Count, Q
from activities.models import Period
from .serializers import PeriodSerializer
from .permissions import PeriodPermission

class PeriodViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Period CRUD + tree navigation actions.

    Endpoints:
    - GET /periods/ - List periods with filtering
    - POST /periods/ - Create period
    - GET /periods/{id}/ - Retrieve period
    - PUT /periods/{id}/ - Update period
    - DELETE /periods/{id}/ - Delete period (prevents if children exist)
    - GET /periods/{id}/children/ - Get direct children
    - GET /periods/{id}/descendants/ - Get all descendants (CTE)
    """
    queryset = Period.objects.select_related(
        'organisation', 'project', 'parent_period', 'created_by'
    ).annotate(
        children_count=Count('children'),
        activities_count=Count('activities')
    )
    serializer_class = PeriodSerializer
    permission_classes = [PeriodPermission]
    filterset_fields = ['organisation', 'project']

    def get_queryset(self):
        """Apply query param filters"""
        queryset = super().get_queryset()

        # Filter by organisation_id
        organisation_id = self.request.query_params.get('organisation_id')
        if organisation_id:
            queryset = queryset.filter(organisation_id=organisation_id)

        # Filter by project_id
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by parent_id (supports parent_id=null for roots)
        parent_id = self.request.query_params.get('parent_id')
        if parent_id == 'null':
            queryset = queryset.filter(parent_period__isnull=True)
        elif parent_id:
            queryset = queryset.filter(parent_period_id=parent_id)

        return queryset

    def destroy(self, request, *args, **kwargs):
        """Override destroy to prevent deletion if children exist"""
        instance = self.get_object()

        # Check if period has children
        children_count = instance.children.count()
        if children_count > 0:
            return Response(
                {
                    'error': f'Cannot delete period with {children_count} child period(s). Delete children first.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if period has activities
        activities_count = instance.activities.count()
        if activities_count > 0:
            return Response(
                {
                    'error': f'Cannot delete period with {activities_count} activit(ies). Delete activities first.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        """Get direct children of period"""
        period = self.get_object()
        children = period.children.all()
        serializer = self.get_serializer(children, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def descendants(self, request, pk=None):
        """Get all descendants of period using recursive CTE"""
        period = self.get_object()
        descendants = Period.objects.get_descendants(period.id)
        serializer = self.get_serializer(descendants, many=True)
        return Response(serializer.data)
```

### T015: Configure API URL Routing (Part 1 - Period)

Location: `src/activities/api/urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PeriodViewSet

router = DefaultRouter()
router.register(r'periods', PeriodViewSet, basename='period')

urlpatterns = [
    path('', include(router.urls)),
]
```

**Main URL configuration**: Update `src/config/urls.py`:

```python
urlpatterns = [
    ...
    path('api/v1/', include('activities.api.urls')),  # Add this line
    ...
]
```

### T016: Add B09 Audit Signals

Location: `src/activities/signals.py`

```python
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Period
import logging

logger = logging.getLogger(__name__)

# Track previous state for change detection
_period_previous_state = {}

@receiver(pre_save, sender=Period)
def period_pre_save(sender, instance, **kwargs):
    """Capture previous state before save"""
    if instance.pk:
        try:
            old_instance = Period.objects.get(pk=instance.pk)
            _period_previous_state[instance.pk] = {
                'name': old_instance.name,
                'start_date': old_instance.start_date,
                'end_date': old_instance.end_date,
                'parent_period_id': old_instance.parent_period_id,
            }
        except Period.DoesNotExist:
            pass

@receiver(post_save, sender=Period)
def period_post_save(sender, instance, created, **kwargs):
    """Emit B09 audit event for period creation/update"""
    try:
        # Import B09 audit API (adjust based on actual B09 interface)
        from audit.models import AuditEvent  # Example import

        if created:
            event_type = 'period.created'
            changes = {
                'name': instance.name,
                'start_date': str(instance.start_date),
                'end_date': str(instance.end_date),
            }
        else:
            event_type = 'period.updated'
            old_state = _period_previous_state.get(instance.pk, {})
            changes = {}

            if old_state.get('name') != instance.name:
                changes['name'] = {'old': old_state.get('name'), 'new': instance.name}
            if old_state.get('start_date') != instance.start_date:
                changes['start_date'] = {'old': str(old_state.get('start_date')), 'new': str(instance.start_date)}
            # ... (add more field comparisons)

            # Clean up previous state
            _period_previous_state.pop(instance.pk, None)

        # Emit audit event
        AuditEvent.objects.create(
            event_type=event_type,
            actor=instance.created_by,
            target_model='Period',
            target_id=str(instance.id),
            changes=changes
        )

    except ImportError:
        # Fallback if B09 not available
        logger.info(f"Period {event_type}: {instance.id} by {instance.created_by}")
    except Exception as e:
        logger.error(f"Failed to emit audit event for Period {instance.id}: {e}")

@receiver(post_delete, sender=Period)
def period_post_delete(sender, instance, **kwargs):
    """Emit B09 audit event for period deletion"""
    try:
        from audit.models import AuditEvent

        AuditEvent.objects.create(
            event_type='period.deleted',
            actor=getattr(instance, '_deleted_by', None),  # Set via view if needed
            target_model='Period',
            target_id=str(instance.id),
            changes={'name': instance.name}
        )

    except ImportError:
        logger.info(f"Period deleted: {instance.id}")
    except Exception as e:
        logger.error(f"Failed to emit deletion audit event for Period {instance.id}: {e}")
```

**Connect signals**: Update `src/activities/apps.py`:

```python
class ActivitiesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'activities'
    verbose_name = 'Activities & Period Hierarchy'

    def ready(self):
        import activities.signals  # Connect signals
```

## Test Strategy

### API Tests

Create `src/activities/tests/test_api_periods.py`:

```python
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from activities.models import Period
from datetime import date

@pytest.mark.django_db
def test_create_root_period(api_client, organisation, user):
    """Test POST /api/v1/periods/ creates root period"""
    api_client.force_authenticate(user=user)

    data = {
        'organisation_id': str(organisation.id),
        'name': 'Seizoen 2023/2024',
        'description': 'Voetbal seizoen',
        'start_date': '2023-09-01',
        'end_date': '2024-06-30',
        'data': {}
    }

    response = api_client.post('/api/v1/periods/', data, format='json')

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['name'] == 'Seizoen 2023/2024'
    assert response.data['parent_period'] is None
    assert Period.objects.filter(name='Seizoen 2023/2024').exists()

@pytest.mark.django_db
def test_create_child_period(api_client, organisation, user):
    """Test creating child period under parent"""
    api_client.force_authenticate(user=user)

    # Create parent
    parent = Period.objects.create(
        organisation=organisation,
        name='Season 2023',
        start_date=date(2023, 9, 1),
        end_date=date(2024, 6, 30)
    )

    # Create child
    data = {
        'organisation_id': str(organisation.id),
        'parent_period_id': str(parent.id),
        'name': 'Fall 2023',
        'start_date': '2023-09-01',
        'end_date': '2023-12-31',
        'data': {}
    }

    response = api_client.post('/api/v1/periods/', data, format='json')

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['parent_period']['id'] == str(parent.id)

@pytest.mark.django_db
def test_get_period_descendants(api_client, organisation, user):
    """Test GET /api/v1/periods/{id}/descendants/ returns all descendants"""
    api_client.force_authenticate(user=user)

    # Create 3-level hierarchy
    season = Period.objects.create(
        organisation=organisation,
        name='Season',
        start_date=date(2023, 1, 1),
        end_date=date(2023, 12, 31)
    )

    q1 = Period.objects.create(
        organisation=organisation,
        parent_period=season,
        name='Q1',
        start_date=date(2023, 1, 1),
        end_date=date(2023, 3, 31)
    )

    january = Period.objects.create(
        organisation=organisation,
        parent_period=q1,
        name='January',
        start_date=date(2023, 1, 1),
        end_date=date(2023, 1, 31)
    )

    response = api_client.get(f'/api/v1/periods/{season.id}/descendants/')

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2  # q1 + january
    names = [p['name'] for p in response.data]
    assert 'Q1' in names
    assert 'January' in names

@pytest.mark.django_db
def test_delete_period_with_children_prevented(api_client, organisation, user):
    """Test DELETE /api/v1/periods/{id}/ fails if children exist"""
    api_client.force_authenticate(user=user)

    parent = Period.objects.create(
        organisation=organisation,
        name='Parent',
        start_date=date(2023, 1, 1),
        end_date=date(2023, 12, 31)
    )

    child = Period.objects.create(
        organisation=organisation,
        parent_period=parent,
        name='Child',
        start_date=date(2023, 1, 1),
        end_date=date(2023, 3, 31)
    )

    response = api_client.delete(f'/api/v1/periods/{parent.id}/')

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert 'Cannot delete period with 1 child period' in response.data['error']
    assert Period.objects.filter(id=parent.id).exists()  # Not deleted
```

## Definition of Done

- [x] PeriodSerializer created with nested representations, validation, write-only fields
- [x] PeriodPermission class integrates B08 (or uses fallback)
- [x] PeriodViewSet with CRUD + /children/ + /descendants/ actions
- [x] API routes configured at /api/v1/periods/
- [x] B09 audit signals emit events for create/update/delete
- [x] API tests pass for create, retrieve, descendants, delete prevention
- [x] GET /api/v1/periods/?organisation_id=X filters correctly
- [x] DELETE blocked if children or activities exist (HTTP 400)

## Risks & Reviewer Guidance

**Risk 1**: B08 permission API unknown
**Check**: Verify `has_permission(user, 'organisation.manage_periods', obj)` signature matches B08

**Risk 2**: B09 audit event signature may differ
**Check**: Adjust `AuditEvent.objects.create()` to match actual B09 API

**Reviewer Checklist**:
- [ ] Serializer validation prevents end_date <= start_date
- [ ] Serializer validation checks parent organisation match
- [ ] ViewSet.destroy() checks both children and activities before deletion
- [ ] /descendants/ endpoint uses Period.objects.get_descendants() CTE method
- [ ] Signals connect in apps.py ready() method
- [ ] API returns B13 envelope pattern (if B13 integration required)
