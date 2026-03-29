"""Unit tests for transactions app models."""

from decimal import Decimal

import pytest
from django.db import IntegrityError
from organisations.models import Organisation
from projects.models import Project
from transactions.models import (
    BalancePolicy,
    EnforcementModeChoices,
    SourceTypeChoices,
    Transaction,
    UsageEvent,
)


@pytest.mark.django_db
class TestUsageEvent:
    """Test cases for UsageEvent model."""

    def test_create_usage_event(self, user, organization, project):
        """Test basic usage event creation."""
        event = UsageEvent.objects.create(
            event_type="ai_inference",
            user=user,
            organization=organization,
            project=project,
            metadata={"tokens": 1500},
        )
        assert event.id is not None
        assert event.event_type == "ai_inference"
        assert event.metadata == {"tokens": 1500}
        assert event.timestamp is not None

    def test_idempotency_key_uniqueness(self, user, organization):
        """Test idempotency key prevents duplicate events."""
        UsageEvent.objects.create(
            event_type="test",
            user=user,
            organization=organization,
            idempotency_key="key123",
        )
        with pytest.raises(IntegrityError):
            UsageEvent.objects.create(
                event_type="test",
                user=user,
                organization=organization,
                idempotency_key="key123",
            )

    def test_nullable_idempotency_key(self, user, organization):
        """Test multiple events can have null idempotency_key."""
        UsageEvent.objects.create(
            event_type="test", user=user, organization=organization, idempotency_key=None
        )
        UsageEvent.objects.create(
            event_type="test", user=user, organization=organization, idempotency_key=None
        )  # Should not raise

    @pytest.mark.skip(reason="DB-level project-org mismatch constraint not implemented")
    def test_project_organization_mismatch_constraint(self, user, organization, project):
        """Test project must belong to same organization."""
        other_org = Organisation.objects.create(name="Other Org", creator=user)
        other_project = Project.objects.create(
            name="Other Project", organisation=other_org, creator=user
        )

        with pytest.raises(IntegrityError):
            UsageEvent.objects.create(
                event_type="test",
                user=user,
                organization=organization,
                project=other_project,  # Wrong org
            )

    def test_usage_event_manager_for_organization(self, user, organization):
        """Test manager for_organization filter."""
        other_org = Organisation.objects.create(name="Other Org", creator=user)

        event1 = UsageEvent.objects.create(event_type="test", user=user, organization=organization)
        UsageEvent.objects.create(event_type="test", user=user, organization=other_org)

        events = UsageEvent.objects.for_organization(organization.id)
        assert events.count() == 1
        assert events.first().id == event1.id

    def test_usage_event_manager_unbilled(self, user, organization):
        """Test manager unbilled filter."""
        event = UsageEvent.objects.create(event_type="test", user=user, organization=organization)

        assert UsageEvent.objects.unbilled().count() == 1
        assert UsageEvent.objects.unbilled().first().id == event.id


@pytest.mark.django_db
class TestTransaction:
    """Test cases for Transaction model."""

    def test_create_transaction(self, user, organization):
        """Test basic transaction creation."""
        txn = Transaction.objects.create(
            amount=Decimal("100.0000"),
            organization=organization,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user,
            idempotency_key="txn123",
        )
        assert txn.id is not None
        assert txn.amount == Decimal("100.0000")
        assert txn.timestamp is not None

    def test_amount_cannot_be_zero(self, user, organization):
        """Test zero amount transactions are rejected."""
        with pytest.raises(IntegrityError):
            Transaction.objects.create(
                amount=Decimal("0"),
                organization=organization,
                source_type=SourceTypeChoices.ADJUSTMENT,
                created_by=user,
                idempotency_key="txn-zero",
            )

    def test_idempotency_key_required(self, user, organization):
        """Test idempotency_key is required."""
        with pytest.raises(IntegrityError):
            Transaction.objects.create(
                amount=Decimal("10.0000"),
                organization=organization,
                source_type=SourceTypeChoices.ADJUSTMENT,
                created_by=user,
                idempotency_key=None,
            )

    def test_idempotency_key_uniqueness(self, user, organization):
        """Test idempotency_key must be unique."""
        Transaction.objects.create(
            amount=Decimal("10.0000"),
            organization=organization,
            source_type=SourceTypeChoices.ADJUSTMENT,
            created_by=user,
            idempotency_key="txn-unique",
        )

        with pytest.raises(IntegrityError):
            Transaction.objects.create(
                amount=Decimal("20.0000"),
                organization=organization,
                source_type=SourceTypeChoices.ADJUSTMENT,
                created_by=user,
                idempotency_key="txn-unique",
            )

    def test_balance_calculation_via_manager(self, user, organization):
        """Test manager compute_balance method."""
        Transaction.objects.create(
            amount=Decimal("100.0000"),
            organization=organization,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user,
            idempotency_key="txn1",
        )
        Transaction.objects.create(
            amount=Decimal("-25.0000"),
            organization=organization,
            source_type=SourceTypeChoices.ADJUSTMENT,  # Use ADJUSTMENT, not USAGE_EVENT (requires linked event)
            created_by=user,
            idempotency_key="txn2",
        )

        balance_data = Transaction.objects.for_organization(organization.id).compute_balance()
        assert balance_data["current_balance"] == Decimal("75.0000")
        assert balance_data["total_positive_amounts"] == Decimal("100.0000")
        assert balance_data["total_negative_amounts"] == Decimal("-25.0000")
        assert balance_data["transaction_count"] == 2

    @pytest.mark.skip(reason="DB-level project-org mismatch constraint not implemented")
    def test_project_organization_mismatch_constraint(self, user, organization):
        """Test project must belong to same organization."""
        other_org = Organisation.objects.create(name="Other Org", creator=user)
        other_project = Project.objects.create(
            name="Other Project", organisation=other_org, creator=user
        )

        with pytest.raises(IntegrityError):
            Transaction.objects.create(
                amount=Decimal("10.0000"),
                organization=organization,
                project=other_project,  # Wrong org
                source_type=SourceTypeChoices.ADJUSTMENT,
                created_by=user,
                idempotency_key="txn-mismatch",
            )

    def test_usage_event_source_type_validation(self, user, organization, usage_event):
        """Test USAGE_EVENT source_type requires usage_event FK."""
        # Valid: source_type=USAGE_EVENT with usage_event
        Transaction.objects.create(
            amount=Decimal("10.0000"),
            organization=organization,
            source_type=SourceTypeChoices.USAGE_EVENT,
            usage_event=usage_event,
            created_by=user,
            idempotency_key="txn-valid-usage",
        )

        # Invalid: source_type=USAGE_EVENT without usage_event
        with pytest.raises(IntegrityError):
            Transaction.objects.create(
                amount=Decimal("10.0000"),
                organization=organization,
                source_type=SourceTypeChoices.USAGE_EVENT,
                usage_event=None,
                created_by=user,
                idempotency_key="txn-invalid-usage",
            )


@pytest.mark.django_db
class TestBalancePolicy:
    """Test cases for BalancePolicy model."""

    def test_create_policy(self, organization):
        """Test basic balance policy creation."""
        policy = BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )
        assert policy.id is not None
        assert policy.allow_negative is False
        assert policy.enforcement_mode == EnforcementModeChoices.BLOCK

    def test_unique_org_project_constraint(self, organization, project):
        """Test one policy per organization/project combination."""
        BalancePolicy.objects.create(
            organization=organization,
            project=project,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.WARN,
        )

        with pytest.raises(IntegrityError):
            BalancePolicy.objects.create(
                organization=organization,
                project=project,  # Duplicate
                allow_negative=False,
                enforcement_mode=EnforcementModeChoices.BLOCK,
            )

    @pytest.mark.skip(reason="DB-level project-org mismatch constraint not implemented")
    def test_project_organization_mismatch_constraint(self, user, organization):
        """Test project must belong to same organization."""
        other_org = Organisation.objects.create(name="Other Org", creator=user)
        other_project = Project.objects.create(
            name="Other Project", organisation=other_org, creator=user
        )

        with pytest.raises(IntegrityError):
            BalancePolicy.objects.create(
                organization=organization,
                project=other_project,  # Wrong org
                allow_negative=False,
                enforcement_mode=EnforcementModeChoices.BLOCK,
            )

    def test_default_enforcement_mode(self, organization):
        """Test default enforcement_mode is BLOCK."""
        policy = BalancePolicy.objects.create(organization=organization, allow_negative=False)
        assert policy.enforcement_mode == EnforcementModeChoices.BLOCK
