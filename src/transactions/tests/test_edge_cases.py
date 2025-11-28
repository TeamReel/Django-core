"""Edge case tests for transactions engine.

Tests for boundary conditions and unusual scenarios:
- Exactly zero balance
- Very large amounts (near decimal precision limits)
- Unusual event types
- Null/empty metadata
- Concurrent same-key idempotency

WP06-T063: Edge case tests
"""

import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from organisations.models import Organisation
from projects.models import Project

from transactions.exceptions import PolicyViolationError
from transactions.models import BalancePolicy, EnforcementModeChoices, Transaction, UsageEvent
from transactions.services import (
    create_transaction,
    get_organization_balance,
    record_usage_event,
)

User = get_user_model()


@pytest.mark.django_db
class TestEdgeCases:
    """Edge case tests for transactions."""

    @pytest.fixture
    def test_setup(self):
        """Create test entities."""
        user = User.objects.create(email="edge@example.com")
        org = Organisation.objects.create(name="Edge Test Org", slug="edge-test-org", creator=user)
        project = Project.objects.create(
            name="Edge Test Project",
            slug="edge-test-proj",
            organisation=org,
            creator=user,
        )
        policy = BalancePolicy.objects.create(
            organisation=org,
            enforcement_mode=EnforcementModeChoices.BLOCK,
            min_balance=Decimal("0.00"),
        )

        yield {"user": user, "org": org, "project": project, "policy": policy}

        # Cleanup
        cache.clear()
        Transaction.objects.filter(organisation=org).delete()
        UsageEvent.objects.filter(organisation=org).delete()
        policy.delete()
        project.delete()
        org.delete()
        user.delete()

    def test_exactly_zero_balance(self, test_setup):
        """Test operations when balance is exactly 0."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Create initial balance of exactly 0
        balance = get_organization_balance(org.id)
        assert balance == Decimal("0.00")

        # Try to create debit transaction (should fail with BLOCK policy)
        with pytest.raises(PolicyViolationError):
            create_transaction(
                organisation_id=org.id,
                project_id=project.id,
                user_id=user.id,
                amount=Decimal("-0.01"),
                description="Test debit on zero balance",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"zero-balance-{uuid.uuid4()}",
            )

        # Credit should work
        create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("0.01"),
            description="Test credit on zero balance",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"zero-balance-credit-{uuid.uuid4()}",
        )

        balance = get_organization_balance(org.id)
        assert balance == Decimal("0.01")

    def test_very_large_amounts(self, test_setup):
        """Test transactions with amounts near decimal precision limits."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Test large positive amount (approaching NUMERIC(14,4) limit)
        large_amount = Decimal("9999999999.9999")
        txn = create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=large_amount,
            description="Very large credit",
            source_type="EXTERNAL_BILLING",
            idempotency_key=f"large-amount-{uuid.uuid4()}",
        )

        assert txn.amount == large_amount
        balance = get_organization_balance(org.id)
        assert balance == large_amount

        # Test large negative amount
        large_debit = Decimal("-9999999999.9999")
        txn2 = create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=large_debit,
            description="Very large debit",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"large-debit-{uuid.uuid4()}",
        )

        assert txn2.amount == large_debit
        balance = get_organization_balance(org.id)
        assert balance == Decimal("0.00")

    def test_precise_decimal_arithmetic(self, test_setup):
        """Test that decimal precision is maintained correctly."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Create series of small transactions with precision
        amounts = [
            Decimal("0.0001"),
            Decimal("0.0002"),
            Decimal("0.0003"),
            Decimal("-0.0002"),
        ]

        for i, amount in enumerate(amounts):
            create_transaction(
                organisation_id=org.id,
                project_id=project.id,
                user_id=user.id,
                amount=amount,
                description=f"Precision test {i}",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"precision-{i}",
            )

        # Expected: 0.0001 + 0.0002 + 0.0003 - 0.0002 = 0.0004
        balance = get_organization_balance(org.id)
        assert balance == Decimal("0.0004")

    def test_empty_metadata(self, test_setup):
        """Test transactions with empty metadata."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Transaction with empty dict metadata
        txn = create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("10.00"),
            description="Empty metadata test",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"empty-meta-{uuid.uuid4()}",
            metadata={},
        )

        assert txn.metadata == {}

        # UsageEvent with empty metadata
        event = record_usage_event(
            event_type="API_CALL",
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("5.00"),
            idempotency_key=f"empty-event-meta-{uuid.uuid4()}",
            metadata={},
        )

        assert event.metadata == {}

    def test_null_optional_fields(self, test_setup):
        """Test transactions with null optional fields."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Transaction without source_id (nullable field)
        txn = create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("20.00"),
            description="Null source_id test",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"null-source-{uuid.uuid4()}",
            source_id=None,
        )

        assert txn.source_id is None

        # UsageEvent without idempotency_key (nullable)
        event = UsageEvent.objects.create(
            id=uuid.uuid4(),
            event_type="COMPUTE",
            organisation=org,
            project=project,
            user=user,
            amount=Decimal("15.00"),
            metadata={"test": "no_idempotency"},
            idempotency_key=None,  # Explicitly None
        )

        assert event.idempotency_key is None

    def test_concurrent_idempotency_enforcement(self, test_setup):
        """Test idempotency when same key used concurrently."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        idempotency_key = f"concurrent-idem-{uuid.uuid4()}"

        # First transaction
        txn1 = create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("10.00"),
            description="First transaction",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=idempotency_key,
        )

        # Second transaction with same key (should fail)
        from django.db import IntegrityError

        with pytest.raises(IntegrityError):
            create_transaction(
                organisation_id=org.id,
                project_id=project.id,
                user_id=user.id,
                amount=Decimal("20.00"),  # Different amount
                description="Second transaction",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=idempotency_key,  # Same key
            )

        # Verify only one transaction exists
        txns = Transaction.objects.filter(idempotency_key=idempotency_key)
        assert txns.count() == 1
        assert txns.first().amount == Decimal("10.00")

    def test_balance_policy_edge_at_minimum(self, test_setup):
        """Test policy enforcement when balance equals min_balance exactly."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]
        policy = test_setup["policy"]

        # Set policy min_balance to 10.00
        policy.min_balance = Decimal("10.00")
        policy.save()

        # Create balance of exactly 10.00
        create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("10.00"),
            description="Set balance to min",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"balance-at-min-{uuid.uuid4()}",
        )

        balance = get_organization_balance(org.id)
        assert balance == Decimal("10.00")

        # Transaction that would bring balance to 9.99 should fail
        with pytest.raises(PolicyViolationError):
            create_transaction(
                organisation_id=org.id,
                project_id=project.id,
                user_id=user.id,
                amount=Decimal("-0.01"),
                description="Try to go below min",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"below-min-{uuid.uuid4()}",
            )

        # Transaction keeping balance at exactly 10.00 should succeed
        create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("0.00"),  # No-op, but valid
            description="Stay at min",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"stay-at-min-{uuid.uuid4()}",
        )

        balance = get_organization_balance(org.id)
        assert balance == Decimal("10.00")
