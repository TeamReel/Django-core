---
work_package_id: WP02
title: Core Data Models & Managers
lane: "doing"
subtasks:
  - T007
  - T008
  - T009
  - T010
  - T011
  - T012
  - T013
  - T014
priority: Critical
user_story: All
agent: "claude"
shell_pid: "11524"
history:
  - date: 2025-11-24
    action: created
    author: spec-kitty
---

# WP02: Core Data Models & Managers

## Objective

Implement the Organisation and Membership models with UUID primary keys, soft-delete support, custom managers, and database migrations. These models are the foundation for all user stories.

## Context

From data-model.md:
- **Organisation**: UUID PK, unique name/slug, description, timestamps, creator FK, soft-delete fields (is_active, deleted_at)
- **Membership**: UUID PK, user/organisation FKs, role (admin/member), timestamps, invited_by FK, unique constraint on (user, organisation)

Key design decisions from research.md:
- UUID for better distribution and multi-tenant scalability
- Soft-delete with 30-day retention before hard-delete
- Custom managers for filtering active/deleted records
- Slug auto-generation from organisation name

## Detailed Implementation Guidance

### T007: Define Organisation Model

**Goal**: Create Organisation model with all required fields and constraints.

**Steps**:
1. Open `src/organisations/models.py`
2. Import required modules:
   ```python
   import uuid
   from django.db import models
   from django.contrib.auth import get_user_model
   from django.utils import timezone
   from django.utils.text import slugify
   from django.core.validators import RegexValidator
   ```
3. Define Organisation model:
   ```python
   User = get_user_model()

   class Organisation(models.Model):
       """
       Represents an independent organisational unit for multi-tenancy.

       Business Rules:
       - Names must be globally unique
       - Slug auto-generated from name
       - Soft-delete via is_active=False
       - 30-day retention before hard delete
       """
       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

       name = models.CharField(
           max_length=100,
           unique=True,
           validators=[
               RegexValidator(
                   regex=r'^[a-zA-Z0-9\s\-_]+$',
                   message='Name can only contain letters, numbers, spaces, hyphens, and underscores.'
               )
           ],
           help_text='Organisation display name (3-100 characters)'
       )

       slug = models.SlugField(max_length=100, unique=True, blank=True)

       description = models.TextField(blank=True, null=True)

       created_at = models.DateTimeField(auto_now_add=True, db_index=True)
       updated_at = models.DateTimeField(auto_now=True)

       creator = models.ForeignKey(
           User,
           on_delete=models.PROTECT,
           related_name='created_organisations',
           help_text='User who created this organisation'
       )

       is_active = models.BooleanField(default=True, db_index=True)
       deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)

       # Custom manager (will be added in T009)
       # objects = OrganisationManager()

       class Meta:
           ordering = ['name']
           verbose_name = 'Organisation'
           verbose_name_plural = 'Organisations'

       def __str__(self):
           return self.name
   ```

**Validation**: Model can be imported, fields are correct types.

---

### T008: Define Membership Model

**Goal**: Create Membership model with role choices and unique constraint.

**Steps**:
1. In `src/organisations/models.py`, add Membership model:
   ```python
   class Membership(models.Model):
       """
       Many-to-many relationship between Users and Organisations with role.

       Business Rules:
       - One membership per (user, organisation) pair
       - Roles: admin (full control) or member (read-only)
       - Must have at least one admin per organisation
       """

       ROLE_CHOICES = [
           ('admin', 'Admin'),
           ('member', 'Member'),
       ]

       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

       user = models.ForeignKey(
           User,
           on_delete=models.CASCADE,
           related_name='organisation_memberships'
       )

       organisation = models.ForeignKey(
           'Organisation',  # String reference for forward declaration
           on_delete=models.CASCADE,
           related_name='memberships'
       )

       role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')

       joined_at = models.DateTimeField(auto_now_add=True, db_index=True)

       invited_by = models.ForeignKey(
           User,
           on_delete=models.SET_NULL,
           null=True,
           blank=True,
           related_name='invited_memberships'
       )

       is_active = models.BooleanField(default=True, db_index=True)

       class Meta:
           constraints = [
               models.UniqueConstraint(
                   fields=['user', 'organisation'],
                   name='unique_user_organisation'
               )
           ]
           indexes = [
               models.Index(fields=['organisation', 'role']),
               models.Index(fields=['user', 'is_active']),
           ]
           ordering = ['-joined_at']
           verbose_name = 'Membership'
           verbose_name_plural = 'Memberships'

       def __str__(self):
           return f"{self.user.username} - {self.organisation.name} ({self.role})"
   ```

**Validation**: Model defines unique constraint, role choices, proper foreign keys.

---

### T009: Implement Custom Model Managers

**Goal**: Create OrganisationQuerySet and Manager with active()/deleted() methods.

**Steps**:
1. Create `src/organisations/managers.py`:
   ```python
   from django.db import models
   from django.utils import timezone

   class OrganisationQuerySet(models.QuerySet):
       """Custom queryset for Organisation model."""

       def active(self):
           """Return only active (non-deleted) organisations."""
           return self.filter(is_active=True)

       def deleted(self):
           """Return only soft-deleted organisations."""
           return self.filter(is_active=False)

       def pending_cleanup(self, days=30):
           """Return deleted orgs past retention period."""
           from datetime import timedelta
           threshold = timezone.now() - timedelta(days=days)
           return self.deleted().filter(deleted_at__lt=threshold)

   class OrganisationManager(models.Manager):
       """Custom manager for Organisation model."""

       def get_queryset(self):
           return OrganisationQuerySet(self.model, using=self._db)

       def active(self):
           return self.get_queryset().active()

       def deleted(self):
           return self.get_queryset().deleted()

       def pending_cleanup(self, days=30):
           return self.get_queryset().pending_cleanup(days)
   ```

2. Update `src/organisations/models.py`, add to Organisation model:
   ```python
   from .managers import OrganisationManager

   class Organisation(models.Model):
       # ... existing fields ...

       objects = OrganisationManager()
   ```

**Validation**: Can call `Organisation.objects.active()`, `Organisation.objects.deleted()`.

---

### T010: Implement Soft-Delete Logic

**Goal**: Override delete() to soft-delete, preserving audit trail.

**Steps**:
1. In `src/organisations/models.py`, add to Organisation model:
   ```python
   def delete(self, using=None, keep_parents=False, hard=False):
       """
       Soft-delete by default. Use hard=True or hard_delete() for permanent deletion.
       """
       if hard:
           return super().delete(using=using, keep_parents=keep_parents)

       self.is_active = False
       self.deleted_at = timezone.now()
       self.save(update_fields=['is_active', 'deleted_at'])

       # Cascade soft-delete to memberships
       self.memberships.update(is_active=False)
   ```

**Note**: This soft-delete also marks memberships inactive, preserving audit trail.

**Validation**: Calling `org.delete()` sets is_active=False, not removes from DB.

---

### T011: Add Hard-Delete Method

**Goal**: Provide explicit method for permanent deletion (superadmin only).

**Steps**:
1. In `src/organisations/models.py`, add to Organisation model:
   ```python
   def hard_delete(self, using=None, keep_parents=False):
       """Permanently delete organisation and all memberships."""
       return super().delete(using=using, keep_parents=keep_parents)
   ```

**Note**: Memberships will CASCADE delete due to FK constraint.

**Validation**: `org.hard_delete()` removes record from database.

---

### T012: Implement Slug Auto-Generation

**Goal**: Generate URL-friendly slug from organisation name.

**Steps**:
1. In `src/organisations/models.py`, override save method:
   ```python
   def save(self, *args, **kwargs):
       """Generate slug from name if not provided."""
       if not self.slug:
           base_slug = slugify(self.name)
           slug = base_slug
           counter = 1

           # Ensure uniqueness
           while Organisation.objects.filter(slug=slug).exclude(pk=self.pk).exists():
               slug = f"{base_slug}-{counter}"
               counter += 1

           self.slug = slug

       super().save(*args, **kwargs)
   ```

**Validation**: Creating org with name "Engineering Team" generates slug "engineering-team".

---

### T013: Generate and Apply Migrations

**Goal**: Create database schema for models.

**Steps**:
1. Run `python manage.py makemigrations organisations`
2. Inspect the migration file in `src/organisations/migrations/0001_initial.py`
3. Check for:
   - UUID primary keys
   - Unique constraints on name, slug
   - UniqueConstraint on (user, organisation) for Membership
   - Indexes on is_active, deleted_at, created_at, etc.
4. Run `python manage.py migrate`
5. Verify tables created: `python manage.py dbshell` then `\dt organisations*` (PostgreSQL)

**Validation**: Migration applies cleanly, tables exist in database.

---

### T014: Add Model Validation and Meta Configuration

**Goal**: Polish models with validation, __str__, and Meta options.

**Steps**:
1. Add `clean()` method to Organisation for custom validation:
   ```python
   from django.core.exceptions import ValidationError

   def clean(self):
       """Validate organisation data."""
       super().clean()

       # Name length check
       if len(self.name) < 3:
           raise ValidationError({'name': 'Name must be at least 3 characters.'})

       # Soft-delete constraint
       if self.is_active and self.deleted_at is not None:
           raise ValidationError('Active organisations cannot have deleted_at set.')
   ```

2. Add helper method to Organisation:
   ```python
   def get_admin_count(self):
       """Count active admin memberships."""
       return self.memberships.filter(role='admin', is_active=True).count()
   ```

3. Verify all `__str__()` methods and Meta classes are defined

**Validation**: Calling `org.full_clean()` validates constraints.

---

## Definition of Done

- [ ] Organisation model defined with all fields (id, name, slug, description, timestamps, creator, is_active, deleted_at)
- [ ] Membership model defined with all fields (id, user, organisation, role, joined_at, invited_by, is_active)
- [ ] Unique constraints: name, slug, (user, organisation)
- [ ] Indexes created: is_active, deleted_at, created_at, (organisation, role), (user, is_active)
- [ ] Custom managers: OrganisationManager with active(), deleted(), pending_cleanup()
- [ ] Soft-delete: delete() sets is_active=False, cascades to memberships
- [ ] Hard-delete: hard_delete() removes from database
- [ ] Slug auto-generation works
- [ ] Migrations generated and applied successfully
- [ ] Models have __str__(), clean(), Meta configurations
- [ ] Can create instances in Django shell and save them

## Testing Strategy

**Manual Tests** (in `python manage.py shell`):
```python
from django.contrib.auth import get_user_model
from organisations.models import Organisation, Membership

User = get_user_model()
user = User.objects.first()  # Assumes user exists

# Test organisation creation
org = Organisation.objects.create(name="Test Org", creator=user)
assert org.slug == "test-org"
assert org.is_active == True
assert org.deleted_at is None

# Test membership creation
membership = Membership.objects.create(user=user, organisation=org, role='admin')
assert membership.role == 'admin'
assert membership.is_active == True

# Test custom manager
active_orgs = Organisation.objects.active()
assert org in active_orgs

# Test soft-delete
org.delete()
assert org.is_active == False
assert org.deleted_at is not None
assert Organisation.objects.active().count() == 0
assert Organisation.objects.deleted().count() == 1

# Verify memberships also inactive
membership.refresh_from_db()
assert membership.is_active == False
```

**Automated tests**: Will be added in test work packages (not required for MVP).

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| UUID migration issues | Low | Medium | New app, no migration complexity |
| Slug uniqueness conflicts | Medium | Low | Slug generation handles conflicts with counter |
| Soft-delete cascade bugs | Medium | High | Test thoroughly, verify memberships marked inactive |
| Custom manager breaks existing queries | Low | Medium | Test with .active() calls in later WPs |

## Dependencies

**Prerequisites**: WP01 (app structure, dependencies installed)

**Blocks**: WP03, WP04, WP05, WP06 (all user stories need models)

## Reviewer Guidance

**What to check**:
- [ ] All fields match data-model.md specification
- [ ] UUID primary keys used (not default integers)
- [ ] Unique constraints in place (name, slug, user+org)
- [ ] Soft-delete doesn't actually delete records
- [ ] Slug generation works and handles duplicates
- [ ] Migrations apply cleanly without warnings
- [ ] Can create, query, soft-delete, hard-delete in shell

**Common issues**:
- Forgetting to import `uuid` module
- Unique constraint syntax errors
- Circular import if managers.py imports models
- Migration conflicts if other migrations pending

## Related Documentation

- Data Model: [data-model.md](../data-model.md) - Complete field definitions
- Research: [research.md](../research.md) - Q4 (soft-delete strategy), Q5 (permissions)
- Spec: [spec.md](../spec.md) - FR-001 through FR-020, Entity definitions

## Activity Log

- 2025-11-25T07:56:35Z – claude – shell_pid=11524 – lane=doing – Started implementation of core data models and managers
