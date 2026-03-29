"""Views for accounts module."""

from accounts.forms import (
    PasswordResetConfirmForm,
    PasswordResetRequestForm,
    RegistrationForm,
)
from accounts.models import User
from accounts.tokens import email_verification_token
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.shortcuts import redirect, render
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode


def register(request):
    if request.method == "POST":
        form = RegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Send verification email
            token = email_verification_token.make_token(user)
            verification_url = request.build_absolute_uri(
                f"/accounts/verify-email/{user.id}/{token}/"
            )
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
            messages.success(
                request,
                "Registration successful. Please check your email to verify your account.",
            )
            return redirect("login")
    else:
        form = RegistrationForm()
    return render(request, "accounts/registration/register.html", {"form": form})


def verify_email(request, user_id, token):
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        messages.error(request, "Invalid verification link.")
        return redirect("login")

    if user.email_verified:
        messages.info(request, "Email already verified. You can sign in.")
        return redirect("login")

    if email_verification_token.check_token(user, token):
        user.email_verified = True
        user.is_active = True
        user.save()
        messages.success(request, "Email verified successfully. You can now sign in.")
        return redirect("login")
    else:
        messages.error(request, "The verification link is invalid or has expired.")
        return redirect("register")


def login_view(request):
    """Handle user login with email verification check."""
    from accounts.forms import LoginForm
    from django.contrib.auth import authenticate
    from django.contrib.auth import login as auth_login

    if request.method == "POST":
        form = LoginForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data["email"]
            password = form.cleaned_data["password"]
            user = authenticate(request, email=email, password=password)
            if user:
                if not user.email_verified:
                    messages.error(
                        request,
                        "Please verify your email address before signing in.",
                    )
                    return redirect("register")
                if not user.is_active:
                    messages.error(request, "Your account has been deactivated.")
                    return redirect("login")
                auth_login(request, user)
                request.session["last_activity"] = timezone.now().timestamp()
                messages.success(request, f"Welcome back, {user.get_short_name()}!")
                # Redirect to next parameter or home
                next_url = request.GET.get("next", "/")
                return redirect(next_url)
            else:
                messages.error(request, "Invalid email or password.")
    else:
        form = LoginForm()
    return render(request, "accounts/registration/login.html", {"form": form})


def logout_view(request):
    """Handle user logout."""
    from django.contrib.auth import logout as auth_logout

    auth_logout(request)
    messages.success(request, "You have been logged out.")
    return redirect("login")


def password_reset_request(request):
    """Handle password reset request with no email enumeration."""
    if request.method == "POST":
        form = PasswordResetRequestForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data["email"]
            try:
                user = User.objects.get(email=email, email_verified=True, is_active=True)
                # Generate reset token and send email
                token = default_token_generator.make_token(user)
                uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
                reset_url = request.build_absolute_uri(
                    f"/accounts/reset-password/{uidb64}/{token}/"
                )
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
            # Always show the same message regardless of email existence
            messages.success(
                request,
                "If an account with that email exists, a password reset link has been sent. "
                "Please check your inbox.",
            )
            return redirect("login")
    else:
        form = PasswordResetRequestForm()
    return render(request, "accounts/registration/password_reset_request.html", {"form": form})


def password_reset_confirm(request, uidb64, token):
    """Handle password reset confirmation with token validation and session invalidation."""
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user and default_token_generator.check_token(user, token):
        if request.method == "POST":
            form = PasswordResetConfirmForm(request.POST)
            if form.is_valid():
                # Set new password
                user.set_password(form.cleaned_data["new_password"])
                user.save()

                # Invalidate all existing sessions for this user
                from django.contrib.sessions.models import Session

                for session in Session.objects.all():
                    session_data = session.get_decoded()
                    if session_data.get("_auth_user_id") == str(user.id):
                        session.delete()

                messages.success(
                    request,
                    "Password reset successful. You can now sign in with your new password.",
                )
                return redirect("login")
        else:
            form = PasswordResetConfirmForm()
        return render(
            request,
            "accounts/registration/password_reset_confirm.html",
            {"form": form, "uidb64": uidb64, "token": token},
        )
    else:
        messages.error(request, "The password reset link is invalid or has expired.")
        return redirect("password_reset_request")
