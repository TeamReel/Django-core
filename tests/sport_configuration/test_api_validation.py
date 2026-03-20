"""
Tests for WP05: Validation API Endpoint.

Tests the validation endpoints for sport configuration:
- POST /api/v1/validation/team_size/
- POST /api/v1/validation/positions/
- POST /api/v1/validation/formation/
- POST /api/v1/validation/project/
"""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from sport_configuration.models import Sport, SportConfiguration

pytestmark = pytest.mark.django_db

User = get_user_model()


# ==============================================================================
# Fixtures
# ==============================================================================


@pytest.fixture
def api_client():
    """Return an API client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a regular authenticated user."""
    return User.objects.create_user(
        email="user@example.com",
        password="testpass123",
        email_verified=True,
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def football_sport(db):
    """Create or get a football sport with configuration for testing."""
    # Use get_or_create since migrations may have seeded this sport
    sport, _ = Sport.objects.get_or_create(
        slug="football",
        defaults={
            "name": "Football",
            "sport_icon": "⚽",
            "federation_metadata": {"code": "KNVB", "country": "NL"},
        },
    )
    # Ensure configuration exists with our test values
    SportConfiguration.objects.filter(sport=sport).delete()
    SportConfiguration.objects.create(
        sport=sport,
        team_size_min=7,
        team_size_max=25,
        positions=["GK", "CB", "LB", "RB", "CM", "LM", "RM", "ST", "LW", "RW"],
        formations={
            "4-4-2": {
                "name": "4-4-2",
                "positions": ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"],
            },
            "4-3-3": {
                "name": "4-3-3",
                "positions": ["GK", "LB", "CB", "CB", "RB", "CM", "CM", "CM", "LW", "ST", "RW"],
            },
            "3-5-2": {
                "name": "3-5-2",
                "positions": ["GK", "CB", "CB", "CB", "LM", "CM", "CM", "CM", "RM", "ST", "ST"],
            },
        },
    )
    return sport


# ==============================================================================
# Helper Functions
# ==============================================================================


def unwrap_data(response):
    """Extract data from envelope response."""
    if hasattr(response, "data") and isinstance(response.data, dict):
        if "data" in response.data:
            return response.data["data"]
    return response.data


def unwrap_error(response):
    """Extract error from envelope response."""
    if hasattr(response, "data") and isinstance(response.data, dict):
        if "error" in response.data:
            return response.data["error"]
    return response.data


# ==============================================================================
# Team Size Validation Tests
# ==============================================================================


class TestTeamSizeValidation:
    """Tests for POST /api/v1/validation/team_size/."""

    def test_team_size_valid(self, authenticated_client, football_sport):
        """Test valid team size returns is_valid=True."""
        url = "/api/v1/validation/team_size/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "player_count": 11},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["is_valid"] is True
        assert data["has_errors"] is False
        assert data["has_warnings"] is False
        assert data["issues"] == []

    def test_team_size_too_small(self, authenticated_client, football_sport):
        """Test team size below min returns warning."""
        url = "/api/v1/validation/team_size/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "player_count": 5},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        # Small team size is a warning, not error (advisory model)
        assert data["is_valid"] is True
        assert data["has_warnings"] is True
        assert len(data["issues"]) >= 1
        issue = data["issues"][0]
        assert issue["code"] == "TEAM_TOO_SMALL"
        assert issue["level"] == "warning"

    def test_team_size_too_large(self, authenticated_client, football_sport):
        """Test team size above max returns warning."""
        url = "/api/v1/validation/team_size/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "player_count": 50},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["is_valid"] is True
        assert data["has_warnings"] is True
        issue = data["issues"][0]
        assert issue["code"] == "TEAM_TOO_LARGE"
        assert issue["level"] == "warning"

    def test_team_size_unknown_sport(self, authenticated_client):
        """Test unknown sport returns 404."""
        url = "/api/v1/validation/team_size/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "quidditch", "player_count": 7},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_team_size_missing_fields(self, authenticated_client):
        """Test missing required fields returns 400."""
        url = "/api/v1/validation/team_size/"
        response = authenticated_client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_team_size_unauthenticated(self, api_client, football_sport):
        """Test unauthenticated request returns 401/403."""
        url = "/api/v1/validation/team_size/"
        response = api_client.post(
            url,
            {"sport_slug": "football", "player_count": 11},
            format="json",
        )
        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]


# ==============================================================================
# Positions Validation Tests
# ==============================================================================


class TestPositionsValidation:
    """Tests for POST /api/v1/validation/positions/."""

    def test_positions_valid(self, authenticated_client, football_sport):
        """Test valid positions returns is_valid=True."""
        url = "/api/v1/validation/positions/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "positions": ["GK", "CB", "ST"]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["is_valid"] is True
        assert data["has_errors"] is False

    def test_positions_unknown(self, authenticated_client, football_sport):
        """Test unknown positions return warnings (advisory model)."""
        url = "/api/v1/validation/positions/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "positions": ["XYZ", "ABC"]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        # Unknown positions are warnings, not errors (advisory)
        assert data["is_valid"] is True
        assert data["has_warnings"] is True
        # Should have warnings for unknown positions
        warning_codes = [i["code"] for i in data["issues"]]
        assert "UNKNOWN_POSITION" in warning_codes

    def test_positions_mixed_valid_invalid(self, authenticated_client, football_sport):
        """Test mix of valid and unknown positions."""
        url = "/api/v1/validation/positions/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "positions": ["GK", "XYZ", "ST"]},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["is_valid"] is True
        assert data["has_warnings"] is True
        # Only the unknown position should be flagged
        assert len(data["issues"]) == 1
        assert data["issues"][0]["context"].get("position") == "XYZ"

    def test_positions_empty_list(self, authenticated_client, football_sport):
        """Test empty positions list is valid."""
        url = "/api/v1/validation/positions/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "positions": []},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["is_valid"] is True

    def test_positions_unknown_sport(self, authenticated_client):
        """Test unknown sport returns 404."""
        url = "/api/v1/validation/positions/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "cricket", "positions": ["bowler"]},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ==============================================================================
# Formation Validation Tests
# ==============================================================================


class TestFormationValidation:
    """Tests for POST /api/v1/validation/formation/."""

    def test_formation_valid(self, authenticated_client, football_sport):
        """Test valid formation returns is_valid=True."""
        url = "/api/v1/validation/formation/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "formation": "4-4-2"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["is_valid"] is True
        assert data["has_errors"] is False

    def test_formation_unknown(self, authenticated_client, football_sport):
        """Test unknown formation returns warning (advisory model)."""
        url = "/api/v1/validation/formation/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "formation": "1-1-1-1-1-1-1-1-1-1-1"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        # Unknown formation is a warning, not error (advisory)
        assert data["is_valid"] is True
        assert data["has_warnings"] is True
        warning_codes = [i["code"] for i in data["issues"]]
        assert "UNKNOWN_FORMATION" in warning_codes

    def test_formation_empty_string(self, authenticated_client, football_sport):
        """Test empty formation string returns warning."""
        url = "/api/v1/validation/formation/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "formation": ""},
            format="json",
        )
        # Empty string might fail validation or return warning
        assert response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
        ]

    def test_formation_unknown_sport(self, authenticated_client):
        """Test unknown sport returns 404."""
        url = "/api/v1/validation/formation/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "rugby", "formation": "scrum"},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ==============================================================================
# Project Validation Tests
# ==============================================================================


class TestProjectValidation:
    """Tests for POST /api/v1/validation/project/."""

    def test_project_valid(self, authenticated_client, football_sport, user):
        """Test valid project returns validation result."""
        # Create a minimal organisation and project for testing
        from organisations.models import Organisation
        from projects.models import Project

        org = Organisation.objects.create(
            name="Test Org",
            creator=user,
        )
        project = Project.objects.create(
            name="Test Project",
            organisation=org,
            creator=user,
            sport=football_sport,
        )

        url = "/api/v1/validation/project/"
        response = authenticated_client.post(
            url,
            {"project_id": project.id},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert "is_valid" in data
        assert "issues" in data

    def test_project_not_found(self, authenticated_client, football_sport):
        """Test non-existent project returns 404."""
        url = "/api/v1/validation/project/"
        response = authenticated_client.post(
            url,
            {"project_id": 99999},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_project_missing_id(self, authenticated_client):
        """Test missing project_id returns 400."""
        url = "/api/v1/validation/project/"
        response = authenticated_client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ==============================================================================
# Response Format Tests
# ==============================================================================


class TestValidationResponseFormat:
    """Tests for validation response structure."""

    def test_response_contains_all_fields(self, authenticated_client, football_sport):
        """Test response contains all required fields."""
        url = "/api/v1/validation/team_size/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "player_count": 11},
            format="json",
        )
        data = unwrap_data(response)
        assert "is_valid" in data
        assert "has_errors" in data
        assert "has_warnings" in data
        assert "issues" in data

    def test_issue_contains_all_fields(self, authenticated_client, football_sport):
        """Test issue object contains all required fields."""
        url = "/api/v1/validation/team_size/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "player_count": 5},  # Too small
            format="json",
        )
        data = unwrap_data(response)
        assert len(data["issues"]) >= 1
        issue = data["issues"][0]
        assert "code" in issue
        assert "message" in issue
        assert "level" in issue
        assert "field" in issue
        assert "context" in issue

    def test_issue_level_values(self, authenticated_client, football_sport):
        """Test issue level is one of allowed values."""
        url = "/api/v1/validation/team_size/"
        response = authenticated_client.post(
            url,
            {"sport_slug": "football", "player_count": 5},
            format="json",
        )
        data = unwrap_data(response)
        if data["issues"]:
            for issue in data["issues"]:
                assert issue["level"] in ["info", "warning", "error"]
