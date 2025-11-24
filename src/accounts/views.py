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


def login(request):
    """Placeholder login view for WP04 testing."""
    return render(request, "accounts/login.html")
