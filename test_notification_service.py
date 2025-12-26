#!/usr/bin/env python
"""Test notification service integration."""

import os
import sys

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import django

django.setup()

from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from projects.models import Project

User = get_user_model()


def test_notification_service():
    """Test that notification service functions work."""
    from notifications.services import (
        create_notification,
        notify_member_role_changed,
        notify_project_created,
    )

    print("Testing notification service...")

    # Get test users
    admin = User.objects.filter(email="admin@example.com").first()
    if not admin:
        print("❌ Admin user not found")
        return

    print(f"✓ Found admin user: {admin.email}")

    # Test basic notification creation
    create_notification(
        recipient_user_id=str(admin.id),
        title="Test Notification",
        message="This is a test notification from the service.",
        level="info",
    )
    print("✓ Created basic test notification")

    # Test project created notification
    project = Project.objects.first()
    if project:
        notify_project_created(project=project, creator=admin)
        print(f"✓ Created project notification for: {project.name}")
    else:
        print("⚠ No projects found, skipping project notification test")

    # Test role change notification
    membership = Membership.objects.filter(organisation__isnull=False, user__isnull=False).first()
    if membership:
        notify_member_role_changed(
            membership=membership, changed_by=admin, old_role="member", new_role="admin"
        )
        print(f"✓ Created role change notification for: {membership.user.email}")
    else:
        print("⚠ No memberships found, skipping role change notification test")

    # Count notifications
    from notifications.models import Notification

    total_notifications = Notification.objects.filter(channel="in_app").count()
    print(f"\n✅ Total in-app notifications in database: {total_notifications}")
    print(
        f"✅ Admin notifications: {Notification.objects.filter(recipient_user=admin, channel='in_app').count()}"
    )


if __name__ == "__main__":
    test_notification_service()
