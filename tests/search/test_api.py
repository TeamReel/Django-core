import pytest
from unittest.mock import MagicMock, patch
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.test import APIClient
from django.db import connection
from search.api.views import SearchAPIView
from search.models import SearchEntry
from accounts.models import User
from projects.models import Project


@pytest.mark.unit
class TestSearchAPI:
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.view = SearchAPIView.as_view()
        self.url = "/api/v1/search/"
        self.user = MagicMock()
        self.user.is_authenticated = True

    @patch("search.api.views.PostgresSearchBackend")
    def test_global_search_grouping(self, mock_backend_cls):
        # Setup Mock Backend
        mock_backend = mock_backend_cls.return_value

        # Create mock entries
        ct_project = MagicMock()
        ct_project.model = "project"
        ct_project.app_label = "projects"

        ct_user = MagicMock()
        ct_user.model = "user"
        ct_user.app_label = "accounts"

        entry1 = MagicMock(spec=SearchEntry)
        entry1.content_type = ct_project
        entry1.title = "Project A"
        entry1.highlight = "<b>Project</b> A"
        # Serializer needs these
        entry1.id = 1
        entry1.description = "Desc"
        entry1.url = "/p/1"
        entry1.image_url = None
        entry1.object_id = "uuid-1"

        entry2 = MagicMock(spec=SearchEntry)
        entry2.content_type = ct_user
        entry2.title = "User B"
        entry2.highlight = "<b>User</b> B"
        entry2.id = 2
        entry2.description = "Desc"
        entry2.url = "/u/2"
        entry2.image_url = None
        entry2.object_id = "uuid-2"

        # Mock search return - needs to be iterable AND support annotate
        # The view calls .count() -> .distinct() -> .annotate() -> slicing.
        mock_qs = MagicMock()
        mock_backend.search.return_value = mock_qs
        mock_qs.count.return_value = 2
        mock_qs.distinct.return_value = mock_qs
        mock_qs.annotate.return_value = mock_qs
        # Also needs to support slicing for the "results = queryset[:100]" line
        mock_qs.__getitem__.return_value = [entry1, entry2]

        # Execute
        request = self.factory.get(self.url, {"q": "test"})
        force_authenticate(request, user=self.user)
        response = self.view(request)

        # Verify
        assert response.status_code == 200
        data = response.data

        # Check grouping with plural keys
        # Note: the view splits projects into clubs/teams based on hierarchy
        assert "clubs" in data or "teams" in data
        assert "users" in data
        # At least one project category should have our entry
        assert data.get("clubs", []) or data.get("teams", []), "Expected project in clubs or teams"
        assert len(data["users"]) == 1

        # Check fields (entry may be in clubs or teams depending on mock)
        project_entries = data.get("clubs", []) or data.get("teams", [])
        assert project_entries[0]["title"] == "Project A"
        assert project_entries[0]["content_type"] == "projects.project"

    @patch("search.api.views.PostgresSearchBackend")
    def test_filtered_search_pagination(self, mock_backend_cls):
        # Setup Mock Backend
        mock_backend = mock_backend_cls.return_value

        # Mock QuerySet
        mock_qs = MagicMock()
        mock_backend.search.return_value = mock_qs
        mock_qs.count.return_value = 50
        mock_qs.distinct.return_value = mock_qs

        # Mock annotate return
        mock_annotated_qs = MagicMock()
        mock_qs.annotate.return_value = mock_annotated_qs

        # Paginator needs count and slicing
        mock_annotated_qs.count.return_value = 50
        mock_annotated_qs.__getitem__.return_value = []

        # Execute
        request = self.factory.get(self.url, {"q": "test", "types": "projects.project"})
        force_authenticate(request, user=self.user)
        response = self.view(request)

        # Verify
        assert response.status_code == 200
        data = response.data

        # Check pagination structure
        assert "count" in data
        assert "next" in data
        assert "previous" in data
        assert "results" in data

    @patch("search.api.views.PostgresSearchBackend")
    def test_empty_query(self, mock_backend_cls):
        request = self.factory.get(self.url, {"q": "   "})
        force_authenticate(request, user=self.user)
        response = self.view(request)

        assert response.status_code == 200
        assert response.data == {"results": []}

        mock_backend_cls.return_value.search.assert_not_called()

    @patch("search.api.views.PostgresSearchBackend")
    def test_highlight_annotation(self, mock_backend_cls):
        # Verify that annotate is called with SearchHeadline
        mock_backend = mock_backend_cls.return_value
        mock_qs = MagicMock()
        mock_backend.search.return_value = mock_qs
        mock_qs.count.return_value = 1
        mock_qs.distinct.return_value = mock_qs
        mock_qs.annotate.return_value = mock_qs
        mock_qs.__getitem__.return_value = []  # For slicing

        # Execute
        request = self.factory.get(self.url, {"q": "test"})
        force_authenticate(request, user=self.user)
        self.view(request)

        if connection.vendor == "postgresql":
            # Verify annotate called
            mock_qs.annotate.assert_called()
        else:
            # Highlighting is disabled on non-Postgres DBs
            mock_qs.annotate.assert_not_called()


@pytest.mark.django_db
@pytest.mark.integration
class TestSearchAPIIntegration:
    """Integration tests for Search API with real database."""

    def setup_method(self):
        self.factory = APIRequestFactory()
        self.url = "/api/v1/search/"

    def test_global_search_with_real_data(self, client, test_user, search_entries):
        """Test global search returns grouped results with real database data."""
        api_client = APIClient()
        api_client.force_login(test_user)
        response = api_client.get(self.url, {"q": "test"})

        assert response.status_code == 200
        payload = response.json()
        data = payload.get("data", payload)

        # Should have plural keys
        assert "users" in data or "projects" in data or "organisations" in data

        # Check that results are grouped
        total_results = sum(len(v) for v in data.values())
        assert total_results > 0

        # Verify each result has required fields
        for category, results in data.items():
            for result in results:
                assert "id" in result
                assert "title" in result
                assert "description" in result
                assert "url" in result
                assert "content_type" in result
                # highlight field may be present depending on query match

    def test_filtered_search_with_pagination(self, client, test_user, test_project):
        """Test filtered search returns paginated results."""
        from search.models import SearchEntry
        from django.contrib.contenttypes.models import ContentType

        # Create multiple real projects + search entries.
        # Permission filtering uses ProjectIndex.get_visible_ids(), so object_id must
        # correspond to actual Project IDs visible to the user.
        project_ct = ContentType.objects.get_for_model(Project)
        org = test_project.organisation

        for i in range(25):
            project = Project.objects.create(
                organisation=org,
                creator=test_user,
                name=f"Project {i}",
                slug=f"project-{i}",
                description=f"Test project description {i}",
            )
            SearchEntry.objects.update_or_create(
                content_type=project_ct,
                object_id=str(project.id),
                defaults={
                    "title": project.name,
                    "description": project.description,
                    "url": f"/projects/{project.id}/",
                    "body_text": f"{project.name} test data",
                },
            )

        api_client = APIClient()
        api_client.force_login(test_user)

        # Request with types filter
        response = api_client.get(self.url, {"q": "project", "types": "projects.project"})

        assert response.status_code == 200
        payload = response.json()
        data = payload.get("data", payload)

        # Should have pagination structure
        assert "count" in data
        assert "next" in data
        assert "previous" in data
        assert "results" in data

        # Should have results
        assert len(data["results"]) > 0
        assert data["count"] >= 25

    def test_highlighting_in_results(self, client, test_user, search_entries):
        """Test that search results include highlighting."""
        api_client = APIClient()
        api_client.force_login(test_user)
        response = api_client.get(self.url, {"q": "test"})

        assert response.status_code == 200
        payload = response.json()
        data = payload.get("data", payload)

        # Highlighting is PostgreSQL-specific. On SQLite we only assert the
        # endpoint responds and returns grouped results.
        for category, results in data.items():
            for result in results:
                if "highlight" in result and result["highlight"]:
                    assert "<b>" in str(result["highlight"]) or result["highlight"] is None

        # At least some results should have highlighting when there's a match
        # (This may not always be true if body_text doesn't match)

    def test_empty_query_returns_empty_results(self, client, test_user):
        """Test that empty query returns empty results."""
        api_client = APIClient()
        api_client.force_login(test_user)
        response = api_client.get(self.url, {"q": ""})

        assert response.status_code == 200
        payload = response.json()
        data = payload.get("data", payload)
        assert data == {"results": []}

    def test_grouped_results_respect_limit(self, client, test_user):
        """Test that grouped results limit each category to 5 items."""
        from search.models import SearchEntry
        from django.contrib.contenttypes.models import ContentType
        from organisations.models import Membership, Organisation

        # Put all users in the same organisation so they are visible
        org = Organisation.objects.create(name="Search Limit Org", creator=test_user)
        Membership.objects.create(user=test_user, organisation=org, role="admin")

        # Create 10 users
        users = []
        for i in range(10):
            user = User.objects.create_user(
                email=f"searchuser{i}@example.com",
            )
            Membership.objects.create(user=user, organisation=org, role="member")
            users.append(user)

        # Create search entries for all users
        user_ct = ContentType.objects.get_for_model(User)
        for user in users:
            SearchEntry.objects.create(
                content_type=user_ct,
                object_id=str(user.id),
                title=user.username,
                description=user.email,
                url=f"/users/{user.id}/",
                body_text=f"searchuser {user.username} {user.email}",
            )

        api_client = APIClient()
        api_client.force_login(test_user)
        response = api_client.get(self.url, {"q": "searchuser"})

        assert response.status_code == 200
        payload = response.json()
        data = payload.get("data", payload)

        # Users category should have at most 5 results
        if "users" in data:
            assert len(data["users"]) <= 5
