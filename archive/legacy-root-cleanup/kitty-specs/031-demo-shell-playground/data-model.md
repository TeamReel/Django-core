# Data Model: Demo Shell & Playground Site (F10)
*Path: kitty-specs/031-demo-shell-playground/data-model.md*

**Phase**: 1 - Design & Contracts
**Date**: 2025-12-14
**Status**: Complete

## Overview

The Demo Shell is a **pure consumer** of existing backend entities (B05-B08, B11, B16-B17). It does **NOT** introduce new database models or modify core schemas (FR-052, Gate 31.5). This document catalogs the consumed entities and their relationships as exercised by the demo.

## Consumed Entities (Read-Only)

### User (B05 - Core Accounts)

**Source**: `src/apps/accounts/models.py` (existing)

**Fields** (relevant to demo):
- `id`: UUID (primary key)
- `email`: EmailField (unique, used for login)
- `password`: CharField (hashed, managed by Django auth)
- `first_name`: CharField (optional, displayed in UI)
- `last_name`: CharField (optional, displayed in UI)
- `is_active`: BooleanField (demo seed data sets to True)
- `is_superuser`: BooleanField (admin@example.com in seed data)
- `date_joined`: DateTimeField (auto)
- `last_login`: DateTimeField (auto, updated on auth)

**Demo usage**:
- Login page: Authenticate via email/password (FR-005)
- Top navigation: Display `user.first_name` or `user.email` (FR-006)
- Dashboard: Show "Welcome, {user.first_name}" (P1 story 1)
- Logout: Clear session, redirect to login (FR-008)

**Seed data**: 5 users (admin@example.com, alice@example.com, bob@example.com, carol@example.com, dave@example.com)

---

### Organisation (B06 - Organisations)

**Source**: `src/apps/organisations/models.py` (existing)

**Fields** (relevant to demo):
- `id`: UUID (primary key)
- `name`: CharField (displayed in context switcher)
- `slug`: SlugField (unique, used in URLs: `/orgs/{slug}/`)
- `created_at`: DateTimeField (auto)
- `updated_at`: DateTimeField (auto)
- `is_active`: BooleanField (demo seed data sets to True)

**Relationships**:
- **Members** (many-to-many via `OrganisationMembership`): Users belonging to this org
- **Projects** (one-to-many): Projects within this org

**Demo usage**:
- Context switcher: List orgs user has access to (FR-009)
- Org list page: Display org cards with name, project count (P1 story 2)
- Org detail page: Show org name, members list, projects list (P2 story 4)
- URL routing: `/orgs/{org_slug}/projects/` (context-aware navigation)

**Seed data**: 2 organisations (TechCorp, DataLab)

---

### Project (B07 - Projects/Workspaces)

**Source**: `src/apps/projects/models.py` (existing)

**Fields** (relevant to demo):
- `id`: UUID (primary key)
- `name`: CharField (displayed in project list)
- `slug`: SlugField (unique within org, used in URLs: `/projects/{slug}/`)
- `organisation`: ForeignKey(Organisation) (parent org)
- `created_at`: DateTimeField (auto)
- `updated_at`: DateTimeField (auto)
- `status`: CharField (choices: 'active', 'archived') - demo filters by status

**Relationships**:
- **Organisation** (many-to-one): Parent org
- **Members** (many-to-many via `ProjectMembership`): Users with project access

**Demo usage**:
- Context switcher: List projects within selected org (FR-010)
- Project list page: Display project cards filtered by status (FR-011)
- Project detail page: Show project name, org name, status badge (P1 story 2)
- URL routing: `/orgs/{org_slug}/projects/{project_slug}/` (hierarchical context)

**Seed data**: 6 projects (3 per org: 2 active, 1 archived)

---

### OrganisationMembership (B06 - Organisations)

**Source**: `src/apps/organisations/models.py` (existing)

**Fields** (relevant to demo):
- `id`: UUID (primary key)
- `user`: ForeignKey(User)
- `organisation`: ForeignKey(Organisation)
- `role`: CharField (choices: 'admin', 'member') - used for permission checks
- `created_at`: DateTimeField (auto)

**Demo usage**:
- Context switcher: Determine which orgs user can access (FR-009)
- Permissions: Check if user.role == 'admin' for edit actions (P1 story 3)
- Org detail page: Display members list with roles (P2 story 4)

**Seed data**: 4 memberships (alice/bob in TechCorp, carol/dave in DataLab)

---

### ProjectMembership (B07 - Projects/Workspaces)

**Source**: `src/apps/projects/models.py` (existing)

**Fields** (relevant to demo):
- `id`: UUID (primary key)
- `user`: ForeignKey(User)
- `project`: ForeignKey(Project)
- `role`: CharField (choices: 'admin', 'member', 'viewer')
- `created_at`: DateTimeField (auto)

**Demo usage**:
- Context switcher: Determine which projects user can access (FR-010)
- Permissions: Check role for edit/view actions (P1 story 3)
- Project detail page: Display members list with roles (P2 story 4)

**Seed data**: Auto-generated based on org memberships (inherits org access for all org projects)

---

### Permission (B08 - Hierarchical Access Control)

**Source**: `src/apps/permissions/models.py` (existing, module 26 refactor)

**Fields** (relevant to demo):
- `id`: UUID (primary key)
- `codename`: CharField (e.g., 'projects.edit', 'orgs.admin')
- `name`: CharField (human-readable description)
- `scope`: CharField (choices: 'global', 'organisation', 'project')

**Relationships**:
- **RoleAssignments** (many-to-many via `RoleAssignment`): Links permissions to users/contexts

**Demo usage**:
- Permission checks: `if hasPermission('projects.edit')` (P1 story 3)
- 403 error page: Display when user lacks required permission (P2 story 5)
- API: `/api/permissions/current/` returns hierarchical permissions for active context (FR-013)

**Seed data**: Core permissions (orgs.admin, orgs.view, projects.edit, projects.view, projects.delete)

---

### Transaction (B11 - Core Transactions & Credits)

**Source**: `src/apps/transactions/models.py` (existing)

**Fields** (relevant to demo):
- `id`: UUID (primary key)
- `organisation`: ForeignKey(Organisation)
- `type`: CharField (choices: 'credit', 'debit')
- `amount`: DecimalField (usage amount)
- `balance_after`: DecimalField (org balance after transaction)
- `created_at`: DateTimeField (auto)
- `metadata`: JSONField (optional, e.g., {\"reason\": \"api_call\"})

**Demo usage**:
- Dashboard: Display current org balance via latest `balance_after` (P2 story 6)
- Usage meter component: Show `<UsageMeter current={balance_after} max={credits_limit} />` (FR-028)
- Alerts: Trigger warning if `balance_after < credits_limit * 0.2` (P2 story 6)

**Seed data**:
- TechCorp: balance=1000, limit=5000 (healthy)
- DataLab: balance=250, limit=1000 (triggers low-credit alert)

---

### Notification (B16 - Notifications Baseline)

**Source**: `src/apps/notifications/models.py` (existing)

**Fields** (relevant to demo):
- `id`: UUID (primary key)
- `user`: ForeignKey(User)
- `type`: CharField (choices: 'info', 'warning', 'error', 'success')
- `message`: TextField (notification body)
- `read`: BooleanField (default False)
- `created_at`: DateTimeField (auto)
- `metadata`: JSONField (optional, e.g., {\"link\": \"/projects/123\"})

**Demo usage**:
- Notification inbox: List unread notifications (FR-026)
- Badge: Show unread count in top navigation (FR-027)
- Toast: Display transient notifications (P3 story 7)
- Mark as read: POST `/api/notifications/{id}/mark-read/` (FR-028)

**Seed data**:
- Alice (TechCorp): "Welcome to TechCorp!" (info, unread)
- Carol (DataLab): "Low credits warning" (warning, unread)

---

## Entity Relationships (ERD)

```
User (B05)
 │
 ├──< OrganisationMembership >──┐
 │                               │
 ├──< ProjectMembership >────────┤
 │                               │
 └──< Notification (B16)         │
                                 │
Organisation (B06) <─────────────┘
 │
 ├──< Project (B07)
 │
 └──< Transaction (B11)

Permission (B08)
 └──< RoleAssignment >──> User/Org/Project

(Demo reads all entities via B13 APIs, no write operations except auth/logout/mark-read)
```

**Key constraints**:
- User cannot access org/project without membership (enforced by B08 ACL)
- Transactions always link to org (never to project directly in current schema)
- Notifications link to user only (org/project context in metadata if needed)

---

## Optional: DemoResource (Not Implemented in Initial Version)

**Status**: ❌ **NOT INCLUDED** (A-006: Demo stays minimal, no demo-specific entities)

**Rationale**: Spec assumption A-006 states "Demo avoids introducing new entities unless absolutely necessary to exercise contracts." All P1-P3 user stories can be validated using existing User/Org/Project/Permission/Transaction/Notification entities. Adding DemoResource would violate FR-049 (<1500 LOC constraint) and Gate 31.5 (minimal scope principle).

**If future need arises**: DemoResource could demonstrate:
- Custom resource CRUD flows (B13 API patterns)
- Audit logging (B09) on create/update/delete
- Hierarchical permissions (B08) on project-scoped resources

**Deferred to**: Post-v1.0 if product teams request "generic resource management" reference implementation.

---

## Data Access Patterns (Frontend ↔ Backend)

### Authentication Flow (B05 + F02)

```
User → Login Page → POST /auth/login/ {email, password}
                  ← 200 OK {user: {...}, token: "..."}
                  → Store token in AuthProvider state
                  → Redirect to /dashboard

User → Logout → POST /auth/logout/
              ← 204 No Content
              → Clear AuthProvider state
              → Redirect to /login
```

---

### Context Switching Flow (B06/B07 + F03)

```
User → Open ContextSwitcher
     → GET /api/organisations/ (returns orgs user can access)
     ← 200 OK [{id, name, slug, project_count}, ...]
     → Select "TechCorp"
     → GET /api/organisations/techcorp/projects/
     ← 200 OK [{id, name, slug, status}, ...]
     → ContextProvider updates: currentOrg = TechCorp
     → All subsequent API calls send: X-Organization-ID = {techcorp_id}

User → Select "Web Platform" project
     → ContextProvider updates: currentProject = Web Platform
     → All subsequent API calls send:
        X-Organization-ID = {techcorp_id}
        X-Project-ID = {web_platform_id}
```

---

### Permission Check Flow (B08 + F03 permissions)

```
User → Navigate to /orgs/techcorp/projects/web-platform/
     → GET /api/permissions/current/ (with X-Organization-ID, X-Project-ID headers)
     ← 200 OK {
         global: ["users.view"],
         organisation: ["orgs.view", "projects.create"],
         project: ["projects.view", "projects.edit"]
       }
     → PermissionsProvider stores permissions
     → Page renders:
        - Edit button: visible (hasPermission("projects.edit") = true)
        - Delete button: hidden (hasPermission("projects.delete") = false)

User → Click "Edit" → PUT /api/projects/web-platform/ {...}
     ← 200 OK (success) OR 403 Forbidden (if permissions changed)
     → On 403: Show error page (P2 story 5)
```

---

### Resource Display Flow (B11 + F05)

```
User → Dashboard page
     → GET /api/organisations/techcorp/credits/
     ← 200 OK {balance: 1000, limit: 5000, transactions: [...recent...]}
     → Render <UsageMeter current={1000} max={5000} />
     → If balance < limit * 0.2: Show <AlertBanner type="warning" />

User → DataLab dashboard (low credits)
     → GET /api/organisations/datalab/credits/
     ← 200 OK {balance: 250, limit: 1000}
     → Render <AlertBanner type="warning" message="Low credits (25% remaining)" />
```

---

### Notifications Flow (B16/B17 + F04)

```
User → Login
     → GET /api/notifications/?unread=true
     ← 200 OK [{id, type, message, created_at}, ...] (2 unread)
     → NotificationsProvider stores notifications
     → Top nav badge: "2" (unread count)

User → Open NotificationInbox
     → Display list of notifications
     → Click notification
     → POST /api/notifications/{id}/mark-read/
     ← 204 No Content
     → Update local state: notification.read = true
     → Badge updates: "1" (remaining unread)
```

---

## Seed Data Script Design

**File**: `src/core/management/commands/seed_demo_data.py`

**Idempotency**: Uses `get_or_create()` to allow re-running without errors.

**Structure**:
```python
from django.core.management.base import BaseCommand
from apps.accounts.models import User
from apps.organisations.models import Organisation, OrganisationMembership
from apps.projects.models import Project, ProjectMembership
from apps.permissions.models import Permission, RoleAssignment
from apps.transactions.models import Transaction
from apps.notifications.models import Notification

class Command(BaseCommand):
    help = "Seed minimal demo data (5 users, 2 orgs, 6 projects)"

    def handle(self, *args, **options):
        # Create users
        admin, _ = User.objects.get_or_create(
            email="admin@example.com",
            defaults={"is_superuser": True, "first_name": "Admin"}
        )
        alice, _ = User.objects.get_or_create(
            email="alice@example.com",
            defaults={"first_name": "Alice"}
        )
        # ... (bob, carol, dave)

        # Create organisations
        techcorp, _ = Organisation.objects.get_or_create(
            slug="techcorp",
            defaults={"name": "TechCorp"}
        )
        datalab, _ = Organisation.objects.get_or_create(
            slug="datalab",
            defaults={"name": "DataLab"}
        )

        # Create memberships
        OrganisationMembership.objects.get_or_create(
            user=alice, organisation=techcorp,
            defaults={"role": "admin"}
        )
        # ... (other memberships)

        # Create projects
        Project.objects.get_or_create(
            slug="web-platform", organisation=techcorp,
            defaults={"name": "Web Platform", "status": "active"}
        )
        # ... (other projects)

        # Create transactions (credits)
        Transaction.objects.get_or_create(
            organisation=techcorp,
            defaults={"type": "credit", "amount": 1000, "balance_after": 1000}
        )
        # ... (datalab low-credit scenario)

        # Create notifications
        Notification.objects.get_or_create(
            user=alice,
            defaults={"type": "info", "message": "Welcome to TechCorp!", "read": False}
        )
        # ... (carol low-credit warning)

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
```

**Usage**:
```powershell
python manage.py seed_demo_data
```

**Verification queries** (for testing):
```python
# Verify users created
assert User.objects.filter(email="alice@example.com").exists()

# Verify org memberships
alice = User.objects.get(email="alice@example.com")
techcorp = Organisation.objects.get(slug="techcorp")
assert OrganisationMembership.objects.filter(user=alice, organisation=techcorp, role="admin").exists()

# Verify projects
assert Project.objects.filter(slug="web-platform", organisation=techcorp, status="active").exists()

# Verify low-credit scenario
datalab = Organisation.objects.get(slug="datalab")
latest_txn = Transaction.objects.filter(organisation=datalab).order_by('-created_at').first()
assert latest_txn.balance_after == 250
assert latest_txn.balance_after < 1000 * 0.3  # Triggers alert
```

---

## Phase 1 Checklist (Data Model)

- [x] All consumed entities documented (User, Org, Project, Memberships, Permissions, Transactions, Notifications)
- [x] Entity relationships (ERD) defined
- [x] No new database models introduced (FR-052 compliance)
- [x] Data access patterns documented (auth, context, permissions, resources, notifications)
- [x] Seed data script design complete (idempotent, minimal, realistic)
- [x] Verification queries provided for testing

**Next**: contracts/ (API contracts for consumed endpoints)
