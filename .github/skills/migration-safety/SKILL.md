---
name: migration-safety
description: "Audits Django migrations for destructive operations and generates safe alternatives. Use when creating a migration, reviewing schema changes, renaming fields, or removing models."
compatibility: "Requires Django 5, PostgreSQL."
metadata:
  author: teamreel
  argument-hint: "Migration file path or app name (e.g. 'organisations/0043_add_slug')"
---

# Migration Safety Audit

Audit Django migrations for destructive operations and generate safe alternatives.

## The Golden Rule

> **NEVER DROP TABLES. NEVER REMOVE FIELDS without a deprecation cycle.**

## Dangerous Operations Detector

Scan the migration file for these red flags:

| Operation | Risk | Safe Alternative |
|-----------|------|-----------------|
| `DeleteModel` | Data loss | Soft-delete: set `is_active=False`, stop querying |
| `RemoveField` | Data loss | Mark nullable first, stop writing, then remove later |
| `AlterField` removing `null=True` | Breaks existing rows | Keep nullable, add validation in serializer |
| `RunSQL` without `reverse_sql` | Irreversible | Always provide `reverse_sql` |
| `RunPython` without `reverse_code` | Irreversible | Always provide reverse function or `RunPython.noop` |
| `AlterUniqueTogether` removing constraints | Silent data corruption | Verify data integrity before removing |
| `RenameField` | Can break running code | Add new field → copy data → deprecate old |

## Safe Field Addition Pattern

```python
# ✅ New fields MUST be nullable or have a default
new_field = models.CharField(max_length=100, null=True, blank=True)
new_int = models.IntegerField(default=0)
new_fk = models.ForeignKey('app.Model', null=True, on_delete=models.SET_NULL)
```

## Safe Field Removal (4-step cycle)

```
Migration 1: Make field nullable (null=True, blank=True)
Deploy 1:    Stop writing to the field in code
Deploy 2:    Stop reading the field in code
Migration 2: Remove the field (safe because nothing uses it)
```

## Data Migration Template

```python
from django.db import migrations

def forward(apps, schema_editor):
    Model = apps.get_model('app', 'Model')
    for obj in Model.objects.filter(is_active=True).iterator():
        obj.new_field = compute_value(obj)
        obj.save(update_fields=['new_field'])

def reverse(apps, schema_editor):
    # Either undo the change or noop
    pass

class Migration(migrations.Migration):
    dependencies = [('app', '0042_previous')]
    operations = [
        migrations.RunPython(forward, reverse),
    ]
```

## Audit Procedure

1. Read the migration file
2. Check each operation against the Dangerous Operations table
3. For each dangerous operation, propose a safe alternative
4. Verify the migration has `dependencies` set correctly
5. Test: `python manage.py migrate <app>` (forward)
6. Test: `python manage.py migrate <app> <previous>` (backward — must work)
7. Check: `python manage.py showmigrations <app>` (clean state)

## Output Format

```markdown
## Migration Audit: [migration_name]

### Status: ✅ SAFE / ⚠️ ISSUES FOUND

### Operations
| # | Operation | Status | Notes |
|---|-----------|--------|-------|

### Recommendations
- ...
```
