# Generated manually on 2026-01-26
# Restore unique constraint: one active membership per (project, user)

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0013_update_project_slug_constraints"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="projectmembership",
            name="unique_project_user_period_role",
        ),
        migrations.AddConstraint(
            model_name="projectmembership",
            constraint=models.UniqueConstraint(
                fields=["project", "user"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_active_project_membership",
            ),
        ),
    ]
