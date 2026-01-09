from projects.models import Membership
from django.db.models import Count

# Find duplicates
duplicates = (
    Membership.objects.values("project_id", "user_id")
    .annotate(count=Count("id"))
    .filter(count__gt=1)
)
print(f"Found {duplicates.count()} duplicate membership pairs")

# Show details
for dup in duplicates[:10]:
    memberships = Membership.objects.filter(project_id=dup["project_id"], user_id=dup["user_id"])
    print(
        f"\nProject {dup['project_id']}, User {dup['user_id']}: {memberships.count()} memberships"
    )
    for m in memberships:
        print(f"  - ID: {m.id}, Role: {m.role}, Created: {m.created_at}")

# Fix: Keep oldest, delete newer duplicates
print("\n--- Cleaning duplicates ---")
fixed_count = 0
for dup in duplicates:
    memberships = list(
        Membership.objects.filter(project_id=dup["project_id"], user_id=dup["user_id"]).order_by(
            "created_at"
        )
    )

    if len(memberships) > 1:
        # Keep first (oldest), delete rest
        to_delete = memberships[1:]
        for m in to_delete:
            print(f"Deleting duplicate: Project {m.project_id}, User {m.user_id}, ID {m.id}")
            m.delete()
            fixed_count += 1

print(f"\nFixed {fixed_count} duplicate memberships")
