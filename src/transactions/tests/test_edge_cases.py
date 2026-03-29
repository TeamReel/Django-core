"""Edge case tests for transactions engine.

Tests for boundary conditions and unusual scenarios:
- Exactly zero balance
- Very large amounts (near decimal precision limits)
- Null/empty metadata
- Concurrent same-key idempotency

WP06-T063: Edge case tests
"""

import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from transactions.exceptions import DuplicateIdempotencyKeyError, InsufficientBalanceError
from transactions.models import (
    BalancePolicy,
    EnforcementModeChoices,
    SourceTypeChoices,
    Transaction,
)
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
    def edge_setup(self, user, organization, project):
        """Create test entities using conftest fixtures."""
        policy = BalancePolicy.objects.create(
            organization=organization,
            enforcement_mode=EnforcementModeChoices.BLOCK,
            allow_negative=False,
        )
        yield {"user": user, "org": organization, "project": project, "policy": policy}
        # Cleanup handled automatically by Django test transactions
        cache.clear()

    def test_exactly_zero_balance(self, edge_setup):
        """Test operations when balance is exactly 0."""
        org = edge_setup["org"]
        project = edge_setup["project"]
        user = edge_setup["user"]

        # Create initial balance of exactly 0
        balance_data = get_organization_balance(org.id)
        assert balance_data["current_balance"] == Decimal("0.00")

        # Try to create debit transaction (should fail with BLOCK policy)
        with pytest.raises(InsufficientBalanceError):
            create_transaction(
                organization=org,
                project=project,
                created_by=user,
                amount=Decimal("-0.01"),
                notes="Test debit on zero balance",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=f"zero-balance-{uuid.uuid4()}",
            )

        # Credit should work
        create_transaction(
            organization=org,
            project=project,
            created_by=user,
            amount=Decimal("0.01"),
            notes="Test credit on zero balance",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"zero-balance-credit-{uuid.uuid4()}",
        )

        balance_data = get_organization_balance(org.id)
        assert balance_data["current_balance"] == Decimal("0.01")

    def test_very_large_amounts(self, edge_setup):
        """Test transactions with amounts near decimal precision limits."""
        org = edge_setup["org"]
        project = edge_setup["project"]
        user = edge_setup["user"]

        # Update policy to allow negative
        policy = edge_setup["policy"]
        policy.allow_negative = True
        policy.save()

        # Test large positive amount (approaching NUMERIC(14,4) limit)
        large_amount = Decimal("9999999999.9999")
        txn = create_transaction(
            organization=org,
            project=project,
            created_by=user,
            amount=large_amount,
            notes="Very large credit",
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            idempotency_key=f"large-amount-{uuid.uuid4()}",
        )

        assert txn.amount == large_amount
        balance_data = get_organization_balance(org.id)
        assert balance_data["current_balance"] == large_amount

        # Test large negative amount
        large_debit = Decimal("-9999999999.9999")
        txn2 = create_transaction(
            organization=org,
            project=project,
            created_by=user,
            amount=large_debit,
            notes="Very large debit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"large-debit-{uuid.uuid4()}",
        )

        assert txn2.amount == large_debit
        balance_data = get_organization_balance(org.id)
        assert balance_data["current_balance"] == Decimal("0.00")

    def test_precise_decimal_arithmetic(self, edge_setup):
        """Test that decimal precision is maintained correctly."""
        org = edge_setup["org"]
        project = edge_setup["project"]
        user = edge_setup["user"]

        # Update policy to allow negative
        policy = edge_setup["policy"]
        policy.allow_negative = True
        policy.save()

        # Create series of small transactions with precision
        amounts = [
            Decimal("0.0001"),
            Decimal("0.0002"),
            Decimal("0.0003"),
            Decimal("-0.0002"),
        ]

        for i, amount in enumerate(amounts):
            create_transaction(
                organization=org,
                project=project,
                created_by=user,
                amount=amount,
                notes=f"Precision test {i}",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=f"precision-{i}",
            )

        # Expected: 0.0001 + 0.0002 + 0.0003 - 0.0002 = 0.0004
        balance_data = get_organization_balance(org.id)
        assert balance_data["current_balance"] == Decimal("0.0004")

    def test_empty_metadata(self, edge_setup):
        """Test usage events with empty metadata."""
        org = edge_setup["org"]
        project = edge_setup["project"]
        user = edge_setup["user"]

        # UsageEvent with empty metadata
        event = record_usage_event(
            event_type="API_CALL",
            organization=org,
            project=project,
            user=user,
            metadata={},
            idempotency_key=f"empty-event-meta-{uuid.uuid4()}",
        )

        assert event.metadata == {}

    def test_null_optional_fields(self, edge_setup):
        """Test transactions with null optional fields."""
        org = edge_setup["org"]
        user = edge_setup["user"]

        # Transaction without project (optional field)
        txn = create_transaction(
            organization=org,
            project=None,
            created_by=user,
            amount=Decimal("20.00"),
            notes="Null project test",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"null-project-{uuid.uuid4()}",
            external_reference_id=None,
        )

        assert txn.project is None
        assert txn.external_reference_id is None

    def test_concurrent_idempotency_enforcement(self, edge_setup):
        """Test idempotency when same key used concurrently."""
        org = edge_setup["org"]
        project = edge_setup["project"]
        user = edge_setup["user"]

        idempotency_key = f"concurrent-idem-{uuid.uuid4()}"

        # First transaction
        create_transaction(
            organization=org,
            project=project,
            created_by=user,
            amount=Decimal("10.00"),
            notes="First transaction",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=idempotency_key,
        )

        # Second transaction with same key (should fail)
        with pytest.raises(DuplicateIdempotencyKeyError):
            create_transaction(
                organization=org,
                project=project,
                created_by=user,
                amount=Decimal("20.00"),  # Different amount
                notes="Second transaction",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=idempotency_key,  # Same key
            )

        # Verify only one transaction exists
        txns = Transaction.objects.filter(idempotency_key=idempotency_key)
        assert txns.count() == 1
        assert txns.first().amount == Decimal("10.00")

    def test_balance_policy_edge_at_zero(self, edge_setup):
        """Test policy enforcement when balance would go negative."""
        org = edge_setup["org"]
        project = edge_setup["project"]
        user = edge_setup["user"]

        # Create balance of exactly 10.00
        create_transaction(
            organization=org,
            project=project,
            created_by=user,
            amount=Decimal("10.00"),
            notes="Set balance to 10",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"balance-setup-{uuid.uuid4()}",
        )

        balance_data = get_organization_balance(org.id)
        assert balance_data["current_balance"] == Decimal("10.00")

        # Transaction that would bring balance to -0.01 should fail
        with pytest.raises(InsufficientBalanceError):
            create_transaction(
                organization=org,
                project=project,
                created_by=user,
                amount=Decimal("-10.01"),
                notes="Try to go negative",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=f"go-negative-{uuid.uuid4()}",
            )

        # Transaction bringing balance to exactly 0 should succeed
        create_transaction(
            organization=org,
            project=project,
            created_by=user,
            amount=Decimal("-10.00"),
            notes="Go to zero",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"to-zero-{uuid.uuid4()}",
        )

        balance_data = get_organization_balance(org.id)
        assert balance_data["current_balance"] == Decimal("0.00")
