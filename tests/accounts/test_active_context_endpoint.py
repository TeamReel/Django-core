"""Tests for GET/PATCH /api/v1/auth/active-context/.

These tests cover the persisted per-user TeamReel navigation context.

Note: The API response is wrapped by the global envelope renderer, so these tests assert
against the rendered JSON body (response.json()).
"""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework import status

from activities.models import Activity, Period
from organisations.models import Organisation
from projects.models import Project
from projects.models.project_membership import ProjectMembership


@pytest.mark.api
@pytest.mark.django_db
class TestAuthActiveContextEndpoint:
    def test_unauthenticated_get_returns_401(self, api_client):
        response = api_client.get("/api/v1/auth/active-context/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        body = response.json()
        assert body["status"] == "error"
        assert body["error"]["code"] == "not_authenticated"

    def test_authenticated_get_without_context_returns_nulls(self, authenticated_client):
        response = authenticated_client.get("/api/v1/auth/active-context/")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == "success"
        payload = body["data"]

        assert payload["updated_at"] is None
        assert payload["organisation"] is None
        assert payload["club"] is None
        assert payload["team"] is None
        assert payload["season"] is None
        assert payload["competition"] is None
        assert payload["match"] is None
        assert payload["membership"] is None

    def test_patch_set_match_sets_full_context_and_affects_default_context(
        self, authenticated_client, regular_user
    ):
        org = Organisation.objects.create(name="KNVB", creator=regular_user)
        club = Project.objects.create(
            organisation=org,
            creator=regular_user,
            name="Ajax",
            slug="ajax",
            parent_project=None,
        )
        team = Project.objects.create(
            organisation=org,
            creator=regular_user,
            name="Heren 1",
            slug="heren-1",
            parent_project=club,
        )
        ProjectMembership.objects.create(project=team, user=regular_user, role="viewer")

        today = timezone.localdate()
        now = timezone.now()

        season = Period.objects.create(
            organisation=org,
            project=team,
            parent_period=None,
            name="Seizoen 2024/2025",
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=200),
        )
        competition = Period.objects.create(
            organisation=org,
            project=team,
            parent_period=season,
            name="Competitie",
            start_date=today - timedelta(days=10),
            end_date=today + timedelta(days=200),
        )

        match = Activity.objects.create(
            project=team,
            period=competition,
            title="Ajax vs Feyenoord",
            activity_type="match",
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2) + timedelta(hours=2),
        )

        patch = authenticated_client.patch(
            "/api/v1/auth/active-context/",
            data={"kind": "match", "id": str(match.id)},
            format="json",
        )
        assert patch.status_code == status.HTTP_200_OK
        patch_body = patch.json()
        assert patch_body["status"] == "success"
        patch_payload = patch_body["data"]

        assert patch_payload["organisation"]["id"] == str(org.id)
        assert patch_payload["club"]["id"] == str(club.id)
        assert patch_payload["team"]["id"] == str(team.id)
        assert patch_payload["season"]["id"] == str(season.id)
        assert patch_payload["competition"]["id"] == str(competition.id)
        assert patch_payload["match"]["id"] == str(match.id)

        # Membership is derived for the current user in the active team (and season when possible).
        assert patch_payload["membership"] is not None
        assert patch_payload["membership"]["project"]["id"] == str(team.id)
        assert patch_payload["membership"]["user"]["id"] == str(regular_user.id)

        # Now default-context should prefer the persisted active match.
        default_resp = authenticated_client.get("/api/v1/auth/default-context/")
        assert default_resp.status_code == status.HTTP_200_OK
        default_body = default_resp.json()
        assert default_body["status"] == "success"
        default_payload = default_body["data"]

        assert default_payload["match"]["id"] == str(match.id)
        assert default_payload["competition"]["id"] == str(competition.id)
        assert default_payload["season"]["id"] == str(season.id)
        assert str(default_payload["team"]["id"]) == str(team.id)

    def test_patch_clear_resets_all_levels(self, authenticated_client, regular_user):
        # Seed a minimal context via team membership.
        org = Organisation.objects.create(name="KNVB", creator=regular_user)
        club = Project.objects.create(
            organisation=org,
            creator=regular_user,
            name="Ajax",
            slug="ajax",
            parent_project=None,
        )
        team = Project.objects.create(
            organisation=org,
            creator=regular_user,
            name="Heren 1",
            slug="heren-1",
            parent_project=club,
        )
        ProjectMembership.objects.create(project=team, user=regular_user, role="viewer")

        set_team = authenticated_client.patch(
            "/api/v1/auth/active-context/",
            data={"kind": "team", "id": str(team.id)},
            format="json",
        )
        assert set_team.status_code == status.HTTP_200_OK

        cleared = authenticated_client.patch(
            "/api/v1/auth/active-context/",
            data={"kind": "clear"},
            format="json",
        )
        assert cleared.status_code == status.HTTP_200_OK
        body = cleared.json()
        assert body["status"] == "success"
        payload = body["data"]

        assert payload["organisation"] is None
        assert payload["club"] is None
        assert payload["team"] is None
        assert payload["season"] is None
        assert payload["competition"] is None
        assert payload["match"] is None
        assert payload["membership"] is None
