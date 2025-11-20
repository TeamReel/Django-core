# Data Model: Core Project Skeleton
*Path: [kitty-specs/001-core-project-skeleton/data-model.md](kitty-specs/001-core-project-skeleton/data-model.md)*

**Feature**: Core Project Skeleton  
**Date**: 2025-11-20  
**Status**: N/A - No domain models in this feature

---

## Overview

The Core Project Skeleton feature establishes infrastructure only—no domain models are created. This document serves as a placeholder to maintain spec-kitty template compliance.

---

## Future Domain Models

When future features add domain models to `src/core_apps/`, they will be documented here. Expected entities based on constitutional scope:

- **Accounts**: User authentication and profile management
- **Organizations**: Multi-tenant organization structures
- **Projects**: Project management within organizations
- **Settings**: User and organization preferences
- **Audit Log**: Audit trail for compliance and security

---

## Database Configuration

**Development**: SQLite (default)
- File: `db.sqlite3` in repository root
- Configuration: `DATABASE_URL=sqlite:///db.sqlite3`

**Production**: PostgreSQL (recommended)
- Configuration via `DATABASE_URL` environment variable
- Example: `DATABASE_URL=postgresql://user:pass@host:5432/dbname`

---

## Migration Strategy

**Initial State**:
- Django's default migrations applied (auth, contenttypes, sessions, admin)
- No custom app migrations

**Future Migrations**:
- Each Django app in `src/core_apps/` will have its own `migrations/` directory
- Migration naming: `NNNN_descriptive_name.py`
- All migrations must be reviewed for:
  - Data safety (no data loss)
  - Reversibility (down migrations)
  - Performance (no long-running operations on large tables)

---

## Type Hints for Models

When domain models are added, they must follow constitutional type hint requirements:

```python
from django.db import models
from typing import Optional

class ExampleModel(models.Model):
    """Example domain model (future feature)."""
    
    name: str = models.CharField(max_length=255)
    description: Optional[str] = models.TextField(blank=True, null=True)
    created_at: models.DateTimeField = models.DateTimeField(auto_now_add=True)
    
    def __str__(self) -> str:
        return self.name
    
    class Meta:
        verbose_name = "Example"
        verbose_name_plural = "Examples"
        ordering = ["-created_at"]
```

---

## Query Optimization Guidelines

Constitutional requirement: No N+1 queries allowed.

**When adding models in future features**:

1. Use `select_related()` for foreign keys:
   ```python
   # Good
   users = User.objects.select_related('organization').all()
   
   # Bad (N+1 query)
   users = User.objects.all()
   for user in users:
       print(user.organization.name)  # Triggers extra query per user
   ```

2. Use `prefetch_related()` for many-to-many and reverse foreign keys:
   ```python
   # Good
   projects = Project.objects.prefetch_related('members').all()
   
   # Bad (N+1 query)
   projects = Project.objects.all()
   for project in projects:
       print(project.members.count())  # Triggers extra query per project
   ```

3. Use `only()` / `defer()` to limit fields:
   ```python
   # Load only needed fields
   users = User.objects.only('id', 'email', 'name')
   ```

4. Add database indexes for frequently queried fields:
   ```python
   class Meta:
       indexes = [
           models.Index(fields=['email']),
           models.Index(fields=['organization', 'created_at']),
       ]
   ```

---

## Testing Models

When models are added, tests must cover:

1. **Model creation and validation**:
   ```python
   def test_user_creation():
       user = User.objects.create(email='test@example.com', name='Test User')
       assert user.email == 'test@example.com'
       assert str(user) == 'Test User'
   ```

2. **Constraint validation**:
   ```python
   def test_email_unique_constraint():
       User.objects.create(email='test@example.com')
       with pytest.raises(IntegrityError):
           User.objects.create(email='test@example.com')
   ```

3. **Query optimization** (no N+1):
   ```python
   def test_no_n_plus_one_queries(django_assert_num_queries):
       # Create test data
       org = Organization.objects.create(name='Test Org')
       User.objects.create(email='user1@example.com', organization=org)
       User.objects.create(email='user2@example.com', organization=org)
       
       # Should be 1 query (with select_related)
       with django_assert_num_queries(1):
           users = User.objects.select_related('organization').all()
           for user in users:
               _ = user.organization.name  # No extra query
   ```

---

## Documentation Reference

This placeholder will be replaced with actual data models in future features. See:

- Future Feature: User Accounts (accounts domain models)
- Future Feature: Organizations (organization domain models)
- Future Feature: Projects (project domain models)

---

**Status**: No action required for Core Project Skeleton feature.
