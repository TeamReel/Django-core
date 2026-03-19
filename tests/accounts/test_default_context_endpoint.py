"""Tests for GET /api/v1/auth/default-context/.

Note: The API response is wrapped by the global envelope renderer, so these tests assert
against the rendered JSON body (response.json()).
"""

from __future__ import annotations

import uuid
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
class TestAuthDefaultContextEndpoint:
    def test_unauthenticated_user_returns_401(self, api_client):
        response = api_client.get("/api/v1/auth/default-context/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        body = response.json()
        assert body["status"] == "error"
        assert body["error"]["code"] == "not_authenticated"
        assert "timestamp" in body["meta"]

    def test_authenticated_user_without_memberships_returns_nulls(self, authenticated_client):
        response = authenticated_client.get("/api/v1/auth/default-context/")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == "success"
        payload = body["data"]

        assert payload["organisation"] is None
        assert payload["club"] is None
        assert payload["team"] is None
        assert payload["season"] is None
        assert payload["competition"] is None
        assert payload["match"] is None

    def test_picks_next_match_context_for_team_member(self, authenticated_client, regular_user):
        uid = uuid.uuid4().hex[:8]
        org = Organisation.objects.create(name=f"KNVB-{uid}", creator=regular_user)
        club = Project.objects.create(
            organisation=org,
            creator=regular_user,
            name=f"Ajax-{uid}",
            slug=f"ajax-{uid}",
            parent_project=None,
        )
        team = Project.objects.create(
            organisation=org,
            creator=regular_user,
            name=f"Heren 1-{uid}",
            slug=f"heren-1-{uid}",
            parent_project=club,
        )

        membership = ProjectMembership.objects.create(
            project=team, user=regular_user, role="viewer"
        )

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

        # Past match (should not be chosen)
        Activity.objects.create(
            project=team,
            period=competition,
            title="Ajax vs PSV (past)",
            activity_type="match",
            start_time=now - timedelta(days=2),
            end_time=now - timedelta(days=2) + timedelta(hours=2),
        )

        next_match = Activity.objects.create(
            project=team,
            period=competition,
            title="Ajax vs Feyenoord",
            activity_type="match",
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2) + timedelta(hours=2),
        )

        # Membership period should be preferred when present
        membership.period = season
        membership.save(update_fields=["period"])

        response = authenticated_client.get("/api/v1/auth/default-context/")

        assert response.status_code == status.HTTP_200_OK
        body = response.json()
        assert body["status"] == "success"
        payload = body["data"]

        assert payload["organisation"]["slug"] == org.slug
        assert payload["club"]["slug"] == club.slug
        assert payload["team"]["slug"] == team.slug
        assert payload["team"]["parent"]["slug"] == club.slug

        assert payload["season"]["id"] == str(season.id)
        assert payload["season"]["key"] == "seizoen-2024-2025"
        assert payload["competition"]["id"] == str(competition.id)
        assert payload["competition"]["key"] == "competitie"

        assert payload["match"]["id"] == str(next_match.id)
        assert payload["match"]["slug"] == next_match.slug
        assert payload["match"]["key"] == next_match.slug

        assert payload["source"]["organisation"] in {"derived_from_team", "derived_from_club"}
        assert payload["source"]["season"] == "membership_period"
        assert payload["source"]["match"] == "next_upcoming"
        assert payload["source"]["competition"] == "from_match"
