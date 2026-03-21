"""Replace invalid 'can_approve' permission with ['admin', 'editor'] in
WorkflowTemplate.definition and WorkflowInstance.workflow_snapshot."""

import copy

from django.db import migrations


def fix_permissions(apps, schema_editor):
    """Walk transitions in definitions/snapshots and replace 'can_approve'."""
    WorkflowTemplate = apps.get_model("workflows", "WorkflowTemplate")
    WorkflowInstance = apps.get_model("workflows", "WorkflowInstance")

    valid_replacement = ["admin", "editor"]

    def patch_definition(definition):
        """Return (patched_definition, changed) tuple."""
        changed = False
        patched = copy.deepcopy(definition)
        for transition in patched.get("transitions", []):
            perms = transition.get("permissions", [])
            if "can_approve" in perms:
                transition["permissions"] = valid_replacement
                changed = True
        return patched, changed

    # Fix templates
    for tpl in WorkflowTemplate.objects.all():
        patched, changed = patch_definition(tpl.definition)
        if changed:
            tpl.definition = patched
            tpl.save(update_fields=["definition"])

    # Fix instance snapshots
    for inst in WorkflowInstance.objects.all():
        patched, changed = patch_definition(inst.workflow_snapshot)
        if changed:
            inst.workflow_snapshot = patched
            inst.save(update_fields=["workflow_snapshot"])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("workflows", "0002_alter_workflowinstance_object_id_to_charfield"),
    ]

    operations = [
        migrations.RunPython(fix_permissions, noop),
    ]
