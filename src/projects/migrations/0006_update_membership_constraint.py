# Generated manually on 2026-01-07
# Update unique constraint to support multiple memberships per user (different roles/periods)

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0005_add_membership_metadata"),
    ]

    operations = [
        # Remove old constraint: unique (project, user)
        migrations.RemoveConstraint(
            model_name="projectmembership",
            name="unique_active_project_membership",
        ),
        # Add new constraint: unique (project, user, period, role)
        # This allows same user to have multiple memberships in same project
        # (e.g., Remko as Keeper + Remko as Assistant Coach)
        migrations.AddConstraint(
            model_name="projectmembership",
            constraint=models.UniqueConstraint(
                fields=["project", "user", "period", "role"],
                condition=models.Q(deleted_at__isnull=True),
                name="unique_project_user_period_role",
            ),
        ),
    ]
