# Project Access Control - Developer Quickstart

**Feature:** B26 Project-Level Access Control
**Status:** In Development (feature/038-project-access-control branch)
**Last Updated:** 2026-01-04

## Overview

This guide helps developers quickly understand, set up, and test the project membership system.

**Core Capabilities:**
- Explicit project membership with role-based permissions (viewer/editor/admin)
- Invitation system for external and org users
- Admin promotion approval workflow
- Hybrid permission resolution (explicit + implicit org-based access)
- Private project enforcement

**Key Integrations:**
- B08 Hierarchical Access Control (permission resolution)
- B09 Audit Logging (membership lifecycle events)
- B10 Feature Flags (extensibility)
- B16 Notifications (invitations, promotions)

---

## Quick Setup

### 1. Environment Setup

```powershell
# Ensure you're on the feature branch
git checkout feature/038-project-access-control

# Install dependencies (if not already done)
uv sync

# Configure Python environment
python .kittify/scripts/python/configure_python_environment.py

# Set up environment variables (create .env if not exists)
cp .env.example .env

# Required environment variables for local development:
# DATABASE_URL=postgresql://user:pass@localhost:5432/django_core
# REDIS_URL=redis://localhost:6379/0
# DEBUG=True
# SECRET_KEY=your-secret-key-here
```

### 2. Database Setup

```powershell
# Apply migrations (includes B26 models)
python manage.py migrate

# Create superuser for testing
python manage.py createsuperuser

# Seed demo data (organizations, projects, users)
python manage.py seed_demo_data --orgs=3 --projects-per-org=5 --users-per-org=10

# Seed project memberships specifically
python manage.py seed_memberships --projects=5 --members-per-project=3
```

### 3. Start Services

```powershell
# Option A: Docker Compose (recommended for full stack)
docker-compose -f docker-compose.local.yml up -d

# Option B: Manual startup (development only)
# Terminal 1: Django dev server
python manage.py runserver

# Terminal 2: Redis (Windows - using Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Terminal 3: Celery worker (for notification emails)
celery -A src.core worker -l info -P solo

# Terminal 4: Frontend (React)
cd packages/frontend
npm run dev
```

### 4. Verify Installation

```powershell
# Run health check
curl http://localhost:8000/health/ | jq .

# Expected output includes:
# {
#   "status": "healthy",
#   "checks": {
#     "database": "ok",
#     "cache": "ok",
#     "celery": "ok",
#     "project_membership_system": "ok"
#   }
# }

# Run B26-specific tests
pytest tests/unit/apps/projects/test_models.py -v
pytest tests/integration/test_membership_flows.py -v
```

---

## Core Concepts

### Permission Resolution (5-Step Process)

```python
# Hybrid permission model: explicit membership OR implicit org access

def get_project_role(user, project):
    """
    1. Check explicit ProjectMembership (if exists, use that role)
    2. Check if project.is_private (if yes, deny access without explicit membership)
    3. Check OrganizationMembership (use org role as implicit access)
    4. Check emergency override (org admin can access private projects via audit trail)
    5. Return "no_access" if none of the above
    """
    # Cached result (300s TTL, invalidated on membership changes)
    return permission_resolution_service.resolve(user.id, project.id)
```

**Example Scenarios:**

| User's Org Role | Project Membership | Project Type | Effective Access | Source |
|-----------------|-------------------|--------------|------------------|--------|
| Admin | None | Public | Admin | Implicit (org) |
| Admin | Editor | Public | Editor | Explicit (project) |
| Editor | None | Private | No Access | Private enforcement |
| Admin | None | Private | Admin (via override) | Emergency override |
| Viewer | None | Public | Viewer | Implicit (org) |
| None (external) | Editor | Public | Editor | Explicit (project) |

### Role Definitions

| Role | Permissions | Description |
|------|-------------|-------------|
| **viewer** | `projects.view`, `projects.view_members` | Read-only access to project data and member list |
| **editor** | viewer + `projects.edit`, `projects.create_content` | Can modify project content, cannot manage members |
| **admin** | editor + `projects.delete`, `projects.manage_members` | Full control including member management |

### State Machines

**ProjectMembership States:**
```
Created → Active → [Deleted OR RoleChange → Active]
                 ↓
              Deleted (soft delete, deleted_at timestamp)
```

**ProjectInvite States:**
```
Pending → [Accepted OR Cancelled OR Expired]
```

**ProjectMembershipPromotion States:**
```
Pending → [Accepted OR Declined OR Expired OR Cancelled]
```

---

## Common Development Tasks

### Task 1: Add a Member to a Project

**API Call:**
```http
POST /api/v1/projects/{project_id}/members
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "user_id": "u1234567-abcd-ef12-3456-7890abcdef12",
  "role": "editor"
}
```

**Python Code:**
```python
from apps.projects.services.membership_service import MembershipService

membership_service = MembershipService()
membership = membership_service.add_member(
    project_id="p1234567-abcd-ef12-3456-7890abcdef12",
    user_id="u1234567-abcd-ef12-3456-7890abcdef12",
    role="editor",
    added_by=request.user,
    assignment_reason="manual"
)

# Audit event automatically logged: project.membership.created
# Cache automatically invalidated for user's permissions
```

### Task 2: Invite External User

**API Call:**
```http
POST /api/v1/projects/{project_id}/invitations
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "email": "external@example.com",
  "role": "viewer"
}
```

**Python Code:**
```python
from apps.projects.services.invitation_service import InvitationService

invitation_service = InvitationService()
invitation = invitation_service.send_invitation(
    project_id="p1234567-abcd-ef12-3456-7890abcdef12",
    email="external@example.com",
    role="viewer",
    invited_by=request.user
)

# Generates secure token (32 bytes URL-safe)
# Sends email via Celery task (B16 Notifications)
# Token valid for 7 days
# Magic link: https://app.com/accept-invitation/{token}
```

### Task 3: Accept Invitation

**User Flow:**
1. User receives email with magic link
2. Clicks link → Frontend calls GET `/invitations/{token}` to display invitation details
3. User clicks "Accept" → Frontend calls POST `/invitations/{token}`

**API Call:**
```http
POST /api/v1/invitations/{token}
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Python Code:**
```python
invitation_service = InvitationService()
membership = invitation_service.accept_invitation(
    token="secure-32-byte-token",
    accepting_user=request.user
)

# Validates token not expired
# Checks email match (if applicable)
# Creates ProjectMembership with assignment_reason="invitation"
# Sets invitation status to "accepted"
# Sends notification to project admins
```

### Task 4: Promote User to Admin

**API Call:**
```http
PATCH /api/v1/projects/{project_id}/members/{user_id}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "role": "admin"
}
```

**Behavior (based on feature flags):**

**Case A: Approval NOT Required** (user's org role ≥ threshold)
```python
# Immediate promotion (200 OK)
membership.role = "admin"
membership.save()
# Audit event: project.membership.role_changed
```

**Case B: Approval Required** (user's org role < threshold)
```python
# Creates promotion request (202 Accepted)
promotion = PromotionService().request_promotion(
    membership=membership,
    to_role="admin",
    requested_by=request.user
)
# Sends notification to target user
# Returns: {"promotion_id": "pr123...", "status": "pending"}
# Audit event: project.membership.promotion_requested
```

### Task 5: Accept Promotion

**API Call:**
```http
POST /api/v1/promotions/{promotion_id}/accept
Authorization: Bearer {jwt_token}
```

**Python Code:**
```python
promotion_service = PromotionService()
promotion_service.accept_promotion(
    promotion_id="pr123456-abcd-ef12-3456-7890abcdef12",
    accepting_user=request.user
)

# Validates user is target user
# Updates membership.role to "admin"
# Sets promotion.status to "accepted"
# Invalidates permission cache
# Sends notification to requester
# Audit events: project.membership.promotion_accepted, project.membership.role_changed
```

### Task 6: Check User's Permissions

**API Call:**
```http
GET /api/v1/projects/{project_id}/members/{user_id}/permissions
Authorization: Bearer {jwt_token}
```

**Python Code:**
```python
from apps.projects.services.permission_resolution import PermissionResolutionService

resolution_service = PermissionResolutionService()
result = resolution_service.get_project_role(
    user_id="u1234567-abcd-ef12-3456-7890abcdef12",
    project_id="p1234567-abcd-ef12-3456-7890abcdef12"
)

# Returns TypedDict:
# {
#   "effective_role": "editor",
#   "source": "explicit_membership",
#   "permissions": ["projects.view", "projects.edit", ...]
# }

# Cached for 300s (Redis key: permissions:user:{user_id}:project:{project_id})
```

---

## Testing

### Unit Tests

```powershell
# Test models (validation, state transitions)
pytest tests/unit/apps/projects/test_models.py -v

# Test serializers (boundary validation)
pytest tests/unit/apps/projects/test_serializers.py -v

# Test services (permission resolution, caching)
pytest tests/unit/apps/projects/test_services.py -v

# Run with coverage
pytest tests/unit/apps/projects/ --cov=apps.projects --cov-report=html
```

### Integration Tests

```powershell
# Test complete workflows (invite → accept → verify access)
pytest tests/integration/test_membership_flows.py -v

# Test promotion workflow (request → accept → elevate)
pytest tests/integration/test_promotion_workflow.py -v

# Test permission resolution with caching
pytest tests/integration/test_permission_caching.py -v
```

### Contract Tests (OpenAPI Compliance)

```powershell
# Validate API responses match OpenAPI specs
pytest tests/contract/test_membership_api.py -v
pytest tests/contract/test_invitation_api.py -v
pytest tests/contract/test_promotion_api.py -v
```

### Manual Testing

```powershell
# Use provided test script
python scripts/test_project_access.py

# Example output:
# ✓ Created test organization: English Football Association
# ✓ Created test project: Premier League 2025/26
# ✓ Added 3 members: 2 editors, 1 viewer
# ✓ Sent invitation to external@example.com
# ✓ Requested promotion for bob@example.com
# ✓ Permission cache working (hit rate: 85%)
```

---

## Feature Flags Configuration

```python
# Feature flags control extensibility (B10 Integration)

# Enable/disable entire feature
project_access_control.enabled = True  # Default: True

# Require invitation for external users (not in org)
project_access_control.require_invitation = True  # Default: False

# Require acceptance for admin promotion
project_access_control.require_promotion_approval = True  # Default: True

# Org role threshold for auto-approval (no acceptance needed)
# Values: "viewer" | "editor" | "admin" | "owner"
project_access_control.promotion_approval_threshold = "editor"  # Default: "editor"

# Allow discovering external users by email
project_access_control.external_user_discovery = False  # Default: False

# Enable private projects feature
project_access_control.private_projects = True  # Default: True

# Allow org admins emergency override for private projects
project_access_control.org_admin_override = True  # Default: True
```

**Configure via Django Admin or API:**
```python
from apps.feature_flags.models import FeatureFlag

FeatureFlag.objects.update_or_create(
    key="project_access_control.private_projects",
    defaults={"enabled": True, "description": "Enable private project enforcement"}
)
```

---

## Troubleshooting

### Issue: Permission Cache Not Invalidating

**Symptom:** User role changed but still has old permissions

**Solution:**
```powershell
# Manually invalidate cache
python manage.py invalidate_permission_cache --user-id=u1234567 --project-id=p1234567

# Or via Python:
from apps.projects.services.cache_service import CacheService
CacheService().invalidate_user_project_permissions(user_id, project_id)
```

**Check Cache Health:**
```python
# Verify Redis connection
redis-cli ping  # Should return: PONG

# Check cache stats
python manage.py cache_stats

# Expected output:
# Permission cache hit rate: 82%
# Total permission checks: 1,250
# Cache misses: 225
# Average resolution time: 23ms (p95: 48ms)
```

### Issue: Invitation Email Not Sent

**Symptom:** Invitation created but email not received

**Debug Steps:**
```powershell
# Check Celery worker is running
celery -A src.core inspect active

# Check Celery queue
celery -A src.core inspect scheduled

# Check audit logs for email dispatch
python manage.py show_audit_events --event-type=notification.email.sent --limit=10

# Manually trigger email (dev only)
python manage.py send_test_invitation --email=test@example.com --project-id=p1234567
```

### Issue: Last Admin Protection Not Working

**Symptom:** Can remove last admin from project

**Validation:**
```python
# This should raise ValidationError
from apps.projects.models import ProjectMembership

membership = ProjectMembership.objects.get(project=project, user=last_admin)
membership.delete()  # Should raise: "Cannot remove last admin"

# Check validation logic:
admins_count = ProjectMembership.objects.filter(
    project=project,
    role="admin",
    deleted_at__isnull=True
).count()

if admins_count <= 1:
    raise ValidationError("Cannot remove the last admin from the project.")
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Permission resolution time | <50ms (p95) | Prometheus metric: `permission_resolution_duration_seconds` |
| Cache hit rate | >80% | Redis stats: `INFO stats` → `keyspace_hits / (keyspace_hits + keyspace_misses)` |
| API response time | <200ms (p95) | DRF instrumentation: `api_request_duration_seconds` |
| Database query count | ≤3 per permission check | Django Debug Toolbar or `django.db.connection.queries` |

**Monitor Performance:**
```powershell
# Prometheus metrics endpoint
curl http://localhost:8000/metrics | grep permission_resolution

# Example output:
# permission_resolution_duration_seconds_bucket{le="0.05"} 850
# permission_resolution_duration_seconds_bucket{le="0.1"} 1200
# permission_resolution_duration_seconds_count 1250
```

---

## Next Steps

1. **Read Architecture Docs:** `docs/architecture/project-access-control.md`
2. **Review API Contracts:** `kitty-specs/038-project-access-control/contracts/`
3. **Explore Extension Points:** `docs/guides/extending-project-access.md`
4. **Run Full Test Suite:** `pytest tests/ --cov=apps.projects`
5. **Deploy to Railway:** Follow `docs/railway/RAILWAY_SETUP.md`

---

## Reference

- **Spec:** [spec.md](spec.md) (52 functional requirements, 9 user stories)
- **Planning:** [plan.md](plan.md) (implementation plan, constitution check)
- **Research:** [research/research.md](research/research.md) (5 technical decisions)
- **Data Model:** [research/data-model.md](research/data-model.md) (entity schemas, state machines)
- **API Contracts:** [contracts/](contracts/) (OpenAPI 3.1 specifications)

**Questions?** See `docs/troubleshooting/project-access-faq.md` or ask in `#core-app-dev` Slack channel.
