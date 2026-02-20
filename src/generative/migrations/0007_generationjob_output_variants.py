"""Add output_variants JSONField to GenerationJob for multi-variant review."""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("generative", "0006_generationjob_approval_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="generationjob",
            name="output_variants",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text=(
                    "All generated output variants. Each entry: "
                    "{variant_index, storage_path, file_asset_id, mime_type, filename, approved}"
                ),
            ),
        ),
    ]
