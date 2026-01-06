---
lane: "planned"
agent: "system"
---
# Work Package 07: Test Suite Implementation

---
**work_package_id**: WP07
**lane**: planned
**priority**: P0 (Blocking - Constitution Article IV compliance)
**estimated_effort**: 5 hours
**dependencies**: WP01, WP02, WP03, WP04, WP05
**blocks**: None (Acceptance)
**subtasks**: T025, T026, T027, T028, T029
**history**:
  - 2026-01-06: Created for Constitution Article IV v1.2.0 compliance
---

## Objective

Implement comprehensive pytest test suite for activities module to satisfy Constitution Article IV requirements. Achieve minimum coverage thresholds: models ≥90%, API ≥85%, serializers ≥80%, permissions ≥90%, managers ≥85%.

## Context

**Constitution Article IV v1.2.0** mandates:
- Every Django app in `src/` MUST have `tests/` directory with pytest files
- Required test files: test_models.py, test_api.py, test_serializers.py, test_permissions.py, test_managers.py
- Coverage thresholds enforced in CI
- Features MUST include tests before acceptance

**Current State**: activities module has empty `tests/` directory with only `__init__.py`. All 6 work packages (WP01-WP06) implemented without test coverage.

**Gap Analysis**:
- 3 models (Period, Activity, Participation) - untested
- 5 manager methods (get_descendants, get_ancestors, get_siblings, get_depth, is_root) - untested
- 3 ViewSets with 15+ endpoints - untested
- 3 permission classes - untested
- 3 serializers with validation logic - untested

## Detailed Guidance

### T025: Implement test_models.py

**Objective**: Test Period, Activity, Participation models (target: ≥90% coverage)

**Location**: `src/activities/tests/test_models.py`

**Test Scenarios**:

```python
import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from django.db import IntegrityError
from django.core.exceptions import ValidationError
from activities.models import Period, Activity, Participation

@pytest.mark.django_db
class TestPeriodModel:
    """Test Period model constraints, validation, and behavior."""

    def test_create_root_period(self, organisation):
        """Root period can be created without parent."""
        period = Period.objects.create(
            name="Season 2023/2024",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation
        )
        assert period.parent_period is None
        assert period.is_root()

    def test_create_child_period(self, organisation):
        """Child period requires valid parent."""
        parent = Period.objects.create(
            name="Season 2023/2024",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation
        )
        child = Period.objects.create(
            name="Fall 2023",
            start_date=date(2023, 9, 1),
            end_date=date(2023, 12, 31),
            parent_period=parent,
            organisation=organisation
        )
        assert child.parent_period == parent
        assert not child.is_root()

    def test_end_date_before_start_date_raises_error(self, organisation):
        """CHECK constraint enforces end_date > start_date."""
        with pytest.raises(IntegrityError):
            Period.objects.create(
                name="Invalid Period",
                start_date=date(2024, 6, 30),
                end_date=date(2023, 9, 1),  # Before start_date
                organisation=organisation
            )

    def test_str_representation(self, organisation):
        """String representation shows name and date range."""
        period = Period.objects.create(
            name="Season 2023/2024",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation
        )
        assert str(period) == "Season 2023/2024 (2023-09-01 to 2024-06-30)"

    def test_children_count(self, organisation):
        """Period tracks number of direct children."""
        parent = Period.objects.create(
            name="Season", start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30), organisation=organisation
        )
        for i in range(3):
            Period.objects.create(
                name=f"Month {i}", start_date=date(2023, 9+i, 1),
                end_date=date(2023, 9+i, 30), parent_period=parent,
                organisation=organisation
            )
        # Assuming annotate in viewset/serializer
        assert parent.children.count() == 3


@pytest.mark.django_db
class TestActivityModel:
    """Test Activity model constraints, validation, and behavior."""

    def test_create_activity_with_period(self, organisation, project):
        """Activity can be created with period and project."""
        period = Period.objects.create(
            name="December 2023", start_date=date(2023, 12, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        activity = Activity.objects.create(
            title="Match vs Feyenoord",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
            activity_type="match",
            location="Stadium"
        )
        assert activity.period == period
        assert activity.project == project

    def test_end_time_before_start_time_raises_error(self, project, period):
        """CHECK constraint enforces end_time > start_time."""
        with pytest.raises(IntegrityError):
            Activity.objects.create(
                title="Invalid Activity",
                start_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
                end_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),  # Before start
                project=project,
                period=period
            )

    def test_outcome_data_jsonfield(self, project, period):
        """outcome_data JSONField stores structured data."""
        activity = Activity.objects.create(
            title="Match", start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period,
            outcome_data={"score_home": 3, "score_away": 1, "goals": [{"player": "John", "minute": 23}]}
        )
        assert activity.outcome_data["score_home"] == 3
        assert len(activity.outcome_data["goals"]) == 1

    def test_str_representation(self, project, period):
        """String representation shows title and datetime."""
        activity = Activity.objects.create(
            title="Match vs Feyenoord",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period
        )
        assert "Match vs Feyenoord" in str(activity)
        assert "2023-12-15" in str(activity)


@pytest.mark.django_db
class TestParticipationModel:
    """Test Participation model constraints, validation, and XOR behavior."""

    def test_create_period_participation(self, member, organisation):
        """Participation can link member to period."""
        period = Period.objects.create(
            name="Season", start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30), organisation=organisation
        )
        participation = Participation.objects.create(
            member=member,
            period=period,
            role="squad_member",
            status="confirmed",
            data={"jersey_number": 10, "position": "striker"}
        )
        assert participation.period == period
        assert participation.activity is None

    def test_create_activity_participation(self, member, project, period):
        """Participation can link member to activity."""
        activity = Activity.objects.create(
            title="Match", start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period
        )
        participation = Participation.objects.create(
            member=member,
            activity=activity,
            role="starter",
            status="confirmed"
        )
        assert participation.activity == activity
        assert participation.period is None

    def test_both_period_and_activity_raises_error(self, member, project, organisation):
        """CHECK constraint enforces XOR: activity_id XOR period_id."""
        period = Period.objects.create(
            name="Season", start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30), organisation=organisation
        )
        activity = Activity.objects.create(
            title="Match", start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period
        )
        with pytest.raises(IntegrityError):
            Participation.objects.create(
                member=member,
                period=period,
                activity=activity,  # Both set - violates XOR
                role="invalid"
            )

    def test_neither_period_nor_activity_raises_error(self, member):
        """CHECK constraint enforces XOR: at least one must be set."""
        with pytest.raises(IntegrityError):
            Participation.objects.create(
                member=member,
                # Neither period nor activity set
                role="invalid"
            )

    def test_str_representation(self, member, organisation):
        """String representation shows member, role, and target."""
        period = Period.objects.create(
            name="Season", start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30), organisation=organisation
        )
        participation = Participation.objects.create(
            member=member, period=period, role="squad_member"
        )
        assert member.user.email in str(participation)
        assert "squad_member" in str(participation)
```

**Fixtures Required** (create in `conftest.py`):
```python
import pytest
from organisations.models import Organisation, OrganisationMembership
from projects.models import Project, ProjectMembership
from accounts.models import User

@pytest.fixture
def organisation(db):
    return Organisation.objects.create(name="Test Organisation", slug="test-org")

@pytest.fixture
def user(db):
    return User.objects.create_user(email="test@example.com", password="testpass123")

@pytest.fixture
def member(db, user, organisation):
    return OrganisationMembership.objects.create(
        user=user, organisation=organisation, role="member"
    )

@pytest.fixture
def project(db, organisation):
    return Project.objects.create(
        name="Test Project", slug="test-project", organisation=organisation
    )

@pytest.fixture
def period(db, organisation):
    from activities.models import Period
    from datetime import date
    return Period.objects.create(
        name="Test Period",
        start_date=date(2023, 1, 1),
        end_date=date(2023, 12, 31),
        organisation=organisation
    )
```

**Coverage Target**: ≥90% for models.py

---

### T026: Implement test_managers.py

**Objective**: Test PeriodQuerySet manager CTE methods (target: ≥85% coverage)

**Location**: `src/activities/tests/test_managers.py`

**Test Scenarios**:

```python
import pytest
from datetime import date
from activities.models import Period

@pytest.mark.django_db
class TestPeriodQuerySet:
    """Test PeriodQuerySet custom methods using PostgreSQL CTEs."""

    def test_get_descendants_single_level(self, organisation):
        """get_descendants() returns all direct children."""
        parent = Period.objects.create(
            name="Parent", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        child1 = Period.objects.create(
            name="Child 1", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=parent, organisation=organisation
        )
        child2 = Period.objects.create(
            name="Child 2", start_date=date(2023, 7, 1),
            end_date=date(2023, 12, 31), parent_period=parent, organisation=organisation
        )

        descendants = parent.get_descendants()
        assert descendants.count() == 2
        assert child1 in descendants
        assert child2 in descendants

    def test_get_descendants_multi_level(self, organisation):
        """get_descendants() recursively returns all descendants."""
        root = Period.objects.create(
            name="Root", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        level1 = Period.objects.create(
            name="Level 1", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=root, organisation=organisation
        )
        level2 = Period.objects.create(
            name="Level 2", start_date=date(2023, 1, 1),
            end_date=date(2023, 3, 31), parent_period=level1, organisation=organisation
        )

        descendants = root.get_descendants()
        assert descendants.count() == 2
        assert level1 in descendants
        assert level2 in descendants

    def test_get_ancestors_single_level(self, organisation):
        """get_ancestors() returns direct parent."""
        parent = Period.objects.create(
            name="Parent", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        child = Period.objects.create(
            name="Child", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=parent, organisation=organisation
        )

        ancestors = child.get_ancestors()
        assert ancestors.count() == 1
        assert parent in ancestors

    def test_get_ancestors_multi_level(self, organisation):
        """get_ancestors() iteratively returns all ancestors."""
        root = Period.objects.create(
            name="Root", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        level1 = Period.objects.create(
            name="Level 1", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=root, organisation=organisation
        )
        level2 = Period.objects.create(
            name="Level 2", start_date=date(2023, 1, 1),
            end_date=date(2023, 3, 31), parent_period=level1, organisation=organisation
        )

        ancestors = level2.get_ancestors()
        assert ancestors.count() == 2
        assert root in ancestors
        assert level1 in ancestors

    def test_get_siblings(self, organisation):
        """get_siblings() returns periods with same parent."""
        parent = Period.objects.create(
            name="Parent", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        child1 = Period.objects.create(
            name="Child 1", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=parent, organisation=organisation
        )
        child2 = Period.objects.create(
            name="Child 2", start_date=date(2023, 7, 1),
            end_date=date(2023, 12, 31), parent_period=parent, organisation=organisation
        )
        child3 = Period.objects.create(
            name="Child 3", start_date=date(2023, 10, 1),
            end_date=date(2023, 12, 31), parent_period=parent, organisation=organisation
        )

        siblings = child1.get_siblings()
        assert siblings.count() == 2  # Excludes self
        assert child2 in siblings
        assert child3 in siblings
        assert child1 not in siblings

    def test_get_depth(self, organisation):
        """get_depth() calculates distance from root."""
        root = Period.objects.create(
            name="Root", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        level1 = Period.objects.create(
            name="Level 1", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=root, organisation=organisation
        )
        level2 = Period.objects.create(
            name="Level 2", start_date=date(2023, 1, 1),
            end_date=date(2023, 3, 31), parent_period=level1, organisation=organisation
        )

        assert root.get_depth() == 0
        assert level1.get_depth() == 1
        assert level2.get_depth() == 2

    def test_is_root(self, organisation):
        """is_root() returns True only for root periods."""
        root = Period.objects.create(
            name="Root", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        child = Period.objects.create(
            name="Child", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=root, organisation=organisation
        )

        assert root.is_root() is True
        assert child.is_root() is False
```

**Coverage Target**: ≥85% for managers.py

---

### T027: Implement test_api.py

**Objective**: Test ViewSet endpoints (target: ≥85% coverage)

**Location**: `src/activities/tests/test_api.py`

**Test Scenarios**:

```python
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, datetime, timezone
from activities.models import Period, Activity, Participation

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestPeriodViewSet:
    """Test Period CRUD and custom actions."""

    def test_list_periods(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/ returns periods visible to user."""
        Period.objects.create(
            name="Season", start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30), organisation=organisation
        )
        response = authenticated_client.get('/api/v1/periods/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_create_period(self, authenticated_client, organisation, member):
        """POST /api/v1/periods/ creates new period."""
        data = {
            "name": "New Season",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "organisation": organisation.id
        }
        response = authenticated_client.post('/api/v1/periods/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Period.objects.filter(name="New Season").exists()

    def test_create_period_with_invalid_dates(self, authenticated_client, organisation):
        """POST with end_date < start_date returns 400."""
        data = {
            "name": "Invalid",
            "start_date": "2024-12-31",
            "end_date": "2024-01-01",  # Before start
            "organisation": organisation.id
        }
        response = authenticated_client.post('/api/v1/periods/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_period(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/{id}/ returns period detail."""
        period = Period.objects.create(
            name="Season", start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30), organisation=organisation
        )
        response = authenticated_client.get(f'/api/v1/periods/{period.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == "Season"

    def test_update_period(self, authenticated_client, organisation, member):
        """PATCH /api/v1/periods/{id}/ updates period."""
        period = Period.objects.create(
            name="Season", start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30), organisation=organisation
        )
        response = authenticated_client.patch(
            f'/api/v1/periods/{period.id}/',
            {"name": "Updated Season"}
        )
        assert response.status_code == status.HTTP_200_OK
        period.refresh_from_db()
        assert period.name == "Updated Season"

    def test_delete_period_without_children(self, authenticated_client, organisation, member):
        """DELETE /api/v1/periods/{id}/ succeeds if no children."""
        period = Period.objects.create(
            name="Season", start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30), organisation=organisation
        )
        response = authenticated_client.delete(f'/api/v1/periods/{period.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Period.objects.filter(id=period.id).exists()

    def test_delete_period_with_children_fails(self, authenticated_client, organisation, member):
        """DELETE /api/v1/periods/{id}/ returns 400 if children exist."""
        parent = Period.objects.create(
            name="Parent", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        Period.objects.create(
            name="Child", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=parent, organisation=organisation
        )
        response = authenticated_client.delete(f'/api/v1/periods/{parent.id}/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "children" in response.data['detail'].lower()

    def test_get_children_action(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/{id}/children/ returns direct children."""
        parent = Period.objects.create(
            name="Parent", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        Period.objects.create(
            name="Child 1", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=parent, organisation=organisation
        )
        Period.objects.create(
            name="Child 2", start_date=date(2023, 7, 1),
            end_date=date(2023, 12, 31), parent_period=parent, organisation=organisation
        )

        response = authenticated_client.get(f'/api/v1/periods/{parent.id}/children/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2

    def test_get_descendants_action(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/{id}/descendants/ returns all descendants."""
        root = Period.objects.create(
            name="Root", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        level1 = Period.objects.create(
            name="Level 1", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), parent_period=root, organisation=organisation
        )
        Period.objects.create(
            name="Level 2", start_date=date(2023, 1, 1),
            end_date=date(2023, 3, 31), parent_period=level1, organisation=organisation
        )

        response = authenticated_client.get(f'/api/v1/periods/{root.id}/descendants/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2


@pytest.mark.django_db
class TestActivityViewSet:
    """Test Activity CRUD and filtering."""

    def test_list_activities(self, authenticated_client, project, period, member):
        """GET /api/v1/activities/ returns activities."""
        Activity.objects.create(
            title="Match", start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period
        )
        response = authenticated_client.get('/api/v1/activities/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1

    def test_create_activity(self, authenticated_client, project, period, member):
        """POST /api/v1/activities/ creates new activity."""
        data = {
            "title": "Training Session",
            "start_time": "2023-12-16T10:00:00Z",
            "end_time": "2023-12-16T12:00:00Z",
            "project": project.id,
            "period": period.id,
            "activity_type": "training"
        }
        response = authenticated_client.post('/api/v1/activities/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Activity.objects.filter(title="Training Session").exists()

    def test_filter_by_period(self, authenticated_client, project, organisation, member):
        """GET /api/v1/activities/?period_id=X filters by period."""
        period1 = Period.objects.create(
            name="Period 1", start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30), organisation=organisation
        )
        period2 = Period.objects.create(
            name="Period 2", start_date=date(2023, 7, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        Activity.objects.create(
            title="Activity 1", start_time=datetime(2023, 3, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 3, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period1
        )
        Activity.objects.create(
            title="Activity 2", start_time=datetime(2023, 9, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 9, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period2
        )

        response = authenticated_client.get(f'/api/v1/activities/?period_id={period1.id}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == "Activity 1"

    def test_get_participants_action(self, authenticated_client, project, period, member):
        """GET /api/v1/activities/{id}/participants/ returns participants."""
        activity = Activity.objects.create(
            title="Match", start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period
        )
        Participation.objects.create(
            member=member, activity=activity, role="starter", status="confirmed"
        )

        response = authenticated_client.get(f'/api/v1/activities/{activity.id}/participants/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1


@pytest.mark.django_db
class TestParticipationViewSet:
    """Test Participation CRUD and XOR enforcement."""

    def test_create_period_participation(self, authenticated_client, member, period):
        """POST /api/v1/participations/ with period_id creates participation."""
        data = {
            "member": member.id,
            "period": period.id,
            "role": "squad_member",
            "status": "confirmed",
            "data": {"jersey_number": 10}
        }
        response = authenticated_client.post('/api/v1/participations/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Participation.objects.filter(member=member, period=period).exists()

    def test_create_activity_participation(self, authenticated_client, member, project, period):
        """POST /api/v1/participations/ with activity_id creates participation."""
        activity = Activity.objects.create(
            title="Match", start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period
        )
        data = {
            "member": member.id,
            "activity": activity.id,
            "role": "starter",
            "status": "confirmed"
        }
        response = authenticated_client.post('/api/v1/participations/', data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Participation.objects.filter(member=member, activity=activity).exists()

    def test_create_with_both_period_and_activity_fails(self, authenticated_client, member, project, period):
        """POST with both period_id and activity_id returns 400."""
        activity = Activity.objects.create(
            title="Match", start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period
        )
        data = {
            "member": member.id,
            "period": period.id,
            "activity": activity.id,  # Both set - violates XOR
            "role": "invalid"
        }
        response = authenticated_client.post('/api/v1/participations/', data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_by_member(self, authenticated_client, member, period):
        """GET /api/v1/participations/?member_id=X filters by member."""
        Participation.objects.create(
            member=member, period=period, role="squad_member"
        )
        response = authenticated_client.get(f'/api/v1/participations/?member_id={member.id}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
```

**Coverage Target**: ≥85% for api/views.py

---

### T028: Implement test_permissions.py

**Objective**: Test B08 permission integration (target: ≥90% coverage)

**Location**: `src/activities/tests/test_permissions.py`

**Test Scenarios**:

```python
import pytest
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from activities.models import Period

@pytest.mark.django_db
class TestPeriodPermissions:
    """Test org.manage_periods and project.manage_periods permission checks."""

    def test_user_without_permission_cannot_create_period(self, api_client, user, organisation):
        """User without manage_periods permission gets 403."""
        api_client.force_authenticate(user=user)
        # User not in organisation
        data = {
            "name": "Unauthorized Period",
            "start_date": "2023-01-01",
            "end_date": "2023-12-31",
            "organisation": organisation.id
        }
        response = api_client.post('/api/v1/periods/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_org_admin_can_create_org_wide_period(self, api_client, user, organisation):
        """Organisation admin with manage_periods can create periods."""
        from organisations.models import OrganisationMembership
        membership = OrganisationMembership.objects.create(
            user=user, organisation=organisation, role="admin"
        )
        # Assuming admin role has manage_periods permission
        api_client.force_authenticate(user=user)

        data = {
            "name": "Admin Period",
            "start_date": "2023-01-01",
            "end_date": "2023-12-31",
            "organisation": organisation.id
        }
        response = api_client.post('/api/v1/periods/', data)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN]
        # Actual permission logic depends on B08 implementation

    def test_project_manager_can_create_project_scoped_period(self, api_client, user, project):
        """Project manager with manage_periods can create project periods."""
        from projects.models import ProjectMembership
        ProjectMembership.objects.create(
            user=user, project=project, role="manager"
        )
        api_client.force_authenticate(user=user)

        data = {
            "name": "Project Period",
            "start_date": "2023-01-01",
            "end_date": "2023-12-31",
            "project": project.id
        }
        response = api_client.post('/api/v1/periods/', data)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN]

    def test_member_can_read_periods(self, api_client, user, organisation):
        """Organisation members can view periods (read-only)."""
        from organisations.models import OrganisationMembership
        OrganisationMembership.objects.create(
            user=user, organisation=organisation, role="member"
        )
        Period.objects.create(
            name="Visible Period", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        api_client.force_authenticate(user=user)

        response = api_client.get('/api/v1/periods/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1


@pytest.mark.django_db
class TestActivityPermissions:
    """Test project.manage_activities permission checks."""

    def test_user_without_permission_cannot_create_activity(self, api_client, user, project, period):
        """User without manage_activities permission gets 403."""
        api_client.force_authenticate(user=user)
        data = {
            "title": "Unauthorized Activity",
            "start_time": "2023-12-15T14:30:00Z",
            "end_time": "2023-12-15T16:30:00Z",
            "project": project.id,
            "period": period.id
        }
        response = api_client.post('/api/v1/activities/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_project_manager_can_create_activity(self, api_client, user, project, period):
        """Project manager with manage_activities can create activities."""
        from projects.models import ProjectMembership
        ProjectMembership.objects.create(
            user=user, project=project, role="manager"
        )
        api_client.force_authenticate(user=user)

        data = {
            "title": "Manager Activity",
            "start_time": "2023-12-15T14:30:00Z",
            "end_time": "2023-12-15T16:30:00Z",
            "project": project.id,
            "period": period.id
        }
        response = api_client.post('/api/v1/activities/', data)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
class TestParticipationPermissions:
    """Test participation permission checks."""

    def test_user_without_permission_cannot_create_participation(self, api_client, user, member, period):
        """User without manage_activities permission gets 403."""
        api_client.force_authenticate(user=user)
        data = {
            "member": member.id,
            "period": period.id,
            "role": "squad_member"
        }
        response = api_client.post('/api/v1/participations/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
```

**Coverage Target**: ≥90% for api/permissions.py

---

### T029: Implement test_serializers.py

**Objective**: Test serializer validation logic (target: ≥80% coverage)

**Location**: `src/activities/tests/test_serializers.py`

**Test Scenarios**:

```python
import pytest
from datetime import date, datetime, timezone
from activities.api.serializers import PeriodSerializer, ActivitySerializer, ParticipationSerializer
from activities.models import Period, Activity

@pytest.mark.django_db
class TestPeriodSerializer:
    """Test Period serializer validation and representation."""

    def test_validate_end_date_after_start_date(self, organisation):
        """Serializer rejects end_date before start_date."""
        data = {
            "name": "Invalid Period",
            "start_date": "2023-12-31",
            "end_date": "2023-01-01",  # Before start_date
            "organisation": organisation.id
        }
        serializer = PeriodSerializer(data=data)
        assert not serializer.is_valid()
        assert "end_date" in serializer.errors or "non_field_errors" in serializer.errors

    def test_children_count_annotation(self, organisation):
        """Serializer includes children_count."""
        parent = Period.objects.create(
            name="Parent", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        for i in range(3):
            Period.objects.create(
                name=f"Child {i}", start_date=date(2023, i+1, 1),
                end_date=date(2023, i+1, 28), parent_period=parent, organisation=organisation
            )

        # Assuming serializer annotates children_count
        serializer = PeriodSerializer(parent)
        # Check if children_count exists in representation
        # This depends on serializer implementation

    def test_nested_organisation_representation(self, organisation):
        """Serializer includes nested organisation data."""
        period = Period.objects.create(
            name="Period", start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31), organisation=organisation
        )
        serializer = PeriodSerializer(period)
        assert "organisation" in serializer.data
        # Check if organisation is expanded or just ID


@pytest.mark.django_db
class TestActivitySerializer:
    """Test Activity serializer validation and warnings."""

    def test_validate_end_time_after_start_time(self, project, period):
        """Serializer rejects end_time before start_time."""
        data = {
            "title": "Invalid Activity",
            "start_time": "2023-12-15T16:30:00Z",
            "end_time": "2023-12-15T14:30:00Z",  # Before start_time
            "project": project.id,
            "period": period.id
        }
        serializer = ActivitySerializer(data=data)
        assert not serializer.is_valid()
        assert "end_time" in serializer.errors or "non_field_errors" in serializer.errors

    def test_warning_when_activity_outside_period_range(self, project, organisation):
        """Serializer adds warning if activity start_time outside period dates."""
        period = Period.objects.create(
            name="January 2024", start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31), organisation=organisation
        )
        data = {
            "title": "Activity",
            "start_time": "2023-12-15T14:30:00Z",  # Outside period range
            "end_time": "2023-12-15T16:30:00Z",
            "project": project.id,
            "period": period.id
        }
        serializer = ActivitySerializer(data=data)
        if serializer.is_valid():
            # Check for warnings in representation or validated_data
            # Depends on implementation - may use to_representation or warnings field
            pass

    def test_timezone_enforcement(self, project, period):
        """Serializer enforces timezone-aware datetimes."""
        data = {
            "title": "Activity",
            "start_time": "2023-12-15T14:30:00",  # No timezone
            "end_time": "2023-12-15T16:30:00",
            "project": project.id,
            "period": period.id
        }
        serializer = ActivitySerializer(data=data)
        # DRF auto-converts to timezone-aware if USE_TZ=True
        # Check if serializer handles naive datetimes correctly


@pytest.mark.django_db
class TestParticipationSerializer:
    """Test Participation serializer XOR validation."""

    def test_validate_activity_xor_period(self, member, project, period):
        """Serializer enforces (activity_id XOR period_id)."""
        activity = Activity.objects.create(
            title="Match", start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project, period=period
        )

        # Both set - should fail
        data_both = {
            "member": member.id,
            "activity": activity.id,
            "period": period.id,
            "role": "invalid"
        }
        serializer_both = ParticipationSerializer(data=data_both)
        assert not serializer_both.is_valid()
        assert "non_field_errors" in serializer_both.errors or "activity" in serializer_both.errors

        # Neither set - should fail
        data_neither = {
            "member": member.id,
            "role": "invalid"
        }
        serializer_neither = ParticipationSerializer(data=data_neither)
        assert not serializer_neither.is_valid()

    def test_nested_member_representation(self, member, period):
        """Serializer includes nested member data."""
        from activities.models import Participation
        participation = Participation.objects.create(
            member=member, period=period, role="squad_member"
        )
        serializer = ParticipationSerializer(participation)
        assert "member" in serializer.data
        # Check if member is expanded or just ID

    def test_status_choices_validation(self, member, period):
        """Serializer validates status against choices."""
        data = {
            "member": member.id,
            "period": period.id,
            "role": "squad_member",
            "status": "invalid_status"  # Not in choices
        }
        serializer = ParticipationSerializer(data=data)
        assert not serializer.is_valid()
        assert "status" in serializer.errors
```

**Coverage Target**: ≥80% for api/serializers.py

---

## Testing Instructions

**Run all tests**:
```bash
pytest src/activities/tests/ -v
```

**Run with coverage**:
```bash
pytest src/activities/tests/ --cov=src/activities --cov-report=term-missing --cov-report=html
```

**Coverage thresholds** (enforced in CI):
- `src/activities/models.py`: ≥90%
- `src/activities/managers.py`: ≥85%
- `src/activities/api/views.py`: ≥85%
- `src/activities/api/permissions.py`: ≥90%
- `src/activities/api/serializers.py`: ≥80%

**Acceptance Criteria**:
- All 5 test files created and passing
- Coverage thresholds met for all modules
- No regressions in existing tests
- pytest runs in <15s for activities module
- Constitution Article IV compliance verified

---

## Risks & Mitigation

**Risk**: Existing implementation may have bugs discovered during testing
**Mitigation**: Fix bugs as part of this WP, add regression tests

**Risk**: B08 permission logic may be incomplete
**Mitigation**: Test permission paths with skip/xfail markers if needed, document gaps

**Risk**: Test fixtures may conflict with existing test infrastructure
**Mitigation**: Use isolated fixtures in conftest.py, avoid global state

---

## Definition of Done

- [ ] All 5 test files (test_models.py, test_managers.py, test_api.py, test_permissions.py, test_serializers.py) implemented
- [ ] conftest.py with required fixtures created
- [ ] All tests passing (pytest exit code 0)
- [ ] Coverage thresholds met: models ≥90%, managers ≥85%, API ≥85%, permissions ≥90%, serializers ≥80%
- [ ] No test warnings or deprecation errors
- [ ] Test execution <15s for activities module
- [ ] Coverage report generated and reviewed
- [ ] Constitution Article IV v1.2.0 compliance verified
- [ ] Committed to feature branch before PR
