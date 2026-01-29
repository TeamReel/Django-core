from __future__ import annotations

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_user_avatar_and_two_factor"),
        ("projects", "0014_restore_unique_active_project_membership"),
    ]

    operations = [
        migrations.AddField(
            model_name="useractivecontext",
            name="membership",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="+",
                to="projects.projectmembership",
            ),
        ),
        migrations.AddIndex(
            model_name="useractivecontext",
            index=models.Index(fields=["membership"], name="accounts_us_membersh_8b3f70_idx"),
        ),
    ]
