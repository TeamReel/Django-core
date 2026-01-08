# Generated manually on 2026-01-07
# Add metadata JSONField to ProjectMembership for storing position, shirt_number, etc.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0004_add_teamreel_hierarchy"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectmembership",
            name="metadata",
            field=models.JSONField(
                default=dict,
                blank=True,
                help_text="Additional membership data (position, shirt_number, etc.)",
            ),
        ),
    ]
