"""Admin user detail & lifecycle views — detail, activate, deactivate, reset password, change role."""

from __future__ import annotations

import logging

from audit.api import audit_log
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_encode
from permissions.evaluator import check_permission
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdmin
from accounts.serializers import (
    ChangeRoleSerializer,
    UserDetailSerializer,
    UserUpdateSerializer,
)

logger = logging.getLogger(__name__)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, user_id):
    """Get, update, or delete user details (admin only)."""
    try:
        user = User.objects.prefetch_related("groups").get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission Check
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()
    is_self = user_id == request.user.id

    # SELF-ACCESS: Users can always view and edit their own profile
    if is_self:
        # Allow GET for self
        if request.method == "GET":
            serializer = UserDetailSerializer(user)
            return Response(serializer.data)

        # Allow PATCH/PUT for self with safe fields only
        if request.method in ["PUT", "PATCH"]:
            # Whitelist of fields users can update for themselves
            safe_fields = {"first_name", "last_name", "email"}

            # Check if any forbidden fields are being modified
            forbidden_fields = set(request.data.keys()) - safe_fields
            if forbidden_fields:
                return Response(
                    {
                        "error": "forbidden_fields",
                        "message": f"You cannot modify these fields: {', '.join(forbidden_fields)}",
                        "allowed_fields": list(safe_fields),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Allow self-update for safe fields
            serializer = UserUpdateSerializer(
                user, data=request.data, partial=True, context={"user": user}
            )
            if serializer.is_valid():
                serializer.save()
                return Response(UserDetailSerializer(user).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Prevent self-deletion
        if request.method == "DELETE":
            return Response(
                {"error": "permission_denied", "message": "You cannot delete yourself."},
                status=status.HTTP_403_FORBIDDEN,
            )

    if not is_global_admin:
        # TeamReel Option A:
        # Permit access if requestor can manage profiles (`profile.edit_team`) for a project/org
        # where the target user has an active ProjectMembership.
        from permissions.models import RoleAssignment, ScopeChoices
        from projects.models import Project, ProjectMembership

        org_scope_ids = set(
            RoleAssignment.objects.filter(
                user=request.user,
                scope=ScopeChoices.ORGANIZATION,
                role__permissions__permission="profile.edit_team",
            ).values_list("target_organization_id", flat=True)
        )
        project_scope_ids = set(
            RoleAssignment.objects.filter(
                user=request.user,
                scope=ScopeChoices.PROJECT,
                role__permissions__permission="profile.edit_team",
            ).values_list("target_project_id", flat=True)
        )

        allowed_project_ids: set[str] = set()
        if org_scope_ids:
            allowed_project_ids.update(
                Project.all_objects.filter(organisation_id__in=org_scope_ids).values_list(
                    "id", flat=True
                )
            )
        if project_scope_ids:
            allowed_project_ids.update(
                Project.all_objects.filter(id__in=project_scope_ids).values_list("id", flat=True)
            )
            allowed_project_ids.update(
                Project.all_objects.filter(parent_project_id__in=project_scope_ids).values_list(
                    "id", flat=True
                )
            )

        has_teamreel_access = False
        if allowed_project_ids:
            has_teamreel_access = ProjectMembership.objects.filter(
                user=user,
                project_id__in=allowed_project_ids,
                deleted_at__isnull=True,
            ).exists()

        if has_teamreel_access:
            # Non-global admins may only edit safe profile fields via this endpoint.
            if request.method in ["PUT", "PATCH"]:
                safe_fields = {"first_name", "last_name", "email"}
                forbidden_fields = set(request.data.keys()) - safe_fields
                if forbidden_fields:
                    return Response(
                        {
                            "error": "forbidden_fields",
                            "message": (
                                "You cannot modify these fields: "
                                f"{', '.join(sorted(forbidden_fields))}"
                            ),
                            "allowed_fields": sorted(safe_fields),
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            # Do not allow non-global deletes through this endpoint.
            if request.method == "DELETE":
                return Response(
                    {"detail": "You do not have permission to delete users."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        else:
            # Legacy behaviour: org admins can manage users in shared organisations.
            from organisations.models import Membership

            requestor_memberships = Membership.objects.filter(user=request.user, is_active=True)
            is_admin_anywhere = requestor_memberships.filter(role="admin").exists()
            if not is_admin_anywhere:
                return Response(
                    {"error": "not_found", "message": "User not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # For non-global admins, we need to check if they have permission to manage THIS user.
        # This is tricky because the user might belong to multiple organizations.
        # We'll check if the requestor has 'org.view_members' (for GET) or
        # 'org.remove_users' (for DELETE)
        # on ANY organization that the target user is also a member of.

        from permissions.models import RoleAssignment

        # Get organizations where the requestor has admin rights
        # This is a simplified check. Ideally we should check specific permissions per org.
        # But for now, let's find common organizations.

        # 1. Via RoleAssignment (RBAC)
        requestor_org_ids = set(
            RoleAssignment.objects.filter(
                user=request.user, role__permissions__permission="org.view_members"
            ).values_list("target_organization_id", flat=True)
        )

        # 2. Via Membership (Legacy/Simple)
        from organisations.models import Membership

        membership_org_ids = set(
            Membership.objects.filter(user=request.user, role="admin", is_active=True).values_list(
                "organisation_id", flat=True
            )
        )
        requestor_org_ids.update(membership_org_ids)

        target_user_org_ids = set(
            user.organisation_memberships.values_list("organisation_id", flat=True)
        )

        common_orgs = requestor_org_ids.intersection(target_user_org_ids)

        # If no common orgs, check if the user has a role assignment in an org the requestor manages
        if not common_orgs:
            target_user_role_org_ids = set(
                user.role_assignments.values_list("target_organization_id", flat=True)
            )
            common_orgs = requestor_org_ids.intersection(target_user_role_org_ids)

        # Check if target user is unassigned
        # We align this with admin_user_list which considers users with no memberships as unassigned
        # even if they might have role assignments (e.g. project roles)
        is_unassigned = not target_user_org_ids

        if not common_orgs and not is_unassigned:
            return Response(
                {"detail": "You do not have permission to manage this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # For DELETE, check specifically for org.remove_users on at least one common org
        if request.method == "DELETE":
            if is_unassigned:
                return Response(
                    {"detail": "You cannot delete unassigned users."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            has_delete_perm = False
            for org_id in common_orgs:
                # Check RBAC
                if check_permission(
                    request.user.id,
                    "org.remove_users",
                    resource_id=org_id,
                    resource_type="organisation",
                ):
                    has_delete_perm = True
                    break

                # Check Membership Admin (Legacy/Simple)
                # Admins have full permissions
                if Membership.objects.filter(
                    user=request.user,
                    organisation_id=org_id,
                    role="admin",
                    is_active=True,
                ).exists():
                    has_delete_perm = True
                    break

            if not has_delete_perm:
                return Response(
                    {
                        "detail": (
                            "You do not have permission to delete users in the shared "
                            "organization(s)."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

    if request.method == "GET":
        serializer = UserDetailSerializer(user)
        return Response(serializer.data)

    if request.method == "DELETE":
        # Prevent deleting yourself
        if request.user.id == user.id:
            return Response(
                {"error": "permission_denied", "message": "You cannot delete yourself."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not is_global_admin:
            # For Org Admins, we don't actually delete the user account (which is global).
            # We only remove them from the organization(s) that the admin manages.
            # However, the frontend calls this endpoint expecting a "delete".
            # If the user is ONLY in this organization, maybe we can delete them?
            # For now, let's stick to the safe approach: Remove membership from common orgs.

            from organisations.models import Membership

            # Get organizations where the requestor has remove_users permission
            # AND the user is a member

            # Re-calculate common orgs to be safe (or reuse from above if scope allows)
            requestor_org_ids = set(
                RoleAssignment.objects.filter(
                    user=request.user, role__permissions__permission="org.remove_users"
                ).values_list("target_organization_id", flat=True)
            )
            target_user_org_ids = set(
                user.organisation_memberships.values_list("organisation_id", flat=True)
            )
            common_orgs = requestor_org_ids.intersection(target_user_org_ids)

            if not common_orgs:
                return Response(
                    {"detail": "No common organizations found to remove user from."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            memberships_to_remove = list(
                Membership.objects.filter(
                    user=user, organisation_id__in=common_orgs
                ).select_related("organisation")
            )
            deleted_count, _ = Membership.objects.filter(
                id__in=[m.id for m in memberships_to_remove]
            ).delete()

            # Audit log: membership removed (best-effort)
            for membership in memberships_to_remove:
                try:
                    audit_log.record(
                        "organisation.membership.deleted",
                        user=request.user,
                        organization=membership.organisation,
                        metadata={
                            "user_id": str(user.id),
                            "role": membership.role,
                            "email": user.email,
                        },
                        request=request,
                    )
                except Exception:
                    pass

            return Response(
                {"message": f"User removed from {deleted_count} organization(s)."},
                status=status.HTTP_204_NO_CONTENT,
            )

        # Audit log: user deleted (best-effort). Also emit membership removals scoped
        # to orgs so org admins can see the action in org-scoped audit views.
        try:
            audit_log.record(
                "resource.deleted",
                user=request.user,
                metadata={
                    "resource_type": "user",
                    "resource_id": str(user.id),
                    "email": user.email,
                },
                request=request,
            )
        except Exception:
            pass

        try:
            from organisations.models import Membership

            memberships_to_remove = list(
                Membership.objects.filter(user=user).select_related("organisation")
            )
            for membership in memberships_to_remove:
                try:
                    audit_log.record(
                        "organisation.membership.deleted",
                        user=request.user,
                        organization=membership.organisation,
                        metadata={
                            "user_id": str(user.id),
                            "role": membership.role,
                            "email": user.email,
                        },
                        request=request,
                    )
                except Exception:
                    pass
        except Exception:
            pass

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Handle PUT/PATCH
    serializer = UserUpdateSerializer(user, data=request.data, partial=True, context={"user": user})
    if serializer.is_valid():
        serializer.save()
        # Return full details after update
        return Response(UserDetailSerializer(user).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_user_activate(request, user_id):
    """Activate a user (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission Check
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()

    org_for_audit = None

    if not is_global_admin:
        # Check if requestor manages any org the user is in
        from permissions.models import RoleAssignment

        requestor_org_ids = set(
            RoleAssignment.objects.filter(
                user=request.user, role__permissions__permission="org.manage_settings"
            ).values_list("target_organization_id", flat=True)
        )
        target_user_org_ids = set(
            user.organisation_memberships.values_list("organisation_id", flat=True)
        )
        common_orgs = requestor_org_ids.intersection(target_user_org_ids)

        if not common_orgs:
            return Response(
                {"detail": "You do not have permission to manage this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Include an org for audit scoping so the event shows up in org-scoped audit views.
        try:
            from organisations.models import Organisation

            org_for_audit = Organisation.objects.filter(id=sorted(common_orgs)[0]).first()
        except Exception:
            org_for_audit = None

    if user.is_active:
        return Response(
            {"error": "bad_request", "message": "User is already active."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.is_active = True
    user.save()

    try:
        audit_log.record(
            "user.activated",
            user=request.user,
            organization=org_for_audit,
            metadata={
                "target_user_id": str(user.id),
                "target_user_email": user.email,
            },
            request=request,
        )
    except Exception:
        pass

    serializer = UserDetailSerializer(user)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_user_deactivate(request, user_id):
    """Deactivate a user with protection checks (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission Check
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()

    org_for_audit = None

    if not is_global_admin:
        # Check if requestor manages any org the user is in
        from permissions.models import RoleAssignment

        requestor_org_ids = set(
            RoleAssignment.objects.filter(
                user=request.user, role__permissions__permission="org.manage_settings"
            ).values_list("target_organization_id", flat=True)
        )
        target_user_org_ids = set(
            user.organisation_memberships.values_list("organisation_id", flat=True)
        )
        common_orgs = requestor_org_ids.intersection(target_user_org_ids)

        if not common_orgs:
            return Response(
                {"detail": "You do not have permission to manage this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            from organisations.models import Organisation

            org_for_audit = Organisation.objects.filter(id=sorted(common_orgs)[0]).first()
        except Exception:
            org_for_audit = None

    # Prevent self-deactivation
    if user.id == request.user.id:
        return Response(
            {"error": "bad_request", "message": "You cannot deactivate your own account."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Admins can't deactivate superadmins or other admins
    if not request.user.is_superuser:
        if user.is_superuser or user.is_admin:
            return Response(
                {
                    "error": "permission_denied",
                    "message": "You do not have permission to deactivate this user.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    if not user.is_active:
        return Response(
            {"error": "bad_request", "message": "User is already inactive."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.is_active = False
    user.save()

    try:
        audit_log.record(
            "user.deactivated",
            user=request.user,
            organization=org_for_audit,
            metadata={
                "target_user_id": str(user.id),
                "target_user_email": user.email,
            },
            request=request,
        )
    except Exception:
        pass

    serializer = UserDetailSerializer(user)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAdmin])
def admin_user_reset_password(request, user_id):
    """Send password reset email to a user (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Prevent non-superusers from resetting superusers
    if user.is_superuser and not request.user.is_superuser:
        return Response(
            {
                "error": "permission_denied",
                "message": "You cannot reset password for a superadmin account.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if not user.is_active:
        return Response(
            {
                "error": "bad_request",
                "message": "Cannot send password reset to inactive account.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.email_verified:
        return Response(
            {
                "error": "bad_request",
                "message": "Cannot send password reset to unverified account.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Generate reset token and send email (same logic as user-initiated reset)
    token = default_token_generator.make_token(user)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    reset_path = f"/accounts/reset-password/{uidb64}/{token}/"
    if request.build_absolute_uri:
        reset_url = request.build_absolute_uri(reset_path)
    else:
        reset_url = f"http://localhost:8000{reset_path}"

    context = {"user": user, "reset_url": reset_url}
    html_message = render_to_string("accounts/email/password_reset.html", context)
    plain_message = strip_tags(html_message)
    send_mail(
        subject="Reset your password",
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
    )

    try:
        audit_log.record(
            "user.password_reset_requested",
            user=request.user,
            metadata={
                "target_user_id": str(user.id),
                "target_user_email": user.email,
            },
            request=request,
        )
    except Exception:
        pass

    return Response({"message": f"Password reset email sent to {user.email}."})


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def admin_change_role(request, user_id):
    """Change a user's role (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Prevent self-role-change
    if user.id == request.user.id:
        return Response(
            {"error": "bad_request", "message": "You cannot change your own role."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Prevent non-superusers from modifying superusers
    if user.is_superuser and not request.user.is_superuser:
        return Response(
            {
                "error": "permission_denied",
                "message": "You cannot modify a superadmin account.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = ChangeRoleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    new_role = serializer.validated_data["role"]
    old_role = (
        "superadmin"
        if user.is_superuser
        else ("admin" if getattr(user, "is_admin", False) or user.is_staff else "user")
    )

    # Permission check: admins can only assign 'user' role
    if not request.user.is_superuser and new_role in ["superadmin", "admin"]:
        return Response(
            {
                "error": "permission_denied",
                "message": "You do not have permission to assign this role.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # Remove from all groups
    user.groups.clear()

    # Assign new role
    if new_role == "superadmin":
        user.is_superuser = True
        user.is_staff = True
    elif new_role == "admin":
        user.is_superuser = False
        from django.contrib.auth.models import Group

        admin_group = Group.objects.get(name="admin")
        user.groups.add(admin_group)
        user.is_staff = True
    else:  # user
        user.is_superuser = False
        user.is_staff = False
        from django.contrib.auth.models import Group

        user_group = Group.objects.get(name="user")
        user.groups.add(user_group)

    user.save()

    try:
        audit_log.record(
            "user.role_changed",
            user=request.user,
            metadata={
                "target_user_id": str(user.id),
                "target_user_email": user.email,
                "old_role": old_role,
                "new_role": new_role,
            },
            request=request,
        )
    except Exception:
        pass

    serializer = UserDetailSerializer(user)
    return Response(serializer.data)

