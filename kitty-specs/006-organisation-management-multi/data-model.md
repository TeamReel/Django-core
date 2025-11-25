# Data Model: Organisation Management & Multi-Tenancy

**Feature**: 006-organisation-management-multi
**Created**: 2025-11-24
**Status**: Draft

## Overview

This document describes the data model for the organisation management system, which enables multi-tenancy through flat organisation structures with simple role-based membership.

## Entity-Relationship Diagram

```
┌──────────────┐
│     User     │ (from B05-core-accounts)
│ (existing)   │
└──────┬───────┘
       │
       │ creates
       ▼
┌──────────────────┐         ┌────────────────┐
│  Organisation    │◄────────┤   Membership   │
│                  │ 1     * │                │
│ - id (UUID)      │         │ - id (UUID)    │
│ - name           │         │ - role         │
│ - slug           │         │ - joined_at    │
│ - description    │         │ - is_active    │
│ - created_at     │         └────────┬───────┘
│ - updated_at     │                  │
│ - creator_id     │                  │ * belongs to
│ - is_active      │                  │
│ - deleted_at     │                  ▼
└──────────────────┘         ┌──────────────┐
                             │     User     │
                             └──────────────┘
```

## Core Entities

### Organisation

Represents an independent organisational unit that users can belong to.

**Table Name**: `organisations_organisation`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default=uuid4 | Unique identifier |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL, indexed | Organisation display name |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL, indexed | URL-friendly identifier |
| `description` | TEXT | nullable | Optional rich description |
| `created_at` | TIMESTAMP | NOT NULL, indexed | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Last modification timestamp |
| `creator_id` | UUID | FK(User), NOT NULL, PROTECT | User who created the org |
| `is_active` | BOOLEAN | NOT NULL, default=True, indexed | Soft-delete flag |
| `deleted_at` | TIMESTAMP | nullable, indexed | Soft-delete timestamp |

**Indexes**:
- Primary key on `id`
- Unique index on `name`
- Unique index on `slug`
- Index on `is_active` (filter active orgs)
- Index on `deleted_at` (cleanup queries)
- Index on `created_at` (temporal queries)
- Index on `creator_id` (creator queries)

**Constraints**:
- `name` must be 3-100 characters
- `name` must match pattern: `^[a-zA-Z0-9\s\-_]+$`
- `slug` auto-generated from `name` on save
- `deleted_at` must be NULL when `is_active` is True
- Cannot delete if `is_active` is False and `deleted_at` + 30 days > now

**Business Rules**:
- Organisation names are globally unique across the instance
- Soft-delete sets `is_active=False` and `deleted_at=now()`
- Hard-delete only allowed by superadmins
- Automatic hard-delete after 30 days of soft-delete
- Must have at least one admin member at all times

---

### Membership

Represents the many-to-many relationship between users and organisations with role information.

**Table Name**: `organisations_membership`

**Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK, default=uuid4 | Unique identifier |
| `user_id` | UUID | FK(User), NOT NULL, CASCADE | Member user |
| `organisation_id` | UUID | FK(Organisation), NOT NULL, CASCADE | Organisation |
| `role` | VARCHAR(20) | NOT NULL, CHECK(role IN ('admin', 'member')) | Member role |
| `joined_at` | TIMESTAMP | NOT NULL, indexed | Membership start timestamp |
| `invited_by_id` | UUID | FK(User), nullable, SET_NULL | User who invited this member |
| `is_active` | BOOLEAN | NOT NULL, default=True, indexed | Active membership flag |

**Indexes**:
- Primary key on `id`
- Unique compound index on `(user_id, organisation_id)`
- Index on `(organisation_id, role)` (admin lookups)
- Index on `(user_id, is_active)` (user's active orgs)
- Index on `joined_at` (temporal queries)
- Index on `invited_by_id` (invitation tracking)

**Constraints**:
- UNIQUE(`user_id`, `organisation_id`) - No duplicate memberships
- CHECK(`role` IN ('admin', 'member'))
- Foreign key to User on DELETE CASCADE
- Foreign key to Organisation on DELETE CASCADE
- Foreign key to User (invited_by) on DELETE SET_NULL

**Business Rules**:
- Each user can have exactly one membership per organisation
- Organisation creator automatically gets admin role
- At least one admin required per organisation (enforced in application)
- Cannot remove last admin
- Cannot downgrade last admin to member
- Soft-deleted organisations cascade to inactive memberships

**Role Permissions**:

| Action | Admin | Member |
|--------|-------|--------|
| View organisation | ✓ | ✓ |
| View members | ✓ | ✓ |
| Update organisation | ✓ | ✗ |
| Delete organisation | ✓ | ✗ |
| Invite member | ✓ | ✗ |
| Remove member | ✓ | ✗ |
| Change member role | ✓ | ✗ |
| Leave organisation | ✓* | ✓ |

*Admin can leave only if not the last admin

---

## Derived/Computed Fields

### Active Membership Count

```sql
SELECT COUNT(*)
FROM organisations_membership
WHERE organisation_id = ? AND is_active = TRUE
```

### Admin Count

```sql
SELECT COUNT(*)
FROM organisations_membership
WHERE organisation_id = ? AND role = 'admin' AND is_active = TRUE
```

### User's Active Organisations

```sql
SELECT o.*
FROM organisations_organisation o
JOIN organisations_membership m ON o.id = m.organisation_id
WHERE m.user_id = ? AND m.is_active = TRUE AND o.is_active = TRUE
ORDER BY o.name
```

---

## Data Lifecycle

### Organisation Creation Flow

1. User submits organisation name
2. System validates name (unique, length, characters)
3. System generates slug from name
4. System creates Organisation record with `is_active=True`
5. System creates Membership record for creator with `role='admin'`
6. System logs creation event to audit log

### Member Invitation Flow

1. Admin submits user ID + role
2. System validates:
   - Requester is admin of organisation
   - Target user exists
   - No existing membership for target user
3. System creates Membership record with `invited_by` reference
4. System logs invitation event to audit log

### Role Change Flow

1. Admin submits membership ID + new role
2. System validates:
   - Requester is admin
   - Target membership exists
   - Not removing last admin (if downgrading to member)
3. System updates Membership.role
4. System logs role change to audit log

### Member Removal Flow

1. Admin requests member removal
2. System validates:
   - Requester is admin
   - Target membership exists
   - Not removing last admin
3. System deletes Membership record (hard delete)
4. System logs removal to audit log

### Soft-Delete Flow

1. Admin requests organisation deletion
2. System validates requester is admin
3. System sets `is_active=False`, `deleted_at=now()`
4. System cascades to memberships: set `is_active=False`
5. System logs deletion to audit log

### Hard-Delete Flow (Automated)

1. Scheduled task runs daily
2. Query: `deleted_at < (now() - 30 days) AND is_active=False`
3. For each organisation:
   - Hard delete all memberships (CASCADE)
   - Hard delete organisation
   - Log permanent deletion to audit log

---

## Query Patterns & Optimization

### Common Queries

**1. List user's active organisations**
```python
Organisation.objects.filter(
    memberships__user=user,
    memberships__is_active=True,
    is_active=True
).select_related('creator').order_by('name')
```

**2. Check if user is admin of organisation**
```python
Membership.objects.filter(
    user=user,
    organisation=org,
    role='admin',
    is_active=True
).exists()
```

**3. List organisation members with roles**
```python
Membership.objects.filter(
    organisation=org,
    is_active=True
).select_related('user', 'invited_by').order_by('-joined_at')
```

**4. Count admin members**
```python
Membership.objects.filter(
    organisation=org,
    role='admin',
    is_active=True
).count()
```

**5. Find deleted organisations ready for cleanup**
```python
from datetime import timedelta
from django.utils import timezone

threshold = timezone.now() - timedelta(days=30)
Organisation.objects.filter(
    is_active=False,
    deleted_at__lt=threshold
)
```

### N+1 Query Prevention

**Loading organisations with membership counts**:
```python
from django.db.models import Count

Organisation.objects.filter(is_active=True).annotate(
    member_count=Count('memberships', filter=Q(memberships__is_active=True))
)
```

**Loading memberships with user details**:
```python
Membership.objects.filter(
    organisation=org, is_active=True
).select_related('user', 'invited_by')
```

---

## State Transitions

### Organisation States

```
┌─────────────┐
│   Created   │ (is_active=True, deleted_at=NULL)
└──────┬──────┘
       │
       │ soft_delete()
       ▼
┌──────────────┐
│ Soft-Deleted │ (is_active=False, deleted_at=now())
└──────┬───────┘
       │
       │ restore() (superadmin only, within 30 days)
       ├─────────────────────────┐
       │                         │
       │ ◄───────────────────────┘
       │
       │ auto_cleanup (after 30 days)
       ▼
┌──────────────┐
│ Hard-Deleted │ (record removed from DB)
└──────────────┘
```

### Membership States

```
┌─────────────┐
│   Active    │ (is_active=True)
└──────┬──────┘
       │
       ├───────────────────────────────────────┐
       │ remove_member()                       │ org soft-deleted
       │                                       │
       ▼                                       ▼
┌──────────────┐                    ┌──────────────┐
│   Removed    │                    │   Inactive   │
│ (deleted)    │                    │(is_active=   │
└──────────────┘                    │   False)     │
                                    └──────┬───────┘
                                           │
                                           │ org hard-deleted
                                           ▼
                                    ┌──────────────┐
                                    │   Removed    │
                                    │  (CASCADE)   │
                                    └──────────────┘
```

---

## Data Integrity Rules

### Application-Level Constraints

1. **Last Admin Protection**: Cannot remove or downgrade the last admin of an organisation
2. **Creator Assignment**: Organisation creator must be set to current user on creation
3. **Auto-Admin**: Creator automatically receives admin role on org creation
4. **Slug Generation**: Slug auto-generated from name (lowercase, hyphens for spaces)
5. **Soft-Delete Cascade**: When org is soft-deleted, all memberships become inactive

### Database-Level Constraints

1. **Unique Organisation Name**: Enforced by unique index
2. **Unique Membership**: Enforced by unique index on (user_id, organisation_id)
3. **Role Enum**: Enforced by CHECK constraint
4. **Referential Integrity**: Enforced by foreign keys with appropriate ON DELETE actions

---

## Migration Strategy

### Initial Migration

```python
# organisations/migrations/0001_initial.py

- Create organisations_organisation table
- Create organisations_membership table
- Add indexes
- Add constraints
```

### Future Considerations

- Add `metadata` JSONB field to Organisation for extensibility
- Add `invitation_token` to Membership for email-based invitations
- Add `last_active_at` to Membership for activity tracking

---

## Testing Checklist

- [ ] Organisation uniqueness enforced (name, slug)
- [ ] Membership uniqueness enforced (user + org)
- [ ] Last admin cannot be removed
- [ ] Last admin cannot be downgraded
- [ ] Soft-delete sets is_active=False
- [ ] Soft-delete cascades to memberships
- [ ] Hard-delete respects 30-day retention
- [ ] Role enum validation works
- [ ] Foreign key cascades work correctly
- [ ] Indexes improve query performance
- [ ] N+1 queries prevented with select_related
- [ ] Pagination works on large result sets
