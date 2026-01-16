# Generated manually on 2026-01-16

import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0008_remove_duplicate_memberships"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectFunctionalRoleAssignment",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        primary_key=True,
                        default=uuid.uuid4,
                        editable=False,
                        serialize=False,
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        max_length=32,
                        choices=[
                            ("coach", "Coach"),
                            ("player", "Player"),
                            ("keeper", "Keeper"),
                            ("assistant", "Assistant"),
                            ("verzorger", "Verzorger"),
                            ("supporter", "Supporter"),
                            ("manager", "Manager"),
                        ],
                    ),
                ),
                (
                    "assignment_reason",
                    models.CharField(
                        max_length=20,
                        choices=[("manual", "Manual"), ("imported", "Imported")],
                        default="manual",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="functional_role_assignments",
                        to="projects.project",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="project_functional_roles",
                        to="accounts.user",
                    ),
                ),
            ],
            options={
                "db_table": "projects_functional_role_assignment",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="projectfunctionalroleassignment",
            constraint=models.UniqueConstraint(
                fields=("project", "user", "role"),
                name="unique_project_user_functional_role",
            ),
        ),
        migrations.AddIndex(
            model_name="projectfunctionalroleassignment",
            index=models.Index(fields=["project", "role"], name="proj_funcrole_proj_role_idx"),
        ),
        migrations.AddIndex(
            model_name="projectfunctionalroleassignment",
            index=models.Index(fields=["user"], name="proj_funcrole_user_idx"),
        ),
    ]
