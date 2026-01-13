from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("activities", "0004_update_period_unique_constraint"),
        ("organisations", "0001_initial"),
        ("projects", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ActivityEvent",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                (
                    "event_type",
                    models.CharField(
                        help_text="Event type (goal, assist, card_yellow, injury, substitution, etc.)",
                        max_length=64,
                    ),
                ),
                (
                    "minute",
                    models.PositiveSmallIntegerField(
                        blank=True,
                        help_text="Match minute (TeamReel). Leave empty for non-timed events.",
                        null=True,
                    ),
                ),
                (
                    "occurred_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Absolute timestamp for the event (optional).",
                        null=True,
                    ),
                ),
                (
                    "data",
                    models.JSONField(blank=True, default=dict, help_text="Event-specific metadata"),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "activity",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="events",
                        to="activities.activity",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_activity_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "member",
                    models.ForeignKey(
                        blank=True,
                        help_text="Primary actor (scorer, injured player, etc).",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="activity_events",
                        to="organisations.membership",
                    ),
                ),
                (
                    "related_member",
                    models.ForeignKey(
                        blank=True,
                        help_text="Secondary actor (assist, player_in, etc).",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="related_activity_events",
                        to="organisations.membership",
                    ),
                ),
                (
                    "team_project",
                    models.ForeignKey(
                        blank=True,
                        help_text="Optional project/team context for the event.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="activity_events",
                        to="projects.project",
                    ),
                ),
            ],
            options={
                "db_table": "activities_activityevent",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="activityevent",
            index=models.Index(
                fields=["activity", "event_type"], name="activities__activit_55ce00_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="activityevent",
            index=models.Index(fields=["event_type"], name="activities__event_t_ea0bb9_idx"),
        ),
        migrations.AddIndex(
            model_name="activityevent",
            index=models.Index(
                fields=["activity", "minute"], name="activities__activit_878eca_idx"
            ),
        ),
    ]
