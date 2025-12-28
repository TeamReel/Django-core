import os
import django
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from audit.models import AuditEvent
from organisations.models import Organisation
from projects.models import Project
from django.contrib.auth import get_user_model

User = get_user_model()


def create_routing_logs():
    print("Creating routing logs...")

    # Get or create necessary objects
    org = Organisation.objects.first()
    if not org:
        print("No organisation found. Please create one first.")
        return

    project = Project.objects.filter(organisation=org).first()
    user = User.objects.filter(is_superuser=True).first()

    # Create AuditEvents
    events = [
        {
            "event_type": "notification_routing_decision",
            "organization": org,
            "project": project,
            "user": user,
            "metadata": {
                "notification_type": "project.created",
                "recipient_count": 3,
                "decision": "delivered",
                "delivery_channels": ["email", "in_app"],
                "routing_decision": "org_admins + creator",
            },
        },
        {
            "event_type": "notification_routing_decision",
            "organization": org,
            "project": None,
            "user": user,
            "metadata": {
                "notification_type": "member.role_changed",
                "recipient_count": 2,
                "decision": "filtered",
                "delivery_channels": ["in_app"],
                "routing_decision": "affected_user + changer",
            },
        },
        {
            "event_type": "notification_routing_decision",
            "organization": None,
            "project": None,
            "user": user,
            "metadata": {
                "notification_type": "auth.login",
                "recipient_count": 1,
                "decision": "delivered",
                "delivery_channels": ["in_app"],
                "routing_decision": "system_admins",
            },
        },
    ]

    for event_data in events:
        AuditEvent.objects.create(
            event_type=event_data["event_type"],
            organization=event_data["organization"],
            project=event_data["project"],
            user=event_data["user"],
            metadata=event_data["metadata"],
            created_at=timezone.now(),
        )

    print(f"Created {len(events)} routing logs.")


if __name__ == "__main__":
    create_routing_logs()
