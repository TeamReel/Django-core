# Generated manually on 2026-01-09
# Remove duplicate project memberships before adding unique constraint

from django.db import migrations


def remove_duplicate_memberships(apps, schema_editor):
    """
    Remove duplicate (project, user) memberships.
    Keep oldest membership, delete newer ones.

    DISABLED: Too slow for production deployment, causes timeout.
    Run manually after deployment: python manage.py remove_duplicate_memberships
    """
    # Skip for now - run via management command instead
    print("Skipping duplicate removal (run manage.py fix_duplicate_memberships manually)")


def reverse_func(apps, schema_editor):
    # Cannot reverse data migration
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0007_remove_project_user_unique_together"),
    ]

    operations = [
        migrations.RunPython(remove_duplicate_memberships, reverse_func),
    ]
