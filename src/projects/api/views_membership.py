"""DRF views for Project Membership and Functional Roles."""

import logging
import uuid

from django.db import IntegrityError
from django.db.models import OuterRef, Q, Subquery
from projects.models import (
    Project,
    ProjectFunctionalRoleAssignment,
    ProjectMembership,
)
from projects.services.membership_service import MembershipService
from projects.services.promotion_service import PromotionService
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .serializers import (
    ProjectFunctionalRoleAssignSerializer,
    ProjectMembershipSerializer,
)
from .views_project import _safe_check_permission

logger = logging.getLogger(__name__)


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

    def _get_project(self) -> Project:
        """Resolve project by numeric id or by slug.

        This ViewSet is mounted under /api/v1/projects/{project_pk}/..., where
        {project_pk} may be an integer id or a slug depending on caller.
        """
        project_pk = (self.kwargs.get("project_pk") or "").strip()
        if not project_pk:
            raise ValidationError({"detail": "Project not found."})

        try:
            if project_pk.isdigit():
                return Project.objects.get(pk=int(project_pk))
            return Project.objects.get(slug=project_pk)
        except Project.DoesNotExist as exc:
            raise ValidationError({"detail": "Project not found."}) from exc

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

        # Legacy: Club Admin managing a child team via admin membership on the parent club
        if (
            project.parent_project_id
            and ProjectMembership.objects.filter(
                project_id=project.parent_project_id,
                user=user,
                role=ProjectMembership.Role.ADMIN,
                deleted_at__isnull=True,
            ).exists()
        ):
            return

        # Direct team-member management capability on this project
        if _safe_check_permission(
            user_id=user.id,
            permission_code="profile.edit_team",
            resource_type="project",
            resource_id=project.id,
        ):
            return

        # Club Admin can manage child teams via project.edit_children on the parent (club)
        if project.parent_project_id and _safe_check_permission(
            user_id=user.id,
            permission_code="project.edit_children",
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

        # Legacy: Club Admin can view child team roster via admin membership on the parent club
        if (
            project.parent_project_id
            and ProjectMembership.objects.filter(
                project_id=project.parent_project_id,
                user=user,
                role=ProjectMembership.Role.ADMIN,
                deleted_at__isnull=True,
            ).exists()
        ):
            return

        # Admins who can edit team profiles can also view the roster
        if _safe_check_permission(
            user_id=user.id,
            permission_code="profile.edit_team",
            resource_type="project",
            resource_id=project.id,
        ):
            return

        # Club Admin viewing child team roster
        if project.parent_project_id and _safe_check_permission(
            user_id=user.id,
            permission_code="project.edit_children",
            resource_type="project",
            resource_id=project.parent_project_id,
        ):
            return

        raise PermissionDenied("You do not have access to this project's members.")

    def get_throttles(self):
        """Apply different rate limits for read vs write operations."""
        if self.action in ["list", "retrieve"]:
            return [ProjectMembershipReadThrottle()]
        elif self.action in [
            "create",
            "update",
            "partial_update",
            "destroy",
            "bulk",
            "bulk_delete",
        ]:
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
        try:
            project = self._get_project()
        except ValidationError:
            raise
        except Exception as exc:
            import logging

            logger = logging.getLogger(__name__)
            logger.exception("Failed to get project in ProjectMembershipViewSet")
            raise ValidationError({"detail": "Project not found."}) from exc

        # Enforce read access (avoid leaking rosters by UUID guessing)
        self._check_can_view_members(project)

        qs = ProjectMembership.objects.filter(
            project_id=project.id,
            deleted_at__isnull=True,
        ).select_related("user", "project", "project__organisation")

        # Optional season filter for squads
        period_param = (
            self.request.query_params.get("period")
            or self.request.query_params.get("period_id")
            or ""
        ).strip()
        if period_param:
            try:
                uuid.UUID(str(period_param))
            except (ValueError, TypeError) as exc:
                raise ValidationError({"period": "Invalid UUID."}) from exc

            qs = qs.filter(period_id=period_param)

        # Provide organisation membership id (used for lineup/participations).
        # This avoids a separate /organisations/{id}/members call which may be permission-restricted
        # and can lead to an empty lineup roster in the UI.
        from organisations.models import Membership as OrganisationMembership

        qs = qs.annotate(
            organisation_membership_id=Subquery(
                OrganisationMembership.objects.filter(
                    organisation_id=project.organisation_id,
                    user_id=OuterRef("user_id"),
                    is_active=True,
                ).values("id")[:1]
            )
        )

        return qs

    def list(self, request, *args, **kwargs):
        """List memberships with optimized N+1 prevention via context caching.

        Pre-loads teamreel_assets and functional roles for all memberships
        to avoid N+1 queries during serialization.
        """
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        memberships = page if page is not None else list(queryset)

        # Build caches for serializer context to avoid N+1 queries
        teamreel_cache: dict[tuple, dict] = {}
        functional_roles_cache: dict[tuple, set] = {}

        if memberships:
            project_id = memberships[0].project_id
            user_ids = {m.user_id for m in memberships}

            # Batch-load teamreel_assets from ALL memberships in this project for these users
            # (assets may be on a different season's membership)
            from projects.models import ProjectMembership

            all_memberships_with_assets = ProjectMembership.objects.filter(
                project_id=project_id,
                user_id__in=user_ids,
                deleted_at__isnull=True,
                metadata__has_key="teamreel_assets",
            ).only("user_id", "metadata")

            for m in all_memberships_with_assets:
                cache_key = (project_id, m.user_id)
                if cache_key not in teamreel_cache:
                    tr = (m.metadata or {}).get("teamreel_assets")
                    if tr:
                        teamreel_cache[cache_key] = tr

            # Batch-load functional roles
            try:
                from projects.models import ProjectFunctionalRoleAssignment

                role_qs = ProjectFunctionalRoleAssignment.objects.filter(
                    project_id=project_id,
                    user_id__in=user_ids,
                ).values("user_id", "role")

                for r in role_qs:
                    cache_key = (project_id, r["user_id"])
                    if cache_key not in functional_roles_cache:
                        functional_roles_cache[cache_key] = set()
                    functional_roles_cache[cache_key].add(r["role"])
            except Exception:
                pass  # Table may not exist yet

        # Serialize with context caches
        context = self.get_serializer_context()
        context["teamreel_assets_cache"] = teamreel_cache
        context["functional_roles_cache"] = functional_roles_cache

        serializer = self.get_serializer(memberships, many=True, context=context)

        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """Use service to add member."""
        project = self._get_project()

        self._check_can_manage_members(project)

        # Extract validated data
        user_id = serializer.validated_data["user_id"]
        role = serializer.validated_data["role"]
        period_id = serializer.validated_data.get("period_id")
        # metadata is a read-only SerializerMethodField, read from request.data
        metadata = self.request.data.get("metadata")

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
        except (ValueError, IntegrityError) as e:
            raise ValidationError({"detail": str(e)}) from e

    def update(self, request, *args, **kwargs):
        """Update membership role with promotion logic."""
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        self._check_can_manage_members(instance.project)

        old_role = instance.role  # capture before mutation
        new_role = serializer.validated_data.get("role")
        # metadata is a read-only SerializerMethodField, so it won't appear in
        # validated_data.  Read it directly from the request payload instead.
        new_metadata = request.data.get("metadata")

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
                    # Metadata updates should not be blocked by a pending promotion.
                    if new_metadata is not None:
                        instance.metadata = new_metadata or {}
                        instance.save(update_fields=["metadata"])
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

        if new_metadata is not None:
            instance.metadata = new_metadata or {}
            instance.save(update_fields=["metadata"])
            instance.refresh_from_db()

        if getattr(instance, "_prefetched_objects_cache", None):
            instance._prefetched_objects_cache = {}

        # Sync RBAC RoleAssignment when the membership role changed
        if new_role and new_role != old_role:
            try:
                from permissions.sync import sync_rbac_for_membership

                sync_rbac_for_membership(
                    user_id=instance.user_id,
                    project_id=instance.project_id,
                    membership_role=instance.role,
                    actor=request.user,
                )
            except Exception:
                import logging

                logging.getLogger(__name__).exception("RBAC sync failed (non-fatal)")

        # Re-serialize to reflect any changes applied above.
        return Response(self.get_serializer(instance).data)

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
            project = self._get_project()
            project = Project.objects.select_related("organisation").get(pk=project.id)
        except ValidationError:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        # This reveals user identities; require manage permission.
        self._check_can_manage_members(project)

        # Get org members not already in project
        period_param = (
            request.query_params.get("period") or request.query_params.get("period_id") or ""
        ).strip()
        if period_param:
            try:
                uuid.UUID(str(period_param))
            except (ValueError, TypeError) as exc:
                raise ValidationError({"period": "Invalid UUID."}) from exc
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
                raise ValidationError({"scope_project_id": "Project does not exist."}) from None

            if scope_project.organisation_id != project.organisation_id:
                raise ValidationError(
                    {"scope_project_id": "Project is not in the same organisation."}
                )

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

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request, project_pk=None):
        """Bulk add members to a project."""

        try:
            project = Project.objects.select_related("organisation").get(pk=project_pk)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        self._check_can_manage_members(project)

        payload = request.data
        items = None

        if isinstance(payload, list):
            items = payload
        elif isinstance(payload, dict) and isinstance(payload.get("members"), list):
            items = payload.get("members")
        elif isinstance(payload, dict) and isinstance(payload.get("user_ids"), list):
            base_role = payload.get("role")
            base_period_id = payload.get("period_id")
            base_metadata = payload.get("metadata")
            items = [
                {
                    "user_id": uid,
                    "role": base_role,
                    "period_id": base_period_id,
                    "metadata": base_metadata,
                }
                for uid in payload.get("user_ids")
            ]

        if not isinstance(items, list):
            raise ValidationError({"detail": "Expected 'members' list or 'user_ids' list."})

        max_batch = 200
        if len(items) > max_batch:
            raise ValidationError({"detail": f"Too many members in one request (max {max_batch})."})

        user_ids = []
        for item in items:
            try:
                user_ids.append(int(item.get("user_id")))
            except Exception:
                continue

        from django.contrib.auth import get_user_model

        user_model = get_user_model()
        users_by_id = user_model.objects.in_bulk(user_ids)

        service = MembershipService()
        created_count = 0
        skipped_count = 0
        errors = []

        for raw_item in items:
            serializer = self.get_serializer(data=raw_item)
            try:
                serializer.is_valid(raise_exception=True)
            except ValidationError as e:
                errors.append({"user_id": raw_item.get("user_id"), "detail": e.detail})
                continue

            uid = serializer.validated_data["user_id"]
            role = serializer.validated_data["role"]
            period_id = serializer.validated_data.get("period_id")
            metadata = serializer.validated_data.get("metadata")

            user = users_by_id.get(uid)
            if not user:
                errors.append({"user_id": uid, "detail": "User not found."})
                continue

            try:
                service.add_member(
                    project=project,
                    user=user,
                    role=role,
                    period_id=str(period_id) if period_id else None,
                    metadata=metadata or {},
                    actor=request.user,
                )
                created_count += 1
            except Exception as e:
                msg = str(e)
                if (
                    "already" in msg.lower()
                    or "exists" in msg.lower()
                    or "duplicate" in msg.lower()
                ):
                    skipped_count += 1
                else:
                    logger.exception(
                        "bulk add_member failed for user %s on project %s",
                        uid,
                        project.id,
                    )
                    errors.append({"user_id": uid, "detail": msg})

        return Response(
            {"created": created_count, "skipped": skipped_count, "errors": errors},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request, project_pk=None):
        """Bulk remove members from a project by membership IDs."""

        try:
            project = Project.objects.select_related("organisation").get(pk=project_pk)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        self._check_can_manage_members(project)

        membership_ids = (
            request.data.get("membership_ids") if isinstance(request.data, dict) else None
        )
        if not isinstance(membership_ids, list):
            raise ValidationError({"membership_ids": "Expected a list of membership IDs."})

        max_batch = 200
        if len(membership_ids) > max_batch:
            raise ValidationError(
                {"detail": f"Too many membership IDs in one request (max {max_batch})."}
            )

        qs = ProjectMembership.objects.filter(
            project_id=project_pk,
            deleted_at__isnull=True,
            id__in=membership_ids,
        )

        service = MembershipService()
        removed_count = 0
        errors = []
        for membership in qs:
            try:
                service.remove_member(membership=membership, actor=request.user)
                removed_count += 1
            except Exception as e:
                errors.append({"membership_id": str(membership.id), "detail": str(e)})

        return Response({"removed": removed_count, "errors": errors}, status=status.HTTP_200_OK)


class ProjectFunctionalRoleViewSet(viewsets.ViewSet):
    """Manage functional (domain) roles for users on a team project.

    Routes (registered under /api/v1/projects/{project_pk}/functional-roles/):
    - POST assign/   { user_id, roles: [...] }
    - POST unassign/ { user_id, roles: [...] }

    Notes:
    - This is intentionally separate from access roles (ProjectMembership.role) and RBAC.
    - Functional roles are team-level labels and a user may hold multiple roles per team.
    """

    permission_classes = [IsAuthenticated]

    def _get_project(self) -> Project:
        project_pk = self.kwargs.get("project_pk")
        project_key = str(project_pk or "").strip()
        if not project_key:
            raise ValidationError({"detail": "Project not found."})

        try:
            if project_key.isdigit():
                return Project.objects.get(pk=int(project_key))
            return Project.objects.get(slug=project_key)
        except Project.DoesNotExist as exc:
            raise ValidationError({"detail": "Project not found."}) from exc

    def _check_can_manage_functional_roles(self, project: Project) -> None:
        """Reuse the same intent as membership management permissions."""
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

        # Legacy: Club Admin managing a child team via admin membership on the parent club
        if (
            project.parent_project_id
            and ProjectMembership.objects.filter(
                project_id=project.parent_project_id,
                user=user,
                role=ProjectMembership.Role.ADMIN,
                deleted_at__isnull=True,
            ).exists()
        ):
            return

        # Direct team-member management capability on this project
        if _safe_check_permission(
            user_id=user.id,
            permission_code="profile.edit_team",
            resource_type="project",
            resource_id=project.id,
        ):
            return

        # Club Admin can manage child teams via project.edit_children on the parent (club)
        if project.parent_project_id and _safe_check_permission(
            user_id=user.id,
            permission_code="project.edit_children",
            resource_type="project",
            resource_id=project.parent_project_id,
        ):
            return

        raise PermissionDenied("Only team admins can manage functional roles.")

    def _ensure_team_project(self, project: Project) -> None:
        if project.parent_project_id is None:
            raise ValidationError(
                {"detail": "Functional roles are only supported on team projects."}
            )

    def _update_metadata_functional_roles(self, project, user_id, *, add=None, remove=None):
        """Update metadata.functional_roles on the membership.

        Directly adds/removes the specified roles from the metadata list so that
        legacy metadata-sourced roles are properly handled (the assignment table
        may not have rows for roles that only live in metadata).
        """
        membership = ProjectMembership.objects.filter(
            project=project,
            user_id=user_id,
            deleted_at__isnull=True,
        ).first()
        if membership is None:
            return

        meta = membership.metadata or {}
        current = set(meta.get("functional_roles") or [])

        if add:
            current.update(add)
        if remove:
            current -= set(remove)

        meta["functional_roles"] = sorted(current)
        membership.metadata = meta
        membership.save(update_fields=["metadata", "updated_at"])

    @action(detail=False, methods=["post"], url_path="assign")
    def assign(self, request, project_pk=None):
        project = self._get_project()
        self._ensure_team_project(project)
        self._check_can_manage_functional_roles(project)

        serializer = ProjectFunctionalRoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data["user_id"]
        roles = serializer.validated_data["roles"]

        created = []
        skipped = []
        for role in roles:
            obj, was_created = ProjectFunctionalRoleAssignment.objects.get_or_create(
                project=project,
                user_id=user_id,
                role=role,
                defaults={
                    "assignment_reason": ProjectFunctionalRoleAssignment.AssignmentReason.MANUAL,
                },
            )
            if was_created:
                created.append(obj.role)
            else:
                skipped.append(obj.role)

        # Keep metadata.functional_roles in sync
        self._update_metadata_functional_roles(project, user_id, add=roles)

        return Response({"created": created, "skipped": skipped})

    @action(detail=False, methods=["post"], url_path="unassign")
    def unassign(self, request, project_pk=None):
        project = self._get_project()
        self._ensure_team_project(project)
        self._check_can_manage_functional_roles(project)

        serializer = ProjectFunctionalRoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_id = serializer.validated_data["user_id"]
        roles = serializer.validated_data["roles"]

        qs = ProjectFunctionalRoleAssignment.objects.filter(
            project=project,
            user_id=user_id,
            role__in=roles,
        )
        removed = list(qs.values_list("role", flat=True))
        qs.delete()

        # Keep metadata.functional_roles in sync
        self._update_metadata_functional_roles(project, user_id, remove=roles)

        return Response({"removed": sorted(removed)})
