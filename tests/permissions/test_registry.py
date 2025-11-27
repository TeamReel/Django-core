"""Tests for the permission registry."""

import threading
from unittest import mock

import pytest
from django.core.exceptions import ImproperlyConfigured
from permissions.registry import permission_registry


class TestPermissionRegistry:
    """Test cases for the PermissionRegistry class."""

    def setup_method(self):
        """Clear the registry before each test."""
        permission_registry.clear()

    def test_register_valid_permission(self):
        """Test registering a valid permission."""
        permission_registry.register(
            permission="documents.create",
            resource_type="documents",
            description="Create documents",
            is_sensitive=False,
        )

        assert permission_registry.is_registered("documents.create")
        perm = permission_registry.get("documents.create")
        assert perm["resource_type"] == "documents"
        assert perm["description"] == "Create documents"
        assert perm["is_sensitive"] is False

    def test_register_tracks_caller_module(self):
        """Test that registry tracks which module registered the permission."""
        permission_registry.register(
            permission="test.action",
            resource_type="test",
            description="Test permission",
            is_sensitive=False,
        )

        perm = permission_registry.get("test.action")
        # Should track the module that called register()
        assert "registered_by" in perm
        assert perm["registered_by"] != "unknown"

    def test_register_logs_registration(self):
        """Test that registry logs each permission registration."""
        with mock.patch("permissions.registry.logger") as mock_logger:
            permission_registry.register(
                permission="logging.test",
                resource_type="logging",
                description="Test logging",
                is_sensitive=False,
            )

            # Verify logger.info was called with lazy formatting
            mock_logger.info.assert_called_once()
            call_args = mock_logger.info.call_args[0]
            assert "Registered permission: %s (from %s)" in call_args

    def test_register_invalid_format_uppercase(self):
        """Test that uppercase letters are rejected."""
        with pytest.raises(ImproperlyConfigured, match="must match format"):
            permission_registry.register(
                permission="Documents.Create",
                resource_type="documents",
                description="Invalid format",
                is_sensitive=False,
            )

    def test_register_invalid_format_special_chars(self):
        """Test that special characters are rejected."""
        with pytest.raises(ImproperlyConfigured, match="must match format"):
            permission_registry.register(
                permission="documents.create!",
                resource_type="documents",
                description="Invalid format",
                is_sensitive=False,
            )

    def test_register_invalid_format_no_dot(self):
        """Test that permissions without a dot are rejected."""
        with pytest.raises(ImproperlyConfigured, match="must match format"):
            permission_registry.register(
                permission="documents_create",
                resource_type="documents",
                description="Invalid format",
                is_sensitive=False,
            )

    def test_register_invalid_format_multiple_dots(self):
        """Test that permissions with multiple dots are rejected."""
        with pytest.raises(ImproperlyConfigured, match="must match format"):
            permission_registry.register(
                permission="documents.files.create",
                resource_type="documents",
                description="Invalid format",
                is_sensitive=False,
            )

    def test_register_duplicate_permission(self):
        """Test that duplicate permissions are rejected."""
        permission_registry.register(
            permission="documents.create",
            resource_type="documents",
            description="First registration",
            is_sensitive=False,
        )

        with pytest.raises(ImproperlyConfigured, match="already registered"):
            permission_registry.register(
                permission="documents.create",
                resource_type="documents",
                description="Duplicate registration",
                is_sensitive=False,
            )

    def test_get_nonexistent_permission(self):
        """Test getting a permission that doesn't exist."""
        result = permission_registry.get("nonexistent.permission")
        assert result is None

    def test_is_registered_false(self):
        """Test is_registered returns False for unregistered permissions."""
        assert not permission_registry.is_registered("nonexistent.permission")

    def test_get_by_resource_type(self):
        """Test getting permissions by resource type."""
        permission_registry.register(
            permission="documents.create",
            resource_type="documents",
            description="Create documents",
            is_sensitive=False,
        )
        permission_registry.register(
            permission="documents.delete",
            resource_type="documents",
            description="Delete documents",
            is_sensitive=True,
        )
        permission_registry.register(
            permission="reports.view",
            resource_type="reports",
            description="View reports",
            is_sensitive=False,
        )

        docs_perms = permission_registry.get_by_resource_type("documents")
        assert len(docs_perms) == 2
        assert "documents.create" in docs_perms
        assert "documents.delete" in docs_perms
        assert "reports.view" not in docs_perms

    def test_get_by_resource_type_empty(self):
        """Test getting permissions for a resource type with no permissions."""
        result = permission_registry.get_by_resource_type("nonexistent")
        assert result == []

    def test_all_permissions(self):
        """Test getting all registered permissions."""
        permission_registry.register(
            permission="documents.create",
            resource_type="documents",
            description="Create documents",
            is_sensitive=False,
        )
        permission_registry.register(
            permission="reports.view",
            resource_type="reports",
            description="View reports",
            is_sensitive=False,
        )

        all_perms = permission_registry.all()
        assert len(all_perms) == 2
        assert "documents.create" in all_perms
        assert "reports.view" in all_perms

    def test_all_permissions_empty(self):
        """Test getting all permissions when registry is empty."""
        result = permission_registry.all()
        assert result == []

    def test_clear_registry(self):
        """Test clearing the registry."""
        permission_registry.register(
            permission="documents.create",
            resource_type="documents",
            description="Create documents",
            is_sensitive=False,
        )

        assert permission_registry.is_registered("documents.create")

        permission_registry.clear()

        assert not permission_registry.is_registered("documents.create")
        assert permission_registry.all() == []

    def test_thread_safety_concurrent_registration(self):
        """Test that concurrent registrations are thread-safe."""
        errors = []
        action_names = [
            "create",
            "read",
            "update",
            "delete",
            "archive",
            "restore",
            "publish",
            "draft",
            "review",
            "approve",
        ]

        def register_permission(index):
            try:
                permission_registry.register(
                    permission=f"testthread.{action_names[index]}",
                    resource_type="testthread",
                    description=f"Test permission {action_names[index]}",
                    is_sensitive=False,
                )
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=register_permission, args=(i,)) for i in range(10)]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # All threads should succeed without errors
        assert len(errors) == 0
        assert len(permission_registry.all()) == 10

    def test_thread_safety_duplicate_detection(self):
        """Test that duplicate detection works correctly under concurrent access."""
        errors = []

        def register_same_permission():
            try:
                permission_registry.register(
                    permission="concurrent.test",
                    resource_type="concurrent",
                    description="Concurrent test",
                    is_sensitive=False,
                )
            except ImproperlyConfigured as e:
                errors.append(e)

        threads = [threading.Thread(target=register_same_permission) for _ in range(5)]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # Exactly one thread should succeed, the rest should get ImproperlyConfigured
        assert len(errors) == 4
        assert permission_registry.is_registered("concurrent.test")

    def test_singleton_instance(self):
        """Test that permission_registry is a singleton instance."""
        from permissions.registry import permission_registry as registry1

        registry1.register(
            permission="singleton.test",
            resource_type="singleton",
            description="Singleton test",
            is_sensitive=False,
        )

        from permissions.registry import permission_registry as registry2

        # Both imports should reference the same instance
        assert registry2.is_registered("singleton.test")
        assert registry1 is registry2
