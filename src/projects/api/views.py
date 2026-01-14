"""DRF views for Projects & Workspaces."""

import logging

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from projects.models import Project, ProjectInvite, ProjectMembership, ProjectMembershipPromotion
from projects.services.invitation_service import InvitationService
from projects.services.membership_service import MembershipService
from projects.services.promotion_service import PromotionService

from .permissions import IsProjectMemberOrOrgAdmin
from .serializers import (
    AcceptInvitationSerializer,
    ProjectDetailSerializer,
    ProjectInviteSerializer,
    ProjectListSerializer,
    ProjectMembershipPromotionSerializer,
    ProjectMembershipSerializer,
    ProjectUpdateSerializer,
)


logger = logging.getLogger(__name__)


class ProjectCursorPagination(CursorPagination):
    """
    Cursor pagination for project lists.

    Uses created_at for ordering to ensure stable pagination.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200  # Reasonable page size - frontend recursively fetches all pages
    ordering = "-created_at"


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for project management.

    Supports both nested (under organisations) and top-level routes.

    Actions:
    - list: GET /api/organisations/{org_slug}/projects/ or /api/projects/
    - create: POST /api/organisations/{org_slug}/projects/
    - retrieve: GET /api/organisations/{org_slug}/projects/{slug}/
      or /api/projects/{slug}/
    - update: PATCH /api/organisations/{org_slug}/projects/{slug}/
      or /api/projects/{slug}/
    - archive: POST /api/organisations/{org_slug}/projects/{slug}/archive/
      or /api/projects/{slug}/archive/
    - restore: POST /api/organisations/{org_slug}/projects/{slug}/restore/
      or /api/projects/{slug}/restore/
    """

    lookup_field = "slug"

    permission_classes = [IsAuthenticated, IsProjectMemberOrOrgAdmin]
    pagination_class = ProjectCursorPagination

    @action(detail=True, methods=["get"])
    def members(self, request, slug=None, organisation_id=None):
        """
        List users with access to this project.
        Includes:
        1. Users with explicit RoleAssignments on this project.
        2. Organisation Admins (who implicitly have access).
        """
        project = self.get_object()

        # Minimal access control: only project members or admins that can edit team profiles
        if not request.user.is_superuser:
            from permissions.evaluator import check_permission

            is_project_member = ProjectMembership.objects.filter(
                project=project,
                user=request.user,
                deleted_at__isnull=True,
            ).exists()

            # TeamReel: rosters live on teams (child projects). Root projects (clubs)
            # are containers and should not expose membership lists to basic viewers.
            is_team_project = project.parent_project_id is not None

            can_edit_team_profiles = check_permission(
                request.user.id,
                "profile.edit_team",
                resource_type="project",
                resource_id=project.id,
            )

            if not ((is_project_member and is_team_project) or can_edit_team_profiles):
                raise PermissionDenied("You do not have access to this project's members.")

        # 1. Role Assignments
        from permissions.models import RoleAssignment, ScopeChoices

        assignments = RoleAssignment.objects.filter(
            target_project=project, scope=ScopeChoices.PROJECT
        ).select_related("user", "role")

        # 2. Org Admins
        from organisations.models import Membership

        org_admins = Membership.objects.filter(
            organisation=project.organisation, role="admin", is_active=True
        ).select_related("user")

        # 3. Project Memberships (TeamReel data layer)
        project_memberships = (
            ProjectMembership.objects.filter(project=project, deleted_at__isnull=True)
            .select_related("user")
            .order_by("-created_at")
        )

        # Combine and format
        members_data = []
        seen_user_ids = set()

        # Add project memberships
        for pm in project_memberships:
            if pm.user.id not in seen_user_ids:
                members_data.append(
                    {
                        "id": str(pm.id),
                        "user": {
                            "id": str(pm.user.id),
                            "email": pm.user.email,
                            "first_name": pm.user.first_name,
                            "last_name": pm.user.last_name,
                        },
                        "role": pm.role,
                        "joined_at": pm.created_at,
                        "source": "project_membership",
                    }
                )
                seen_user_ids.add(pm.user.id)

        # Add explicit assignments
        for ra in assignments:
            if ra.user.id not in seen_user_ids:
                members_data.append(
                    {
                        "id": str(ra.id),  # Use assignment ID as unique key
                        "user": {
                            "id": str(ra.user.id),
                            "email": ra.user.email,
                            "first_name": ra.user.first_name,
                            "last_name": ra.user.last_name,
                        },
                        "role": ra.role.name,  # Use the actual role name (e.g. "Coach", "Player")
                        "joined_at": ra.assigned_at,
                        "source": "assignment",
                    }
                )
                seen_user_ids.add(ra.user.id)

        # Add org admins
        for m in org_admins:
            if m.user.id not in seen_user_ids:
                members_data.append(
                    {
                        "id": str(m.id),
                        "user": {
                            "id": str(m.user.id),
                            "email": m.user.email,
                            "first_name": m.user.first_name,
                            "last_name": m.user.last_name,
                        },
                        "role": "Org Admin",
                        "joined_at": m.joined_at,
                        "source": "membership",
                    }
                )
                seen_user_ids.add(m.user.id)

        return Response({"results": members_data})

    def get_queryset(self):
        """
        Return projects queryset with optimizations.

        For nested routes: filter by organisation_id (slug)
        For top-level routes: filter by user's organisation memberships

        Applies select_related for organisation and creator to minimize queries.
        """
        # For archive/restore actions, include archived projects
        if self.action in ["restore", "archive"]:
            base_queryset = Project.all_objects.select_related(
                "organisation", "creator"
            ).prefetch_related("organisation__memberships")
        else:
            base_queryset = Project.objects.select_related(
                "organisation", "creator"
            ).prefetch_related("organisation__memberships")

        queryset = base_queryset

        # Apply visibility filter for all routes
        user = self.request.user
        if user.is_authenticated and not user.is_superuser:
            from permissions.models import RoleAssignment, ScopeChoices

            # 1. Direct org membership
            user_org_ids = user.organisation_memberships.values_list("organisation_id", flat=True)

            # 2. Role Assignments on Projects
            assigned_project_ids = RoleAssignment.objects.filter(
                user=user, scope=ScopeChoices.PROJECT
            ).values_list("target_project_id", flat=True)

            # 2b. Include related hierarchy for project-scoped roles
            # - Team Admin (team project) should be able to see its club container
            assigned_parent_project_ids = Project.all_objects.filter(
                id__in=assigned_project_ids,
                parent_project__isnull=False,
            ).values_list("parent_project_id", flat=True)

            # - Club Admin (club project) should be able to see child teams
            assigned_child_project_ids = Project.all_objects.filter(
                parent_project_id__in=assigned_project_ids
            ).values_list("id", flat=True)

            # 3. Role Assignments on Organisations
            assigned_org_ids = RoleAssignment.objects.filter(
                user=user, scope=ScopeChoices.ORGANIZATION
            ).values_list("target_organization_id", flat=True)

            # 4. Project Memberships (TeamReel data layer)
            membership_project_ids = ProjectMembership.objects.filter(
                user=user, deleted_at__isnull=True
            ).values_list("project_id", flat=True)

            queryset = queryset.filter(
                Q(organisation_id__in=user_org_ids)
                | Q(organisation_id__in=assigned_org_ids)
                | Q(id__in=assigned_project_ids)
                | Q(id__in=assigned_parent_project_ids)
                | Q(id__in=assigned_child_project_ids)
                | Q(id__in=membership_project_ids)
            ).distinct()
        else:
            # Ensure distinct results for superusers as well, just in case
            queryset = queryset.distinct()

        # Check if this is a nested route (organisation_id slug in URL)
        organisation_slug = self.kwargs.get("organisation_id")

        if organisation_slug:
            # Nested route: resolve slug to organisation and filter
            from organisations.models import Organisation

            try:
                organisation = Organisation.objects.get(slug=organisation_slug)
                queryset = queryset.filter(organisation_id=organisation.id)
            except Organisation.DoesNotExist:
                # Return empty queryset if organisation not found
                return queryset.none()

        # Handle include_archived query parameter
        include_archived = (
            self.request.query_params.get("include_archived", "false").lower() == "true"
        )

        if include_archived:
            # Use all_objects manager to include archived projects
            queryset = Project.all_objects.select_related(
                "organisation", "creator"
            ).prefetch_related("organisation__memberships")

            # Reapply organisation filter
            if organisation_slug:
                from organisations.models import Organisation

                try:
                    organisation = Organisation.objects.get(slug=organisation_slug)
                    queryset = queryset.filter(organisation_id=organisation.id)
                except Organisation.DoesNotExist:
                    return queryset.none()
            else:
                user = self.request.user
                if user.is_authenticated and not user.is_superuser:
                    from permissions.models import RoleAssignment, ScopeChoices

                    # 1. Direct membership
                    user_org_ids = user.organisation_memberships.values_list(
                        "organisation_id", flat=True
                    )

                    # 2. Role Assignments on Projects
                    assigned_project_ids = RoleAssignment.objects.filter(
                        user=user, scope=ScopeChoices.PROJECT
                    ).values_list("target_project_id", flat=True)

                    # 3. Role Assignments on Organisations
                    assigned_org_ids = RoleAssignment.objects.filter(
                        user=user, scope=ScopeChoices.ORGANIZATION
                    ).values_list("target_organization_id", flat=True)

                    queryset = queryset.filter(
                        Q(organisation_id__in=user_org_ids)
                        | Q(id__in=assigned_project_ids)
                        | Q(organisation_id__in=assigned_org_ids)
                    ).distinct()

        # Handle search query parameter
        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(name__icontains=search)

        # Handle parent_project filtering for clubs/teams distinction
        parent_filter = self.request.query_params.get("parent_project__isnull")
        if parent_filter is not None:
            if parent_filter.lower() in ["true", "1"]:
                # Clubs only (no parent)
                queryset = queryset.filter(parent_project__isnull=True)
            elif parent_filter.lower() in ["false", "0"]:
                # Teams only (has parent)
                queryset = queryset.filter(parent_project__isnull=False)

        # Ensure distinct is always applied to prevent duplicates
        return queryset.distinct()

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "list":
            return ProjectListSerializer
        elif self.action in ["update", "partial_update"]:
            return ProjectUpdateSerializer
        return ProjectDetailSerializer

    def get_serializer_context(self):
        """Add organisation to serializer context for nested routes."""
        context = super().get_serializer_context()

        organisation_slug = self.kwargs.get("organisation_id")
        if organisation_slug:
            # For nested routes, fetch the organisation by slug and add to context
            from organisations.models import Organisation

            try:
                organisation = Organisation.objects.get(slug=organisation_slug)
                context["organisation"] = organisation
            except Organisation.DoesNotExist:
                pass

        return context

    def create(self, request, *args, **kwargs):
        """Create a new project."""
        # Ensure organisation is in context
        organisation_slug = self.kwargs.get("organisation_id")
        if not organisation_slug:
            return Response(
                {"detail": "Organisation slug is required for project creation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = super().create(request, *args, **kwargs)

        # Trigger notification on successful creation (best-effort; never fail create)
        if response.status_code == status.HTTP_201_CREATED:
            try:
                from notifications.services import notify_project_created
                from projects.models import Project

                project_id = getattr(response, "data", {}).get("id")
                if project_id:
                    project = Project.objects.get(id=project_id)
                    notify_project_created(project=project, creator=request.user)
            except Exception:
                logger.exception("notify_project_created failed")

        return response

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, *args, **kwargs):
        """
        Archive a project (soft deletion).

        POST /api/organisations/{org_id}/projects/{id}/archive/
        POST /api/projects/{id}/archive/
        """
        project = self.get_object()

        if not project.is_active:
            return Response(
                {"detail": "Project is already archived."}, status=status.HTTP_400_BAD_REQUEST
            )

        project.archive()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="restore")
    def restore(self, request, *args, **kwargs):
        """
        Restore an archived project.

        POST /api/organisations/{org_id}/projects/{id}/restore/
        POST /api/projects/{id}/restore/
        """
        project = self.get_object()

        if project.is_active:
            return Response(
                {"detail": "Project is already active."}, status=status.HTTP_400_BAD_REQUEST
            )

        project.restore()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="membership-stats")
    def membership_stats(self, request, pk=None, organisation_slug=None, slug=None):
        """
        Get membership statistics for the project.
        """
        project = self.get_object()

        # Check permissions (only admins should see stats)
        user = request.user
        if not user.is_superuser:
            from permissions.evaluator import check_permission

            can_edit_team_profiles = check_permission(
                user.id,
                "profile.edit_team",
                resource_type="project",
                resource_id=project.id,
            )

            is_org_admin = user.organisation_memberships.filter(
                organisation=project.organisation,
                role="admin",
                is_active=True,
            ).exists()

            is_project_admin = ProjectMembership.objects.filter(
                project=project,
                user=user,
                role=ProjectMembership.Role.ADMIN,
                deleted_at__isnull=True,
            ).exists()

            if not (can_edit_team_profiles or is_org_admin or is_project_admin):
                raise PermissionDenied("Only admins can view membership statistics.")

        # Calculate stats
        memberships = ProjectMembership.objects.filter(project=project, deleted_at__isnull=True)

        total_members = memberships.count()

        breakdown = {
            "admin": memberships.filter(role=ProjectMembership.Role.ADMIN).count(),
            "editor": memberships.filter(role=ProjectMembership.Role.EDITOR).count(),
            "viewer": memberships.filter(role=ProjectMembership.Role.VIEWER).count(),
        }

        pending_invites = ProjectInvite.objects.filter(
            project=project,
            status=ProjectInvite.Status.PENDING,
        ).count()

        pending_promotions = ProjectMembershipPromotion.objects.filter(
            project=project,
            status=ProjectMembershipPromotion.Status.PENDING,
        ).count()

        data = {
            "total_members": total_members,
            "breakdown": breakdown,
            "pending_invites": pending_invites,
            "pending_promotions": pending_promotions,
        }

        return Response(data)


class ProjectMembershipReadThrottle(UserRateThrottle):
    """Rate limiting for read operations on project memberships: 100/min"""

    rate = "100/min"


class ProjectMembershipWriteThrottle(UserRateThrottle):
    """Rate limiting for write operations on project memberships: 30/min"""

    rate = "30/min"


class ProjectMembershipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing project memberships.

    Routes:
    - GET /api/projects/{project_pk}/members/
    - POST /api/projects/{project_pk}/members/
    - PATCH /api/projects/{project_pk}/members/{pk}/
    - DELETE /api/projects/{project_pk}/members/{pk}/
    - GET /api/projects/{project_pk}/members/searchable-users/

    Rate Limiting:
    - Read operations: 100 requests/min
    - Write operations: 30 requests/min

    Permissions:
    - Read operations: Project member or org admin
    - Write operations: Project admin only
    """

    serializer_class = ProjectMembershipSerializer
    permission_classes = [IsAuthenticated]

    def _check_can_manage_members(self, project: Project) -> None:
        user = self.request.user

        if user.is_superuser or user.is_staff:
            return

        # Legacy: explicit project admin membership
        if ProjectMembership.objects.filter(
            project=project,
            user=user,
            role=ProjectMembership.Role.ADMIN,
            deleted_at__isnull=True,
        ).exists():
            return

        from permissions.evaluator import check_permission

        # Direct team-member management capability on this project
        if check_permission(
            user.id,
            "profile.edit_team",
            resource_type="project",
            resource_id=project.id,
        ):
            return

        # Club Admin can manage child teams via project.edit_children on the parent (club)
        if project.parent_project_id and check_permission(
            user.id,
            "project.edit_children",
            resource_type="project",
            resource_id=project.parent_project_id,
        ):
            return

        raise PermissionDenied("Only project admins can manage project members.")

    def _check_can_view_members(self, project: Project) -> None:
        user = self.request.user

        if user.is_superuser or user.is_staff:
            return

        # Organisation admins can view rosters for projects in their organisation.
        # This is required for demo/ops workflows (e.g. lineup selection) even when
        # the admin is not explicitly added as a project member.
        try:
            from organisations.models import Membership as OrganisationMembership

            if OrganisationMembership.objects.filter(
                organisation=project.organisation,
                user=user,
                role="admin",
                is_active=True,
            ).exists():
                return
        except Exception:
            # If organisations app isn't available for some reason, fall back to stricter checks.
            pass

        is_project_member = ProjectMembership.objects.filter(
            project=project,
            user=user,
            deleted_at__isnull=True,
        ).exists()

        # Any active project member can view the member list.
        if is_project_member:
            return

        from permissions.evaluator import check_permission

        # Admins who can edit team profiles can also view the roster
        if check_permission(
            user.id,
            "profile.edit_team",
            resource_type="project",
            resource_id=project.id,
        ):
            return

        # Club Admin viewing child team roster
        if project.parent_project_id and check_permission(
            user.id,
            "project.edit_children",
            resource_type="project",
            resource_id=project.parent_project_id,
        ):
            return

        raise PermissionDenied("You do not have access to this project's members.")

    def get_throttles(self):
        """Apply different rate limits for read vs write operations."""
        if self.action in ["list", "retrieve"]:
            return [ProjectMembershipReadThrottle()]
        elif self.action in ["create", "update", "partial_update", "destroy"]:
            return [ProjectMembershipWriteThrottle()]
        return []

    def check_project_admin_permission(self, project):
        """Check if user is a project admin (required for write operations)."""
        user = self.request.user

        # Superusers always have access
        if user.is_superuser or user.is_staff:
            return True

        # Check if user is a project admin
        is_admin = ProjectMembership.objects.filter(
            project=project, user=user, role=ProjectMembership.Role.ADMIN, deleted_at__isnull=True
        ).exists()

        if not is_admin:
            raise PermissionDenied(
                "Only project admins can manage memberships. "
                "Your current role does not have sufficient permissions."
            )

        return True

    def get_queryset(self):
        """Return memberships for the specific project."""
        # We expect project_pk to be passed from the nested router or URL kwarg
        project_pk = self.kwargs.get("project_pk")
        if not project_pk:
            return ProjectMembership.objects.none()

        try:
            project = Project.objects.get(pk=project_pk)
        except Project.DoesNotExist:
            return ProjectMembership.objects.none()

        # Enforce read access (avoid leaking rosters by UUID guessing)
        self._check_can_view_members(project)

        qs = ProjectMembership.objects.filter(
            project_id=project_pk,
            deleted_at__isnull=True,
        ).select_related("user")

        # Optional season filter for squads
        period_param = (
            self.request.query_params.get("period")
            or self.request.query_params.get("period_id")
            or ""
        ).strip()
        if period_param:
            qs = qs.filter(period_id=period_param)

        return qs

    def perform_create(self, serializer):
        """Use service to add member."""
        project_pk = self.kwargs.get("project_pk")
        project = Project.objects.get(pk=project_pk)

        self._check_can_manage_members(project)

        # Extract validated data
        user_id = serializer.validated_data["user_id"]
        role = serializer.validated_data["role"]
        period_id = serializer.validated_data.get("period_id")
        metadata = serializer.validated_data.get("metadata")

        # Get the user instance
        from django.contrib.auth import get_user_model

        user_model = get_user_model()
        user = user_model.objects.get(pk=user_id)

        service = MembershipService()
        try:
            membership = service.add_member(
                project=project,
                user=user,
                role=role,
                period_id=str(period_id) if period_id else None,
                metadata=metadata or {},
                actor=self.request.user,
            )
            # Set the instance on the serializer so response data is correct
            serializer.instance = membership
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

    def update(self, request, *args, **kwargs):
        """Update membership role with promotion logic."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        self._check_can_manage_members(instance.project)

        new_role = serializer.validated_data.get("role")

        if new_role and new_role != instance.role:
            role_hierarchy = {
                ProjectMembership.Role.VIEWER: 10,
                ProjectMembership.Role.EDITOR: 20,
                ProjectMembership.Role.ADMIN: 30,
            }

            current_level = role_hierarchy.get(instance.role, 0)
            new_level = role_hierarchy.get(new_role, 0)

            if new_level > current_level:
                # Promotion - use PromotionService
                service = PromotionService()
                promotion = service.request_promotion(
                    membership=instance,
                    to_role=new_role,
                    requested_by=request.user,
                )

                if promotion:
                    # Pending approval
                    return Response(
                        {
                            "detail": "Promotion requested. Waiting for user acceptance.",
                            "promotion_id": str(promotion.id),
                        },
                        status=status.HTTP_202_ACCEPTED,
                    )
                else:
                    # Immediate promotion applied
                    instance.refresh_from_db()
            else:
                # Demotion or same role - use MembershipService
                service = MembershipService()
                service.update_role(
                    membership=instance,
                    new_role=new_role,
                    actor=request.user,
                )
                instance.refresh_from_db()

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

    def perform_destroy(self, instance):
        """Use service to remove member."""
        from django.core.exceptions import ValidationError as DjangoValidationError

        self._check_can_manage_members(instance.project)

        service = MembershipService()
        try:
            service.remove_member(
                membership=instance,
                actor=self.request.user,
            )
        except DjangoValidationError as e:
            raise ValidationError(
                {"detail": e.messages[0] if hasattr(e, "messages") else str(e)}
            ) from e

    @action(detail=False, methods=["get"], url_path="searchable-users")
    def searchable_users(self, request, project_pk=None):
        """Return organization members not already in the project.

        This endpoint helps populate "Add Member" dropdowns by listing
        users who can be added to the project.

        Query Parameters:
        - search: Filter by name or email (optional)
        - scope_project_id: Optional project id to scope users to a specific club/team subtree
        - page_size: Max number of results to return (default 50, max 1000)

        Returns:
        - List of users with id, email, first_name, last_name, full_name
        """
        try:
            project = Project.objects.select_related("organisation").get(pk=project_pk)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        # This reveals user identities; require manage permission.
        self._check_can_manage_members(project)

        # Get org members not already in project
        period_param = (
            request.query_params.get("period") or request.query_params.get("period_id") or ""
        ).strip()
        existing_qs = ProjectMembership.objects.filter(project=project, deleted_at__isnull=True)
        if period_param:
            existing_qs = existing_qs.filter(period_id=period_param)

        existing_member_ids = existing_qs.values_list("user_id", flat=True)

        # Get org members excluding project members
        from django.contrib.auth import get_user_model

        user_model = get_user_model()

        available_users = (
            user_model.objects.filter(
                Q(
                    organisation_memberships__organisation=project.organisation,
                    organisation_memberships__is_active=True,
                )
                | Q(
                    project_memberships__project__organisation=project.organisation,
                    project_memberships__deleted_at__isnull=True,
                )
            )
            .exclude(id__in=existing_member_ids)
            .distinct()
        )

        # Optional scoping: limit to users that belong to a specific club/team subtree.
        # This matches the demo UX expectation where selecting Federation/Club/Team
        # should not show users from other clubs within the same federation.
        scope_project_param = (
            request.query_params.get("scope_project_id")
            or request.query_params.get("scope_project")
            or ""
        ).strip()
        if scope_project_param:
            try:
                scope_project = Project.objects.select_related("organisation").get(
                    pk=scope_project_param
                )
            except Project.DoesNotExist:
                raise ValidationError({"scope_project_id": "Project does not exist."})

            if scope_project.organisation_id != project.organisation_id:
                raise ValidationError(
                    {"scope_project_id": "Project is not in the same organisation."}
                )

            # Include the scope project plus its direct children (club -> teams).
            scoped_project_ids = [scope_project.id]
            scoped_project_ids.extend(
                Project.objects.filter(parent_project_id=scope_project.id).values_list(
                    "id", flat=True
                )
            )

            available_users = available_users.filter(
                project_memberships__project_id__in=scoped_project_ids,
                project_memberships__deleted_at__isnull=True,
            ).distinct()

        # Apply search filter if provided
        search_query = request.query_params.get("search", "")
        if search_query:
            available_users = available_users.filter(
                Q(email__icontains=search_query)
                | Q(first_name__icontains=search_query)
                | Q(last_name__icontains=search_query)
            )

        # Serialize results
        try:
            limit = int(request.query_params.get("page_size") or 50)
        except (TypeError, ValueError):
            limit = 50
        limit = max(1, min(limit, 1000))

        users_data = [
            {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "full_name": f"{user.first_name} {user.last_name}".strip() or user.email,
            }
            for user in available_users[:limit]
        ]

        return Response({"data": users_data})


class ProjectInviteThrottle(UserRateThrottle):
    """Rate limiting for project invitations: 20/hour"""

    rate = "20/hour"


class InvitationAcceptThrottle(AnonRateThrottle):
    """Rate limiting for invitation acceptance: 60/hour"""

    rate = "60/hour"


class ProjectInviteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing project invitations.

    Routes:
    - GET /api/projects/{project_pk}/invitations/ - List invitations
    - POST /api/projects/{project_pk}/invitations/ - Create invitation
    - DELETE /api/projects/{project_pk}/invitations/{pk}/ - Cancel invitation
    - POST /api/projects/{project_pk}/invitations/{pk}/resend/ - Resend invitation
    - GET /api/invitations/{token}/ - Get invitation details (public)
    - POST /api/invitations/{token}/accept/ - Accept invitation (public)

    Rate Limiting:
    - Create invitation: 20 requests/hour per user
    - Accept invitation: 60 requests/hour (anonymous)

    Permissions:
    - List/Create/Cancel/Resend: Project admin only
    - Get by token/Accept: Public (no authentication required)
    """

    serializer_class = ProjectInviteSerializer
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        """Apply rate limiting for invitation creation."""
        if self.action == "create":
            return [ProjectInviteThrottle()]
        elif self.action in ["get_by_token", "accept"]:
            return [InvitationAcceptThrottle()]
        return []

    def get_queryset(self):
        """Return invitations for the specific project."""
        project_pk = self.kwargs.get("project_pk")
        if not project_pk:
            return ProjectInvite.objects.none()

        return ProjectInvite.objects.filter(project_id=project_pk).select_related(
            "project", "invited_by"
        )

    def get_permissions(self):
        """Public access for token-based operations."""
        if self.action in ["get_by_token", "accept"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def check_project_admin_permission(self, project):
        """Check if user is a project admin."""
        user = self.request.user

        if user.is_superuser or user.is_staff:
            return True

        # TeamReel: Use RBAC permission checks (Option A)
        from permissions.evaluator import check_permission

        # Legacy: explicit project admin membership
        if ProjectMembership.objects.filter(
            project=project,
            user=user,
            role=ProjectMembership.Role.ADMIN,
            deleted_at__isnull=True,
        ).exists():
            return True

        if check_permission(
            user.id,
            "profile.edit_team",
            resource_type="project",
            resource_id=project.id,
        ):
            return True

        if project.parent_project_id and check_permission(
            user.id,
            "project.edit_children",
            resource_type="project",
            resource_id=project.parent_project_id,
        ):
            return True

        raise PermissionDenied("Only project admins can manage invitations for this project.")

    def list(self, request, project_pk=None):
        """List pending invitations for a project."""
        project = Project.objects.get(pk=project_pk)
        self.check_project_admin_permission(project)

        queryset = self.get_queryset().filter(status=ProjectInvite.Status.PENDING)
        serializer = self.get_serializer(queryset, many=True)
        return Response({"data": serializer.data})

    def create(self, request, project_pk=None):
        """Create and send a project invitation."""
        project = Project.objects.get(pk=project_pk)
        self.check_project_admin_permission(project)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = InvitationService()
        try:
            invitation = service.create_invitation(
                project=project,
                email=serializer.validated_data["email"],
                role=serializer.validated_data["role"],
                invited_by=request.user,
            )
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        response_serializer = self.get_serializer(invitation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None, project_pk=None):
        """Cancel a pending invitation."""
        invitation = self.get_object()
        self.check_project_admin_permission(invitation.project)

        service = InvitationService()
        try:
            service.cancel_invitation(invitation, request.user)
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None, project_pk=None):
        """Resend an invitation email."""
        invitation = self.get_object()
        self.check_project_admin_permission(invitation.project)

        service = InvitationService()
        try:
            invitation = service.resend_invitation(invitation, request.user)
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        serializer = self.get_serializer(invitation)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path=r"token/(?P<token>[^/.]+)")
    def get_by_token(self, request, token=None, project_pk=None):
        """Get invitation details by token (public endpoint)."""
        try:
            invitation = ProjectInvite.objects.select_related("project").get(token=token)
        except ProjectInvite.DoesNotExist:
            return Response(
                {"detail": "Invalid invitation token."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(invitation)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path=r"token/(?P<token>[^/.]+)/accept")
    def accept(self, request, token=None, project_pk=None):
        """Accept an invitation (public endpoint)."""
        serializer = AcceptInvitationSerializer(data={"token": token})
        serializer.is_valid(raise_exception=True)

        service = InvitationService()
        accepting_user = request.user if request.user.is_authenticated else None

        try:
            membership = service.accept_invitation(token, accepting_user)
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        # Return membership details
        membership_serializer = ProjectMembershipSerializer(membership)
        return Response(membership_serializer.data, status=status.HTTP_200_OK)


class ProjectMembershipPromotionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing project membership promotions.

    Provides list and retrieve for promotions.
    Actions for accept, decline, cancel.
    """

    serializer_class = ProjectMembershipPromotionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return promotions based on user context.
        - Project Admins: See all promotions for the project.
        - Users: See promotions where they are the target.
        """
        user = self.request.user
        project_pk = self.kwargs.get("project_pk")

        if project_pk:
            # Nested under project
            queryset = ProjectMembershipPromotion.objects.filter(project_id=project_pk)

            # Check if user is project admin
            # TeamReel: allow if they can manage team profiles/members
            from permissions.evaluator import check_permission

            is_admin = check_permission(
                user.id,
                "profile.edit_team",
                resource_type="project",
                resource_id=project_pk,
            )

            if is_admin:
                return queryset
            else:
                # Only show promotions for this user (target or requester)
                return queryset.filter(Q(target_user=user) | Q(requested_by=user))
        else:
            # Not nested (e.g. /promotions/)
            # Show promotions where user is target or requester
            return ProjectMembershipPromotion.objects.filter(
                Q(target_user=user) | Q(requested_by=user)
            )

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None, project_pk=None):
        """Accept a promotion."""
        promotion = self.get_object()

        if promotion.target_user != request.user:
            return Response(
                {"detail": "You can only accept your own promotions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = PromotionService()
        try:
            service.accept_promotion(promotion, request.user)
            return Response({"detail": "Promotion accepted."}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None, project_pk=None):
        """Decline a promotion."""
        promotion = self.get_object()

        if promotion.target_user != request.user:
            return Response(
                {"detail": "You can only decline your own promotions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = PromotionService()
        try:
            service.decline_promotion(promotion, request.user)
            return Response({"detail": "Promotion declined."}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"])
    def cancel(self, request, pk=None, project_pk=None):
        """Cancel a promotion (requester or admin)."""
        promotion = self.get_object()

        # Check permission: requester or admin
        is_requester = promotion.requested_by == request.user
        from permissions.evaluator import check_permission

        is_admin = check_permission(
            request.user.id,
            "profile.edit_team",
            resource_type="project",
            resource_id=promotion.project_id,
        )

        if not (is_requester or is_admin):
            return Response(
                {"detail": "You do not have permission to cancel this promotion."},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = PromotionService()
        try:
            service.cancel_promotion(promotion, request.user)
            return Response({"detail": "Promotion cancelled."}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
