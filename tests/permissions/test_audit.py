"""
Tests for audit logging integration.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
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
    """Create a sensitive permission."""
    return Permission.objects.create(
        permission="projects.delete", resource_type="project", is_sensitive=True
    )


@pytest.fixture
def non_sensitive_permission(db):
    """Create a non-sensitive permission."""
    return Permission.objects.create(
        permission="projects.view", resource_type="project", is_sensitive=False
    )


@pytest.fixture
def global_role(db, sensitive_permission):
    """Create a global role with sensitive permission."""
    role = Role.objects.create(name="Test Admin", scope=ScopeChoices.GLOBAL)
    role.permissions.add(sensitive_permission)
    return role


@pytest.mark.django_db
class TestB09Backend:
    """Test B09 audit backend."""

    def test_b09_backend_checks_availability(self):
        """Verify B09Backend checks if package is available."""
        backend = B09Backend()
        # Should not raise exception even if B09 not installed
        assert hasattr(backend, "b09_available")

    def test_b09_backend_emits_when_available(self, mocker):
        """Verify B09Backend emits events when B09 is available."""
        mock_emit = MagicMock()
        mocker.patch("permissions.audit.importlib.util.find_spec", return_value=True)
        mocker.patch("permissions.audit.B09Backend._check_b09_available", return_value=True)

        backend = B09Backend()
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

    def test_b09_backend_handles_emit_errors_gracefully(self, mocker):
        """Verify B09Backend logs but doesn't crash on emit errors."""
        from unittest.mock import patch as mock_patch

        mock_emit = MagicMock(side_effect=Exception("B09 API error"))
        mocker.patch("permissions.audit.importlib.util.find_spec", return_value=True)

        backend = B09Backend()
        backend.b09_available = True
        backend.emit_event = mock_emit

        # Mock the logger to verify error is logged
        with mock_patch("permissions.audit.logger") as mock_logger:
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
        from unittest.mock import patch

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
        backend = get_audit_backend()
        assert isinstance(backend, DjangoLoggingBackend)

    @patch("permissions.audit.settings.PERMISSIONS_AUDIT_BACKEND", "permissions.audit.B09Backend")
    def test_get_audit_backend_returns_b09_when_configured(self):
        """Verify get_audit_backend returns B09Backend when configured."""
        backend = get_audit_backend()
        assert isinstance(backend, B09Backend)


@pytest.mark.django_db
class TestEvaluatorAuditIntegration:
    """Test audit integration in permission evaluator."""

    def test_audit_event_emitted_for_sensitive_permission_grant(
        self, user, global_role, sensitive_permission, mocker
    ):
        """Verify audit event emitted when sensitive permission is granted."""
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        mock_backend = mocker.patch("permissions.evaluator.audit_backend")

        result = check_permission(
            user.id, "projects.delete", resource_id=None, resource_type="project"
        )

        assert result is True  # Permission should be granted
        mock_backend.emit.assert_called_once()

        call_kwargs = mock_backend.emit.call_args.kwargs
        assert call_kwargs["permission"] == "projects.delete"
        assert call_kwargs["decision"] == "grant"
        assert call_kwargs["user_id"] == str(user.id)

    def test_audit_event_emitted_for_sensitive_permission_deny(
        self, user, sensitive_permission, mocker
    ):
        """Verify audit event emitted when sensitive permission is denied."""
        # User has no roles, permission will be denied
        mock_backend = mocker.patch("permissions.evaluator.audit_backend")

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
        self, user, non_sensitive_permission, mocker
    ):
        """Verify audit event emitted when non-sensitive permission is denied."""
        # User has no roles, permission will be denied
        mock_backend = mocker.patch("permissions.evaluator.audit_backend")

        result = check_permission(
            user.id, "projects.view", resource_id=None, resource_type="project"
        )

        assert result is False  # Permission should be denied
        mock_backend.emit.assert_called_once()  # Deny always audited

        call_kwargs = mock_backend.emit.call_args.kwargs
        assert call_kwargs["permission"] == "projects.view"
        assert call_kwargs["decision"] == "deny"

    def test_audit_event_not_emitted_for_non_sensitive_permission_grant(
        self, user, global_role, non_sensitive_permission, mocker
    ):
        """Verify no audit event for non-sensitive permission grant."""
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)
        global_role.permissions.add(non_sensitive_permission)

        mock_backend = mocker.patch("permissions.evaluator.audit_backend")

        result = check_permission(
            user.id, "projects.view", resource_id=None, resource_type="project"
        )

        assert result is True  # Permission should be granted
        # Should not emit audit event (non-sensitive + grant)
        mock_backend.emit.assert_not_called()

    def test_audit_event_includes_evaluated_roles(
        self, user, global_role, sensitive_permission, mocker
    ):
        """Verify audit event includes evaluated_roles in context."""
        assignment = RoleAssignment.objects.create(
            user=user, role=global_role, scope=ScopeChoices.GLOBAL
        )

        mock_backend = mocker.patch("permissions.evaluator.audit_backend")

        check_permission(user.id, "projects.delete", resource_id=None, resource_type="project")

        call_kwargs = mock_backend.emit.call_args.kwargs
        assert "context" in call_kwargs
        assert "evaluated_roles" in call_kwargs["context"]
        assert str(assignment.role_id) in call_kwargs["context"]["evaluated_roles"]


@pytest.mark.django_db
class TestRoleAssignmentAudit:
    """Test audit events for role assignments."""

    def test_emit_role_assignment_audit(self, mocker):
        """Verify emit_role_assignment_audit calls backend correctly."""
        mock_backend = mocker.patch("permissions.audit.get_audit_backend")()

        emit_role_assignment_audit(
            user_id="admin-123",
            assigned_to_user_id="user-456",
            role_id="role-789",
            role_name="Project Admin",
            scope="project",
            target_org_id=None,
            target_project_id="proj-abc",
        )

        mock_backend.emit.assert_called_once()
        call_kwargs = mock_backend.emit.call_args.kwargs

        assert call_kwargs["user_id"] == "admin-123"
        assert call_kwargs["permission"] == "permissions.assign_role"
        assert call_kwargs["resource_type"] == "role_assignment"
        assert call_kwargs["resource_id"] == "user-456"
        assert call_kwargs["decision"] == "grant"
        assert call_kwargs["context"]["action"] == "assign_role"
        assert call_kwargs["context"]["role_id"] == "role-789"
        assert call_kwargs["context"]["role_name"] == "Project Admin"
        assert call_kwargs["context"]["scope"] == "project"
        assert call_kwargs["context"]["target_project_id"] == "proj-abc"


@pytest.mark.django_db
class TestRoleModificationAudit:
    """Test audit events for role modifications."""

    def test_emit_role_modification_audit(self, mocker):
        """Verify emit_role_modification_audit calls backend correctly."""
        mock_backend = mocker.patch("permissions.audit.get_audit_backend")()

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

        # Mock B09 audit using correct API (audit.services.create_audit_event)
        with patch("permissions.audit.create_audit_event") as mock_create_audit_event:
            result = evaluate_permission(
                user=user,
                permission="projects.delete",
                resource=None,
                context={"scope": "GLOBAL", "request_id": "test-123"},
            )

            # Assert permission granted
            assert result is True

            # Verify B09 audit event created with structured fields
            mock_create_audit_event.assert_called_once()
            call_args = mock_create_audit_event.call_args[1]
            assert call_args["event_type"] == "permission.granted"
            assert call_args["user"] == user
            assert call_args["metadata"]["permission"] == "projects.delete"
            assert call_args["metadata"]["outcome"] == "allowed"
            assert call_args["metadata"]["scope"] == "GLOBAL"
            assert call_args["metadata"]["request_id"] == "test-123"

    def test_evaluate_permission_denied(self, user, sensitive_permission):
        """Test permission denied path with B09 audit event."""
        # User has no role assignments, should be denied

        # Mock B09 audit using correct API
        with patch("permissions.audit.create_audit_event") as mock_create_audit_event:
            result = evaluate_permission(
                user=user,
                permission="projects.delete",
                resource=None,
                context={"scope": "PROJECT", "project_id": 42},
            )

            # Assert permission denied
            assert result is False

            # Verify B09 audit event created with denied outcome
            mock_create_audit_event.assert_called_once()
            call_args = mock_create_audit_event.call_args[1]
            assert call_args["event_type"] == "permission.denied"
            assert call_args["user"] == user
            assert call_args["metadata"]["outcome"] == "denied"
            assert call_args["metadata"]["project_id"] == 42

    def test_evaluate_permission_b09_unavailable_fallback(
        self, user, global_role, sensitive_permission
    ):
        """Test Django logging fallback when B09 unavailable (FR-003)."""
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        # Mock B09 to raise ImportError (module not available)
        with patch("permissions.audit.create_audit_event") as mock_create_audit_event:
            mock_create_audit_event.side_effect = ImportError("No module named 'audit'")

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
                assert mock_logger.warning.called
                warning_call = mock_logger.warning.call_args[0][0]
                assert "B09 audit backend unavailable" in warning_call

                # Verify info log with permission decision
                assert mock_logger.info.called
                info_call = mock_logger.info.call_args[0][0]
                assert "Permission allowed" in info_call
                assert f"user={user.id}" in info_call

    def test_evaluate_permission_unauthenticated_user_raises(self):
        """Test that unauthenticated user raises TypeError."""
        from accounts.models import User

        unauthenticated_user = User()  # Not authenticated

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
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        # Create mock resource (e.g., organization)
        class MockOrganization:
            id = 42
            uuid = "org-uuid-123"
            __class__.__name__ = "Organisation"

        org = MockOrganization()

        with patch("permissions.audit.create_audit_event") as mock_create_audit_event:
            with patch("permissions.audit.Organisation") as mock_org_model:
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
                call_args = mock_create_audit_event.call_args[1]
                assert call_args["metadata"]["resource_type"] == "MockOrganization"
                assert call_args["metadata"]["resource_id"] == 42

    def test_evaluate_permission_none_context_handled(
        self, user, global_role, sensitive_permission
    ):
        """Test evaluate_permission handles None context gracefully."""
        RoleAssignment.objects.create(user=user, role=global_role, scope=ScopeChoices.GLOBAL)

        with patch("permissions.audit.create_audit_event") as mock_create_audit_event:
            result = evaluate_permission(
                user=user,
                permission="projects.delete",
                resource=None,
                context=None,  # None context should be handled
            )

            assert result is True

            # Verify default scope is UNKNOWN
            call_args = mock_create_audit_event.call_args[1]
            assert call_args["metadata"]["scope"] == "UNKNOWN"
