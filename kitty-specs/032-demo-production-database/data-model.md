# Data Model (Seeded Demo)

## Entities

### Organisation
- Fields: name, credits, description, trial flag, created_at
- Relations: has many Users; has many Projects; has many Transactions; has many AuditEvents; has many Notifications; has many FeatureFlags

### User
- Fields: email, password hash, role (superuser/admin/member/viewer), is_active, created_at
- Relations: belongs to Organisation (many-to-many via memberships/roles); has many AuditEvents; has many Notifications; has one UserPreference

### Project
- Fields: name, description, status (active/archived), created_at, updated_at
- Relations: belongs to Organisation; has many Users (through permissions/roles); has many AuditEvents; has many FileMetadata placeholders

### Transaction
- Fields: amount, type (purchase/usage/refund), balance_after, timestamp
- Relations: belongs to Organisation; referenced in AuditEvents

### AuditEvent
- Fields: event_type (auth, crud, financial, security), timestamp, metadata
- Relations: belongs to Organisation; belongs to User (nullable where system-generated)

### Notification
- Fields: type (system/org/project), channel (in-app/email), read_at (nullable), created_at
- Relations: belongs to User; belongs to Organisation (scope)

### FeatureFlag
- Fields: name, enabled, scope (org-level)
- Relations: belongs to Organisation

### UserPreference
- Fields: language, theme, notification settings, timezone
- Relations: belongs to User

### FileMetadata (placeholder)
- Fields: filename, size, mime_type, created_at, placeholder_path
- Relations: belongs to Project

## Integrity Rules
- Every Organisation must have ≥1 admin user.
- Credits must never be negative; transactions must keep balance non-negative.
- Projects must have at least one role assignment; viewers cannot have write permissions.
- AuditEvents must reference valid orgs and users (when applicable).
- Notifications must scope to valid users/orgs.
- FeatureFlags must default to safe settings (premium flags off for trial orgs).

## Data Volume Targets
- Organisations: 5 fixed
- Users: 20 fixed (3 superusers, 10 admins, 7 members/viewers)
- Projects: 80 fixed (15/30/10/5/20 per org as defined)
- AuditEvents: 200-300 per run (seeded randomness)
- Notifications: 5-10 unread per demo account; 50+ read per org
- Transactions: window of last 30 days with varied types
