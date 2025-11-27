---
lane: "done"
agent: "claude"
assignee: "claude"
shell_pid: "45896"
review_status: "approved_without_changes"
reviewed_by: "claude"
reviewed_at: "2025-01-21"
history:
  - date: "2025-11-27"
    action: "created"
    author: "AI Agent"
  - date: "2025-01-21"
    action: "moved_to_done"
    author: "claude"
    shell_pid: "45896"
    note: "Approved and moved to done lane"
---
# WP05: B08 Permission System Integration

```yaml
work_package_id: WP05
feature: 009-audit-logging-system
priority: P1
estimated_subtasks: 7
dependencies: [WP01, WP02]
lane: done
assignee: claude
history:
  - date: 2025-11-27
    action: created
    author: AI Agent
  - date: 2025-11-27T16:20:00Z
    action: moved_to_done
    author: claude
    shell_pid: 45896
    note: Approved and moved to done lane
```

## Objective

Add `audit_log.record()` calls to B08 permission evaluator and RoleAssignment model to automatically log all permission checks and role changes (User Story 5).

## Context

**Specification**: [spec.md](../../spec.md) - User Story 5 (B08 Integration, P1)
**Research**: [research.md](../../research.md) - Decision 1 (Direct API calls for guaranteed coverage)

**User Story** (from spec.md):
> As a developer, I want permission checks and role changes automatically logged via B08 integration so that I don't have to manually instrument audit calls everywhere.

**Architecture Decision**: Use direct `audit_log.record()` calls in B08 code (not signals/middleware) for guaranteed coverage and simplicity.

**B08 Files to Modify**:
- `src/permissions/evaluator.py` - check_permission() method
- `src/permissions/models.py` - RoleAssignment model save/delete

## Detailed Guidance

### T029: Add audit_log Calls in Permission Evaluator

**Goal**: Log all permission checks with permission name, resource, and result.

**Implementation** (modify `src/permissions/evaluator.py`):
```python
# Add import at top
try:
    from audit.api import audit_log
    AUDIT_AVAILABLE = True
except ImportError:
    AUDIT_AVAILABLE = False

class PermissionEvaluator:
    # ... existing code ...

    def check_permission(
        self,
        user,
        permission: str,
        organization=None,
        project=None,
        resource=None
    ) -> bool:
        """
        Check if user has permission.

        Logs permission check via audit system.
        """
        # Evaluate permission (existing logic)
        result = self._evaluate_permission(user, permission, organization, project, resource)

        # Log audit event
        if AUDIT_AVAILABLE:
            try:
                audit_log.record(
                    'permission.checked',
                    user=user,
                    organization=organization,
                    project=project,
                    metadata={
                        'permission': permission,
                        'result': 'allowed' if result else 'denied',
                        'resource_type': type(resource).__name__ if resource else None,
                        'resource_id': getattr(resource, 'id', None)
                    }
                )
            except Exception as e:
                # Graceful degradation: Audit failure doesn't break permission check
                logger.warning(f"Failed to log permission check: {e}")

        return result
```

**Key Points**:
- **Import Guard**: try/except allows B08 to work even if audit app not installed
- **Graceful Degradation**: Audit failure logged but doesn't re-raise
- **Metadata**: Captures permission, result, resource type/ID
- **Context**: Automatically includes user, organization, project

**Files Modified**:
- `src/permissions/evaluator.py`

**Validation**:
```python
from permissions.evaluator import PermissionEvaluator
from audit.models import AuditEvent

evaluator = PermissionEvaluator()
evaluator.check_permission(user, 'projects.create', organization=org)

# Verify audit event created
event = AuditEvent.objects.filter(event_type='permission.checked').last()
assert event.metadata['permission'] == 'projects.create'
assert event.metadata['result'] in ['allowed', 'denied']
```

---

### T030: Add audit_log Calls in RoleAssignment.save()

**Goal**: Log role.assigned event when creating RoleAssignment.

**Implementation** (modify `src/permissions/models.py`):
```python
# Add import at top
try:
    from audit.api import audit_log
    AUDIT_AVAILABLE = True
except ImportError:
    AUDIT_AVAILABLE = False

class RoleAssignment(models.Model):
    # ... existing fields ...

    def save(self, *args, **kwargs):
        """
        Save role assignment and log audit event.
        """
        is_new = self.pk is None  # Check before save

        # Save to database
        super().save(*args, **kwargs)

        # Log audit event for new assignments
        if is_new and AUDIT_AVAILABLE:
            try:
                audit_log.record(
                    'role.assigned',
                    user=self.assigned_by if hasattr(self, 'assigned_by') else None,
                    organization=self.organization if hasattr(self, 'organization') else None,
                    project=self.project if hasattr(self, 'project') else None,
                    metadata={
                        'role_name': self.role.name,
                        'role_id': self.role.id,
                        'target_user_id': self.user.id,
                        'target_user_email': self.user.email,
                        'scope': self.scope if hasattr(self, 'scope') else None
                    }
                )
            except Exception as e:
                # Graceful degradation
                logger.warning(f"Failed to log role assignment: {e}")
```

**Design Notes**:
- **Check is_new**: Only log on creation, not every update
- **assigned_by Field**: May need to add this field to RoleAssignment model or pass via context
- **Scope Context**: Capture organization/project if RoleAssignment has these fields

**Files Modified**:
- `src/permissions/models.py`

**Validation**:
```python
from permissions.models import RoleAssignment
from audit.models import AuditEvent

assignment = RoleAssignment.objects.create(
    role=admin_role,
    user=target_user,
    organization=org
)

# Verify audit event created
event = AuditEvent.objects.filter(event_type='role.assigned').last()
assert event.metadata['role_name'] == 'Admin'
assert event.metadata['target_user_id'] == target_user.id
```

---

### T031: Add audit_log Calls in RoleAssignment.delete()

**Goal**: Log role.revoked event when deleting RoleAssignment.

**Implementation** (add to `RoleAssignment` in `src/permissions/models.py`):
```python
class RoleAssignment(models.Model):
    # ... existing code ...

    def delete(self, *args, **kwargs):
        """
        Delete role assignment and log audit event.
        """
        # Capture data before deletion
        role_name = self.role.name
        role_id = self.role.id
        user_id = self.user.id
        user_email = self.user.email
        organization = getattr(self, 'organization', None)
        project = getattr(self, 'project', None)
        revoked_by = kwargs.pop('revoked_by', None)  # Custom kwarg for context

        # Delete from database
        super().delete(*args, **kwargs)

        # Log audit event
        if AUDIT_AVAILABLE:
            try:
                audit_log.record(
                    'role.revoked',
                    user=revoked_by,
                    organization=organization,
                    project=project,
                    metadata={
                        'role_name': role_name,
                        'role_id': role_id,
                        'target_user_id': user_id,
                        'target_user_email': user_email,
                        'reason': kwargs.get('reason', 'Not specified')
                    }
                )
            except Exception as e:
                logger.warning(f"Failed to log role revocation: {e}")
```

**Design Notes**:
- **Capture Before Delete**: Save role/user data before `super().delete()` destroys it
- **revoked_by Context**: Accept custom kwarg for who performed deletion
- **Reason Field**: Optional reason for revocation

**Usage**:
```python
assignment.delete(revoked_by=admin_user, reason='User left organization')
```

**Files Modified**:
- `src/permissions/models.py`

**Validation**:
```python
assignment = RoleAssignment.objects.create(role=role, user=user)
assignment.delete(revoked_by=admin_user)

event = AuditEvent.objects.filter(event_type='role.revoked').last()
assert event.metadata['role_name'] == role.name
assert event.user == admin_user
```

---

### T032: Handle B08 Graceful Degradation

**Goal**: Ensure audit works even if B08 not installed (for downstream products).

**Implementation** (verify in all B08 files):
```python
# At top of file
try:
    from audit.api import audit_log
    AUDIT_AVAILABLE = True
except ImportError:
    AUDIT_AVAILABLE = False

# Before every audit_log.record() call
if AUDIT_AVAILABLE:
    try:
        audit_log.record(...)
    except Exception as e:
        logger.warning(f"Audit logging failed: {e}")
```

**Testing**:
```python
# Simulate audit app not installed
import sys
sys.modules['audit'] = None  # Mock missing module

# B08 operations should still work
evaluator.check_permission(user, 'projects.create')  # Succeeds without audit
assignment = RoleAssignment.objects.create(...)  # Succeeds without audit
```

**Files Modified**:
- None (verify existing code has guards)

**Validation**:
- B08 tests pass with audit app disabled
- No ImportError or AttributeError exceptions

---

### T033: Write B08 Integration Tests for Permission Checks [P]

**Goal**: Verify permission.checked events created for allow and deny cases.

**Implementation** (create `tests/audit/test_b08_integration.py`):
```python
import pytest
from django.contrib.auth import get_user_model

from permissions.evaluator import PermissionEvaluator
from permissions.models import Role, RoleAssignment
from audit.models import AuditEvent

User = get_user_model()


@pytest.fixture
def permission_setup(db):
    """Setup users, roles, organization for permission tests."""
    user = User.objects.create_user(email='user@example.com', password='pass')
    org = Organisation.objects.create(name='Test Org')

    # Create admin role
    admin_role = Role.objects.create(name='Admin')
    admin_role.permissions.add('projects.create', 'projects.delete')

    return {
        'user': user,
        'org': org,
        'admin_role': admin_role
    }


class TestPermissionCheckAudit:
    """Test audit logging for permission checks."""

    def test_allowed_permission_creates_audit_event(self, permission_setup):
        """Allowed permission check creates audit event with result='allowed'."""
        user = permission_setup['user']
        org = permission_setup['org']
        admin_role = permission_setup['admin_role']

        # Assign admin role
        RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            organization=org
        )

        # Check permission (should be allowed)
        evaluator = PermissionEvaluator()
        result = evaluator.check_permission(user, 'projects.create', organization=org)

        assert result is True

        # Verify audit event
        event = AuditEvent.objects.filter(event_type='permission.checked').last()
        assert event is not None
        assert event.user == user
        assert event.organization == org
        assert event.metadata['permission'] == 'projects.create'
        assert event.metadata['result'] == 'allowed'

    def test_denied_permission_creates_audit_event(self, permission_setup):
        """Denied permission check creates audit event with result='denied'."""
        user = permission_setup['user']
        org = permission_setup['org']

        # No role assigned - permission denied
        evaluator = PermissionEvaluator()
        result = evaluator.check_permission(user, 'projects.delete', organization=org)

        assert result is False

        # Verify audit event
        event = AuditEvent.objects.filter(event_type='permission.checked').last()
        assert event is not None
        assert event.user == user
        assert event.metadata['permission'] == 'projects.delete'
        assert event.metadata['result'] == 'denied'

    def test_permission_check_with_resource_logs_resource_info(self, permission_setup):
        """Permission check with resource includes resource type and ID in metadata."""
        user = permission_setup['user']
        org = permission_setup['org']
        project = Project.objects.create(name='Test Project', organization=org)

        evaluator = PermissionEvaluator()
        evaluator.check_permission(user, 'projects.view', resource=project)

        # Verify resource info in metadata
        event = AuditEvent.objects.filter(event_type='permission.checked').last()
        assert event.metadata['resource_type'] == 'Project'
        assert event.metadata['resource_id'] == project.id
```

**Files Created**:
- `tests/audit/test_b08_integration.py`

**Validation**:
- `pytest tests/audit/test_b08_integration.py::TestPermissionCheckAudit -v`

---

### T034: Write B08 Integration Tests for Role Operations [P]

**Goal**: Verify role.assigned/revoked events created for CRUD operations.

**Implementation** (add to `tests/audit/test_b08_integration.py`):
```python
class TestRoleAssignmentAudit:
    """Test audit logging for role assignments."""

    def test_role_assignment_creates_audit_event(self, permission_setup):
        """Creating role assignment logs role.assigned event."""
        user = permission_setup['user']
        org = permission_setup['org']
        admin_role = permission_setup['admin_role']

        # Create assignment
        assignment = RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            organization=org
        )

        # Verify audit event
        event = AuditEvent.objects.filter(event_type='role.assigned').last()
        assert event is not None
        assert event.organization == org
        assert event.metadata['role_name'] == 'Admin'
        assert event.metadata['target_user_id'] == user.id
        assert event.metadata['target_user_email'] == user.email

    def test_role_revocation_creates_audit_event(self, permission_setup):
        """Deleting role assignment logs role.revoked event."""
        user = permission_setup['user']
        org = permission_setup['org']
        admin_role = permission_setup['admin_role']
        admin_user = User.objects.create_user(email='admin@example.com', password='pass')

        # Create then delete assignment
        assignment = RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            organization=org
        )
        assignment.delete(revoked_by=admin_user, reason='User left organization')

        # Verify audit event
        event = AuditEvent.objects.filter(event_type='role.revoked').last()
        assert event is not None
        assert event.user == admin_user  # Who performed revocation
        assert event.metadata['role_name'] == 'Admin'
        assert event.metadata['target_user_id'] == user.id
        assert event.metadata['reason'] == 'User left organization'

    def test_role_assignment_update_does_not_log(self, permission_setup):
        """Updating existing role assignment does not log duplicate event."""
        user = permission_setup['user']
        org = permission_setup['org']
        admin_role = permission_setup['admin_role']

        # Create assignment
        assignment = RoleAssignment.objects.create(
            role=admin_role,
            user=user,
            organization=org
        )

        # Count events
        initial_count = AuditEvent.objects.filter(event_type='role.assigned').count()

        # Update assignment (e.g., change expiry date)
        assignment.save()

        # Verify no new audit event
        new_count = AuditEvent.objects.filter(event_type='role.assigned').count()
        assert new_count == initial_count  # No duplicate event
```

**Files Modified**:
- `tests/audit/test_b08_integration.py`

**Validation**:
- `pytest tests/audit/test_b08_integration.py::TestRoleAssignmentAudit -v`

---

### T035: Update B08 Documentation

**Goal**: Document audit integration in permissions/README.md.

**Implementation** (modify `src/permissions/README.md`):
```markdown
# Permissions System (B08)

## Audit Logging Integration

The permissions system automatically logs all permission checks and role changes to the audit system.

### Logged Events

#### permission.checked

Logged by: `PermissionEvaluator.check_permission()`

Metadata:
- `permission` (str): Permission name (e.g., 'projects.create')
- `result` (str): 'allowed' or 'denied'
- `resource_type` (str, optional): Type of resource checked
- `resource_id` (int, optional): ID of resource checked

Example:
```python
evaluator.check_permission(user, 'projects.create', organization=org)
# Creates audit event:
# {
#   "event_type": "permission.checked",
#   "user": user,
#   "organization": org,
#   "metadata": {
#     "permission": "projects.create",
#     "result": "allowed"
#   }
# }
```

#### role.assigned

Logged by: `RoleAssignment.save()` (on creation only)

Metadata:
- `role_name` (str): Name of role assigned
- `role_id` (int): Role ID
- `target_user_id` (int): User receiving role
- `target_user_email` (str): Email of user receiving role
- `scope` (str, optional): Organization or project scope

Example:
```python
RoleAssignment.objects.create(role=admin_role, user=user, organization=org)
# Creates audit event with metadata:
# {
#   "role_name": "Admin",
#   "target_user_id": 123,
#   "target_user_email": "user@example.com"
# }
```

#### role.revoked

Logged by: `RoleAssignment.delete()`

Metadata:
- `role_name` (str): Name of role revoked
- `role_id` (int): Role ID
- `target_user_id` (int): User losing role
- `target_user_email` (str): Email of user losing role
- `reason` (str): Reason for revocation

Example:
```python
assignment.delete(revoked_by=admin_user, reason='User left organization')
# Creates audit event with revoked_by as user
```

### Graceful Degradation

Audit logging failures never break permission checks or role operations. If audit system is unavailable:
- Permission checks proceed normally
- Role assignments succeed
- Warnings logged for ops team visibility

### Testing

See `tests/audit/test_b08_integration.py` for integration test examples.
```

**Files Modified**:
- `src/permissions/README.md`

**Validation**:
- Read updated README
- Verify examples match actual implementation

---

## Test Strategy

**Integration Testing**:
- Focus on B08 → Audit integration (not just audit system)
- Test both success (events created) and failure (graceful degradation)
- Verify metadata completeness

**Test Execution**:
```bash
# Run B08 integration tests
pytest tests/audit/test_b08_integration.py -v

# Run all audit tests (including B08)
pytest tests/audit/ -v

# Run B08 tests to ensure no regressions
pytest tests/permissions/ -v
```

## Definition of Done

- [ ] All 7 subtasks completed (T029-T035)
- [ ] audit_log.record() calls added to:
  - `permissions/evaluator.py` check_permission() method
  - `permissions/models.py` RoleAssignment.save() method
  - `permissions/models.py` RoleAssignment.delete() method
- [ ] Import guards added (try/except ImportError) for graceful degradation
- [ ] Permission check creates permission.checked event
- [ ] Role creation creates role.assigned event
- [ ] Role deletion creates role.revoked event
- [ ] B08 integration tests pass: `pytest tests/audit/test_b08_integration.py -v`
- [ ] B08 tests still pass (no regressions): `pytest tests/permissions/ -v`
- [ ] permissions/README.md updated with audit integration docs
- [ ] Manual test: Check permission and verify audit event in admin
- [ ] No linting errors: `ruff check src/permissions/ tests/audit/`

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| B08 code changes break existing tests | High | Run full B08 test suite, ensure tests pass |
| Audit failures break permission checks | Critical | Wrap all audit calls in try/except, test graceful degradation |
| Performance overhead from audit calls | Medium | Benchmark permission checks before/after, verify <10ms overhead |
| Circular imports (B08 → audit → B08) | Medium | Use import guards, audit only imports from B08 models not vice versa |

## Reviewer Guidance

**What to verify**:
1. **Import Guards**: All B08 files use try/except ImportError around audit imports
2. **Graceful Degradation**: Audit failures caught and logged, don't re-raise
3. **Metadata Completeness**: Events include all required fields (permission, result, role_name, etc.)
4. **Context Propagation**: Events capture user, organization, project from B08 context
5. **Performance**: Permission checks don't slow down significantly (<10ms overhead)

**What to test**:
1. Run B08 tests: `pytest tests/permissions/ -v` - verify all pass
2. Run audit integration tests: `pytest tests/audit/test_b08_integration.py -v`
3. Manual permission check:
   ```python
   from permissions.evaluator import PermissionEvaluator
   from audit.models import AuditEvent

   evaluator = PermissionEvaluator()
   evaluator.check_permission(user, 'projects.create', organization=org)

   # Check audit event
   event = AuditEvent.objects.filter(event_type='permission.checked').last()
   print(event.metadata)
   ```
4. Manual role assignment:
   ```python
   from permissions.models import RoleAssignment
   assignment = RoleAssignment.objects.create(role=role, user=user, organization=org)

   # Check audit event
   event = AuditEvent.objects.filter(event_type='role.assigned').last()
   print(event.metadata)
   ```
5. Test with audit disabled:
   ```python
   import sys
   sys.modules['audit'] = None

   # B08 operations should still work
   evaluator.check_permission(...)  # Should succeed without error
   ```

**Red flags**:
- B08 tests failing (regressions introduced)
- Permission checks raise exceptions when audit unavailable
- Audit events missing required metadata fields
- Performance degradation >10ms per permission check
- Circular import errors

## Activity Log

- 2025-11-27T15:16:31Z – claude – shell_pid=45896 – lane=doing – Started implementation of B08 integration
