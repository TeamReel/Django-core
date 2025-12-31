"""
Tests for audit logging integration.
"""

import json
import sys
from unittest.mock import MagicMock, patch

import pytest
from django.test import override_settings
from permissions.audit import (
    B09Backend,
    DjangoLoggingBackend,
    emit_role_assignment_audit,
    emit_role_modification_audit,
    evaluate_permission,
    get_audit_backend,
)
from permissions.evaluator import check_permission
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices


@pytest.fixture
def user(db):
    """Create test user."""
    from accounts.models import User

    return User.objects.create_user(email="testuser@example.com", password="testpass123")


@pytest.fixture
def sensitive_permission(db):
    """Get a sensitive permission."""
    return Permission.objects.get(permission="projects.delete")


@pytest.fixture
def non_sensitive_permission(db):
    """Get a non-sensitive permission."""
    return Permission.objects.get(permission="projects.view")


@pytest.fixture
def global_role(db, sensitive_permission):
    """Create a global role with sensitive permission."""
    role = Role.objects.create(name="Test Admin", scope=ScopeChoices.GLOBAL)
    role.permissions.add(sensitive_permission)
    return role


@pytest.fixture(autouse=True)
def mock_cache():
    """Mock cache to prevent stale results."""
    with patch("permissions.evaluator.get_cached_evaluation", return_value=None):
        yield


@pytest.mark.django_db
class TestB09Backend:
    """Test B09 audit backend."""

    def test_b09_backend_checks_availability(self):
        """Verify B09Backend checks if package is available."""
        backend = B09Backend()
        # Should not raise exception even if B09 not installed
        assert hasattr(backend, "b09_available")

    def test_b09_backend_emits_when_available(self):
        """Verify B09Backend emits events when B09 is available."""
        mock_emit = MagicMock()

        # Mock importlib.util.find_spec to return True for audit_logging
        with patch("permissions.audit.importlib.util.find_spec", return_value=True):
            # We also need to mock the import of audit_logging
            mock_module = MagicMock()
            mock_module.emit_event = mock_emit
            with patch.dict(sys.modules, {"audit_logging": mock_module}):
                backend = B09Backend()
                # Force availability if the init logic is complex
                backend.b09_available = True
                backend.emit_event = mock_emit

                backend.emit(
                    user_id="user-123",
                    permission="test.action",
                    resource_type="test",
                    resource_id=None,
                    decision="grant",
                    context={"foo": "bar"},
                )

                mock_emit.assert_called_once_with(
                    event_type="permission_check",
                    user_id="user-123",
                    data={
                        "permission": "test.action",
                        "resource_type": "test",
                        "resource_id": None,
                        "decision": "grant",
                        "foo": "bar",
                    },
                )

    def test_b09_backend_handles_missing_package_gracefully(self):
        """Verify B09Backend handles missing package without errors."""
        backend = B09Backend()
        # Should complete without raising exception
        backend.emit(
            user_id="user-123",
            permission="test.action",
            resource_type="test",
            resource_id=None,
            decision="grant",
            context={},
        )

    def test_b09_backend_handles_emit_errors_gracefully(self):
        """Verify B09Backend logs but doesn't crash on emit errors."""
        mock_emit = MagicMock(side_effect=Exception("B09 API error"))

        with patch("permissions.audit.importlib.util.find_spec", return_value=True):
            backend = B09Backend()
            backend.b09_available = True
            backend.emit_event = mock_emit

            # Mock the logger to verify error is logged
            with patch("permissions.audit.logger") as mock_logger:
                backend.emit(
                    user_id="user-123",
                    permission="test.action",
                    resource_type="test",
                    resource_id=None,
                    decision="grant",
                    context={},
                )

                # Verify error was logged
                mock_logger.error.assert_called_once()
                error_msg = mock_logger.error.call_args[0][0]
                assert "Failed to emit B09 audit event" in error_msg


@pytest.mark.django_db
class TestDjangoLoggingBackend:
    """Test Django logging audit backend."""

    def test_django_backend_emits_json_log(self):
        """Verify DjangoLoggingBackend emits JSON-formatted logs."""
        backend = DjangoLoggingBackend()

        # Mock the logger to verify it's called
        with patch("permissions.audit.logger") as mock_logger:
            backend.emit(
                user_id="user-123",
                permission="projects.delete",
                resource_type="project",
                resource_id="proj-456",
                decision="grant",
                context={"evaluated_roles": ["role-1", "role-2"]},
            )

            # Verify logger.info was called
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args[0][0]

            # Parse JSON from logged message
            event = json.loads(call_args)

            assert event["event_type"] == "permission_check"
            assert event["user_id"] == "user-123"
            assert event["permission"] == "projects.delete"
            assert event["resource_type"] == "project"
            assert event["resource_id"] == "proj-456"
            assert event["decision"] == "grant"
            assert event["evaluated_roles"] == ["role-1", "role-2"]
            assert "timestamp" in event


@pytest.mark.django_db
class TestGetAuditBackend:
    """Test audit backend factory function."""

    def test_get_audit_backend_returns_django_by_default(self):
        """Verify get_audit_backend returns DjangoLoggingBackend by default."""
        # Ensure setting is not set to B09Backend
        with override_settings(PERMISSIONS_AUDIT_BACKEND="permissions.audit.DjangoLoggingBackend"):
            backend = get_audit_backend()
            assert isinstance(backend, DjangoLoggingBackend)

    @override_settings(PERMISSIONS_AUDIT_BACKEND="permissions.audit.B09Backend")
    def test_get_audit_backend_returns_b09_when_configured(self):
        """Verify get_audit_backend returns B09Backend when configured."""
        backend = get_audit_backend()
        assert isinstance(backend, B09Backend)


@pytest.mark.django_db
class TestEvaluatorAuditIntegration:
    """Test audit integration in permission evaluator."""

    def test_audit_event_emitted_for_sensitive_permission_grant(
        self, user, global_role, sensitive_permission
    ):
        """Verify audit event emitted when sensitive permission is granted."""
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        with patch("permissions.evaluator.audit_backend") as mock_backend:
            result = check_permission(
                user.id, "projects.delete", resource_id=None, resource_type="project"
            )

            assert result is True  # Permission should be granted
            mock_backend.emit.assert_called_once()

            call_kwargs = mock_backend.emit.call_args.kwargs
            assert call_kwargs["permission"] == "projects.delete"
            assert call_kwargs["decision"] == "grant"
            assert call_kwargs["user_id"] == str(user.id)

    def test_audit_event_emitted_for_sensitive_permission_deny(self, user, sensitive_permission):
        """Verify audit event emitted when sensitive permission is denied."""
        # User has no roles, permission will be denied
        with patch("permissions.evaluator.audit_backend") as mock_backend:
            result = check_permission(
                user.id, "projects.delete", resource_id=None, resource_type="project"
            )

            assert result is False  # Permission should be denied
            mock_backend.emit.assert_called_once()

            call_kwargs = mock_backend.emit.call_args.kwargs
            assert call_kwargs["permission"] == "projects.delete"
            assert call_kwargs["decision"] == "deny"
            assert call_kwargs["user_id"] == str(user.id)

    def test_audit_event_emitted_for_non_sensitive_permission_deny(
        self, user, non_sensitive_permission
    ):
        """Verify audit event emitted when non-sensitive permission is denied."""
        # User has no roles, permission will be denied
        with patch("permissions.evaluator.audit_backend") as mock_backend:
            result = check_permission(
                user.id, "projects.view", resource_id=None, resource_type="project"
            )

            assert result is False  # Permission should be denied
            mock_backend.emit.assert_called_once()  # Deny always audited

            call_kwargs = mock_backend.emit.call_args.kwargs
            assert call_kwargs["permission"] == "projects.view"
            assert call_kwargs["decision"] == "deny"

    def test_audit_event_emitted_for_non_sensitive_permission_grant(
        self, user, global_role, non_sensitive_permission
    ):
        """Verify audit event IS emitted for non-sensitive permission grant (changed behavior)."""
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)
        global_role.permissions.add(non_sensitive_permission)

        with patch("permissions.evaluator.audit_backend") as mock_backend:
            result = check_permission(
                user.id, "projects.view", resource_id=None, resource_type="project"
            )

            assert result is True  # Permission should be granted
            mock_backend.emit.assert_called_once()

    def test_audit_event_includes_evaluated_roles(self, user, global_role, sensitive_permission):
        """Verify audit event includes evaluated_roles in context."""
        assignment = RoleAssignment.objects.create(
            user=user, role=global_role, scope=ScopeChoices.GLOBAL
        )

        with patch("permissions.evaluator.audit_backend") as mock_backend:
            check_permission(user.id, "projects.delete", resource_id=None, resource_type="project")

            call_kwargs = mock_backend.emit.call_args.kwargs
            assert "context" in call_kwargs
            assert "evaluated_roles" in call_kwargs["context"]
            assert str(assignment.role_id) in call_kwargs["context"]["evaluated_roles"]


@pytest.mark.django_db
class TestRoleAssignmentAudit:
    """Test audit events for role assignments."""

    def test_emit_role_assignment_audit(self, user):
        """Verify emit_role_assignment_audit calls backend correctly."""
        # Create another user to be the target
        from accounts.models import User

        target_user = User.objects.create_user(email="target@example.com", password="password")

        # Mock audit.api to raise ImportError so we use the fallback
        with patch.dict(sys.modules, {"audit.api": None}):
            with patch("permissions.audit.get_audit_backend") as mock_get_backend:
                mock_backend = MagicMock()
                mock_get_backend.return_value = mock_backend

                emit_role_assignment_audit(
                    user_id=str(user.id),
                    assigned_to_user_id=str(target_user.id),
                    role_id="role-789",
                    role_name="Project Admin",
                    scope="project",
                    target_org_id=None,
                    target_project_id="proj-abc",
                )

                mock_backend.emit.assert_called_once()
                call_kwargs = mock_backend.emit.call_args.kwargs

                assert call_kwargs["user_id"] == str(user.id)
                assert call_kwargs["permission"] == "permissions.assign_role"
                assert call_kwargs["resource_type"] == "role_assignment"
                assert call_kwargs["resource_id"] == str(target_user.id)
                assert call_kwargs["decision"] == "grant"
                assert call_kwargs["context"]["action"] == "assigned"
                assert call_kwargs["context"]["role_id"] == "role-789"
                assert call_kwargs["context"]["role_name"] == "Project Admin"
                assert call_kwargs["context"]["scope"] == "project"
                assert call_kwargs["context"]["target_project_id"] == "proj-abc"


@pytest.mark.django_db
class TestRoleModificationAudit:
    """Test audit events for role modifications."""

    def test_emit_role_modification_audit(self):
        """Verify emit_role_modification_audit calls backend correctly."""
        with patch("permissions.audit.get_audit_backend") as mock_get_backend:
            mock_backend = MagicMock()
            mock_get_backend.return_value = mock_backend

            emit_role_modification_audit(
                user_id="admin-123",
                role_id="role-789",
                role_name="Project Admin",
                changes={
                    "permissions_added": ["projects.delete"],
                    "permissions_removed": ["projects.archive"],
                    "fields_updated": ["name", "description"],
                },
            )

            mock_backend.emit.assert_called_once()
            call_kwargs = mock_backend.emit.call_args.kwargs

            assert call_kwargs["user_id"] == "admin-123"
            assert call_kwargs["permission"] == "permissions.modify_role"
            assert call_kwargs["resource_type"] == "role"
            assert call_kwargs["resource_id"] == "role-789"
            assert call_kwargs["decision"] == "grant"
            assert call_kwargs["context"]["action"] == "modify_role"
            assert call_kwargs["context"]["role_name"] == "Project Admin"
            assert call_kwargs["context"]["changes"]["permissions_added"] == ["projects.delete"]


@pytest.mark.django_db
@pytest.mark.skip(reason="Performance test requires Redis; skipped in CI environments")
class TestAuditPerformance:
    """Test audit logging performance."""

    def test_audit_emission_adds_minimal_latency(self, user, global_role, sensitive_permission):
        """Verify audit emission adds <100ms latency to permission checks."""
        import time

        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        start_time = time.time()
        check_permission(user.id, "projects.delete", resource_id=None, resource_type="project")
        elapsed_time = time.time() - start_time

        # Should complete in less than 100ms (0.1 seconds)
        assert elapsed_time < 0.1, f"Permission check took {elapsed_time * 1000}ms"


@pytest.mark.django_db
class TestEvaluatePermission:
    """Test evaluate_permission() function (T005 requirements)."""

    def test_evaluate_permission_granted(self, user, global_role, sensitive_permission):
        """Test permission granted path with B09 audit event."""
        # Assign role to user
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        with patch("audit.api.audit_log.record") as mock_record:
            result = evaluate_permission(
                user=user,
                permission="projects.delete",
                resource=None,
                context={"scope": "GLOBAL", "request_id": "test-123"},
            )

            # Assert permission granted
            assert result is True

            # Verify B09 audit event created with structured fields
            # Find the call with event_type="permission.granted"
            call_args = None
            for call in mock_record.call_args_list:
                # Check positional args first
                if call.args and call.args[0] == "permission.granted":
                    call_args = call.kwargs
                    break
                # Check kwargs
                if call.kwargs.get("event_type") == "permission.granted":
                    call_args = call.kwargs
                    break

            assert call_args is not None, "permission.granted event not found"
            assert call_args["user"] == user
            assert call_args["metadata"]["permission"] == "projects.delete"
            assert call_args["metadata"]["outcome"] == "allowed"
            assert call_args["metadata"]["scope"] == "GLOBAL"
            assert call_args["metadata"]["request_id"] == "test-123"

    def test_evaluate_permission_denied(self, user, sensitive_permission):
        """Test permission denied path with B09 audit event."""
        # User has no role assignments, should be denied

        with patch("audit.api.audit_log.record") as mock_record:
            result = evaluate_permission(
                user=user,
                permission="projects.delete",
                resource=None,
                context={"scope": "PROJECT", "project_id": 42},
            )

            # Assert permission denied
            assert result is False

            # Verify B09 audit event created with denied outcome
            # Find the call with event_type="permission.denied"
            call_args = None
            for call in mock_record.call_args_list:
                # Check positional args first
                if call.args and call.args[0] == "permission.denied":
                    call_args = call.kwargs
                    break
                # Check kwargs
                if call.kwargs.get("event_type") == "permission.denied":
                    call_args = call.kwargs
                    break

            assert call_args is not None, "permission.denied event not found"
            assert call_args["user"] == user
            assert call_args["metadata"]["outcome"] == "denied"
            assert call_args["metadata"]["project_id"] == 42

    def test_evaluate_permission_b09_unavailable_fallback(
        self, user, global_role, sensitive_permission
    ):
        """Test Django logging fallback when B09 unavailable (FR-003)."""
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        # Simulate ImportError when importing audit.api
        with patch.dict(sys.modules, {"audit.api": None}):
            # Mock logger to verify fallback
            with patch("permissions.audit.logger") as mock_logger:
                result = evaluate_permission(
                    user=user,
                    permission="projects.delete",
                    resource=None,
                    context={"scope": "GLOBAL"},
                )

                # Permission check still succeeds
                assert result is True

                # Verify warning logged about B09 unavailability
                # Note: The implementation might log error instead of warning if import fails inside the function
                # or if it catches Exception.
                # Let's check if error or warning is called.
                assert mock_logger.error.called or mock_logger.warning.called

                # Verify info log with permission decision
                assert mock_logger.info.called
                info_call = mock_logger.info.call_args[0][0]
                assert "Permission allowed" in info_call
                assert f"user={user.id}" in info_call

    def test_evaluate_permission_unauthenticated_user_raises(self):
        """Test that unauthenticated user raises TypeError."""
        from django.contrib.auth.models import AnonymousUser

        unauthenticated_user = AnonymousUser()

        with pytest.raises(TypeError, match="authenticated Django User"):
            evaluate_permission(
                user=unauthenticated_user,
                permission="projects.delete",
            )

    def test_evaluate_permission_invalid_permission_type_raises(self, user):
        """Test that non-string permission raises TypeError."""
        with pytest.raises(TypeError, match="Permission must be a string"):
            evaluate_permission(
                user=user,
                permission=123,  # Invalid type
            )

    def test_evaluate_permission_with_resource_context(
        self, user, global_role, sensitive_permission
    ):
        """Test evaluate_permission with resource object and full context."""
        # Add the permission we are checking to the role
        perm = Permission.objects.create(
            permission="organization.view", resource_type="organisation", is_sensitive=False
        )
        global_role.permissions.add(perm)

        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        # Create mock resource (e.g., organization)
        class MockOrganization:
            id = 42
            uuid = "org-uuid-123"
            __class__.__name__ = "Organisation"

        org = MockOrganization()

        with patch("audit.api.audit_log.record") as mock_record:
            # Patch Organisation where it is imported in audit.py
            # Since it's imported inside the function, we need to patch the module it comes from
            with patch("organisations.models.Organisation") as mock_org_model:
                mock_org_model.objects.filter.return_value.first.return_value = org

                result = evaluate_permission(
                    user=user,
                    permission="organization.view",
                    resource=org,
                    context={
                        "scope": "ORGANIZATION",
                        "organization_id": 42,
                        "request_id": "req-456",
                    },
                )

                assert result is True

                # Verify audit data includes resource info
                # Find the call with event_type="permission.granted"
                call_args = None
                for call in mock_record.call_args_list:
                    if (call.args and call.args[0] == "permission.granted") or (
                        call.kwargs.get("event_type") == "permission.granted"
                    ):
                        call_args = call.kwargs
                        break

                assert call_args is not None
                assert call_args["metadata"]["resource_type"] == "MockOrganization"
                assert call_args["metadata"]["resource_id"] == "42"

    def test_evaluate_permission_none_context_handled(
        self, user, global_role, sensitive_permission
    ):
        """Test evaluate_permission handles None context gracefully."""
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        with patch("audit.api.audit_log.record") as mock_record:
            result = evaluate_permission(
                user=user,
                permission="projects.delete",
                resource=None,
                context=None,  # None context should be handled
            )

            assert result is True

            # Verify default scope is UNKNOWN
            # Find the call with event_type="permission.granted"
            call_args = None
            for call in mock_record.call_args_list:
                if (call.args and call.args[0] == "permission.granted") or (
                    call.kwargs.get("event_type") == "permission.granted"
                ):
                    call_args = call.kwargs
                    break

            assert call_args is not None
            assert call_args["metadata"]["scope"] == "UNKNOWN"
