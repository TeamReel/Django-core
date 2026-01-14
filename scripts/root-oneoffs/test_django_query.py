import os
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.production")
os.environ["DATABASE_URL"] = (
    "postgresql://postgres:<PASSWORD>@switchback.proxy.rlwy.net:17304/railway"
)
django.setup()

from django.contrib.auth import get_user_model
from django.db.models import Q
from projects.models import Project, ProjectMembership

User = get_user_model()

# Simulate the query
project_id = 7  # Go Ahead Eagles

# Step 1: Start with all active users (like the API does)
queryset = User.objects.filter(is_active=True)
print(f"Total active users: {queryset.count()}")

# Step 2: Find the project
proj = Project.objects.filter(id=project_id).first()
print(f"\nProject: {proj.name} (ID: {proj.id})")

# Step 3: Find child projects
project_ids = [proj.id]
child_projects = list(Project.objects.filter(parent_project=proj).values_list("id", flat=True))
project_ids.extend(child_projects)
print(f"Project IDs: {project_ids}")
print(f"Total projects: {len(project_ids)}")

# Step 4: Apply the filter (exactly as the backend does)
queryset = queryset.filter(
    Q(
        project_memberships__project_id__in=project_ids,
        project_memberships__deleted_at__isnull=True,
    )
    | Q(role_assignments__target_project_id__in=project_ids)
).distinct()

print(f"\n=== After Project Filter ===")
print(f"Total users: {queryset.count()}")

if queryset.count() > 0:
    print(f"\nFirst 3 users:")
    for user in queryset[:3]:
        print(f"  - {user.email}")
else:
    print("\n❌ No users found!")

    # Debug: Check if the issue is with the related name
    print("\n=== Debugging Related Names ===")
    test_user = User.objects.first()
    print(f"Test user: {test_user.email}")
    print(f"Has 'project_memberships' attribute: {hasattr(test_user, 'project_memberships')}")

    # Check actual ProjectMembership count
    from projects.models import ProjectMembership

    total_memberships = ProjectMembership.objects.filter(
        project_id__in=project_ids, deleted_at__isnull=True
    ).count()
    print(f"\nTotal ProjectMemberships for these projects: {total_memberships}")

    # Check distinct users
    distinct_users = (
        ProjectMembership.objects.filter(project_id__in=project_ids, deleted_at__isnull=True)
        .values_list("user_id", flat=True)
        .distinct()
    )
    print(f"Distinct user IDs in memberships: {len(list(distinct_users))}")
