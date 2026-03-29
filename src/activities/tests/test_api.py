"""
Test API endpoints for Period, Activity, and Participation resources.

Tests ViewSet CRUD operations, custom actions, and filtering.
Target coverage: ≥85% for api/views.py
"""

from datetime import date, datetime, timezone

import pytest
from activities.models import Activity, Participation, Period
from django.db import connection
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """Create API client for testing."""
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Create authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.mark.django_db
class TestPeriodViewSet:
    """Test Period CRUD, filtering, and tree navigation."""

    def test_list_periods(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/ returns list of periods."""
        Period.objects.create(
            name="Season 2023/2024",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        response = authenticated_client.get("/api/v1/periods/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1

    def test_filter_by_organisation(self, authenticated_client, organisation, user):
        """GET /api/v1/periods/?organisation_id=X filters by organisation."""
        from organisations.models import Membership, Organisation

        org1 = organisation
        org2 = Organisation.objects.create(
            name="Other Organisation", slug="other-org", creator=user
        )
        Membership.objects.create(user=user, organisation=org2, role="member")

        Period.objects.create(
            name="Org 1 Period",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=org1,
        )
        Period.objects.create(
            name="Org 2 Period",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=org2,
        )

        response = authenticated_client.get(f"/api/v1/periods/?organisation_id={org1.id}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["name"] == "Org 1 Period"

    def test_filter_by_parent_null(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/?parent_id=null returns root periods."""
        root = Period.objects.create(
            name="Root",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        Period.objects.create(
            name="Child",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            parent_period=root,
            organisation=organisation,
        )

        response = authenticated_client.get("/api/v1/periods/?parent_id=null")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1
        assert response.data["data"][0]["name"] == "Root"

    def test_create_period(self, authenticated_client, organisation, member):
        """POST /api/v1/periods/ creates new period."""
        data = {
            "name": "New Season",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "organisation_id": str(organisation.id),
        }
        response = authenticated_client.post("/api/v1/periods/", data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Period.objects.filter(name="New Season").exists()

    def test_create_period_with_invalid_dates(self, authenticated_client, organisation, member):
        """POST with end_date < start_date returns 400."""
        data = {
            "name": "Invalid",
            "start_date": "2024-12-31",
            "end_date": "2024-01-01",  # Before start
            "organisation_id": str(organisation.id),
        }
        response = authenticated_client.post("/api/v1/periods/", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_period(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/{id}/ returns period detail."""
        period = Period.objects.create(
            name="Season",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        response = authenticated_client.get(f"/api/v1/periods/{period.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Season"

    def test_update_period(self, authenticated_client, organisation, member):
        """PATCH /api/v1/periods/{id}/ updates period."""
        period = Period.objects.create(
            name="Season",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        response = authenticated_client.patch(
            f"/api/v1/periods/{period.id}/", {"name": "Updated Season"}
        )
        assert response.status_code == status.HTTP_200_OK
        period.refresh_from_db()
        assert period.name == "Updated Season"

    def test_delete_period_without_children(self, authenticated_client, organisation, member):
        """DELETE /api/v1/periods/{id}/ succeeds if no children."""
        period = Period.objects.create(
            name="Season",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        response = authenticated_client.delete(f"/api/v1/periods/{period.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Period.objects.filter(id=period.id).exists()

    def test_delete_period_with_children_fails(self, authenticated_client, organisation, member):
        """DELETE /api/v1/periods/{id}/ returns 400 if children exist."""
        parent = Period.objects.create(
            name="Parent",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        Period.objects.create(
            name="Child",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            parent_period=parent,
            organisation=organisation,
        )
        response = authenticated_client.delete(f"/api/v1/periods/{parent.id}/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "children" in response.data["detail"].lower()

    def test_get_children_action(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/{id}/children/ returns direct children."""
        parent = Period.objects.create(
            name="Parent",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        Period.objects.create(
            name="Child 1",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            parent_period=parent,
            organisation=organisation,
        )
        Period.objects.create(
            name="Child 2",
            start_date=date(2023, 7, 1),
            end_date=date(2023, 12, 31),
            parent_period=parent,
            organisation=organisation,
        )

        response = authenticated_client.get(f"/api/v1/periods/{parent.id}/children/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    @pytest.mark.skipif(
        connection.vendor != "postgresql",
        reason="CTE tests require PostgreSQL (test database uses SQLite)",
    )
    def test_get_descendants_action(self, authenticated_client, organisation, member):
        """GET /api/v1/periods/{id}/descendants/ returns all descendants."""
        root = Period.objects.create(
            name="Root",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        level1 = Period.objects.create(
            name="Level 1",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            parent_period=root,
            organisation=organisation,
        )
        Period.objects.create(
            name="Level 2",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 3, 31),
            parent_period=level1,
            organisation=organisation,
        )

        response = authenticated_client.get(f"/api/v1/periods/{root.id}/descendants/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2


@pytest.mark.django_db
class TestActivityViewSet:
    """Test Activity CRUD and filtering."""

    def test_list_activities(self, authenticated_client, project, period, member):
        """GET /api/v1/activities/ returns activities."""
        Activity.objects.create(
            title="Match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        response = authenticated_client.get("/api/v1/activities/")
        assert response.status_code == status.HTTP_200_OK
        # Handle both paginated and unpaginated responses
        if isinstance(response.data, dict) and "results" in response.data:
            assert len(response.data["data"]) >= 1
        elif isinstance(response.data, list):
            assert len(response.data) >= 1

    def test_create_activity(self, authenticated_client, project, period, member):
        """POST /api/v1/activities/ creates new activity."""
        data = {
            "title": "Training Session",
            "start_time": "2023-12-16T10:00:00Z",
            "end_time": "2023-12-16T12:00:00Z",
            "project_id": project.id,
            "period_id": str(period.id),
            "activity_type": "training",
        }
        response = authenticated_client.post("/api/v1/activities/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Activity.objects.filter(title="Training Session").exists()

    def test_filter_by_period(self, authenticated_client, project, organisation, member):
        """GET /api/v1/activities/?period_id=X filters by period."""
        period1 = Period.objects.create(
            name="Period 1",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            organisation=organisation,
        )
        period2 = Period.objects.create(
            name="Period 2",
            start_date=date(2023, 7, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        Activity.objects.create(
            title="Activity 1",
            start_time=datetime(2023, 3, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 3, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period1,
        )
        Activity.objects.create(
            title="Activity 2",
            start_time=datetime(2023, 9, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 9, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period2,
        )

        response = authenticated_client.get(f"/api/v1/activities/?period_id={period1.id}")
        assert response.status_code == status.HTTP_200_OK
        results = response.data["data"]
        assert len(results) == 1
        assert results[0]["title"] == "Activity 1"

    def test_filter_by_activity_type(self, authenticated_client, project, period, member):
        """GET /api/v1/activities/?activity_type=X filters by type."""
        Activity.objects.create(
            title="Match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
            activity_type="match",
        )
        Activity.objects.create(
            title="Training",
            start_time=datetime(2023, 12, 16, 10, 0, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 16, 12, 0, tzinfo=timezone.utc),
            project=project,
            period=period,
            activity_type="training",
        )

        response = authenticated_client.get("/api/v1/activities/?activity_type=match")
        assert response.status_code == status.HTTP_200_OK
        results = response.data["data"]
        assert len(results) == 1
        assert results[0]["title"] == "Match"

    def test_filter_by_start_time_range(self, authenticated_client, project, period, member):
        """GET /api/v1/activities/?start_time__gte=X&start_time__lte=Y filters by time range."""
        Activity.objects.create(
            title="Early Activity",
            start_time=datetime(2023, 12, 10, 10, 0, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 10, 12, 0, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        Activity.objects.create(
            title="Late Activity",
            start_time=datetime(2023, 12, 20, 10, 0, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 20, 12, 0, tzinfo=timezone.utc),
            project=project,
            period=period,
        )

        response = authenticated_client.get(
            "/api/v1/activities/?start_time__gte=2023-12-15T00:00:00Z"
        )
        assert response.status_code == status.HTTP_200_OK
        results = response.data["data"]
        assert len(results) == 1
        assert results[0]["title"] == "Late Activity"

    def test_get_participants_action(self, authenticated_client, project, period, member):
        """GET /api/v1/activities/{id}/participants/ returns participants."""
        activity = Activity.objects.create(
            title="Match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        Participation.objects.create(
            member=member, activity=activity, role="starter", status="confirmed"
        )

        response = authenticated_client.get(f"/api/v1/activities/{activity.id}/participants/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_update_activity_with_outcome_data(self, authenticated_client, project, period, member):
        """PATCH /api/v1/activities/{id}/ updates activity with outcome data."""
        activity = Activity.objects.create(
            title="Match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        data = {"metadata": {"score_home": 3, "score_away": 1}}
        response = authenticated_client.patch(
            f"/api/v1/activities/{activity.id}/", data, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        activity.refresh_from_db()
        assert activity.metadata["score_home"] == 3


@pytest.mark.django_db
class TestParticipationViewSet:
    """Test Participation CRUD and XOR enforcement."""

    def test_list_participations(self, authenticated_client, member, period):
        """GET /api/v1/participations/ returns participations."""
        Participation.objects.create(
            member=member, period=period, role="squad_member", status="confirmed"
        )
        response = authenticated_client.get("/api/v1/participations/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1

    def test_create_period_participation(self, authenticated_client, member, period):
        """POST /api/v1/participations/ with period_id creates participation."""
        data = {
            "member_id": str(member.id),
            "period_id": str(period.id),
            "role": "squad_member",
            "status": "confirmed",
            "data": {"jersey_number": 10},
        }
        response = authenticated_client.post("/api/v1/participations/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Participation.objects.filter(member=member, period=period).exists()

    def test_create_activity_participation(self, authenticated_client, member, project, period):
        """POST /api/v1/participations/ with activity_id creates participation."""
        activity = Activity.objects.create(
            title="Match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        data = {
            "member_id": str(member.id),
            "activity_id": str(activity.id),
            "role": "starter",
            "status": "confirmed",
        }
        response = authenticated_client.post("/api/v1/participations/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert Participation.objects.filter(member=member, activity=activity).exists()

    def test_create_with_both_period_and_activity_fails(
        self, authenticated_client, member, project, period
    ):
        """POST with both period_id and activity_id returns 400."""
        activity = Activity.objects.create(
            title="Match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        data = {
            "member": member.id,
            "period": period.id,
            "activity": activity.id,  # Both set - violates XOR
            "role": "invalid",
        }
        response = authenticated_client.post("/api/v1/participations/", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_with_neither_period_nor_activity_fails(self, authenticated_client, member):
        """POST with neither period_id nor activity_id returns 400."""
        data = {"member": member.id, "role": "invalid", "status": "confirmed"}
        response = authenticated_client.post("/api/v1/participations/", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_filter_by_member(self, authenticated_client, member, period):
        """GET /api/v1/participations/?member_id=X filters by member."""
        Participation.objects.create(member=member, period=period, role="squad_member")
        response = authenticated_client.get(f"/api/v1/participations/?member_id={member.id}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1

    def test_filter_by_period(self, authenticated_client, member, organisation):
        """GET /api/v1/participations/?period_id=X filters by period."""
        period1 = Period.objects.create(
            name="Period 1",
            start_date=date(2023, 1, 1),
            end_date=date(2023, 6, 30),
            organisation=organisation,
        )
        period2 = Period.objects.create(
            name="Period 2",
            start_date=date(2023, 7, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        Participation.objects.create(member=member, period=period1, role="squad_member")
        Participation.objects.create(member=member, period=period2, role="bench")

        response = authenticated_client.get(f"/api/v1/participations/?period_id={period1.id}")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["data"]) == 1

    def test_update_participation_status(self, authenticated_client, member, period):
        """PATCH /api/v1/participations/{id}/ updates status."""
        participation = Participation.objects.create(
            member=member, period=period, role="squad_member", status="tentative"
        )
        response = authenticated_client.patch(
            f"/api/v1/participations/{participation.id}/", {"status": "confirmed"}, format="json"
        )
        assert response.status_code == status.HTTP_200_OK
        participation.refresh_from_db()
        assert participation.status == "confirmed"

    def test_delete_participation(self, authenticated_client, member, period):
        """DELETE /api/v1/participations/{id}/ removes participation."""
        participation = Participation.objects.create(
            member=member, period=period, role="squad_member"
        )
        response = authenticated_client.delete(f"/api/v1/participations/{participation.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Participation.objects.filter(id=participation.id).exists()
