import pytest
from django.urls import reverse
from rest_framework import status
from activities.models import Period
from projects.models import ProjectMembership


@pytest.fixture
def project_membership(project, admin_user):
    """Create a membership for the authenticated user."""
    return ProjectMembership.objects.create(
        project=project, user=admin_user, role=ProjectMembership.Role.ADMIN
    )


@pytest.mark.django_db
class TestProjectMembershipAPI:
    """Test project membership API."""

    def test_list_members(self, authenticated_client, project, project_membership):
        """Test listing members of a project."""
        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # Handle pagination or list
        results = response.data
        if isinstance(response.data, dict):
            if "results" in response.data:
                results = response.data["results"]
            elif "data" in response.data:
                results = response.data["data"]

        assert len(results) >= 1

        # Check if the user is in the list
        user_ids = [
            str(m["user"]["id"]) if isinstance(m["user"], dict) else str(m["user"]) for m in results
        ]

        assert str(project_membership.user.id) in user_ids

    def test_add_member(self, authenticated_client, project, project_membership, user_factory):
        """Test adding a member to a project."""
        new_user = user_factory()

        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "user_id": str(new_user.id),
            "role": ProjectMembership.Role.VIEWER,
        }

        response = authenticated_client.post(url, data)

        if response.status_code != status.HTTP_201_CREATED:
            print(f"Add member failed: {response.data}")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["role"] == ProjectMembership.Role.VIEWER
        assert str(response.data["user"]["id"]) == str(new_user.id)

        # Verify DB
        assert ProjectMembership.objects.filter(project=project, user=new_user).exists()

    def test_update_member_role(
        self, authenticated_client, project, project_membership, user_factory
    ):
        """Test updating a member's role."""
        # Create a member first
        user = user_factory()
        membership = ProjectMembership.objects.create(
            project=project, user=user, role=ProjectMembership.Role.VIEWER
        )

        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": membership.id},
        )
        data = {
            "role": ProjectMembership.Role.EDITOR,
        }

        response = authenticated_client.patch(url, data)

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_202_ACCEPTED]

        if response.status_code == status.HTTP_200_OK:
            assert response.data["role"] == ProjectMembership.Role.EDITOR
            membership.refresh_from_db()
            assert membership.role == ProjectMembership.Role.EDITOR

    def test_remove_member(self, authenticated_client, project, project_membership, user_factory):
        """Test removing a member."""
        user = user_factory()
        membership = ProjectMembership.objects.create(
            project=project, user=user, role=ProjectMembership.Role.VIEWER
        )

        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": membership.id},
        )

        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Soft delete check
        membership.refresh_from_db()
        assert membership.deleted_at is not None

    def test_remove_last_admin_fails(self, authenticated_client, project, project_membership):
        """Test removing the last admin fails via API."""
        # Ensure no other admins
        assert (
            ProjectMembership.objects.filter(
                project=project, role="admin", deleted_at__isnull=True
            ).count()
            == 1
        )

        # Ensure no other org admins (to trigger failure)
        from organisations.models import Membership

        Membership.objects.filter(organisation=project.organisation).exclude(
            user=project_membership.user
        ).delete()

        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": project_membership.id},
        )

        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot remove the last admin" in str(response.data)

    def test_add_existing_member_fails(self, authenticated_client, project, project_membership):
        """Test adding an existing member fails."""
        user = project_membership.user

        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "user_id": str(user.id),
            "role": ProjectMembership.Role.VIEWER,
        }

        response = authenticated_client.post(url, data)

        # Should fail because user is already a member
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already a member" in str(response.data).lower()

    def test_non_admin_cannot_add_member(self, api_client, project, user_factory, organisation):
        """Test that non-admin project members cannot add new members."""
        # Create a viewer user
        viewer_user = user_factory()

        # Add viewer to org
        from organisations.models import Membership

        Membership.objects.create(organisation=organisation, user=viewer_user, role="member")

        # Add viewer to project as VIEWER
        ProjectMembership.objects.create(
            project=project, user=viewer_user, role=ProjectMembership.Role.VIEWER
        )

        # Authenticate as viewer
        api_client.force_authenticate(user=viewer_user)

        # Try to add a new member
        new_user = user_factory()
        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project.id},
        )
        data = {
            "user_id": str(new_user.id),
            "role": ProjectMembership.Role.VIEWER,
        }

        response = api_client.post(url, data)

        # Should be denied (403 Forbidden)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "admin" in str(response.data).lower()

    def test_non_admin_cannot_update_role(self, api_client, project, user_factory, organisation):
        """Test that non-admin project members cannot update roles."""
        # Create viewer and target users
        viewer_user = user_factory()
        target_user = user_factory()

        # Add both to org
        from organisations.models import Membership

        Membership.objects.create(organisation=organisation, user=viewer_user, role="member")

        # Add viewer to project as VIEWER
        ProjectMembership.objects.create(
            project=project, user=viewer_user, role=ProjectMembership.Role.VIEWER
        )

        # Add target to project as VIEWER
        target_membership = ProjectMembership.objects.create(
            project=project, user=target_user, role=ProjectMembership.Role.VIEWER
        )

        # Authenticate as viewer
        api_client.force_authenticate(user=viewer_user)

        # Try to update target's role
        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": target_membership.id},
        )
        data = {"role": ProjectMembership.Role.EDITOR}

        response = api_client.patch(url, data)

        # Should be denied (403 Forbidden)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_non_admin_cannot_remove_member(self, api_client, project, user_factory, organisation):
        """Test that non-admin project members cannot remove members."""
        # Create viewer and target users
        viewer_user = user_factory()
        target_user = user_factory()

        # Add both to org
        from organisations.models import Membership

        Membership.objects.create(organisation=organisation, user=viewer_user, role="member")

        # Add viewer to project as VIEWER
        ProjectMembership.objects.create(
            project=project, user=viewer_user, role=ProjectMembership.Role.VIEWER
        )

        # Add target to project
        target_membership = ProjectMembership.objects.create(
            project=project, user=target_user, role=ProjectMembership.Role.VIEWER
        )

        # Authenticate as viewer
        api_client.force_authenticate(user=viewer_user)

        # Try to remove target
        url = reverse(
            "api_v1:project-members-detail",
            kwargs={"project_pk": project.id, "pk": target_membership.id},
        )

        response = api_client.delete(url)

        # Should be denied (403 Forbidden)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_searchable_users_endpoint(
        self, authenticated_client, project, project_membership, user_factory, organisation
    ):
        """Test searchable users endpoint returns org members not in project."""
        # Create some org members
        org_member1 = user_factory(email="alice@example.com", first_name="Alice")
        org_member2 = user_factory(email="bob@example.com", first_name="Bob")
        org_member3 = user_factory(email="charlie@example.com", first_name="Charlie")

        # Add them to the organization
        from organisations.models import Membership

        for user in [org_member1, org_member2, org_member3]:
            Membership.objects.create(organisation=organisation, user=user, role="member")

        # Add one to the project (should be excluded from results)
        ProjectMembership.objects.create(
            project=project, user=org_member1, role=ProjectMembership.Role.VIEWER
        )

        # Call searchable users endpoint
        url = reverse(
            "api_v1:project-members-searchable-users",
            kwargs={"project_pk": project.id},
        )
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert "data" in response.data

        users = response.data["data"]
        user_emails = [u["email"] for u in users]

        # org_member1 should NOT be in results (already in project)
        assert "alice@example.com" not in user_emails

        # org_member2 and org_member3 should be in results
        assert "bob@example.com" in user_emails
        assert "charlie@example.com" in user_emails

    def test_searchable_users_with_search_filter(
        self, authenticated_client, project, project_membership, user_factory, organisation
    ):
        """Test searchable users endpoint with search query."""
        # Create org members
        org_member1 = user_factory(email="alice@example.com", first_name="Alice")
        org_member2 = user_factory(email="bob@example.com", first_name="Bob")

        # Add them to the organization
        from organisations.models import Membership

        for user in [org_member1, org_member2]:
            Membership.objects.create(organisation=organisation, user=user, role="member")

        # Search for "alice"
        url = reverse(
            "api_v1:project-members-searchable-users",
            kwargs={"project_pk": project.id},
        )
        response = authenticated_client.get(url, {"search": "alice"})

        assert response.status_code == status.HTTP_200_OK
        users = response.data["data"]
        user_emails = [u["email"] for u in users]

        # Should only return alice
        assert "alice@example.com" in user_emails
        assert "bob@example.com" not in user_emails


@pytest.mark.django_db
class TestSquadReadinessAPI:
    """Test the squad-readiness action on ProjectMembershipViewSet."""

    def _url(self, project_pk: str, **params: str) -> str:
        url = reverse(
            "api_v1:project-members-squad-readiness",
            kwargs={"project_pk": project_pk},
        )
        if params:
            qs = "&".join(f"{k}={v}" for k, v in params.items())
            url = f"{url}?{qs}"
        return url

    @staticmethod
    def _make_metadata(
        *,
        role: str = "player",
        kit_type: str = "home",
        has_fullbody: bool = False,
        has_closeup: bool = False,
        shirt_number: int | None = None,
        functional_roles: list[str] | None = None,
    ) -> dict:
        """Build a realistic ProjectMembership.metadata dict."""
        meta: dict = {}
        if functional_roles is not None:
            meta["functional_roles"] = functional_roles
        if shirt_number is not None:
            meta["shirt_number"] = shirt_number

        role_key = "keeper" if role == "keeper" else "player"
        images: dict = {}
        if has_fullbody:
            images["fullbody"] = {
                kit_type: {"default": {"processed": "https://cdn.example.com/fb.png"}}
            }
        if has_closeup:
            images["closeup"] = {
                kit_type: {"default": {"processed": "https://cdn.example.com/cl.png"}}
            }

        if images:
            meta["teamreel_assets"] = {"roles": {role_key: {"images": images}}}

        return meta

    def test_empty_squad(self, authenticated_client, project, project_membership):
        """Only the admin membership exists; admin has no functional_roles so is counted as player."""
        url = self._url(str(project.id))
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        # Admin membership is counted (no functional_roles → player)
        assert data["total_members"] >= 1
        assert data["readiness_percent"] == 0
        assert data["kit_type"] == "home"

    def test_ready_members(self, authenticated_client, project, project_membership, user_factory):
        """Members with fullbody asset are marked ready."""
        ready_user = user_factory(first_name="Klaas", last_name="Janssen")
        ProjectMembership.objects.create(
            project=project,
            user=ready_user,
            role=ProjectMembership.Role.VIEWER,
            metadata=self._make_metadata(
                has_fullbody=True,
                shirt_number=10,
                functional_roles=["player"],
            ),
        )

        not_ready_user = user_factory(first_name="Piet", last_name="Bakker")
        ProjectMembership.objects.create(
            project=project,
            user=not_ready_user,
            role=ProjectMembership.Role.VIEWER,
            metadata=self._make_metadata(
                has_fullbody=False,
                functional_roles=["player"],
            ),
        )

        url = self._url(str(project.id))
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        data = response.data

        members_by_name = {m["name"]: m for m in data["members"]}
        assert members_by_name["Klaas Janssen"]["ready"] is True
        assert members_by_name["Klaas Janssen"]["has_fullbody"] is True
        assert members_by_name["Klaas Janssen"]["shirt_number"] == "10"
        assert members_by_name["Piet Bakker"]["ready"] is False
        assert data["ready_members"] >= 1

    def test_coaches_excluded(self, authenticated_client, project, project_membership, user_factory):
        """Coaches should not appear in squad readiness."""
        coach = user_factory(first_name="Coach", last_name="Henk")
        ProjectMembership.objects.create(
            project=project,
            user=coach,
            role=ProjectMembership.Role.VIEWER,
            metadata=self._make_metadata(functional_roles=["coach"]),
        )

        url = self._url(str(project.id))
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        member_names = [m["name"] for m in response.data["members"]]
        assert "Coach Henk" not in member_names

    def test_keeper_uses_goalkeeper_kit(
        self, authenticated_client, project, project_membership, user_factory
    ):
        """Keepers should be checked against the goalkeeper kit regardless of requested kit_type."""
        keeper = user_factory(first_name="Tim", last_name="Krul")
        ProjectMembership.objects.create(
            project=project,
            user=keeper,
            role=ProjectMembership.Role.VIEWER,
            metadata=self._make_metadata(
                role="keeper",
                kit_type="goalkeeper",
                has_fullbody=True,
                functional_roles=["keeper"],
            ),
        )

        # Request home kit — keeper should still check goalkeeper kit
        url = self._url(str(project.id), kit_type="home")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        members_by_name = {m["name"]: m for m in response.data["members"]}
        assert members_by_name["Tim Krul"]["ready"] is True
        assert members_by_name["Tim Krul"]["functional_role"] == "keeper"

    def test_kit_type_parameter(
        self, authenticated_client, project, project_membership, user_factory
    ):
        """Different kit_type checks different asset slots."""
        player = user_factory(first_name="Frenkie", last_name="de Jong")
        ProjectMembership.objects.create(
            project=project,
            user=player,
            role=ProjectMembership.Role.VIEWER,
            metadata=self._make_metadata(
                kit_type="home",
                has_fullbody=True,
                functional_roles=["player"],
            ),
        )

        # Home kit — should be ready
        url = self._url(str(project.id), kit_type="home")
        response = authenticated_client.get(url)
        members_by_name = {m["name"]: m for m in response.data["members"]}
        assert members_by_name["Frenkie de Jong"]["ready"] is True

        # Away kit — no away assets uploaded
        url = self._url(str(project.id), kit_type="away")
        response = authenticated_client.get(url)
        members_by_name = {m["name"]: m for m in response.data["members"]}
        assert members_by_name["Frenkie de Jong"]["ready"] is False

    def test_invalid_kit_type_defaults_to_home(
        self, authenticated_client, project, project_membership
    ):
        """Invalid kit_type falls back to 'home'."""
        url = self._url(str(project.id), kit_type="invalid")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["kit_type"] == "home"

    def test_deleted_members_excluded(
        self, authenticated_client, project, project_membership, user_factory
    ):
        """Soft-deleted members should not appear."""
        from django.utils import timezone

        deleted_user = user_factory(first_name="Deleted", last_name="Player")
        ProjectMembership.objects.create(
            project=project,
            user=deleted_user,
            role=ProjectMembership.Role.VIEWER,
            metadata=self._make_metadata(
                has_fullbody=True,
                functional_roles=["player"],
            ),
            deleted_at=timezone.now(),
        )

        url = self._url(str(project.id))
        response = authenticated_client.get(url)
        member_names = [m["name"] for m in response.data["members"]]
        assert "Deleted Player" not in member_names

    def test_unauthenticated_access_denied(self, api_client, project):
        """Unauthenticated requests should be rejected."""
        url = self._url(str(project.id))
        response = api_client.get(url)
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


@pytest.mark.django_db
class TestMembershipPeriodFilter:
    """Test period/season filtering on the members list endpoint."""

    def _list_url(self, project_pk: str, **params: str) -> str:
        url = reverse(
            "api_v1:project-members-list",
            kwargs={"project_pk": project_pk},
        )
        if params:
            qs = "&".join(f"{k}={v}" for k, v in params.items())
            url = f"{url}?{qs}"
        return url

    def _get_results(self, response_data: dict | list) -> list:
        if isinstance(response_data, dict):
            return response_data.get("results", response_data.get("data", []))
        return response_data

    def test_filter_by_period(
        self, authenticated_client, project, project_membership, user_factory, organisation
    ):
        """Members with a specific period should be returned when filtering by period."""
        season = Period.objects.create(
            name="Season 2025-2026",
            organisation=organisation,
            start_date="2025-08-01",
            end_date="2026-06-30",
        )

        season_user = user_factory(first_name="Season", last_name="Player")
        ProjectMembership.objects.create(
            project=project,
            user=season_user,
            role=ProjectMembership.Role.VIEWER,
            period=season,
        )

        # Filter by period — should only return the season member
        url = self._list_url(str(project.id), period=str(season.id))
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        results = self._get_results(response.data)
        user_names = [
            m["user"].get("full_name", "") or f'{m["user"].get("first_name", "")} {m["user"].get("last_name", "")}'.strip()
            for m in results
        ]
        assert any("Season" in n for n in user_names)

        # The admin_user membership (no period) should NOT appear
        user_ids = [str(m["user"]["id"]) for m in results]
        assert str(project_membership.user.id) not in user_ids

    def test_no_period_returns_all(
        self, authenticated_client, project, project_membership, user_factory, organisation
    ):
        """Without period filter, all members are returned."""
        season = Period.objects.create(
            name="Season 2025-2026",
            organisation=organisation,
            start_date="2025-08-01",
            end_date="2026-06-30",
        )

        season_user = user_factory(first_name="Season", last_name="Player")
        ProjectMembership.objects.create(
            project=project,
            user=season_user,
            role=ProjectMembership.Role.VIEWER,
            period=season,
        )

        # No period filter — should return both members
        url = self._list_url(str(project.id))
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        results = self._get_results(response.data)
        # At least 2: admin + season player
        assert len(results) >= 2

    def test_invalid_period_uuid_rejected(
        self, authenticated_client, project, project_membership
    ):
        """Invalid period UUID should return a validation error."""
        url = self._list_url(str(project.id), period="not-a-uuid")
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_general_members_without_period_not_in_season_filter(
        self, authenticated_client, project, project_membership, user_factory, organisation
    ):
        """General members (period=None) should NOT appear when filtering by a specific period.
        This is the expected behavior — the frontend handles the fallback by retrying without filter."""
        season = Period.objects.create(
            name="Season 2025-2026",
            organisation=organisation,
            start_date="2025-08-01",
            end_date="2026-06-30",
        )

        # admin_user has no period
        url = self._list_url(str(project.id), period=str(season.id))
        response = authenticated_client.get(url)
        assert response.status_code == status.HTTP_200_OK

        results = self._get_results(response.data)
        # Only period-scoped members — admin has no period so excluded
        user_ids = [str(m["user"]["id"]) for m in results]
        assert str(project_membership.user.id) not in user_ids
