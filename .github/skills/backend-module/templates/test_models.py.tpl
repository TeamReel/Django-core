"""Model tests for B{NUMBER}: {MODULE_TITLE}."""

import pytest

from {APP_NAME}.models import {MODEL_NAME}


@pytest.mark.django_db
class Test{MODEL_NAME}Model:
    """Tests for {MODEL_NAME} model."""

    def test_create(self, {FIXTURE_NAME}):
        """Model can be created with valid data."""
        assert {FIXTURE_NAME}.pk is not None
        assert {FIXTURE_NAME}.is_active is True
        assert {FIXTURE_NAME}.created_at is not None
        assert {FIXTURE_NAME}.updated_at is not None

    def test_str(self, {FIXTURE_NAME}):
        """__str__ returns readable representation."""
        assert str({FIXTURE_NAME})  # Not empty

    def test_uuid_pk(self, {FIXTURE_NAME}):
        """Primary key is a UUID."""
        import uuid
        assert isinstance({FIXTURE_NAME}.pk, uuid.UUID)

    def test_soft_delete(self, {FIXTURE_NAME}):
        """Setting is_active=False soft-deletes the instance."""
        {FIXTURE_NAME}.is_active = False
        {FIXTURE_NAME}.save()
        {FIXTURE_NAME}.refresh_from_db()
        assert {FIXTURE_NAME}.is_active is False

    def test_org_fk(self, {FIXTURE_NAME}, organisation):
        """Model is linked to organisation."""
        assert {FIXTURE_NAME}.organisation == organisation

    def test_created_by(self, {FIXTURE_NAME}, user):
        """Model tracks creator."""
        assert {FIXTURE_NAME}.created_by == user

    def test_metadata_default(self, organisation, user):
        """Metadata defaults to empty dict."""
        obj = {MODEL_NAME}.objects.create(
            organisation=organisation,
            created_by=user,
            # {REQUIRED_FIELDS}
        )
        assert obj.metadata == {{}}
