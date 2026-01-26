"""Tests for GET /auth/default-context endpoint."""

# ruff: noqa: S101, S106  # Allow assert and hardcoded passwords in tests

from __future__ import annotations

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from rest_framework import status

from activities.models import Activity, Period
from organisations.models import Organisation
from projects.models import Project
from projects.models.project_membership import ProjectMembership

User = get_user_model()


@pytest.fixture
def authenticated_user(db):
    user = User.objects.create_user(
        email="test@example.com",
        password="TestPass123!",
        first_name="Test",
        last_name="User",
        is_active=True,
    )
    return user


@pytest.fixture
def authenticated_client(authenticated_user):
    client = Client()
    client.force_login(authenticated_user)
    return client, authenticated_user


@pytest.mark.django_db
class TestAuthDefaultContextEndpoint:
    def test_unauthenticated_user_returns_401(self, db):
        client = Client()
        response = client.get("/api/v1/auth/default-context/")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        data = response.json()
        assert data["status"] == "error"
        assert data["error"]["code"] == "not_authenticated"
        assert "timestamp" in data["meta"]

    def test_authenticated_user_without_memberships_returns_nulls(self, authenticated_client):
        client, _user = authenticated_client
        response = client.get("/api/v1/auth/default-context/")

        assert response.status_code == status.HTTP_200_OK
        envelope = response.json()
        assert envelope["status"] == "success"
        payload = envelope["data"]
        assert payload["organisation"] is None
        assert payload["club"] is None
        assert payload["team"] is None
        assert payload["season"] is None
        assert payload["competition"] is None
        assert payload["match"] is None

    def test_picks_next_match_context_for_team_member(self, authenticated_client):
        client, user = authenticated_client

        org = Organisation.objects.create(name="KNVB", creator=user)
        club = Project.objects.create(
            organisation=org,
            creator=user,
            name="Ajax",
            slug="ajax",
            parent_project=None,
        )
        team = Project.objects.create(
            organisation=org,
            creator=user,
            name="Heren 1",
            slug="heren-1",
            parent_project=club,
        )

        membership = ProjectMembership.objects.create(project=team, user=user, role="viewer")

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

        response = client.get("/api/v1/auth/default-context/")

        assert response.status_code == status.HTTP_200_OK
        envelope = response.json()
        assert envelope["status"] == "success"
        payload = envelope["data"]

        assert payload["organisation"]["slug"] == org.slug
        assert payload["club"]["slug"] == club.slug
        assert payload["team"]["slug"] == team.slug
        assert payload["team"]["parent"]["slug"] == club.slug

        assert payload["season"]["id"] == str(season.id)
        assert payload["competition"]["id"] == str(competition.id)

        assert payload["match"]["id"] == str(next_match.id)
        assert payload["match"]["slug"] == next_match.slug
        assert payload["match"]["key"] == next_match.slug

        assert payload["source"]["organisation"] in {"derived_from_team", "derived_from_club"}
        assert payload["source"]["season"] == "membership_period"
        assert payload["source"]["match"] == "next_upcoming"
        assert payload["source"]["competition"] == "from_match"
