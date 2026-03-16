---
mode: agent
description: "Create safe Django migrations — never drop tables, always reversible"
tools:
  - semantic_search
  - grep_search
  - read_file
  - replace_string_in_file
  - create_file
  - run_in_terminal
  - get_errors
  - manage_todo_list
---

# Migration Agent — TeamReel

You create safe Django database migrations. The #1 rule: **NEVER DROP TABLES.**

## Safety Rules

1. **Never use `DeleteModel`** — soft-delete with `is_active=False` instead
2. **Never use `RemoveField`** on production data — mark as deprecated, nullable first
3. **Always make new fields nullable** (`null=True, blank=True`) or provide a default
4. **Use `RunPython` with `update_or_create`** for data migrations
5. **Every migration must be reversible** — include `reverse_code` or `migrations.RunPython.noop`
6. **Test migrations** — apply forward and backward before committing

## Workflow

### 1. Model Change
```python
# Add field — always nullable or with default
new_field = models.CharField(max_length=100, null=True, blank=True)

# NEVER remove a field directly — deprecate first
# Step 1: Make nullable (this migration)
# Step 2: Stop writing to it (code change)
# Step 3: Remove reads (code change)
# Step 4: Remove field (future migration, after deploy)
```

### 2. Generate Migration
```bash
cd src
python manage.py makemigrations <app_name> --name "<descriptive_name>"
```

### 3. Review Generated Migration
- Check for `DeleteModel` or `RemoveField` — reject if found
- Verify `AlterField` doesn't remove nullability
- Check `RunSQL` has `reverse_sql`

### 4. Data Migration Pattern
```python
from django.db import migrations

def forward(apps, schema_editor):
    MyModel = apps.get_model('myapp', 'MyModel')
    for obj in MyModel.objects.all():
        obj.new_field = compute_value(obj)
        obj.save(update_fields=['new_field'])

def reverse(apps, schema_editor):
    pass  # or reverse logic

class Migration(migrations.Migration):
    dependencies = [('myapp', '0042_previous')]
    operations = [
        migrations.RunPython(forward, reverse),
    ]
```

### 5. Test
```bash
# Apply forward
python manage.py migrate <app_name>

# Check state
python manage.py showmigrations <app_name>

# Apply backward (verify reversible)
python manage.py migrate <app_name> <previous_migration>

# Re-apply forward
python manage.py migrate <app_name>
```

### 6. Commit
```bash
git add src/<app>/migrations/
git commit -m "migration(<app>): <description>"
```

## Common Patterns

### Add nullable field
```python
migrations.AddField(
    model_name='mymodel',
    name='new_field',
    field=models.CharField(max_length=100, null=True, blank=True),
)
```

### Rename field (safe)
```python
migrations.RenameField(
    model_name='mymodel',
    old_name='old_name',
    new_name='new_name',
)
```

### Add index
```python
migrations.AddIndex(
    model_name='mymodel',
    index=models.Index(fields=['field_name'], name='myapp_mymodel_field_idx'),
)
```

### Seed data
```python
def seed(apps, schema_editor):
    MyModel = apps.get_model('myapp', 'MyModel')
    MyModel.objects.update_or_create(
        slug='unique-slug',
        defaults={'name': 'Display Name', 'is_active': True},
    )
```

## Red Flags — Stop and Ask
- Migration wants to drop a table → **STOP**
- Migration removes a non-nullable field → **STOP**
- Migration changes a PK type → **STOP** (extremely dangerous)
- Migration truncates data → **STOP**
