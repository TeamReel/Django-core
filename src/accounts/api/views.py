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
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from accounts.models import User
from accounts.permissions import IsAdmin
from accounts.serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegistrationSerializer,
    UserDetailSerializer,
    UserListSerializer,
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
def login_api(request):
    """API endpoint for user login."""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            email=serializer.validated_data["email"],
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
            request.session["last_activity"] = timezone.now().timestamp()
            return Response(
                {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "role": (
                        "superadmin"
                        if user.is_superuser
                        else ("admin" if user.is_admin else "user")
                    ),
                    "message": "Login successful.",
                }
            )
        return Response(
            {
                "error": "invalid_credentials",
                "message": "Invalid email or password.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def logout_api(request):
    """API endpoint for user logout."""
    auth_logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


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


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_user_list(request):
    """List all users with pagination and filters (admin only)."""
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

    # Paginate
    paginator = UserPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = UserListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAdmin])
def admin_user_detail(request, user_id):
    """Get user details (admin only)."""
    try:
        user = User.objects.prefetch_related("groups").get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    serializer = UserDetailSerializer(user)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def admin_user_activate(request, user_id):
    """Activate a user (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if user.is_active:
        return Response(
            {"error": "bad_request", "message": "User is already active."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.is_active = True
    user.save()
    serializer = UserDetailSerializer(user)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def admin_user_deactivate(request, user_id):
    """Deactivate a user with protection checks (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

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

    return Response({"message": f"Password reset email sent to {user.email}."})
