"""Add team_type field to Project for team classification (regular, legends)."""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0016_allow_per_period_membership"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="team_type",
            field=models.CharField(
                choices=[("regular", "Regulier"), ("legends", "Legends")],
                default="regular",
                help_text="Team type (regular, legends). Only meaningful for child projects (teams).",
                max_length=20,
            ),
        ),
    ]
