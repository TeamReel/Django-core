"""
API views for organisations app.

Provides:
- OrganisationViewSet: CRUD operations for organisations
"""

from audit.api import audit_log
from django.db import transaction
from django.db.models import Count, IntegerField, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from organisations.metrics import rate_limit_hits
from organisations.models import Membership, Organisation
from organisations.ratelimit import check_rate_limit
from rest_framework import permissions, status, viewsets
from rest_framework.exceptions import Throttled
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .serializers import (
    OrganisationCreateSerializer,
    OrganisationListSerializer,
    OrganisationPublicListSerializer,
    OrganisationSerializer,
)


class OrganisationPagination(PageNumberPagination):
    """Pagination configuration for organisation list."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _annotate_org_list_counts(queryset):
    """Annotate queryset with count subqueries for OrganisationListSerializer.

    Replaces N+1 SerializerMethodField queries with correlated subqueries
    executed in a single SQL statement.
    """
    from activities.models import Activity, Period
    from projects.models import ProjectMembership

    total_players_count_sq = Subquery(
        ProjectMembership.objects.filter(project__organisation_id=OuterRef("pk"))
        .order_by()
        .values(x=Value(1))
        .annotate(cnt=Count("user_id", distinct=True))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    seasons_count_sq = Subquery(
        Period.objects.filter(
            project__organisation_id=OuterRef("pk"),
            parent_period__isnull=True,
        )
        .order_by()
        .values(x=Value(1))
        .annotate(cnt=Count("id"))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    competitions_count_sq = Subquery(
        Period.objects.filter(
            project__organisation_id=OuterRef("pk"),
            parent_period__isnull=False,
        )
        .order_by()
        .values(x=Value(1))
        .annotate(cnt=Count("id"))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    matches_count_sq = Subquery(
        Activity.objects.filter(
            project__organisation_id=OuterRef("pk"),
            activity_type="match",
        )
        .order_by()
        .values(x=Value(1))
        .annotate(cnt=Count("id"))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    sport_variants_count_sq = Subquery(
        Period.objects.filter(
            organisation_id=OuterRef("pk"),
            sport__isnull=False,
            sport__parent_sport__isnull=False,
        )
        .order_by()
        .values(x=Value(1))
        .annotate(cnt=Count("sport_id", distinct=True))
        .values("cnt")[:1],
        output_field=IntegerField(),
    )

    return queryset.annotate(
        total_players_count=Coalesce(total_players_count_sq, Value(0)),
        seasons_count=Coalesce(seasons_count_sq, Value(0)),
        competitions_count=Coalesce(competitions_count_sq, Value(0)),
        matches_count=Coalesce(matches_count_sq, Value(0)),
        sport_variants_count=Coalesce(sport_variants_count_sq, Value(0)),
    )


class OrganisationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Organisation model.

    Endpoints:
    - POST /api/organisations/ - Create organisation (creator becomes first admin)
    - GET /api/organisations/ - List organisations (user is member of)
    - GET /api/organisations/{slug}/ - Retrieve organisation details
    - PUT/PATCH /api/organisations/{slug}/ - Update organisation (admin only)
    - DELETE /api/organisations/{slug}/ - Soft-delete organisation (admin only)
    """

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OrganisationPagination
    lookup_field = "slug"

    def _has_cross_org_view_permission(self) -> bool:
        """Return True if user has org.view_all via any role assignment.

        Note: This does not imply membership; it is intended for read-only
        cross-organisation visibility scenarios.
        """

        user = getattr(self.request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True

        try:
            from django.db.utils import OperationalError, ProgrammingError
            from permissions.models import RoleAssignment

            return RoleAssignment.objects.filter(
                user=user,
                role__permissions__permission="org.view_all",
            ).exists()
        except (ImportError, OperationalError, ProgrammingError):
            # Fail closed if permissions app/db is unavailable/misconfigured.
            return False

    def get_queryset(self):
        """
        Filter organisations to only those the user is a member of.
        Superusers can see all organisations.
        Excludes soft-deleted organisations (name contains '_del_').

        Optimizations:
        - select_related('creator'): Avoid N+1 for creator field
        - prefetch_related('memberships'): Optimize member count queries
        - distinct(): Ensure no duplicates from join

        Query Parameters:
        - include_inactive: If 'false', filter out inactive organisations (default: true)
        """
        # Superusers see all organisations
        if self.request.user.is_superuser:
            queryset = (
                Organisation.objects.all()
                .exclude(name__contains="_del_")  # Exclude soft-deleted
                .select_related("creator", "sport")
                .prefetch_related("memberships", "projects")
            )
        elif self._has_cross_org_view_permission():
            # Users with org.view_all can discover organisations cross-tenant.
            # Keep the queryset broad; serializers will enforce payload safety.
            queryset = (
                Organisation.objects.all()
                .exclude(name__contains="_del_")
                .select_related("creator", "sport")
                .prefetch_related("memberships", "projects")
            )
        else:
            queryset = (
                Organisation.objects.filter(
                    memberships__user=self.request.user, memberships__is_active=True
                )
                .exclude(name__contains="_del_")  # Exclude soft-deleted
                .select_related("creator", "sport")
                .prefetch_related("memberships", "projects")
                .distinct()
            )

        # Filter inactive organisations based on query parameter
        include_inactive = self.request.query_params.get("include_inactive", "true").lower()
        if include_inactive == "false":
            queryset = queryset.filter(is_active=True)

        # Annotate with count subqueries for list serializer (avoids N+1)
        if self.action == "list":
            queryset = _annotate_org_list_counts(queryset)

        return queryset

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            return OrganisationCreateSerializer
        if self.action == "list":
            if self._has_cross_org_view_permission() and not self.request.user.is_superuser:
                return OrganisationPublicListSerializer
            return OrganisationListSerializer
        if self.action in ["update", "partial_update"]:
            return OrganisationCreateSerializer
        return OrganisationSerializer

    def get_permissions(self):
        """Require admin permission for update and delete actions."""
        if self.action in ["update", "partial_update", "destroy"]:
            from organisations.permissions import IsOrganisationAdmin

            return [permissions.IsAuthenticated(), IsOrganisationAdmin()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """
        Create organisation with rate limiting (5 per user per day).

        Rate limit: 5 organisations per user per 24 hours.
        Returns 429 Too Many Requests if limit exceeded.
        """
        # Check rate limit
        key = f"ratelimit:org_create:{request.user.id}:{timezone.now().date()}"
        allowed, remaining, reset = check_rate_limit(key, 5, 86400)  # 24 hours

        if not allowed:
            # Track rate limit hit in metrics
            rate_limit_hits.labels(endpoint="organisation_create").inc()
            raise Throttled(wait=reset - timezone.now().timestamp())

        # Proceed with creation
        response = super().create(request, *args, **kwargs)

        # Add rate limit headers
        response["X-RateLimit-Limit"] = "5"
        response["X-RateLimit-Remaining"] = str(remaining)
        response["X-RateLimit-Reset"] = str(int(reset))

        return response

    def perform_create(self, serializer):
        """
        Create organisation and automatically assign creator as first admin.

        Uses atomic transaction to ensure both organisation and membership
        are created together, or neither is created if there's an error.
        """
        with transaction.atomic():
            # Save organisation with creator
            org = serializer.save(creator=self.request.user)

            # Create admin membership for creator
            Membership.objects.create(user=self.request.user, organisation=org, role="admin")


class MembershipViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Membership model (nested under organisations).

    Endpoints:
    - POST /api/organisations/{slug}/members/ - Invite member (admin only)
    - GET /api/organisations/{slug}/members/ - List members (any member)
    - GET /api/organisations/{slug}/members/{id}/ - Retrieve member details
    - PATCH /api/organisations/{slug}/members/{id}/ - Update member role (admin only)
    - DELETE /api/organisations/{slug}/members/{id}/ - Remove member (admin only)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter memberships by organisation_pk slug from URL."""
        org_slug = self.kwargs.get("organisation_pk")
        # Resolve slug to organisation ID
        from organisations.models import Organisation

        try:
            org = Organisation.objects.get(slug=org_slug)
            return Membership.objects.filter(organisation_id=org.id, is_active=True).select_related(
                "user", "organisation", "invited_by"
            )
        except Organisation.DoesNotExist:
            return Membership.objects.none()

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == "create":
            from .serializers import MembershipCreateSerializer

            return MembershipCreateSerializer
        if self.action == "list":
            from .serializers import MembershipListSerializer

            return MembershipListSerializer
        if self.action in ["update", "partial_update"]:
            from .serializers import MembershipUpdateSerializer

            return MembershipUpdateSerializer
        from .serializers import MembershipSerializer

        return MembershipSerializer

    def get_permissions(self):
        """Require admin permission for create/update/delete actions."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            from organisations.permissions import IsOrganisationAdmin

            return [permissions.IsAuthenticated(), IsOrganisationAdmin()]
        return super().get_permissions()

    def list(self, request, *args, **kwargs):
        """
        List members of the organisation.
        Includes:
        1. Direct Memberships

        Optional query params:
        - include_role_assignments=true: include RoleAssignments as virtual entries
        - include_project_memberships=true: include ProjectMembership users as virtual entries
        - include_project_membership_details=true: attach each user's
          ProjectMemberships in this organisation
        - project_id=<id>: filter to only users with a ProjectMembership at this project
          or any of its child projects (server-side club/team scoping)
        """
        org_slug = self.kwargs.get("organisation_pk")
        try:
            org = Organisation.objects.get(slug=org_slug)
        except Organisation.DoesNotExist:
            return Response({"detail": "Organisation not found."}, status=status.HTTP_404_NOT_FOUND)

        # Access check (TeamReel): allow listing if user is in org via:
        # - direct org membership
        # - role assignment (org or project in org)
        # - project membership (data layer)
        user = request.user
        from django.db import models
        from permissions.models import RoleAssignment
        from projects.models import Project, ProjectMembership

        has_direct_org_membership = Membership.objects.filter(
            organisation=org, user=user, is_active=True
        ).exists()

        has_role_assignment = (
            RoleAssignment.objects.filter(
                user=user,
            )
            .filter(models.Q(target_organization=org) | models.Q(target_project__organisation=org))
            .exists()
        )

        has_project_membership = ProjectMembership.objects.filter(
            user=user,
            project__organisation=org,
            deleted_at__isnull=True,
        ).exists()

        if not (
            user.is_superuser
            or has_direct_org_membership
            or has_role_assignment
            or has_project_membership
        ):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        import logging

        logger = logging.getLogger(__name__)

        try:
            response = super().list(request, *args, **kwargs)
        except Exception:
            # Never hard-fail the directory/club pages due to membership list issues.
            # Return an empty list; callers typically treat this as "no users".
            logger.exception("MembershipViewSet.list failed")
            return Response({"results": []}, status=status.HTTP_200_OK)

        include_role_assignments = (
            request.query_params.get("include_role_assignments", "false").lower() == "true"
        )
        include_project_memberships = (
            request.query_params.get("include_project_memberships", "false").lower() == "true"
        )
        include_project_membership_details = (
            request.query_params.get("include_project_membership_details", "false").lower()
            == "true"
        )

        # ── project_id scoping ──────────────────────────────────────────
        # When project_id is given, restrict the result set to users who
        # have a ProjectMembership at that project *or* any of its child
        # projects.  This avoids returning the entire org member list when
        # the frontend only needs a single club/team scope.
        scope_project_ids: set[int] | None = None
        raw_project_id = request.query_params.get("project_id", "").strip()
        if raw_project_id:
            try:
                scope_project = Project.objects.get(pk=int(raw_project_id), organisation=org)
                child_ids = list(
                    Project.objects.filter(parent_project=scope_project).values_list(
                        "id", flat=True
                    )
                )
                scope_project_ids = {scope_project.id, *child_ids}
            except (Project.DoesNotExist, ValueError, TypeError):
                scope_project_ids = None  # invalid id → ignore filter

        # Helper: set of user-ids that have a membership in the scoped projects
        _scoped_user_ids: set[str] | None = None
        if scope_project_ids is not None:
            _scoped_user_ids = set(
                ProjectMembership.objects.filter(
                    project_id__in=scope_project_ids,
                    deleted_at__isnull=True,
                )
                .values_list("user_id", flat=True)
                .distinct()
            )
            _scoped_user_ids = {str(uid) for uid in _scoped_user_ids}

        if (
            not (
                include_role_assignments
                or include_project_memberships
                or include_project_membership_details
            )
            and _scoped_user_ids is None
        ):
            return response

        try:
            # If pagination is used, response.data is {'results': [...], ...}
            # or {'data': [...], ...}
            # If not, it's [...]
            results = response.data
            if isinstance(response.data, dict):
                results = response.data.get("results", response.data.get("data", response.data))

            # Ensure results is a list
            if not isinstance(results, (list, tuple)):
                results = []

            # Get existing user IDs (ensure strings for comparison)
            existing_user_ids = {str(m["user"]["id"]) for m in results}

            # ── Apply project_id scope: drop base members not in scope ───
            if _scoped_user_ids is not None:
                results = [
                    m for m in results if str(m.get("user", {}).get("id", "")) in _scoped_user_ids
                ]
                existing_user_ids = {str(m["user"]["id"]) for m in results}

            additional_members = []

            if include_role_assignments:
                # RoleAssignments in this org OR projects in this org
                ra_q = models.Q(target_organization=org) | models.Q(
                    target_project__organisation=org
                )
                # Scope to project + children when project_id is given
                if scope_project_ids is not None:
                    ra_q = models.Q(target_project_id__in=scope_project_ids)
                assignments = RoleAssignment.objects.filter(ra_q).select_related(
                    "user", "role", "target_project"
                )

                for ra in assignments:
                    if str(ra.user.id) not in existing_user_ids:
                        role_name = ra.role.name
                        if ra.target_project:
                            role_name = f"{role_name} ({ra.target_project.name})"

                        additional_members.append(
                            {
                                "id": str(ra.id),
                                "user": {
                                    "id": str(ra.user.id),
                                    "email": ra.user.email,
                                    "first_name": ra.user.first_name,
                                    "last_name": ra.user.last_name,
                                },
                                "organisation": {
                                    "id": str(org.id),
                                    "name": org.name,
                                    "slug": org.slug,
                                },
                                "role": role_name,
                                "joined_at": ra.assigned_at,
                                "invited_by": None,
                                "is_active": True,
                                "source": "assignment",
                            }
                        )
                        existing_user_ids.add(str(ra.user.id))

            if include_project_memberships:
                pm_filter = dict(
                    project__organisation=org,
                    deleted_at__isnull=True,
                )
                # Scope to project + children when project_id is given
                if scope_project_ids is not None:
                    pm_filter["project_id__in"] = scope_project_ids

                project_users = (
                    ProjectMembership.objects.filter(**pm_filter)
                    .select_related("user")
                    .values(
                        "user_id",
                        "user__email",
                        "user__first_name",
                        "user__last_name",
                    )
                    .distinct()
                )

                for pu in project_users:
                    user_id = str(pu["user_id"])
                    if user_id in existing_user_ids:
                        continue
                    additional_members.append(
                        {
                            "id": f"pm:{user_id}",
                            "user": {
                                "id": user_id,
                                "email": pu["user__email"],
                                "first_name": pu["user__first_name"],
                                "last_name": pu["user__last_name"],
                            },
                            "organisation": {
                                "id": str(org.id),
                                "name": org.name,
                                "slug": org.slug,
                            },
                            "role": "project_member",
                            "joined_at": None,
                            "invited_by": None,
                            "is_active": True,
                            "source": "project_membership",
                        }
                    )
                    existing_user_ids.add(user_id)

            # Append to results
            if additional_members:
                results.extend(additional_members)

            # Optionally enrich each member entry with project membership details.
            if include_project_membership_details:
                user_ids_raw = []
                for m in results:
                    try:
                        user_ids_raw.append(str(m.get("user", {}).get("id")))
                    except Exception:
                        continue

                # Accounts.User uses integer PK; virtual entries also use numeric IDs as strings.
                user_ids_int = []
                for uid in user_ids_raw:
                    if uid and uid.isdigit():
                        user_ids_int.append(int(uid))

                memberships_by_user = {}
                if user_ids_int:
                    project_memberships = (
                        ProjectMembership.objects.filter(
                            project__organisation=org,
                            deleted_at__isnull=True,
                            user_id__in=user_ids_int,
                        )
                        .select_related("project", "project__parent_project")
                        .only(
                            "id",
                            "role",
                            "period_id",
                            "user_id",
                            "project__id",
                            "project__slug",
                            "project__name",
                            "project__parent_project__id",
                            "project__parent_project__slug",
                            "project__parent_project__name",
                        )
                    )

                    for pm in project_memberships:
                        uid = str(pm.user_id)
                        memberships_by_user.setdefault(uid, []).append(
                            {
                                "id": str(pm.id),
                                "role": pm.role,
                                "period_id": str(pm.period_id) if pm.period_id else None,
                                "project_id": pm.project_id,
                                "project": {
                                    "id": pm.project_id,
                                    "slug": pm.project.slug,
                                    "name": pm.project.name,
                                    "parent_id": pm.project.parent_project_id,
                                    "parent_slug": pm.project.parent_project.slug
                                    if pm.project.parent_project
                                    else None,
                                    "parent_name": pm.project.parent_project.name
                                    if pm.project.parent_project
                                    else None,
                                },
                            }
                        )

                for m in results:
                    try:
                        uid = str(m.get("user", {}).get("id"))
                        m["project_memberships"] = memberships_by_user.get(uid, [])
                    except Exception:
                        continue

            # Update response
            if isinstance(response.data, dict):
                if "data" in response.data:
                    response.data["data"] = results
                else:
                    response.data["results"] = results

                # Update count if possible
                if "count" in response.data:
                    response.data["count"] = len(results)
                elif "meta" in response.data and "pagination" in response.data["meta"]:
                    response.data["meta"]["pagination"]["count"] = len(results)
            else:
                response.data = results

        except Exception as e:
            # Log error but return original response (direct members only)
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Error extending membership list with virtual members: {e}")
            return response

        return response

    def create(self, request, *args, **kwargs):
        """
        Invite member with rate limiting (20 per org per hour).

        Rate limit: 20 invitations per organisation per hour.
        Returns 429 Too Many Requests if limit exceeded.
        """
        org_slug = self.kwargs.get("organisation_pk")

        # Resolve slug to organisation ID for rate limiting
        from organisations.models import Organisation

        try:
            org = Organisation.objects.get(slug=org_slug)
            org_id = org.id
        except Organisation.DoesNotExist:
            return Response(
                {"detail": "Organisation not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check rate limit
        key = f"ratelimit:member_invite:{org_id}:{timezone.now().strftime('%Y-%m-%d-%H')}"
        allowed, remaining, reset = check_rate_limit(key, 200, 3600)  # 1 hour

        if not allowed:
            # Track rate limit hit in metrics
            rate_limit_hits.labels(endpoint="member_invite").inc()
            raise Throttled(wait=reset - timezone.now().timestamp())

        # Proceed with creation
        response = super().create(request, *args, **kwargs)

        # Add rate limit headers
        response["X-RateLimit-Limit"] = "200"
        response["X-RateLimit-Remaining"] = str(remaining)
        response["X-RateLimit-Reset"] = str(int(reset))

        return response

    def perform_create(self, serializer):
        """Set invited_by to current user when creating membership."""
        serializer.save(invited_by=self.request.user)

    def update(self, request, *args, **kwargs):
        """
        Update membership role with last-admin protection.

        Prevents:
        - Downgrading last admin to member (returns 409 Conflict)
        - Removing admin role when it would leave org without admins
        """
        from rest_framework.exceptions import ValidationError

        membership = self.get_object()
        old_role = membership.role
        new_role = request.data.get("role")

        # Check if this would remove the last admin
        if membership.role == "admin" and new_role == "member":
            admin_count = membership.organisation.get_admin_count()
            if admin_count <= 1:
                raise ValidationError(
                    {
                        "role": (
                            "Cannot demote the last admin. "
                            "Promote another member to admin first."
                        )
                    },
                    code="last_admin_protection",
                )

        response = super().update(request, *args, **kwargs)

        # Trigger notification on successful role change
        if response.status_code == status.HTTP_200_OK and old_role != new_role:
            try:
                from notifications.services import notify_member_role_changed

                membership.refresh_from_db()  # Get updated role
                notify_member_role_changed(
                    membership=membership,
                    changed_by=request.user,
                    old_role=old_role,
                    new_role=new_role,
                )
            except Exception as e:
                # Log but don't fail the role change
                import logging

                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send role change notification: {e}", exc_info=True)

        # Return full member data after update using read serializer
        if response.status_code == status.HTTP_200_OK:
            from rest_framework.response import Response

            from .serializers import MembershipSerializer

            membership.refresh_from_db()
            serializer = MembershipSerializer(membership, context={"request": request})
            return Response(serializer.data)

        return response

    def destroy(self, request, *args, **kwargs):
        """
        Remove membership with last-admin and self-removal protection.

        Prevents:
        - Removing last admin (returns 409 Conflict)
        - Last admin from removing themselves
        """
        from rest_framework.exceptions import ValidationError

        membership = self.get_object()

        # Check if removing an admin
        if membership.role == "admin":
            admin_count = membership.organisation.get_admin_count()
            if admin_count <= 1:
                # Prevent last admin removal
                raise ValidationError(
                    {
                        "detail": (
                            "Cannot remove the last admin. "
                            "Promote another member to admin first."
                        )
                    },
                    code="last_admin_protection",
                )

        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        """Soft delete membership."""
        instance.is_active = False
        instance.save()

        # Audit log
        audit_log.record(
            "organisation.membership.deleted",
            user=self.request.user,
            organization=instance.organisation,
            metadata={
                "user_id": str(instance.user.id),
                "role": instance.role,
            },
        )
