from django.db import migrations


FLAG_KEY = "content__pre_match__lineup_flyer"


def enable_lineup_flyer_flag(apps, _schema_editor):
    FeatureFlag = apps.get_model("settings", "FeatureFlag")

    # Enable any existing flags (GLOBAL / ORG / PROJECT / USER)
    FeatureFlag.objects.filter(key=FLAG_KEY).update(enabled=True)

    # Ensure a GLOBAL baseline exists and is enabled (deny-by-default system)
    FeatureFlag.objects.update_or_create(
        key=FLAG_KEY,
        scope_type="GLOBAL",
        user=None,
        organisation=None,
        project=None,
        defaults={
            "enabled": True,
            "description": "Enable Lineup Flyer content templates",
        },
    )


def noop_reverse(_apps, _schema_editor):
    # Intentionally no-op: we don't want to auto-disable the feature.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("settings", "0005_add_user_scope"),
    ]

    operations = [
        migrations.RunPython(enable_lineup_flyer_flag, reverse_code=noop_reverse),
    ]
