"""Views for accounts module."""

from django.conf import settings
from django.contrib import messages
from django.core.mail import send_mail
from django.shortcuts import redirect, render
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

from accounts.forms import RegistrationForm
from accounts.models import User
from accounts.tokens import email_verification_token


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
    from django.contrib.auth import authenticate
    from django.contrib.auth import login as auth_login

    from accounts.forms import LoginForm

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
