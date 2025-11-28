"""Error handling tests for transactions engine.

Tests for proper error handling and validation:
- Missing foreign keys
- Invalid amounts
- Invalid enum values
- Constraint violations
- Service layer error propagation

WP06-T064: Error handling tests
"""

import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from organisations.models import Organisation
from projects.models import Project

from transactions.exceptions import PolicyViolationError
from transactions.models import BalancePolicy, Transaction, UsageEvent
from transactions.services import (
    create_transaction,
    get_organization_balance,
    get_project_balance,
    record_usage_event,
)

User = get_user_model()


@pytest.mark.django_db
class TestErrorHandling:
    """Error handling and validation tests."""

    @pytest.fixture
    def test_setup(self):
        """Create test entities."""
        user = User.objects.create(email="error@example.com")
        org = Organisation.objects.create(
            name="Error Test Org", slug="error-test-org", creator=user
        )
        project = Project.objects.create(
            name="Error Test Project",
            slug="error-test-proj",
            organisation=org,
            creator=user,
        )

        yield {"user": user, "org": org, "project": project}

        # Cleanup
        Transaction.objects.filter(organisation=org).delete()
        UsageEvent.objects.filter(organisation=org).delete()
        project.delete()
        org.delete()
        user.delete()

    def test_missing_organisation_fk(self, test_setup):
        """Test transaction creation with non-existent organisation."""
        project = test_setup["project"]
        user = test_setup["user"]

        # Try to create transaction with invalid org ID
        with pytest.raises((Organisation.DoesNotExist, ValueError)):
            create_transaction(
                organisation_id=99999,  # Non-existent
                project_id=project.id,
                user_id=user.id,
                amount=Decimal("10.00"),
                description="Test missing org",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"missing-org-{uuid.uuid4()}",
            )

    def test_missing_project_fk(self, test_setup):
        """Test transaction creation with non-existent project."""
        org = test_setup["org"]
        user = test_setup["user"]

        with pytest.raises((Project.DoesNotExist, ValueError)):
            create_transaction(
                organisation_id=org.id,
                project_id=99999,  # Non-existent
                user_id=user.id,
                amount=Decimal("10.00"),
                description="Test missing project",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"missing-proj-{uuid.uuid4()}",
            )

    def test_missing_user_fk(self, test_setup):
        """Test transaction creation with non-existent user."""
        org = test_setup["org"]
        project = test_setup["project"]

        with pytest.raises((User.DoesNotExist, ValueError)):
            create_transaction(
                organisation_id=org.id,
                project_id=project.id,
                user_id=99999,  # Non-existent
                amount=Decimal("10.00"),
                description="Test missing user",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"missing-user-{uuid.uuid4()}",
            )

    def test_zero_amount_transaction(self, test_setup):
        """Test that zero-amount transactions are rejected."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Model-level CHECK constraint should prevent this
        with pytest.raises((IntegrityError, ValidationError)):
            Transaction.objects.create(
                id=uuid.uuid4(),
                organisation=org,
                project=project,
                user=user,
                amount=Decimal("0.00"),  # Invalid
                balance_after=Decimal("0.00"),
                description="Zero amount test",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"zero-amt-{uuid.uuid4()}",
                metadata={},
            )

    def test_invalid_source_type(self, test_setup):
        """Test transaction creation with invalid source type."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Direct model creation with invalid enum
        with pytest.raises((ValidationError, ValueError)):
            txn = Transaction(
                id=uuid.uuid4(),
                organisation=org,
                project=project,
                user=user,
                amount=Decimal("10.00"),
                balance_after=Decimal("10.00"),
                description="Invalid source type",
                source_type="INVALID_TYPE",  # Not in SourceTypeChoices
                idempotency_key=f"invalid-source-{uuid.uuid4()}",
                metadata={},
            )
            txn.full_clean()  # Trigger validation
            txn.save()

    def test_invalid_event_type(self, test_setup):
        """Test usage event creation with invalid event type."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        with pytest.raises((ValidationError, ValueError)):
            event = UsageEvent(
                id=uuid.uuid4(),
                event_type="INVALID_EVENT",  # Not in EventTypeChoices
                organisation=org,
                project=project,
                user=user,
                amount=Decimal("5.00"),
                metadata={},
                idempotency_key=f"invalid-event-{uuid.uuid4()}",
            )
            event.full_clean()
            event.save()

    def test_invalid_enforcement_mode(self, test_setup):
        """Test policy creation with invalid enforcement mode."""
        org = test_setup["org"]

        with pytest.raises((ValidationError, ValueError)):
            policy = BalancePolicy(
                organisation=org,
                enforcement_mode="INVALID_MODE",  # Not in EnforcementModeChoices
                min_balance=Decimal("0.00"),
                metadata={},
            )
            policy.full_clean()
            policy.save()

    def test_duplicate_idempotency_key(self, test_setup):
        """Test that duplicate idempotency keys are rejected."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        idempotency_key = f"duplicate-key-{uuid.uuid4()}"

        # Create first transaction
        create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("10.00"),
            description="First transaction",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=idempotency_key,
        )

        # Try to create duplicate (should fail)
        with pytest.raises(IntegrityError):
            create_transaction(
                organisation_id=org.id,
                project_id=project.id,
                user_id=user.id,
                amount=Decimal("20.00"),
                description="Duplicate transaction",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=idempotency_key,  # Same key
            )

    def test_negative_balance_with_block_policy(self, test_setup):
        """Test that BLOCK policy prevents negative balance."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Create BLOCK policy
        BalancePolicy.objects.create(
            organisation=org,
            enforcement_mode="BLOCK",
            min_balance=Decimal("0.00"),
            metadata={},
        )

        # Try to create debit transaction with zero balance
        with pytest.raises(PolicyViolationError) as exc_info:
            create_transaction(
                organisation_id=org.id,
                project_id=project.id,
                user_id=user.id,
                amount=Decimal("-10.00"),
                description="Should be blocked",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"blocked-txn-{uuid.uuid4()}",
            )

        assert "balance" in str(exc_info.value).lower()

    def test_invalid_decimal_precision(self, test_setup):
        """Test that amounts with >4 decimal places are handled correctly."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Amount with 5 decimal places (should be rounded to 4)
        amount = Decimal("10.12345")

        txn = create_transaction(
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=amount,
            description="High precision test",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"precision-{uuid.uuid4()}",
        )

        # Verify amount is stored with correct precision (rounded or truncated)
        # NUMERIC(14,4) should automatically handle this
        assert txn.amount == Decimal("10.1235") or txn.amount == Decimal("10.1234")

    def test_get_balance_nonexistent_org(self):
        """Test balance query for non-existent organization."""
        # Query non-existent org (should return 0 or raise DoesNotExist)
        balance = get_organization_balance(99999)
        assert balance == Decimal("0.00")

    def test_get_balance_nonexistent_project(self):
        """Test balance query for non-existent project."""
        balance = get_project_balance(99999)
        assert balance == Decimal("0.00")

    def test_usage_event_negative_amount(self, test_setup):
        """Test that usage events with negative amounts are allowed (refunds)."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Negative amounts should be allowed for usage events (e.g., refunds)
        event = record_usage_event(
            event_type="API_CALL",
            organisation_id=org.id,
            project_id=project.id,
            user_id=user.id,
            amount=Decimal("-5.00"),  # Negative (refund)
            idempotency_key=f"negative-event-{uuid.uuid4()}",
            metadata={"reason": "refund"},
        )

        assert event.amount == Decimal("-5.00")

    def test_metadata_not_json_serializable(self, test_setup):
        """Test that non-JSON-serializable metadata is rejected."""
        org = test_setup["org"]
        project = test_setup["project"]
        user = test_setup["user"]

        # Try to create transaction with non-serializable metadata
        # (Note: This depends on how metadata is validated in the service layer)
        with pytest.raises((TypeError, ValueError, ValidationError)):
            from datetime import datetime

            create_transaction(
                organisation_id=org.id,
                project_id=project.id,
                user_id=user.id,
                amount=Decimal("10.00"),
                description="Non-serializable metadata",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"bad-meta-{uuid.uuid4()}",
                metadata={"timestamp": datetime.now()},  # datetime not JSON serializable
            )
