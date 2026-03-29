"""Seed user notifications for demo purposes."""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from notifications.models import Notification, NotificationType

User = get_user_model()


class Command(BaseCommand):
    help = "Seed in-app notifications for demo users"

    def handle(self, *args, **options):
        """Create sample notifications for all users."""

        from notifications.models import RetryPolicy

        # Get or create a simple retry policy
        retry_policy = RetryPolicy.objects.first()
        if not retry_policy:
            retry_policy = RetryPolicy.objects.create(
                name="No Retry",
                max_attempts=1,
                retry_window_seconds=0,
            )

        # Ensure notification type exists
        notification_type, _ = NotificationType.objects.get_or_create(
            code="system_demo",
            defaults={
                "name": "Demo Notification",
                "description": "System-generated demo notification",
                "default_channel": "in_app",
                "retry_policy": retry_policy,
            },
        )

        users = User.objects.all()
        created_count = 0

        for user in users:
            # Check if user already has notifications
            existing = Notification.objects.filter(recipient_user=user, channel="in_app").count()

            if existing >= 3:
                self.stdout.write(f"  {user.email}: already has {existing} notifications, skipping")
                continue

            # Create 3 notifications per user with mixed read/unread status
            notifications_data = [
                {
                    "title": "Welcome to Django Core!",
                    "message": f"Hi {user.first_name or user.email}, welcome to the demo shell. Explore the features!",
                    "level": "success",
                    "is_read": True,
                },
                {
                    "title": "New Feature Available",
                    "message": "Check out the new Notifications system with persistent read/unread status.",
                    "level": "info",
                    "is_read": False,
                },
                {
                    "title": "Security Update",
                    "message": "Your account security settings have been updated. Review your settings.",
                    "level": "warning",
                    "is_read": False,
                },
            ]

            for notif_data in notifications_data:
                is_read = notif_data.pop("is_read")

                notification = Notification.objects.create(
                    type=notification_type,
                    channel="in_app",
                    recipient=user.email,
                    recipient_user=user,
                    payload=notif_data,
                    metadata={"level": notif_data["level"]},
                    status="sent",
                )

                if is_read:
                    notification.mark_as_read()

                created_count += 1

            self.stdout.write(f"  {user.email}: created 3 notifications")

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {created_count} notifications for {users.count()} users"
            )
        )
