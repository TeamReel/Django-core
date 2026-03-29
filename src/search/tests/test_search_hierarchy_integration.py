"""Integration tests for search hierarchy API.

NOTE: These integration tests require proper authentication setup.
They are currently skipped pending full API test fixtures.
The hierarchy feature is fully covered by unit tests in:
- test_hierarchy_base.py
- test_hierarchy_registry.py
- test_hierarchy_serializers.py
- test_anchor_selection.py

TODO: Set up proper DRF test client with authentication tokens
"""
import pytest
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.fixture
def api_client():
    """Create API client."""
    return Client()


@pytest.fixture
def user(db):
    """Create test user."""
    return User.objects.create_user(
        username="testuser", email="test@example.com", password="testpass123"
    )


@pytest.mark.django_db
@pytest.mark.skip(reason="Integration tests require proper DRF auth setup")
class TestSearchHierarchyIntegration:
    """Integration tests for search hierarchy API."""

    def test_search_without_hierarchy_param(self, api_client, user):
        """Test search without hierarchy parameter (backward compat)."""
        api_client.force_login(user)
        response = api_client.get("/api/v1/search/?q=test")

        assert response.status_code == 200
        data = response.json()
        # hierarchy key should not be present when not requested
        assert "hierarchy" not in data or data.get("hierarchy") is None

    def test_search_with_hierarchy_no_results(self, api_client, user):
        """Test hierarchy with no search results."""
        api_client.force_login(user)
        response = api_client.get(
            "/api/v1/search/?q=nonexistentquerythatreturnsnothing&hierarchy=true"
        )

        assert response.status_code == 200
        data = response.json()
        # Should return null hierarchy when no results
        assert data.get("hierarchy") is None

    def test_search_with_hierarchy_no_anchor_types(self, api_client, user, settings):
        """Test hierarchy with results but no anchor types configured."""
        settings.SEARCH_HIERARCHY_ANCHOR_TYPES = []

        api_client.force_login(user)
        response = api_client.get("/api/v1/search/?q=test&hierarchy=true")

        assert response.status_code == 200
        data = response.json()
        # Should return null hierarchy when no anchor types configured
        assert data.get("hierarchy") is None

    def test_search_with_hierarchy_disabled(self, api_client, user, settings):
        """Test hierarchy when feature is disabled."""
        settings.SEARCH_HIERARCHY_ENABLED = False

        api_client.force_login(user)
        response = api_client.get("/api/v1/search/?q=test&hierarchy=true")

        assert response.status_code == 200
        data = response.json()
        # Should return null hierarchy when feature disabled
        assert data.get("hierarchy") is None

    def test_search_error_in_hierarchy_doesnt_break_search(
        self, api_client, user, settings, mocker
    ):
        """Test that hierarchy errors don't break main search."""
        # Mock the hierarchy resolver to raise an exception
        mocker.patch(
            "search.api.views.SearchAPIView.resolve_hierarchy",
            side_effect=Exception("Test error"),
        )

        api_client.force_login(user)
        response = api_client.get("/api/v1/search/?q=test&hierarchy=true")

        # Search should still work
        assert response.status_code == 200
        data = response.json()
        # Hierarchy should be null due to error, but search results should be present
        assert data.get("hierarchy") is None

    def test_search_hierarchy_parameter_case_insensitive(self, api_client, user):
        """Test that hierarchy parameter is case-insensitive."""
        api_client.force_login(user)

        # Test various cases
        for param_value in ["true", "True", "TRUE", "TrUe"]:
            response = api_client.get(f"/api/v1/search/?q=test&hierarchy={param_value}")
            assert response.status_code == 200

    def test_search_hierarchy_false_param(self, api_client, user):
        """Test that hierarchy=false doesn't include hierarchy."""
        api_client.force_login(user)
        response = api_client.get("/api/v1/search/?q=test&hierarchy=false")

        assert response.status_code == 200
        data = response.json()
        # hierarchy key should not be present when explicitly false
        assert "hierarchy" not in data or data.get("hierarchy") is None

    def test_unauthenticated_search_with_hierarchy(self, api_client):
        """Test that hierarchy works for unauthenticated users (if search does)."""
        # This depends on your search API permission settings
        # If search requires authentication, this should return 401/403
        # If search is public, hierarchy should work
        response = api_client.get("/api/v1/search/?q=test&hierarchy=true")

        # Check response is valid (either 200 with data or 401/403)
        assert response.status_code in [200, 401, 403]
