"""Tests for OrganisationNotificationPolicy model."""

from datetime import time

import pytest
from contextual_notifications.models import OrganisationNotificationPolicy


@pytest.mark.django_db
class TestOrganisationNotificationPolicyModel:
    """Tests for OrganisationNotificationPolicy model."""

    def test_create_policy_with_quiet_hours(self, organisation):
        """Test creating a policy with quiet hours enabled."""
        policy = OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
            quiet_hours_enabled=True,
            quiet_hours_start=time(22, 0),
            quiet_hours_end=time(8, 0),
            quiet_hours_rate_limit=5,
        )

        assert policy.organisation == organisation
        assert policy.quiet_hours_enabled is True
        assert policy.quiet_hours_start == time(22, 0)
        assert policy.quiet_hours_end == time(8, 0)
        assert policy.quiet_hours_rate_limit == 5

    def test_create_policy_without_quiet_hours(self, organisation):
        """Test creating a policy without quiet hours."""
        policy = OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
            quiet_hours_enabled=False,
        )

        assert policy.quiet_hours_enabled is False
        assert policy.quiet_hours_start is None
        assert policy.quiet_hours_end is None

    def test_str_representation(self, organisation):
        """Test string representation."""
        policy = OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
            quiet_hours_enabled=True,
            quiet_hours_start=time(22, 0),
            quiet_hours_end=time(8, 0),
        )

        expected = f"{organisation.name} - Quiet Hours: enabled"
        assert str(policy) == expected

    def test_unique_organisation(self, organisation):
        """Test that one policy per organisation (unique constraint)."""
        OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
            quiet_hours_enabled=False,
        )

        # Attempting to create another policy for same org should fail
        with pytest.raises(Exception):
            OrganisationNotificationPolicy.objects.create(
                organisation=organisation,
                quiet_hours_enabled=True,
            )

    def test_defaults(self, organisation):
        """Test default values."""
        policy = OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
        )

        assert policy.quiet_hours_enabled is False
        assert policy.quiet_hours_rate_limit == 10  # Default from model

    def test_created_at_set(self, organisation):
        """Test that created_at is automatically set."""
        policy = OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
        )
        assert policy.created_at is not None

    def test_updated_at_set(self, organisation):
        """Test that updated_at is automatically set."""
        policy = OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
        )
        assert policy.updated_at is not None

    def test_query_by_organisation(self, organisation, organisation2):
        """Test querying policy by organisation."""
        policy1 = OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
        )
        OrganisationNotificationPolicy.objects.create(
            organisation=organisation2,
        )

        fetched = OrganisationNotificationPolicy.objects.get(organisation=organisation)
        assert fetched == policy1

    def test_query_enabled_quiet_hours(self, organisation, organisation2):
        """Test querying policies with quiet hours enabled."""
        OrganisationNotificationPolicy.objects.create(
            organisation=organisation,
            quiet_hours_enabled=True,
            quiet_hours_start=time(22, 0),
            quiet_hours_end=time(8, 0),
        )
        OrganisationNotificationPolicy.objects.create(
            organisation=organisation2,
            quiet_hours_enabled=False,
        )

        with_quiet_hours = OrganisationNotificationPolicy.objects.filter(quiet_hours_enabled=True)
        assert with_quiet_hours.count() == 1
        assert with_quiet_hours.first().organisation == organisation
