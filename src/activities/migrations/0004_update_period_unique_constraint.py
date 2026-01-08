# Generated manually to update Period unique constraint for team-scoped periods

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("activities", "0003_add_teamreel_hierarchy"),
    ]

    operations = [
        # 1. Remove old constraint
        migrations.RemoveConstraint(
            model_name="period",
            name="unique_period_per_org",
        ),
        # 2. Add new constraint (includes project_id, NULL-safe)
        migrations.AddConstraint(
            model_name="period",
            constraint=models.UniqueConstraint(
                fields=["organisation", "project", "name", "start_date"],
                name="unique_period_per_org_project",
                # This allows multiple org-wide periods (project=NULL) with same name
                # AND multiple team-scoped periods (project=X) with same name
            ),
        ),
    ]
