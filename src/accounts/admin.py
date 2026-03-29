"""Admin configuration for accounts module."""

from accounts.models import User
from django.conf import settings
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_encode


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin interface for User model."""

    list_display = [
        "email",
        "first_name",
        "last_name",
        "is_active",
        "email_verified",
        "get_role",
        "date_joined",
    ]
    list_filter = [
        "is_active",
        "email_verified",
        "is_staff",
        "is_superuser",
        "groups",
    ]
    search_fields = ["email", "first_name", "last_name"]
    ordering = ["-date_joined"]
    readonly_fields = ["date_joined", "last_login", "email_verification_sent_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("first_name", "last_name")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {"fields": ("last_login", "date_joined", "email_verification_sent_at")},
        ),
        ("Email Verification", {"fields": ("email_verified",)}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2"),
            },
        ),
    )

    def get_role(self, obj):
        """Display user's role."""
        if obj.is_superuser:
            return "Superadmin"
        elif obj.is_admin:
            return "Admin"
        return "User"

    get_role.short_description = "Role"

    actions = ["activate_users", "deactivate_users", "send_password_reset"]

    def activate_users(self, request, queryset):
        """Activate selected users."""
        count = queryset.update(is_active=True)
        self.message_user(request, f"{count} users activated.")

    activate_users.short_description = "Activate selected users"

    def deactivate_users(self, request, queryset):
        """Deactivate selected users with self-modification protection."""
        # Prevent self-deactivation
        if request.user in queryset:
            self.message_user(request, "Cannot deactivate your own account.", level="ERROR")
            return

        # Admins can't deactivate superadmins or other admins
        if not request.user.is_superuser:
            restricted_users = queryset.filter(is_superuser=True) | queryset.filter(
                groups__name="admin"
            )
            if restricted_users.exists():
                self.message_user(
                    request,
                    "You do not have permission to deactivate superadmins or admins.",
                    level="ERROR",
                )
                return

        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} users deactivated.")

    deactivate_users.short_description = "Deactivate selected users"

    def send_password_reset(self, request, queryset):
        """Send password reset emails to selected users."""
        count = 0
        for user in queryset.filter(email_verified=True, is_active=True):
            # Generate reset token
            token = default_token_generator.make_token(user)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            reset_url = request.build_absolute_uri(f"/accounts/reset-password/{uidb64}/{token}/")

            # Send email
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
            count += 1

        self.message_user(request, f"Password reset emails sent to {count} users.")

    send_password_reset.short_description = "Send password reset email"
