"""Rename logo_light → logo, remove logo_dark.

The naming convention for AI-processed assets is:
  - Raw upload: {type}_upload  (e.g. logo_upload, kit_home_upload)
  - AI processed: {type}       (e.g. logo, kit_home, sponsor_logo)

Previously the logo used "logo_light" / "logo_dark" which implied a
light/dark mode variant that doesn't exist.  This migration:
  1. Renames all logo_light records to logo
  2. Removes logo_dark records (reassigns to logo if any exist)
  3. Updates the choices on the model field
"""

from django.db import migrations


def rename_logo_types(apps, schema_editor):
    """Rename logo_light → logo, logo_dark → logo (merge)."""
    BrandAsset = apps.get_model("branding", "BrandAsset")

    # First: rename logo_dark to logo (unlikely to exist, but safe)
    BrandAsset.objects.filter(asset_type="logo_dark").update(asset_type="logo")

    # Then: rename logo_light to logo
    # Use update_or_create pattern to avoid unique constraint violations
    # (profile, asset_type) is unique — if a profile already has a "logo"
    # from the logo_dark rename above, we skip that profile's logo_light.
    for asset in BrandAsset.objects.filter(asset_type="logo_light"):
        existing = BrandAsset.objects.filter(
            profile=asset.profile,
            asset_type="logo",
        ).first()
        if existing:
            # Profile already has a "logo" (from logo_dark merge) — deactivate duplicate
            asset.is_active = False
            asset.asset_type = "logo"
            # Avoid unique constraint by deleting the old record
            asset.delete()
        else:
            asset.asset_type = "logo"
            asset.save(update_fields=["asset_type"])


def reverse_rename(apps, schema_editor):
    """Reverse: logo → logo_light."""
    BrandAsset = apps.get_model("branding", "BrandAsset")
    BrandAsset.objects.filter(asset_type="logo").update(asset_type="logo_light")


class Migration(migrations.Migration):
    dependencies = [
        ("branding", "0003_expand_asset_type_choices"),
    ]

    operations = [
        # 1. Data migration: rename existing records
        migrations.RunPython(rename_logo_types, reverse_rename),
        # 2. Update field choices on the model
        migrations.AlterField(
            model_name="brandasset",
            name="asset_type",
            field=migrations.models.CharField(
                max_length=50,
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
                    ("kit_goalkeeper_combined", "Goalkeeper Kit (Combined: Kit+Logo+Sponsor)"),
                    ("kit_coach_upload", "Coach Kit (Raw Upload)"),
                    ("kit_coach", "Coach Kit (AI Processed)"),
                    ("kit_coach_combined", "Coach Kit (Combined: Kit+Logo+Sponsor)"),
                    ("kit_assistant_upload", "Assistant Kit (Raw Upload)"),
                    ("kit_assistant", "Assistant Kit (AI Processed)"),
                    ("kit_assistant_combined", "Assistant Kit (Combined: Kit+Logo+Sponsor)"),
                    ("kit_training_upload", "Training Kit (Raw Upload)"),
                    ("kit_training", "Training Kit (AI Processed)"),
                    ("kit_training_combined", "Training Kit (Combined: Kit+Logo+Sponsor)"),
                    ("stadium_background", "Stadium/Pitch Background"),
                    ("location_photo", "Location Photo"),
                    ("other", "Other"),
                ],
            ),
        ),
    ]
