"""Migration: Add GenerationJob model for AI workflow queue."""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("generative", "0004_add_lineup_flyer_subtype"),
    ]

    operations = [
        migrations.CreateModel(
            name="GenerationJob",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "task_id",
                    models.UUIDField(
                        db_index=True, unique=True, help_text="Matches Redis cache task key"
                    ),
                ),
                (
                    "template_id",
                    models.CharField(
                        db_index=True, max_length=100, help_text="e.g. fullbody_in_tenue"
                    ),
                ),
                (
                    "label",
                    models.CharField(
                        blank=True, max_length=255, help_text="Human-readable job description"
                    ),
                ),
                (
                    "output_type",
                    models.CharField(default="image", max_length=20, help_text="image | video"),
                ),
                (
                    "output_asset_type",
                    models.CharField(
                        blank=True, max_length=100, help_text="e.g. kit, closeup, intro"
                    ),
                ),
                (
                    "project_id",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=100,
                        null=True,
                        help_text="Project slug or UUID",
                    ),
                ),
                (
                    "membership_id",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        max_length=100,
                        null=True,
                        help_text="ProjectMembership UUID",
                    ),
                ),
                (
                    "created_by_id",
                    models.IntegerField(
                        blank=True,
                        db_index=True,
                        null=True,
                        help_text="User.id who triggered the job",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("queued", "In wachtrij"),
                            ("waiting", "Wachten"),
                            ("processing", "Wordt verwerkt"),
                            ("completed", "Voltooid"),
                            ("failed", "Mislukt"),
                            ("cancelled", "Geannuleerd"),
                        ],
                        db_index=True,
                        default="queued",
                        max_length=20,
                    ),
                ),
                (
                    "progress",
                    models.PositiveSmallIntegerField(default=0, help_text="0-100 percentage"),
                ),
                ("error_message", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Generation Job",
                "verbose_name_plural": "Generation Jobs",
                "db_table": "generative_job",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["created_by_id", "status"], name="gen_job_user_status_idx"
                    ),
                    models.Index(
                        fields=["project_id", "created_at"], name="gen_job_proj_created_idx"
                    ),
                    models.Index(
                        fields=["status", "created_at"], name="gen_job_status_created_idx"
                    ),
                ],
            },
        ),
    ]
