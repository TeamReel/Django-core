"""Serializer tests for B{NUMBER}: {MODULE_TITLE}."""

import pytest

from {APP_NAME}.api.serializers import (
    {MODEL_NAME}DetailSerializer,
    {MODEL_NAME}ListSerializer,
    {MODEL_NAME}WriteSerializer,
)


@pytest.mark.django_db
class Test{MODEL_NAME}ListSerializer:
    """Tests for the lightweight list serializer."""

    def test_fields(self, {FIXTURE_NAME}):
        """List serializer exposes only key fields."""
        data = {MODEL_NAME}ListSerializer({FIXTURE_NAME}).data
        assert "id" in data
        assert "created_at" in data
        # Should NOT include heavy fields
        assert "metadata" not in data

    def test_read_only(self, {FIXTURE_NAME}):
        """All list fields are read-only."""
        serializer = {MODEL_NAME}ListSerializer({FIXTURE_NAME})
        for field_name in serializer.fields:
            assert serializer.fields[field_name].read_only


@pytest.mark.django_db
class Test{MODEL_NAME}DetailSerializer:
    """Tests for the full detail serializer."""

    def test_all_fields(self, {FIXTURE_NAME}):
        """Detail serializer includes all fields."""
        data = {MODEL_NAME}DetailSerializer({FIXTURE_NAME}).data
        assert "id" in data
        assert "metadata" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_created_by_display(self, {FIXTURE_NAME}):
        """created_by_display shows user info."""
        data = {MODEL_NAME}DetailSerializer({FIXTURE_NAME}).data
        assert data["created_by_display"] is not None
        assert "email" in data["created_by_display"]

    def test_read_only_fields(self, {FIXTURE_NAME}):
        """id, created_at, updated_at are read-only."""
        serializer = {MODEL_NAME}DetailSerializer({FIXTURE_NAME})
        assert serializer.fields["id"].read_only
        assert serializer.fields["created_at"].read_only
        assert serializer.fields["updated_at"].read_only


@pytest.mark.django_db
class Test{MODEL_NAME}WriteSerializer:
    """Tests for the create/update serializer."""

    def test_valid_data(self):
        """Valid data passes validation."""
        data = {
            # {VALID_DATA}
        }
        serializer = {MODEL_NAME}WriteSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_empty_data(self):
        """Empty data fails validation."""
        serializer = {MODEL_NAME}WriteSerializer(data={{}})
        assert not serializer.is_valid()
