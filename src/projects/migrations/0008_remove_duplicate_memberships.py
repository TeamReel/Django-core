# Generated manually on 2026-01-09
# Remove duplicate project memberships before adding unique constraint

from django.db import migrations


def remove_duplicate_memberships(apps, schema_editor):
    """
    Remove duplicate (project, user) memberships.
    Keep oldest membership, delete newer ones.
    """
    ProjectMembership = apps.get_model("projects", "ProjectMembership")
    db_alias = schema_editor.connection.alias

    # Find all (project_id, user_id) pairs that have duplicates
    from django.db.models import Count

    duplicates = (
        ProjectMembership.objects.using(db_alias)
        .values("project_id", "user_id")
        .annotate(count=Count("id"))
        .filter(count__gt=1, deleted_at__isnull=True)
    )

    removed_count = 0
    for dup in duplicates:
        # Get all memberships for this (project, user) pair, ordered by created_at
        memberships = list(
            ProjectMembership.objects.using(db_alias)
            .filter(
                project_id=dup["project_id"],
                user_id=dup["user_id"],
                deleted_at__isnull=True,
            )
            .order_by("created_at")
        )

        if len(memberships) > 1:
            # Keep first (oldest), soft-delete rest
            to_delete = memberships[1:]
            for membership in to_delete:
                # Soft delete to preserve audit trail
                membership.deleted_at = membership.updated_at
                membership.save(using=db_alias)
                removed_count += 1

    if removed_count > 0:
        print(f"Removed {removed_count} duplicate project memberships")


def reverse_func(apps, schema_editor):
    # Cannot reverse data migration
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0007_remove_project_user_unique_together"),
    ]

    operations = [
        migrations.RunPython(remove_duplicate_memberships, reverse_func),
    ]
