"""Add club_background asset type, label field, and conditional unique constraint."""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("branding", "0005_alter_brandasset_asset_type"),
    ]

    operations = [
        # 1. Add label field
        migrations.AddField(
            model_name="brandasset",
            name="label",
            field=models.CharField(
                blank=True,
                help_text="Optional display label for multi-instance types (e.g. club backgrounds)",
                max_length=100,
            ),
        ),
        # 2. Remove old unique constraint
        migrations.RemoveConstraint(
            model_name="brandasset",
            name="unique_asset_type_per_profile",
        ),
        # 3. Add conditional unique constraint (excludes club_background)
        migrations.AddConstraint(
            model_name="brandasset",
            constraint=models.UniqueConstraint(
                condition=~models.Q(asset_type="club_background"),
                fields=("profile", "asset_type"),
                name="unique_asset_type_per_profile",
            ),
        ),
        # 4. Update asset_type choices to include club_background
        migrations.AlterField(
            model_name="brandasset",
            name="asset_type",
            field=models.CharField(
                choices=[
                    ("logo_upload", "Logo (Raw Upload)"),
                    ("logo", "Logo (AI Processed)"),
                    ("watermark", "Watermark"),
                    ("favicon", "Favicon"),
                    ("font_file", "Font File"),
                    ("sponsor_logo_upload", "Sponsor Logo (Raw Upload)"),
                    ("sponsor_logo", "Sponsor Logo (AI Processed)"),
                    ("kit_home_upload", "Home Kit (Raw Upload)"),
                    ("kit_home", "Home Kit (AI Processed)"),
                    ("kit_home_combined", "Home Kit (Combined: Kit+Logo+Sponsor)"),
                    ("kit_away_upload", "Away Kit (Raw Upload)"),
                    ("kit_away", "Away Kit (AI Processed)"),
                    ("kit_away_combined", "Away Kit (Combined: Kit+Logo+Sponsor)"),
                    ("kit_third_upload", "Third Kit (Raw Upload)"),
                    ("kit_third", "Third Kit (AI Processed)"),
                    ("kit_third_combined", "Third Kit (Combined: Kit+Logo+Sponsor)"),
                    ("kit_goalkeeper_upload", "Goalkeeper Kit (Raw Upload)"),
                    ("kit_goalkeeper", "Goalkeeper Kit (AI Processed)"),
                    (
                        "kit_goalkeeper_combined",
                        "Goalkeeper Kit (Combined: Kit+Logo+Sponsor)",
                    ),
                    ("kit_coach_upload", "Coach Kit (Raw Upload)"),
                    ("kit_coach", "Coach Kit (AI Processed)"),
                    (
                        "kit_coach_combined",
                        "Coach Kit (Combined: Kit+Logo+Sponsor)",
                    ),
                    ("kit_assistant_upload", "Assistant Kit (Raw Upload)"),
                    ("kit_assistant", "Assistant Kit (AI Processed)"),
                    (
                        "kit_assistant_combined",
                        "Assistant Kit (Combined: Kit+Logo+Sponsor)",
                    ),
                    ("kit_training_upload", "Training Kit (Raw Upload)"),
                    ("kit_training", "Training Kit (AI Processed)"),
                    (
                        "kit_training_combined",
                        "Training Kit (Combined: Kit+Logo+Sponsor)",
                    ),
                    ("kit_legacy_upload", "Legacy Kit (Raw Upload)"),
                    ("kit_legacy", "Legacy Kit (AI Processed)"),
                    (
                        "kit_legacy_combined",
                        "Legacy Kit (Combined: Kit+Logo+Sponsor)",
                    ),
                    ("stadium_background", "Stadium/Pitch Background"),
                    ("location_photo", "Location Photo"),
                    ("club_background", "Club Background (Custom)"),
                    ("other", "Other"),
                ],
                max_length=50,
            ),
        ),
    ]
