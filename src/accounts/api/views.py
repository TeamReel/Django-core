from audit.api import audit_log
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from permissions.evaluator import check_permission
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from accounts.permissions import IsAdmin
from accounts.serializers import (
    ChangeRoleSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegistrationSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)
from accounts.tokens import email_verification_token


@api_view(["POST"])
@permission_classes([AllowAny])
def register_api(request):
    serializer = RegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Send verification email
        token = email_verification_token.make_token(user)
        # Build absolute URI - handle both HTTP and reverse proxy scenarios
        verification_path = f"/accounts/verify-email/{user.id}/{token}/"
        if request.build_absolute_uri:
            verification_url = request.build_absolute_uri(verification_path)
        else:
            # Fallback for testing
            verification_url = f"http://localhost:8000{verification_path}"

        context = {"user": user, "verification_url": verification_url}
        html_message = render_to_string("accounts/email/verification.html", context)
        plain_message = strip_tags(html_message)
        send_mail(
            subject="Verify your email address",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
        )
        user.email_verification_sent_at = timezone.now()
        user.save()

        return Response(
            {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email_verified": user.email_verified,
                "is_active": user.is_active,
                "message": (
                    "Registration successful. Please check your email " "to verify your account."
                ),
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email_api(request, user_id, token):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if user.email_verified:
        return Response(
            {
                "error": "already_verified",
                "message": "This email address has already been verified.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if email_verification_token.check_token(user, token):
        user.email_verified = True
        user.is_active = True
        user.save()
        return Response({"message": "Email verified successfully. You can now sign in."})

    return Response(
        {
            "error": "invalid_token",
            "message": "The verification link is invalid or has expired.",
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def login_api(request):
    """API endpoint for user login."""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            request=request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user:
            if not user.email_verified:
                return Response(
                    {
                        "error": "email_not_verified",
                        "message": ("Please verify your email address before signing in."),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not user.is_active:
                return Response(
                    {
                        "error": "account_inactive",
                        "message": "Your account has been deactivated.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            auth_login(request, user)
            try:
                request.session["last_activity"] = timezone.now().timestamp()
            except Exception as e:
                print(f"Session error: {e}")

            # Audit log: Successful login
            audit_log.record("auth.login", user=user, request=request)

            # Use UserListSerializer to include organisations and consistent fields
            user_data = UserListSerializer(user).data
            user_data["message"] = "Login successful."

            return Response(user_data)

        # Audit log: Failed login
        # Try to find user to attach to audit log (for org-scoped visibility)
        email = serializer.validated_data.get("email")
        failed_user = User.objects.filter(email=email).first()
        if failed_user:
            if not failed_user.email_verified:
                return Response(
                    {
                        "error": "email_not_verified",
                        "message": ("Please verify your email address before signing in."),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not failed_user.is_active:
                return Response(
                    {
                        "error": "account_inactive",
                        "message": "Your account has been deactivated.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        audit_log.record(
            "auth.login_failed",
            user=failed_user,
            metadata={"username": serializer.validated_data.get("email")},
            request=request,
        )

        return Response(
            {
                "error": "invalid_credentials",
                "message": "Invalid email or password.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        # JWT Blacklisting
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                import logging

                logging.getLogger(__name__).debug(
                    "Failed to blacklist refresh token during logout",
                    exc_info=True,
                )

        if request.user.is_authenticated:
            audit_log.record("auth.logout", user=request.user, request=request)

        auth_logout(request)

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(settings.SESSION_COOKIE_NAME)
        return response


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def logout_api(request):
    """API endpoint for user logout."""
    if request.user.is_authenticated:
        audit_log.record("auth.logout", user=request.user, request=request)

    auth_logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def auth_me(request):
    """
    Get current authenticated user profile.

    Returns:
        200 OK: User profile (id, email, first_name, last_name, role, email_verified, is_active)
        401 Unauthorized: Session expired or not authenticated
    """
    from django.utils import timezone

    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["PATCH"])
def update_profile(request):
    """
    Update authenticated user's profile (first_name, last_name).

    Request Body:
        {
            "first_name": str (optional),
            "last_name": str (optional),
            "current_password": str (required for verification)
        }

    Returns:
        200 OK: Updated user profile
        400 Bad Request: Validation errors (B13 envelope)
        401 Unauthorized: Session expired
    """
    from django.utils import timezone

    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    data = request.data

    # Validate current_password (required for security)
    current_password = data.get("current_password")
    if not current_password:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Current password is required",
                    "details": {"current_password": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(current_password):
        # Generic error to prevent password guessing
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "authentication_failed",
                    "message": "Unable to verify credentials.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update fields if provided
    errors = {}
    has_update_fields = False

    first_name = data.get("first_name")
    if first_name is not None:
        has_update_fields = True
        if not first_name.strip():
            errors["first_name"] = ["First name cannot be empty"]
        elif len(first_name) > 150:
            errors["first_name"] = ["First name must be 150 characters or fewer"]
        else:
            user.first_name = first_name.strip()

    last_name = data.get("last_name")
    if last_name is not None:
        has_update_fields = True
        if not last_name.strip():
            errors["last_name"] = ["Last name cannot be empty"]
        elif len(last_name) > 150:
            errors["last_name"] = ["Last name must be 150 characters or fewer"]
        else:
            user.last_name = last_name.strip()

    # Check if at least one field was provided
    if not has_update_fields:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "At least one field must be provided to update.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if errors:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": errors,
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Save updates
    user.save()

    # Return updated profile (same format as /auth/me)
    role = (
        "superadmin"
        if user.is_superuser
        else ("admin" if getattr(user, "is_admin", False) or user.is_staff else "user")
    )

    # Success response returns data directly (no envelope)
    return Response(
        {
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": role,
            "email_verified": getattr(user, "email_verified", True),
            "is_active": user.is_active,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request_api(request):
    """API endpoint for password reset request with no email enumeration."""
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data["email"]
        try:
            user = User.objects.get(email=email, email_verified=True, is_active=True)
            # Generate reset token and send email
            token = default_token_generator.make_token(user)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            # Build absolute URI for password reset
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
        except User.DoesNotExist:
            # No enumeration - don't reveal if email exists
            pass

        # Always return the same message
        return Response(
            {
                "message": (
                    "If an account with that email exists, a password reset link "
                    "has been sent. Please check your inbox."
                )
            }
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_api(request):
    """API endpoint for password reset confirmation with token validation."""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data["uidb64"]))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {
                    "error": "invalid_token",
                    "message": "The password reset link is invalid or has expired.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if default_token_generator.check_token(user, serializer.validated_data["token"]):
            # Set new password
            user.set_password(serializer.validated_data["new_password"])
            user.save()

            # Audit log: Password changed
            audit_log.record("auth.password_changed", user=user, request=request)

            # Invalidate all existing sessions for this user
            from django.contrib.sessions.models import Session

            for session in Session.objects.all():
                session_data = session.get_decoded()
                if session_data.get("_auth_user_id") == str(user.id):
                    session.delete()

            return Response(
                {
                    "message": (
                        "Password reset successful. You can now sign in " "with your new password."
                    )
                }
            )

        return Response(
            {
                "error": "invalid_token",
                "message": "The password reset link is invalid or has expired.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Admin User Management API Endpoints


class UserPagination(PageNumberPagination):
    """Pagination class for user list."""

    page_size = 50


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_user_list(request):
    """List all users with pagination and filters (admin only), or create a new user."""

    org_check = None

    # Permission Check
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()

    if not is_global_admin:
        organisation_id = request.query_params.get("organisation_id")
        project_id = request.query_params.get("project_id")

        # TeamReel Option A:
        # - Allow project-scoped listing for Club/Team Admin via `profile.edit_team`
        #   on that project.
        # - Allow org-scoped listing for Land Admin via `profile.edit_team` on that
        #   organisation.
        # Keep legacy org permissions for older flows.
        if project_id and request.method == "GET":
            import uuid

            from projects.models import Project

            proj_check = None
            try:
                uuid.UUID(project_id)
                proj_check = Project.all_objects.filter(id=project_id).first()
            except ValueError:
                proj_check = Project.all_objects.filter(slug__iexact=project_id).first()

            if not proj_check:
                return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

            has_perm = check_permission(
                request.user.id,
                "profile.edit_team",
                resource_id=proj_check.id,
                resource_type="project",
            )
            if not has_perm:
                return Response(
                    {"detail": "You do not have permission to view users for this project."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        elif organisation_id:
            # Resolve Org
            import uuid

            from organisations.models import Organisation

            org_check = None
            try:
                uuid.UUID(organisation_id)
                org_check = Organisation.objects.filter(id=organisation_id).first()
            except ValueError:
                org_check = Organisation.objects.filter(slug__iexact=organisation_id).first()

            if not org_check:
                return Response(
                    {"detail": "Organization not found."}, status=status.HTTP_404_NOT_FOUND
                )

            # Check Permission
            required_perm = "org.view_members"
            if request.method == "POST":
                required_perm = "org.invite_users"

            # TeamReel: Land Admin uses `profile.edit_team` at org scope.
            has_perm = check_permission(
                request.user.id,
                required_perm,
                resource_id=org_check.id,
                resource_type="organisation",
            ) or check_permission(
                request.user.id,
                "profile.edit_team",
                resource_id=org_check.id,
                resource_type="organisation",
            )

            if not has_perm:
                # Fallback: Check Membership (Legacy/Simple)
                from organisations.models import Membership

                # For GET (viewing), any active member is allowed
                if request.method == "GET":
                    if Membership.objects.filter(
                        user=request.user,
                        organisation=org_check,
                        is_active=True,
                    ).exists():
                        has_perm = True
                # For POST (creating), only admins are allowed
                elif Membership.objects.filter(
                    user=request.user,
                    organisation=org_check,
                    role="admin",
                    is_active=True,
                ).exists():
                    has_perm = True

            if not has_perm:
                return Response(
                    {
                        "detail": (
                            f"You do not have permission to {required_perm} "
                            "in this organization."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif request.method == "POST":
            # Creating a user requires an organization context for non-global admins
            return Response(
                {"detail": "Organization ID required to create users."},
                status=status.HTTP_403_FORBIDDEN,
            )
        else:
            # Regular users cannot list all users in the system without an organization context
            return Response(
                {"detail": "You do not have permission to view all users."},
                status=status.HTTP_403_FORBIDDEN,
            )

    if request.method == "POST":
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Audit log: user created (best-effort; never blocks)
            try:
                audit_log.record(
                    "resource.created",
                    user=request.user,
                    organization=org_check,
                    metadata={
                        "resource_type": "user",
                        "resource_id": str(user.id),
                        "created_user_email": user.email,
                    },
                    request=request,
                )
            except Exception:
                pass

            # If created by an Org Admin, automatically add the user to the organization
            if not is_global_admin and org_check:
                from organisations.models import Membership

                # Default role for new members created by Org Admin
                Membership.objects.create(user=user, organisation=org_check, role="member")

                # Audit log: organisation member added
                try:
                    audit_log.record(
                        "organisation.membership.created",
                        user=request.user,
                        organization=org_check,
                        metadata={
                            "user_id": str(user.id),
                            "role": "member",
                            "email": user.email,
                        },
                        request=request,
                    )
                except Exception:
                    pass

            # Return the created user using the list serializer format for consistency
            response_serializer = UserListSerializer(user)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    queryset = User.objects.select_related().prefetch_related("groups").order_by("-date_joined")

    # Apply filters
    is_active = request.query_params.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active.lower() == "true")

    email_verified = request.query_params.get("email_verified")
    if email_verified is not None:
        queryset = queryset.filter(email_verified=email_verified.lower() == "true")

    role = request.query_params.get("role")
    if role:
        if role == "superadmin":
            queryset = queryset.filter(is_superuser=True)
        elif role == "admin":
            queryset = queryset.filter(groups__name="admin")
        elif role == "user":
            queryset = queryset.filter(groups__name="user", is_superuser=False)

    # Filter by computed demo role label (e.g. "Team Admin", "Club Admin", "Team Member")
    # This is intentionally in-Python (not DB-annotated) to keep logic aligned with serializer.
    role_label = request.query_params.get("role_label")

    # Filter by organisation (if provided)
    organisation_id = request.query_params.get("organisation_id")
    if organisation_id:
        from django.db.models import Q
        from organisations.models import Organisation
        from permissions.models import RoleAssignment

        org = None
        # Check if it's a UUID or a slug
        try:
            import uuid

            uuid.UUID(organisation_id)
            # It's a UUID
            org = Organisation.objects.filter(id=organisation_id).first()
        except ValueError:
            # It's likely a slug
            org = Organisation.objects.filter(slug__iexact=organisation_id).first()

        if org:
            # Security Check: If not global admin, ensure user has access to this org
            if not is_global_admin:
                # Check if user is member or has role assignment in this org
                has_access = (
                    request.user.organisation_memberships.filter(organisation=org).exists()
                    or RoleAssignment.objects.filter(
                        user=request.user, target_organization=org
                    ).exists()
                )
                if not has_access:
                    return Response(
                        {
                            "detail": (
                                "You do not have permission to view users in this organization."
                            )
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                # If user has TeamReel Land Admin permissions, allow org-wide listing.
                # Otherwise keep legacy privacy rules (non-admin org members see self only).
                has_teamreel_org_perm = check_permission(
                    request.user.id,
                    "profile.edit_team",
                    resource_id=org.id,
                    resource_type="organisation",
                )

                if not has_teamreel_org_perm:
                    # PLAYER PRIVACY: Non-admin org members can ONLY see their own user record
                    from organisations.models import Membership

                    user_membership = Membership.objects.filter(
                        user=request.user, organisation=org, is_active=True
                    ).first()

                    is_org_admin = user_membership and user_membership.role == "admin"
                    if not is_org_admin:
                        queryset = User.objects.filter(id=request.user.id)
                        paginator = UserPagination()
                        page = paginator.paginate_queryset(queryset, request)
                        if page is not None:
                            serializer = UserListSerializer(page, many=True)
                            return paginator.get_paginated_response(serializer.data)
                        serializer = UserListSerializer(queryset, many=True)
                        return Response(serializer.data)

            # TeamReel Option A:
            # Include users visible via projects in this organisation (project memberships), plus
            # legacy org memberships and role assignments.

            include_unassigned = (
                request.query_params.get("include_unassigned", "false").lower() == "true"
            )

            filters = (
                Q(
                    project_memberships__project__organisation=org,
                    project_memberships__deleted_at__isnull=True,
                )
                | Q(organisation_memberships__organisation=org)
                | Q(role_assignments__target_organization=org)
                | Q(role_assignments__target_project__organisation=org)
            )

            if include_unassigned:
                filters |= Q(organisation_memberships__isnull=True)

            queryset = queryset.filter(filters).distinct()
        else:
            # Return empty if org not found
            return Response({"count": 0, "next": None, "previous": None, "results": []})
    elif not is_global_admin:
        # Filter by all allowed organizations for the current user
        from django.db.models import Q
        from permissions.models import RoleAssignment, ScopeChoices

        # 1. Direct membership
        user_org_ids = set(
            request.user.organisation_memberships.values_list("organisation_id", flat=True)
        )

        # 2. Role Assignments on Organisations
        assigned_org_ids = set(
            RoleAssignment.objects.filter(
                user=request.user, scope=ScopeChoices.ORGANIZATION
            ).values_list("target_organization_id", flat=True)
        )

        allowed_org_ids = user_org_ids | assigned_org_ids

        # Also include unassigned users if explicitly requested
        # (e.g. for Org Admins looking for new users)
        include_unassigned = (
            request.query_params.get("include_unassigned", "false").lower() == "true"
        )

        filters = (
            Q(organisation_memberships__organisation_id__in=allowed_org_ids)
            | Q(role_assignments__target_organization_id__in=allowed_org_ids)
            | Q(role_assignments__target_project__organisation_id__in=allowed_org_ids)
        )

        if include_unassigned:
            filters |= Q(organisation_memberships__isnull=True)

        queryset = queryset.filter(filters).distinct()

    # Filter by project (if provided)
    project_id = request.query_params.get("project_id")
    if project_id:
        import logging

        from projects.models import Project

        logger = logging.getLogger(__name__)

        proj = None
        try:
            import uuid as uuid_module

            uuid_module.UUID(project_id)
            proj = Project.objects.filter(id=project_id).first()
        except ValueError:
            proj = Project.objects.filter(slug__iexact=project_id).first()

        if proj:
            # Non-global admins must have TeamReel permission to manage/view users for this project.
            if not is_global_admin:
                has_perm = check_permission(
                    request.user.id,
                    "profile.edit_team",
                    resource_id=proj.id,
                    resource_type="project",
                )
                if not has_perm:
                    return Response(
                        {"detail": "You do not have permission to view users for this project."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

            # Find all projects to check:
            # 1. The project itself
            # 2. All child projects (if it's a parent/club)
            project_ids = [proj.id]
            child_project_ids = list(
                Project.objects.filter(parent_project=proj).values_list("id", flat=True)
            )
            project_ids.extend(child_project_ids)
            logger.info(
                (
                    "[admin_user_list] Filtering by project: %s (ID: %s), "
                    "child projects: %s, total project_ids: %s"
                ),
                proj.name,
                proj.id,
                len(child_project_ids),
                len(project_ids),
            )

            # Count before filter
            count_before = queryset.count()
            logger.info(f"[admin_user_list] Users BEFORE project filter: {count_before}")

            # Filter by ProjectMembership (new B26 system - active memberships only)
            queryset = queryset.filter(
                project_memberships__project_id__in=project_ids,
                project_memberships__deleted_at__isnull=True,
            ).distinct()

            # Count after filter
            count_after = queryset.count()
            logger.info(f"[admin_user_list] Users AFTER project filter: {count_after}")
        else:
            return Response({"count": 0, "next": None, "previous": None, "results": []})

    # Paginate
    if role_label:
        # Prefetch relations needed to compute roles without N+1 queries.
        queryset = queryset.prefetch_related(
            "organisation_memberships__organisation",
            "project_memberships__project__organisation",
            "project_memberships__project__parent_project",
            "role_assignments__role",
            "role_assignments__target_organization",
            "role_assignments__target_project__organisation",
        )

        wanted = str(role_label).strip().lower()

        def compute_role_label(u):
            # 0. Superuser is always Superadmin
            if getattr(u, "is_superuser", False):
                return "Superadmin"

            # 1. RBAC RoleAssignment (primary)
            try:
                assignments = list(getattr(u, "role_assignments", []).all())
                if assignments:
                    role_priority = {
                        "Land Admin": 1,
                        "Club Admin": 2,
                        "Team Admin": 3,
                        "Team Staff": 4,
                        "Team Member": 5,
                        "Supporter": 6,
                        "Viewer": 7,
                    }

                    best = None
                    best_rank = 999
                    for ra in assignments:
                        name = getattr(getattr(ra, "role", None), "name", None)
                        if not name:
                            continue
                        rank = role_priority.get(name, 999)
                        if rank < best_rank:
                            best = name
                            best_rank = rank
                    if best:
                        return best
            except Exception:
                import logging

                logging.getLogger(__name__).debug(
                    "Failed to compute RBAC role label from role_assignments",
                    exc_info=True,
                )

            # 2. Organisation membership admin (legacy)
            try:
                memberships = list(getattr(u, "organisation_memberships", []).all())
                if any(
                    getattr(m, "role", None) == "admin" and getattr(m, "is_active", False)
                    for m in memberships
                ):
                    return "Land Admin"
            except Exception:
                import logging

                logging.getLogger(__name__).debug(
                    "Failed to compute legacy org membership role label",
                    exc_info=True,
                )

            # 3. Project memberships (fallback)
            try:
                project_memberships = list(getattr(u, "project_memberships", []).all())

                # Determine highest role across memberships
                highest = None

                for pm in project_memberships:
                    proj = getattr(pm, "project", None)
                    if not proj:
                        continue

                    pm_role = getattr(pm, "role", None)
                    is_team = bool(getattr(proj, "parent_project", None))

                    if pm_role == "admin" and not is_team:
                        return "Club Admin"
                    if pm_role == "admin" and is_team:
                        if highest not in ["Club Admin"]:
                            highest = "Team Admin"
                    elif pm_role in ["staff", "editor"] and highest not in [
                        "Club Admin",
                        "Team Admin",
                    ]:
                        highest = "Team Staff"
                    elif pm_role == "player" and not highest:
                        highest = "Team Member"
                    elif pm_role == "viewer" and not highest:
                        highest = "Viewer"

                return highest or "User"
            except Exception:
                return "User"

        queryset_list = list(queryset)
        queryset = [u for u in queryset_list if compute_role_label(u).strip().lower() == wanted]

    paginator = UserPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = UserListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


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

            deleted_count, _ = Membership.objects.filter(
                user=user, organisation_id__in=common_orgs
            ).delete()

            return Response(
                {"message": f"User removed from {deleted_count} organization(s)."},
                status=status.HTTP_204_NO_CONTENT,
            )

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

        # If there's exactly one shared org, include it for audit scoping.
        if len(common_orgs) == 1:
            try:
                from organisations.models import Organisation

                org_for_audit = Organisation.objects.filter(id=list(common_orgs)[0]).first()
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

        if len(common_orgs) == 1:
            try:
                from organisations.models import Organisation

                org_for_audit = Organisation.objects.filter(id=list(common_orgs)[0]).first()
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
