from django.db import migrations, models
from django.db.models import Q
from django.db.models.functions import Lower


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0011_alter_projectfunctionalroleassignment_assignment_reason_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="project",
            name="unique_project_name_per_org_case_insensitive",
        ),
        migrations.AddConstraint(
            model_name="project",
            constraint=models.UniqueConstraint(
                Lower("name"),
                "organisation",
                condition=Q(parent_project__isnull=True),
                name="unique_root_project_name_per_org_ci",
            ),
        ),
        migrations.AddConstraint(
            model_name="project",
            constraint=models.UniqueConstraint(
                Lower("name"),
                "organisation",
                "parent_project",
                condition=Q(parent_project__isnull=False),
                name="unique_child_project_name_per_parent_ci",
            ),
        ),
    ]
