#!/usr/bin/env python
"""
Create sample NotificationPreference records for testing.
Run with: python create_notification_preferences.py
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from accounts.models import User
from contextual_notifications.models import NotificationPreference


def create_preferences():
    """Create sample notification preferences for all users."""

    # Event types to create preferences for
    event_types = [
        "project.updated",
        "task.assigned",
        "comment.added",
        "mention.received",
        "deadline.approaching",
    ]

    # Channels
    channels = ["email", "push", "in_app"]

    users = User.objects.filter(is_active=True)

    if not users.exists():
        print("❌ No active users found. Please create users first.")
        return

    print(f"📧 Creating notification preferences for {users.count()} users...\n")

    created_count = 0

    for user in users:
        print(f"👤 User: {user.email}")

        for event_type in event_types:
            for channel in channels:
                # Check if preference already exists
                existing = NotificationPreference.objects.filter(
                    user=user, event_type=event_type, channel=channel
                ).first()

                if existing:
                    print(f"   ⏭️  {event_type} / {channel}: already exists")
                    continue

                # Create with default enabled=True
                # Users can disable specific channels via UI
                pref = NotificationPreference.objects.create(
                    user=user,
                    event_type=event_type,
                    channel=channel,
                    enabled=True,  # Default: all channels enabled
                )
                created_count += 1
                print(f"   ✅ {event_type} / {channel}: created")

        print()

    print(f"\n✨ Created {created_count} notification preferences")
    print(f"📊 Total preferences in database: {NotificationPreference.objects.count()}")


if __name__ == "__main__":
    create_preferences()
