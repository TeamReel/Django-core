# Data migration: remove short_intro from lineup_flyer asset_types
# Lineup flyers are static PNGs — they only need in_tenue + closeup, not intro videos.

from django.db import migrations


def fix_lineup_flyer_requirements(apps, _schema_editor):
    ContentTemplate = apps.get_model("content_generation", "ContentTemplate")

    updated = 0
    for tpl in ContentTemplate.objects.filter(template_subtype="lineup_flyer"):
        reqs = tpl.input_requirements or {}
        members = reqs.get("members", {})
        changed = False

        for role_key in ("goalkeeper", "player"):
            role_cfg = members.get(role_key, {})
            asset_types = role_cfg.get("asset_types", [])
            if "short_intro" in asset_types:
                role_cfg["asset_types"] = [a for a in asset_types if a != "short_intro"]
                changed = True

        if changed:
            tpl.input_requirements = reqs
            tpl.save(update_fields=["input_requirements"])
            updated += 1

    if updated:
        print(f"  Fixed {updated} lineup_flyer template(s): removed short_intro from asset_types")


def reverse_fix(apps, _schema_editor):
    ContentTemplate = apps.get_model("content_generation", "ContentTemplate")

    for tpl in ContentTemplate.objects.filter(template_subtype="lineup_flyer"):
        reqs = tpl.input_requirements or {}
        members = reqs.get("members", {})

        for role_key in ("goalkeeper", "player"):
            role_cfg = members.get(role_key, {})
            asset_types = role_cfg.get("asset_types", [])
            if "short_intro" not in asset_types:
                role_cfg["asset_types"] = asset_types + ["short_intro"]

        tpl.input_requirements = reqs
        tpl.save(update_fields=["input_requirements"])


class Migration(migrations.Migration):
    dependencies = [
        ("content_generation", "0012_add_lineup_flyer_templates"),
    ]

    operations = [
        migrations.RunPython(fix_lineup_flyer_requirements, reverse_fix),
    ]
