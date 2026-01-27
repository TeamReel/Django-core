from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_create_groups"),
        ("organisations", "0003_add_metadata_fields"),
        ("projects", "0014_restore_unique_active_project_membership"),
        ("activities", "0006_activity_slug"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserActiveContext",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "club",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="projects.project",
                    ),
                ),
                (
                    "competition",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="activities.period",
                    ),
                ),
                (
                    "match",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="activities.activity",
                    ),
                ),
                (
                    "organisation",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="organisations.organisation",
                    ),
                ),
                (
                    "season",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="activities.period",
                    ),
                ),
                (
                    "team",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="+",
                        to="projects.project",
                    ),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="active_context",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "accounts_user_active_context",
            },
        ),
        migrations.AddIndex(
            model_name="useractivecontext",
            index=models.Index(fields=["user"], name="accounts_us_user_id_0f095c_idx"),
        ),
        migrations.AddIndex(
            model_name="useractivecontext",
            index=models.Index(fields=["organisation"], name="accounts_us_organis_1b9466_idx"),
        ),
        migrations.AddIndex(
            model_name="useractivecontext",
            index=models.Index(fields=["club"], name="accounts_us_club_id_7e5b8d_idx"),
        ),
        migrations.AddIndex(
            model_name="useractivecontext",
            index=models.Index(fields=["team"], name="accounts_us_team_id_1a7c20_idx"),
        ),
    ]
