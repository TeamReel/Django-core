# Updating Existing Features

This guide explains how to modify existing features in Django Core-App, including when to update vs. create new features, backward compatibility, and the update workflow.

## When to Update vs. Create New

### Update Existing Feature When

- ✅ Fixing bugs in current behavior
- ✅ Adding minor enhancements
- ✅ Improving performance
- ✅ Extending existing APIs non-breaking
- ✅ Adding configuration options
- ✅ Updating documentation

### Create New Feature When

- 🆕 Fundamentally changing behavior
- 🆕 Adding major new functionality
- 🆕 Breaking existing APIs
- 🆕 Introducing new architectural patterns
- 🆕 Adding new modules or apps

### Decision Checklist

| Question | If Yes | If No |
|----------|--------|-------|
| Does this break existing API contracts? | New feature | Update |
| Does this require database migrations with data loss? | New feature | Update |
| Is this a significant architectural change? | New feature | Update |
| Does this affect more than one existing feature? | Consider new | Update |
| Is this a simple enhancement to existing behavior? | Update | — |

---

## Update Workflow

### 1. Identify the Feature

Find the existing feature specification:

```
kitty-specs/<feature-id>/
├── spec.md           # Original specification
├── plan.md           # Implementation plan
├── tasks.md          # Work packages
└── tasks/done/       # Completed work packages
```

### 2. Document the Change

Create an update section in the existing spec or create a new ADR:

**Minor Updates** → Add to existing spec.md:

```markdown
## Updates

### 2025-12-05: Add avatar support

**Reason**: User feedback requested profile pictures

**Changes**:
- Add `avatar` field to User model
- Add avatar upload endpoint
- Display avatar in UI header

**Migration**: Non-breaking addition
```

**Major Updates** → Create new ADR:

```markdown
# ADR-XXX: User Avatar System

## Status
Accepted

## Context
Users have requested the ability to add profile pictures...

## Decision
Add avatar support using S3 storage...

## Consequences
- Requires S3 bucket configuration
- Increases storage costs
- Migration adds nullable field
```

### 3. Update the Specification

Modify `spec.md` with new requirements:

```markdown
## Functional Requirements

### Existing
- FR-001: User registration with email
- FR-002: Password reset via email

### Added (2025-12-05)
- FR-010: User can upload avatar image
- FR-011: Avatar displayed in header
- FR-012: Default avatar for users without upload
```

### 4. Create Work Package

Add new work package to `tasks.md`:

```markdown
## Work Package WP12: Avatar Support (Priority: P1)

**Goal**: Add user avatar upload and display
**Prompt**: `tasks/planned/WP12-avatar-support.md`

### Subtasks
- [ ] T120 Add avatar field to User model
- [ ] T121 Create avatar upload endpoint
- [ ] T122 [P] Add avatar display component
- [ ] T123 [P] Write avatar tests
```

### 5. Implement Following Standard Workflow

Use the normal [Spec Kitty Workflow](spec-kitty-workflow.md):

```bash
/spec-kitty.implement  # Implement WP12
/spec-kitty.review     # Review changes
/spec-kitty.accept     # Accept when complete
```

---

## Backward Compatibility

### Breaking Change Policy

**Definition**: A breaking change is any modification that:
- Changes existing API response format
- Removes or renames fields
- Changes required parameters
- Modifies default behavior
- Requires client code changes

### Handling Breaking Changes

When breaking changes are necessary:

1. **Document in ADR**
   ```markdown
   ## ADR-XXX: Deprecate Legacy Auth Endpoints

   ### Breaking Changes
   - `/api/v1/auth/login/` removed in favor of `/api/v2/auth/token/`
   - Response format changed from `{token}` to `{access, refresh}`
   ```

2. **Provide Migration Period**
   - Keep old endpoint working
   - Add deprecation warnings
   - Document migration steps

3. **Version the API**
   ```
   /api/v1/users/  → Old format (deprecated)
   /api/v2/users/  → New format
   ```

4. **Communicate to Users**
   - Update CHANGELOG
   - Add deprecation notices to docs
   - Notify via release notes

### Non-Breaking Additions

Safe additions that don't break compatibility:

```python
# SAFE: New optional field with default
class User(models.Model):
    avatar = models.ImageField(null=True, blank=True)  # ✅

# SAFE: New endpoint
urlpatterns = [
    path("users/<int:pk>/avatar/", AvatarUploadView.as_view()),  # ✅
]

# SAFE: New optional parameter
def get_users(active_only: bool = True):  # ✅
    ...
```

---

## Database Migrations

### Safe Migrations

**Adding Fields:**
```python
# ✅ Safe: New nullable field
migrations.AddField(
    model_name='user',
    name='avatar',
    field=models.ImageField(null=True, blank=True),
)

# ✅ Safe: New field with default
migrations.AddField(
    model_name='user',
    name='notification_enabled',
    field=models.BooleanField(default=True),
)
```

### Dangerous Migrations

**Removing Fields:**
```python
# ⚠️ Dangerous: Data loss
migrations.RemoveField(
    model_name='user',
    name='legacy_id',
)
```

**Mitigation:**
1. Mark field as deprecated
2. Stop writing to field
3. Wait for next major version
4. Remove in migration

**Renaming Fields:**
```python
# ⚠️ Dangerous: Breaks queries
migrations.RenameField(
    model_name='user',
    old_name='name',
    new_name='full_name',
)
```

**Mitigation:**
1. Add new field
2. Copy data in data migration
3. Update code to use new field
4. Remove old field later

### Data Migrations

For complex data transformations:

```python
from django.db import migrations


def copy_name_to_full_name(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    for user in User.objects.all():
        user.full_name = f"{user.first_name} {user.last_name}"
        user.save(update_fields=['full_name'])


class Migration(migrations.Migration):
    dependencies = [
        ('accounts', '0005_add_full_name'),
    ]

    operations = [
        migrations.RunPython(copy_name_to_full_name),
    ]
```

---

## Updating Tests

### Adding Tests for New Behavior

```python
class TestUserAvatar:
    """Tests for new avatar functionality."""

    def test_upload_avatar(self, authenticated_client, user, image_file):
        """Test avatar upload endpoint."""
        response = authenticated_client.post(
            f"/api/v1/users/{user.id}/avatar/",
            {"file": image_file},
            format="multipart",
        )
        assert response.status_code == 200
        user.refresh_from_db()
        assert user.avatar is not None
```

### Updating Existing Tests

When behavior changes, update tests to match:

```python
# Before
def test_user_response(self, authenticated_client, user):
    response = authenticated_client.get(f"/api/v1/users/{user.id}/")
    assert "name" in response.data

# After
def test_user_response(self, authenticated_client, user):
    response = authenticated_client.get(f"/api/v1/users/{user.id}/")
    assert "full_name" in response.data  # Updated field name
    assert "avatar_url" in response.data  # New field
```

### Test Coverage for Updates

Ensure updates are tested:

- [ ] New fields have tests
- [ ] New endpoints have tests
- [ ] Migration logic is tested
- [ ] Backward compatibility is verified
- [ ] Edge cases are covered

---

## ADR Updates

### When to Update Existing ADR

- Clarifying implementation details
- Adding lessons learned
- Documenting exceptions

### When to Create New ADR

- Superseding previous decision
- Major architectural change
- New context changes the decision

### ADR Update Format

```markdown
# ADR-008: Permission Inheritance (Updated)

## Status
Superseded by ADR-015

## Original Decision (2025-01-15)
Use additive permission model...

## Update (2025-12-05)
Added project-level override capability...

## New ADR
See ADR-015 for project-level permission overrides.
```

---

## Documentation Updates

### Update Checklist

When updating a feature, also update:

- [ ] Module README in `src/<module>/README.md`
- [ ] API documentation (if endpoints changed)
- [ ] User guides in `docs/guides/`
- [ ] Troubleshooting if new issues possible
- [ ] CHANGELOG with changes
- [ ] ADR if architectural decision

### Changelog Entry

```markdown
## [Unreleased]

### Added
- User avatar upload and display (#123)

### Changed
- User API now includes `avatar_url` field

### Deprecated
- `name` field replaced by `full_name` (removal in v2.0)
```

---

## Quick Reference

| Action | Where | How |
|--------|-------|-----|
| Document update | `spec.md` Updates section | Add dated entry |
| Major change | New ADR | Full decision record |
| New requirements | `spec.md` FRs | Add with date prefix |
| New work | `tasks.md` | Add new WP |
| Migration | `migrations/` | Django makemigrations |
| Tests | `tests/<module>/` | Add/update tests |
| Docs | Various | Update affected docs |

---

## Next Steps

- Read [Spec Kitty Workflow](spec-kitty-workflow.md) for implementation
- Review [PR Guidelines](pr-guidelines.md) for submissions
- Check [Testing](testing.md) for test requirements
