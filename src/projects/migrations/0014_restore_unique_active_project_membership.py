# Generated manually on 2026-01-26
# Restore unique constraint: one active membership per (project, user)

from django.db import migrations, models


def dedupe_active_project_memberships(apps, schema_editor):
    """Soft-delete duplicate active memberships so the unique constraint can be added safely.

    The unique constraint is conditional on deleted_at IS NULL. In older DBs
    that missed the constraint, duplicates may exist.
    """

    from django.db.models import Count
    from django.utils import timezone

    ProjectMembership = apps.get_model("projects", "ProjectMembership")

    duplicates = (
        ProjectMembership.objects.using(schema_editor.connection.alias)
        .filter(deleted_at__isnull=True)
        .values("project_id", "user_id")
        .annotate(c=Count("id"))
        .filter(c__gt=1)
    )

    now = timezone.now()

    for row in duplicates.iterator():
        project_id = row["project_id"]
        user_id = row["user_id"]

        active = list(
            ProjectMembership.objects.using(schema_editor.connection.alias)
            .filter(project_id=project_id, user_id=user_id, deleted_at__isnull=True)
            .order_by("-updated_at", "-created_at")
        )
        if len(active) <= 1:
            continue

        keep = active[0]
        to_soft_delete = [m.id for m in active[1:]]
        ProjectMembership.objects.using(schema_editor.connection.alias).filter(
            id__in=to_soft_delete,
            deleted_at__isnull=True,
        ).exclude(id=keep.id).update(deleted_at=now)


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0013_update_project_slug_constraints"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="projectmembership",
            name="unique_project_user_period_role",
        ),
        migrations.RunPython(dedupe_active_project_memberships, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="projectmembership",
            constraint=models.UniqueConstraint(
                fields=["project", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_project_membership",
            ),
        ),
    ]
