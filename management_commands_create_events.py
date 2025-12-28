"""Management command to create database-related usage events."""

import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
django.setup()

from datetime import datetime, timedelta
import random
from accounts.models import User
from organisations.models import Organisation
from projects.models import Project
from transactions.models import UsageEvent
from django.db.models import Count

users = list(User.objects.all())
orgs = list(Organisation.objects.all())
projects = list(Project.objects.all())

print(f"Found {len(users)} users, {len(orgs)} orgs, {len(projects)} projects")

# Database/Application-related event types
event_types = [
    ("user.login", {"source": "web_app", "ip_address": "192.168.1.100", "device": "desktop"}),
    ("user.logout", {"source": "web_app", "session_duration_minutes": 45}),
    ("user.profile_updated", {"fields_changed": ["email", "name"], "source": "settings_page"}),
    ("project.created", {"project_type": "standard", "initial_budget": 50000}),
    (
        "project.updated",
        {"fields_changed": ["name", "description", "budget"], "reason": "scope_change"},
    ),
    ("project.archived", {"reason": "completed", "final_status": "success"}),
    ("project.deleted", {"reason": "cancelled", "had_active_tasks": False}),
    (
        "organization.settings_changed",
        {"setting": "notification_preferences", "changed_by": "admin"},
    ),
    ("organization.member_added", {"role": "coach", "invitation_sent": True}),
    ("organization.member_removed", {"role": "player", "reason": "transfer"}),
    (
        "api.request",
        {
            "endpoint": "/api/v1/projects/",
            "method": "GET",
            "status_code": 200,
            "response_time_ms": 45,
        },
    ),
    (
        "api.request",
        {"endpoint": "/api/v1/users/", "method": "GET", "status_code": 200, "response_time_ms": 32},
    ),
    (
        "api.request",
        {
            "endpoint": "/api/v1/organizations/",
            "method": "POST",
            "status_code": 201,
            "response_time_ms": 89,
        },
    ),
    ("feature.enabled", {"feature_name": "dark_mode", "enabled_by": "user"}),
    ("feature.disabled", {"feature_name": "advanced_analytics", "disabled_by": "admin"}),
    ("notification.sent", {"channel": "email", "type": "project_update", "recipients": 5}),
    ("notification.read", {"notification_type": "task_assigned", "read_after_minutes": 15}),
    (
        "document.uploaded",
        {"filename": "project_plan.pdf", "size_kb": 1024, "mime_type": "application/pdf"},
    ),
    ("document.downloaded", {"filename": "report.xlsx", "size_kb": 512}),
    ("search.performed", {"query": "budget reports", "results_count": 12, "search_time_ms": 23}),
    ("export.generated", {"export_type": "csv", "records_count": 150, "file_size_kb": 45}),
    ("import.completed", {"import_type": "users", "records_imported": 25, "errors": 0}),
    ("permission.granted", {"permission": "project.edit", "granted_to": "coach_role"}),
    ("permission.revoked", {"permission": "project.delete", "revoked_from": "player_role"}),
    ("audit.log_viewed", {"resource_type": "user", "viewed_by": "admin"}),
    ("session.expired", {"session_duration_minutes": 120, "reason": "timeout"}),
]

created = 0
for day in range(30):
    date_offset = timedelta(days=day)
    num_events = random.randint(8, 20)

    for _ in range(num_events):
        user = random.choice(users)
        org = random.choice(orgs)
        project = random.choice(projects) if projects and random.random() > 0.3 else None

        event_type, base_metadata = random.choice(event_types)
        # Add real user/org context
        metadata = {
            **base_metadata,
            "user_email": user.email,
            "organization_name": org.name,
        }
        if project:
            metadata["project_name"] = project.name

        UsageEvent.objects.create(
            event_type=event_type,
            user=user,
            organization=org,
            project=project,
            metadata=metadata,
        )
        created += 1

print(f"\nCreated {created} usage events!")

for org in orgs:
    count = UsageEvent.objects.filter(organization=org).count()
    print(f"  {org.name}: {count} events")

top_events = (
    UsageEvent.objects.values("event_type").annotate(count=Count("id")).order_by("-count")[:10]
)
print("\nTop event types:")
for item in top_events:
    print(f"  {item['event_type']}: {item['count']}")

print("\nDone! Refresh the Usage Events page.")
