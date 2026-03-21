"""Replace invalid permission strings with valid ProjectMembership roles in
WorkflowTemplate.definition and WorkflowInstance.workflow_snapshot.

Fixes: can_approve, can_submit, can_approve_invoice → valid roles."""

import copy

from django.db import migrations

# Mapping from invalid permission strings to valid ProjectMembership roles.
# Aligned with RBAC config (documents/05-demo/archive/teamreel-rbac-config.md):
#   - content.approve → admin, editor (Team/Club/Land Admin)
#   - content.create (submit) → admin, editor, viewer (all members)
#   - invoice approve → admin only
PERMISSION_REPLACEMENTS = {
    "can_approve": ["admin", "editor"],
    "can_submit": ["admin", "editor", "viewer"],
    "can_approve_invoice": ["admin"],
}


def fix_permissions(apps, schema_editor):
    """Walk transitions in definitions/snapshots and replace invalid permissions."""
    WorkflowTemplate = apps.get_model("workflows", "WorkflowTemplate")
    WorkflowInstance = apps.get_model("workflows", "WorkflowInstance")

    def patch_definition(definition):
        """Return (patched_definition, changed) tuple."""
        changed = False
        patched = copy.deepcopy(definition)
        for transition in patched.get("transitions", []):
            perms = transition.get("permissions", [])
            for old_perm, new_roles in PERMISSION_REPLACEMENTS.items():
                if old_perm in perms:
                    transition["permissions"] = new_roles
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
