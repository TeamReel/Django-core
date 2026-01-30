"""
API tests for OutfitConfiguration endpoints.

Tests the /api/v1/outfits/ endpoints including:
- List/retrieve outfit configurations
- Create/update/delete outfits
- Resolved endpoint with inheritance
- Project filtering

Coverage target: ≥90% per Constitution Art. IV.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from sport_configuration.models import OutfitConfiguration, Sport, SportConfiguration

User = get_user_model()


# =============================================================================
# Helpers
# =============================================================================


def unwrap_data(response):
    """Extract data from envelope response format if present.

    API responses may use envelope format: {"status": "success", "data": {...}, "meta": {...}}
    This helper extracts the data field for cleaner test assertions.
    """
    if isinstance(response.data, dict) and "data" in response.data:
        return response.data["data"]
    return response.data


def unwrap_error(response):
    """Extract error details from envelope error response.

    Error responses use envelope format: {"status": "error", "error": {...}}
    """
    if isinstance(response.data, dict) and "error" in response.data:
        return response.data["error"].get("details", response.data["error"])
    return response.data


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def api_client():
    """Create an unauthenticated API client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create a regular authenticated user."""
    return User.objects.create_user(
        email="outfit-api-user@example.com",
        password="testpass123",
        email_verified=True,
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return API client authenticated as regular user."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def organisation(user):
    """Create test organisation."""
    from organisations.models import Organisation

    return Organisation.objects.create(
        name="Outfit API Test Org",
        slug="outfit-api-test-org",
        creator=user,
    )


@pytest.fixture
def sport(db):
    """Create test sport."""
    return Sport.objects.create(
        name="Football",
        slug="football-outfit-api-test",
    )


@pytest.fixture
def sport_config(sport):
    """Create sport configuration with outfit types."""
    return SportConfiguration.objects.create(
        sport=sport,
        team_size_min=11,
        team_size_max=25,
        positions=["GK", "CB", "ST"],
        formations={"4-3-3": {}},
        outfit_types=["home", "away", "goalkeeper"],
    )


@pytest.fixture
def project(organisation, user, sport):
    """Create a test project (club level)."""
    from projects.models import Project

    return Project.objects.create(
        organisation=organisation,
        creator=user,
        name="API Test Club",
        slug="api-test-club",
        sport=sport,
    )


@pytest.fixture
def child_project(organisation, user, project):
    """Create a child project (team level) under the club."""
    from projects.models import Project

    return Project.objects.create(
        organisation=organisation,
        creator=user,
        name="API Test Team",
        slug="api-test-team",
        parent_project=project,
    )


@pytest.fixture
def outfit(project):
    """Create a test outfit configuration."""
    return OutfitConfiguration.objects.create(
        project=project,
        outfit_type="home",
        colors={"primary": "#FF0000", "secondary": "#FFFFFF"},
        sponsor_config={"main": "Test Sponsor"},
        number_font={"family": "Arial"},
        badge_position="left_chest",
    )


@pytest.fixture
def second_outfit(project):
    """Create a second outfit configuration."""
    return OutfitConfiguration.objects.create(
        project=project,
        outfit_type="away",
        colors={"primary": "#0000FF", "secondary": "#FFFFFF"},
    )


# =============================================================================
# Test: Unauthenticated Access
# =============================================================================


@pytest.mark.django_db
class TestOutfitAPIUnauthenticated:
    """Tests for unauthenticated access to outfit endpoints."""

    def test_list_outfits_unauthenticated_forbidden(self, api_client):
        """Unauthenticated users cannot list outfits."""
        response = api_client.get("/api/v1/outfits/")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_create_outfit_unauthenticated_forbidden(self, api_client, project):
        """Unauthenticated users cannot create outfits."""
        response = api_client.post(
            "/api/v1/outfits/",
            {"project": project.id, "outfit_type": "home"},
        )
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


# =============================================================================
# Test: List Outfits
# =============================================================================


@pytest.mark.django_db
class TestOutfitList:
    """Tests for listing outfit configurations."""

    def test_list_outfits_empty(self, authenticated_client):
        """List returns empty when no outfits exist."""
        response = authenticated_client.get("/api/v1/outfits/")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data == []

    def test_list_outfits_returns_all(self, authenticated_client, outfit, second_outfit):
        """List returns all active outfits."""
        response = authenticated_client.get("/api/v1/outfits/")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert len(data) == 2

    def test_list_outfits_excludes_inactive(self, authenticated_client, outfit, project):
        """List excludes inactive outfits by default."""
        # Create an inactive outfit
        OutfitConfiguration.objects.create(
            project=project,
            outfit_type="away",
            is_active=False,
        )
        response = authenticated_client.get("/api/v1/outfits/")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert len(data) == 1

    def test_list_outfits_filter_by_project(self, authenticated_client, outfit, organisation, user):
        """List can filter by project ID."""
        # Create outfit in a different project
        from projects.models import Project

        other_project = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Other Project",
            slug="other-project",
        )
        OutfitConfiguration.objects.create(
            project=other_project,
            outfit_type="home",
        )

        response = authenticated_client.get(f"/api/v1/outfits/?project={outfit.project.id}")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert len(data) == 1
        assert data[0]["id"] == outfit.id

    def test_list_outfits_filter_by_outfit_type(self, authenticated_client, outfit, second_outfit):
        """List can filter by outfit type."""
        response = authenticated_client.get("/api/v1/outfits/?outfit_type=home")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert len(data) == 1
        assert data[0]["outfit_type"] == "home"


# =============================================================================
# Test: Retrieve Outfit
# =============================================================================


@pytest.mark.django_db
class TestOutfitRetrieve:
    """Tests for retrieving a single outfit configuration."""

    def test_retrieve_outfit_by_id(self, authenticated_client, outfit):
        """Retrieve outfit by ID returns full details."""
        response = authenticated_client.get(f"/api/v1/outfits/{outfit.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["id"] == outfit.id
        assert data["outfit_type"] == "home"
        assert data["colors"] == {"primary": "#FF0000", "secondary": "#FFFFFF"}
        assert data["sponsor_config"] == {"main": "Test Sponsor"}

    def test_retrieve_outfit_includes_inherited_field(self, authenticated_client, outfit):
        """Retrieved outfit includes inherited field (False for own outfits)."""
        response = authenticated_client.get(f"/api/v1/outfits/{outfit.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        # Without project context, inherited defaults to False
        assert data["inherited"] is False

    def test_retrieve_nonexistent_outfit_404(self, authenticated_client):
        """Retrieving non-existent outfit returns 404."""
        response = authenticated_client.get("/api/v1/outfits/99999/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


# =============================================================================
# Test: Create Outfit
# =============================================================================


@pytest.mark.django_db
class TestOutfitCreate:
    """Tests for creating outfit configurations."""

    def test_create_outfit_minimal(self, authenticated_client, project):
        """Create outfit with minimal required fields."""
        response = authenticated_client.post(
            "/api/v1/outfits/",
            {"project": project.id, "outfit_type": "home"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = unwrap_data(response)
        assert data["project"] == project.id
        assert data["outfit_type"] == "home"

    def test_create_outfit_with_all_fields(self, authenticated_client, project):
        """Create outfit with all optional fields."""
        response = authenticated_client.post(
            "/api/v1/outfits/",
            {
                "project": project.id,
                "outfit_type": "away",
                "colors": {"primary": "#0000FF", "secondary": "#FFFFFF"},
                "sponsor_config": {"main": "Sponsor A", "sleeve": "Sponsor B"},
                "number_font": {"family": "Helvetica", "color": "#FFFFFF"},
                "badge_position": "center_chest",
                "metadata": {"season": "2024-25"},
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = unwrap_data(response)
        assert data["colors"] == {"primary": "#0000FF", "secondary": "#FFFFFF"}
        assert data["sponsor_config"] == {"main": "Sponsor A", "sleeve": "Sponsor B"}
        assert data["badge_position"] == "center_chest"

    def test_create_outfit_duplicate_rejected(self, authenticated_client, project, outfit):
        """Creating duplicate outfit_type for same project is rejected."""
        response = authenticated_client.post(
            "/api/v1/outfits/",
            {"project": project.id, "outfit_type": "home"},  # Same as fixture
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error = unwrap_error(response)
        # Error can be in outfit_type, non_field_errors, or contain "unique"
        error_str = str(error).lower()
        assert "outfit_type" in error or "unique" in error_str or "already exists" in error_str

    def test_create_outfit_same_type_different_project_allowed(
        self, authenticated_client, project, child_project
    ):
        """Same outfit_type in different projects is allowed."""
        # Create home in parent
        authenticated_client.post(
            "/api/v1/outfits/",
            {"project": project.id, "outfit_type": "home"},
            format="json",
        )
        # Create home in child (should succeed)
        response = authenticated_client.post(
            "/api/v1/outfits/",
            {"project": child_project.id, "outfit_type": "home"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED


# =============================================================================
# Test: Update Outfit
# =============================================================================


@pytest.mark.django_db
class TestOutfitUpdate:
    """Tests for updating outfit configurations."""

    def test_update_outfit_partial(self, authenticated_client, outfit):
        """PATCH updates only specified fields."""
        response = authenticated_client.patch(
            f"/api/v1/outfits/{outfit.id}/",
            {"colors": {"primary": "#00FF00", "secondary": "#000000"}},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["colors"] == {"primary": "#00FF00", "secondary": "#000000"}
        # Other fields unchanged
        assert data["badge_position"] == "left_chest"

    def test_update_outfit_full(self, authenticated_client, outfit):
        """PUT updates all fields."""
        response = authenticated_client.put(
            f"/api/v1/outfits/{outfit.id}/",
            {
                "project": outfit.project.id,
                "outfit_type": "home",
                "colors": {"primary": "#FFFFFF"},
                "sponsor_config": {},
                "number_font": {},
                "badge_position": "right_chest",
                "metadata": {},
                "is_active": True,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert data["badge_position"] == "right_chest"

    def test_update_outfit_type_to_existing_rejected(
        self, authenticated_client, outfit, second_outfit
    ):
        """Cannot change outfit_type to one that already exists for project."""
        response = authenticated_client.patch(
            f"/api/v1/outfits/{outfit.id}/",
            {"outfit_type": "away"},  # second_outfit already has 'away'
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# =============================================================================
# Test: Delete Outfit
# =============================================================================


@pytest.mark.django_db
class TestOutfitDelete:
    """Tests for deleting outfit configurations."""

    def test_delete_outfit(self, authenticated_client, outfit):
        """DELETE removes outfit configuration."""
        response = authenticated_client.delete(f"/api/v1/outfits/{outfit.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not OutfitConfiguration.objects.filter(id=outfit.id).exists()

    def test_delete_nonexistent_outfit_404(self, authenticated_client):
        """Deleting non-existent outfit returns 404."""
        response = authenticated_client.delete("/api/v1/outfits/99999/")
        assert response.status_code == status.HTTP_404_NOT_FOUND


# =============================================================================
# Test: Resolved Endpoint (Inheritance)
# =============================================================================


@pytest.mark.django_db
class TestOutfitResolved:
    """Tests for the /outfits/resolved/ endpoint with inheritance."""

    def test_resolved_requires_project_param(self, authenticated_client):
        """Resolved endpoint requires project query parameter."""
        response = authenticated_client.get("/api/v1/outfits/resolved/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = unwrap_data(response)
        assert "project" in str(data)

    def test_resolved_nonexistent_project_404(self, authenticated_client):
        """Resolved endpoint returns 404 for non-existent project."""
        response = authenticated_client.get("/api/v1/outfits/resolved/?project=99999")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_resolved_returns_own_outfits(self, authenticated_client, project, outfit):
        """Resolved returns project's own outfits."""
        response = authenticated_client.get(f"/api/v1/outfits/resolved/?project={project.id}")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert len(data) == 1
        assert data[0]["outfit_type"] == "home"
        assert data[0]["inherited"] is False

    def test_resolved_inherits_from_parent(self, authenticated_client, project, child_project):
        """Child project inherits outfits from parent when not overridden."""
        # Create outfit on parent only
        OutfitConfiguration.objects.create(
            project=project,
            outfit_type="home",
            colors={"primary": "#FF0000"},
        )

        # Child should inherit
        response = authenticated_client.get(f"/api/v1/outfits/resolved/?project={child_project.id}")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert len(data) == 1
        assert data[0]["outfit_type"] == "home"
        assert data[0]["inherited"] is True
        assert data[0]["source_project_name"] == project.name

    def test_resolved_child_overrides_parent(self, authenticated_client, project, child_project):
        """Child outfit overrides parent outfit of same type."""
        # Parent home outfit
        OutfitConfiguration.objects.create(
            project=project,
            outfit_type="home",
            colors={"primary": "#FF0000"},
        )
        # Child home outfit (override)
        OutfitConfiguration.objects.create(
            project=child_project,
            outfit_type="home",
            colors={"primary": "#00FF00"},
        )

        response = authenticated_client.get(f"/api/v1/outfits/resolved/?project={child_project.id}")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert len(data) == 1
        assert data[0]["colors"]["primary"] == "#00FF00"
        assert data[0]["inherited"] is False

    def test_resolved_combines_parent_and_child(self, authenticated_client, project, child_project):
        """Child gets both inherited and own outfits."""
        # Parent has home
        OutfitConfiguration.objects.create(
            project=project,
            outfit_type="home",
            colors={"primary": "#FF0000"},
        )
        # Child has away (different type)
        OutfitConfiguration.objects.create(
            project=child_project,
            outfit_type="away",
            colors={"primary": "#0000FF"},
        )

        response = authenticated_client.get(f"/api/v1/outfits/resolved/?project={child_project.id}")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        assert len(data) == 2

        # Find each outfit
        home = next(o for o in data if o["outfit_type"] == "home")
        away = next(o for o in data if o["outfit_type"] == "away")

        assert home["inherited"] is True
        assert away["inherited"] is False

    def test_resolved_parent_no_inheritance(self, authenticated_client, project, outfit):
        """Parent project has no inheritance (nothing above it)."""
        response = authenticated_client.get(f"/api/v1/outfits/resolved/?project={project.id}")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)
        # All outfits are own
        for item in data:
            assert item["inherited"] is False


# =============================================================================
# Test: Response Format
# =============================================================================


@pytest.mark.django_db
class TestOutfitResponseFormat:
    """Tests for response field format and completeness."""

    def test_outfit_response_has_all_fields(self, authenticated_client, outfit):
        """Response includes all expected fields."""
        response = authenticated_client.get(f"/api/v1/outfits/{outfit.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)

        expected_fields = [
            "id",
            "project",
            "outfit_type",
            "colors",
            "sponsor_config",
            "number_font",
            "badge_position",
            "metadata",
            "is_active",
            "inherited",
            "source_project_name",
            "created_at",
            "updated_at",
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"

    def test_outfit_timestamps_are_iso_format(self, authenticated_client, outfit):
        """Timestamps are in ISO format."""
        response = authenticated_client.get(f"/api/v1/outfits/{outfit.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = unwrap_data(response)

        # Should be ISO format strings
        assert isinstance(data["created_at"], str)
        assert isinstance(data["updated_at"], str)
        assert "T" in data["created_at"]  # ISO format has T separator
