# Generated manually on 2026-01-09
# Restore unique constraint: one active membership per (project, user)

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0007_remove_project_user_unique_together"),
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
