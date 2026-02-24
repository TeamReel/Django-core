"""
Add period_type field to Period model.
Mirrors Project.team_type to allow legend-specific features at the season level.
"""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("activities", "0007_add_sport_to_period"),
    ]

    operations = [
        migrations.AddField(
            model_name="period",
            name="period_type",
            field=models.CharField(
                choices=[("regular", "Regulier"), ("legends", "Legends")],
                default="regular",
                help_text="Period type (regular, legends). Enables legend-specific features like lineup videos.",
                max_length=20,
            ),
        ),
    ]
