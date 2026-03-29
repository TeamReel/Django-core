"""RBAC tests for match activities (TeamReel Option A).

These tests validate that Activities match write operations are gated by TeamReel
permissions (match.*) and that Club-scoped permissions can act on child Teams.

We intentionally do NOT rely on seed_teamreel_rbac here; we create minimal roles
and permissions required for the test matrix.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import uuid4

import pytest
from accounts.models import User
from activities.models import Activity, Period
from django.core.cache import cache
from organisations.models import Membership, Organisation
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIClient


def _dt(y: int, m: int, d: int, hh: int, mm: int) -> datetime:
    return datetime(y, m, d, hh, mm, tzinfo=timezone.utc)


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def org() -> Organisation:
    creator = User.objects.create_user(email=f"creator-{uuid4().hex[:8]}@example.com", password="x")
    return Organisation.objects.create(
        name="Test Org",
        slug=f"org-{uuid4().hex[:8]}",
        creator=creator,
    )


@pytest.fixture
def club_team(org: Organisation) -> tuple[Project, Project]:
    club = Project.objects.create(
        name="Test Club",
        slug=f"club-{uuid4().hex[:8]}",
        organisation=org,
        creator=org.creator,
    )
    team = Project.objects.create(
        name="Test Team",
        slug=f"team-{uuid4().hex[:8]}",
        organisation=org,
        creator=org.creator,
        parent_project=club,
    )
    return club, team


@pytest.fixture
def period(org: Organisation) -> Period:
    return Period.objects.create(
        name="Season 2024/2025",
        start_date=date(2024, 7, 1),
        end_date=date(2025, 6, 30),
        organisation=org,
    )


@pytest.fixture
def match_perms(db):
    # Create the minimal permissions needed for match RBAC.
    perms = {}
    for perm in ["match.create", "match.edit_own_team", "match.delete"]:
        perms[perm], _created = Permission.objects.get_or_create(
            permission=perm,
            defaults={
                "resource_type": "match",
                "description": f"Test permission {perm}",
            },
        )
    return perms


@pytest.fixture
def role_factory(match_perms):
    def _make_role(name: str, scope: str, perm_names: list[str]) -> Role:
        role, _created = Role.objects.get_or_create(
            name=name,
            scope=scope,
            defaults={"description": "test role"},
        )

        # Ensure the role has exactly the permissions requested for this test.
        role.permissions.set([match_perms[p] for p in perm_names])
        return role

    return _make_role


def _auth(client: APIClient, user: User) -> APIClient:
    client.force_authenticate(user=user)
    return client


def _make_user(email_prefix: str, *, is_staff: bool = False, is_superuser: bool = False) -> User:
    return User.objects.create_user(
        email=f"{email_prefix}-{uuid4().hex[:8]}@example.com",
        password="x",
        is_staff=is_staff,
        is_superuser=is_superuser,
    )


@pytest.mark.django_db
class TestMatchRBAC:
    def test_match_create_denied_without_permission(
        self,
        api_client: APIClient,
        org: Organisation,
        club_team: tuple[Project, Project],
        period: Period,
    ):
        _club, team = club_team

        user = _make_user("member")
        Membership.objects.create(user=user, organisation=org, role="member")

        data = {
            "title": "Ajax vs Feyenoord",
            "activity_type": "match",
            "project_id": team.id,
            "period_id": str(period.id),
            "start_time": "2025-01-01T10:00:00Z",
            "end_time": "2025-01-01T12:00:00Z",
        }
        resp = _auth(api_client, user).post("/api/v1/activities/", data, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_match_create_allowed_for_team_scope(
        self,
        api_client: APIClient,
        org: Organisation,
        club_team: tuple[Project, Project],
        period: Period,
        role_factory,
    ):
        _club, team = club_team

        user = _make_user("team-admin")
        Membership.objects.create(user=user, organisation=org, role="member")

        role = role_factory("Test Team Match Creator", ScopeChoices.PROJECT, ["match.create"])
        RoleAssignment.objects.create(
            user=user, role=role, scope=ScopeChoices.PROJECT, target_project=team
        )

        data = {
            "title": "Team Match",
            "activity_type": "match",
            "project_id": team.id,
            "period_id": str(period.id),
            "start_time": "2025-01-02T10:00:00Z",
            "end_time": "2025-01-02T12:00:00Z",
        }
        resp = _auth(api_client, user).post("/api/v1/activities/", data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert Activity.objects.filter(
            project=team, activity_type="match", title="Team Match"
        ).exists()

    def test_match_create_allowed_for_club_parent_scope(
        self,
        api_client: APIClient,
        org: Organisation,
        club_team: tuple[Project, Project],
        period: Period,
        role_factory,
    ):
        club, team = club_team

        user = _make_user("club-admin")
        Membership.objects.create(user=user, organisation=org, role="member")

        role = role_factory("Test Club Match Creator", ScopeChoices.PROJECT, ["match.create"])
        RoleAssignment.objects.create(
            user=user, role=role, scope=ScopeChoices.PROJECT, target_project=club
        )

        data = {
            "title": "Club Creates Team Match",
            "activity_type": "match",
            "project_id": team.id,
            "period_id": str(period.id),
            "start_time": "2025-01-03T10:00:00Z",
            "end_time": "2025-01-03T12:00:00Z",
        }
        resp = _auth(api_client, user).post("/api/v1/activities/", data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED

    def test_match_create_allowed_for_superadmin_without_role(
        self,
        api_client: APIClient,
        club_team: tuple[Project, Project],
        period: Period,
    ):
        _club, team = club_team

        superadmin = _make_user("superadmin", is_superuser=True)

        data = {
            "title": "Superadmin Match",
            "activity_type": "match",
            "project_id": team.id,
            "period_id": str(period.id),
            "start_time": "2025-01-04T10:00:00Z",
            "end_time": "2025-01-04T12:00:00Z",
        }
        resp = _auth(api_client, superadmin).post("/api/v1/activities/", data, format="json")
        assert resp.status_code == status.HTTP_201_CREATED

    def test_match_edit_delete_matrix(
        self,
        api_client: APIClient,
        org: Organisation,
        club_team: tuple[Project, Project],
        period: Period,
        role_factory,
    ):
        club, team = club_team

        match = Activity.objects.create(
            title="Initial Match",
            activity_type="match",
            project=team,
            period=period,
            start_time=_dt(2025, 1, 5, 10, 0),
            end_time=_dt(2025, 1, 5, 12, 0),
        )

        member = _make_user("member")
        Membership.objects.create(user=member, organisation=org, role="member")

        team_admin = _make_user("team-admin")
        Membership.objects.create(user=team_admin, organisation=org, role="member")
        team_role = role_factory(
            "Test Team Match Editor",
            ScopeChoices.PROJECT,
            ["match.edit_own_team", "match.delete"],
        )
        RoleAssignment.objects.create(
            user=team_admin,
            role=team_role,
            scope=ScopeChoices.PROJECT,
            target_project=team,
        )

        club_admin = _make_user("club-admin")
        Membership.objects.create(user=club_admin, organisation=org, role="member")
        club_role = role_factory(
            "Test Club Match Editor",
            ScopeChoices.PROJECT,
            ["match.edit_own_team"],
        )
        RoleAssignment.objects.create(
            user=club_admin,
            role=club_role,
            scope=ScopeChoices.PROJECT,
            target_project=club,
        )

        # Member cannot edit
        resp = _auth(api_client, member).patch(
            f"/api/v1/activities/{match.id}/",
            {"title": "Nope"},
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND

        # Team Admin can edit
        resp = _auth(api_client, team_admin).patch(
            f"/api/v1/activities/{match.id}/",
            {"title": "Updated by Team Admin"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        # Club Admin can edit child team match
        resp = _auth(api_client, club_admin).patch(
            f"/api/v1/activities/{match.id}/",
            {"title": "Updated by Club Admin"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK

        # Club Admin cannot delete (missing match.delete)
        resp = _auth(api_client, club_admin).delete(f"/api/v1/activities/{match.id}/")
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        # Team Admin can delete
        resp = _auth(api_client, team_admin).delete(f"/api/v1/activities/{match.id}/")
        assert resp.status_code == status.HTTP_204_NO_CONTENT
