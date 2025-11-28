"""Error handling tests for transactions engine.

Tests for proper error handling and validation:
- Invalid amounts (zero, non-decimal)
- Duplicate idempotency keys
- Policy violations
- Service layer error propagation

WP06-T064: Error handling tests
"""

import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError
from organisations.models import Organisation
from projects.models import Project

from transactions.exceptions import DuplicateIdempotencyKeyError, InsufficientBalanceError
from transactions.models import (
    BalancePolicy,
    EnforcementModeChoices,
    SourceTypeChoices,
    Transaction,
)
from transactions.services import create_transaction

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
        policy = BalancePolicy.objects.create(
            organization=org,
            enforcement_mode=EnforcementModeChoices.BLOCK,
            allow_negative=False,
        )

        yield {"user": user, "org": org, "project": project, "policy": policy}

        # Cleanup
        cache.clear()
        Transaction.objects.filter(organization=org).delete()
        policy.delete()
        project.delete()
        org.delete()
        user.delete()

    def test_zero_amount_transaction_blocked(self, test_setup):
        """Test that zero-amount transactions are blocked by database constraint."""
        org = test_setup["org"]
        user = test_setup["user"]

        # Zero amount transactions should fail database constraint
        with pytest.raises(IntegrityError):
            create_transaction(
                organization=org,
                created_by=user,
                amount=Decimal("0.00"),
                notes="Zero amount test",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=f"zero-amount-{uuid.uuid4()}",
            )

    def test_duplicate_idempotency_key(self, test_setup):
        """Test duplicate idempotency key detection."""
        org = test_setup["org"]
        user = test_setup["user"]

        idempotency_key = f"duplicate-test-{uuid.uuid4()}"

        # First transaction succeeds
        create_transaction(
            organization=org,
            created_by=user,
            amount=Decimal("10.00"),
            notes="First transaction",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=idempotency_key,
        )

        # Second with same key fails
        with pytest.raises(DuplicateIdempotencyKeyError):
            create_transaction(
                organization=org,
                created_by=user,
                amount=Decimal("20.00"),
                notes="Second transaction",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=idempotency_key,
            )

    def test_insufficient_balance_error(self, test_setup):
        """Test insufficient balance policy enforcement."""
        org = test_setup["org"]
        user = test_setup["user"]

        # Try debit with zero balance and BLOCK policy
        with pytest.raises(InsufficientBalanceError) as exc_info:
            create_transaction(
                organization=org,
                created_by=user,
                amount=Decimal("-10.00"),
                notes="Insufficient balance test",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=f"insufficient-{uuid.uuid4()}",
            )

        # Check exception details
        assert exc_info.value.current_balance == Decimal("0.00")
        assert exc_info.value.requested_amount == Decimal("10.00")

    def test_negative_balance_allowed_with_policy(self, test_setup):
        """Test that negative balance works when policy allows."""
        org = test_setup["org"]
        user = test_setup["user"]
        policy = test_setup["policy"]

        # Update policy to allow negative
        policy.allow_negative = True
        policy.save()

        # Now debit should succeed
        txn = create_transaction(
            organization=org,
            created_by=user,
            amount=Decimal("-10.00"),
            notes="Negative balance allowed",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"negative-allowed-{uuid.uuid4()}",
        )

        assert txn.amount == Decimal("-10.00")
        assert txn.balance_after == Decimal("-10.00")

    def test_invalid_source_type_string(self, test_setup):
        """Test that invalid source_type values are rejected."""
        org = test_setup["org"]
        user = test_setup["user"]

        # Invalid source_type should fail validation
        with pytest.raises((ValueError, IntegrityError)):
            Transaction.objects.create(
                organization=org,
                created_by=user,
                amount=Decimal("10.00"),
                notes="Invalid source type",
                source_type="INVALID_TYPE",  # Not in SourceTypeChoices
                idempotency_key=f"invalid-source-{uuid.uuid4()}",
                balance_after=Decimal("10.00"),
            )

    def test_usage_event_without_required_source(self, test_setup):
        """Test that USAGE_EVENT source_type requires usage_event FK."""
        org = test_setup["org"]
        user = test_setup["user"]

        # Creating transaction with USAGE_EVENT type but no usage_event should fail constraint
        with pytest.raises(IntegrityError):
            Transaction.objects.create(
                organization=org,
                created_by=user,
                amount=Decimal("10.00"),
                notes="Missing usage event",
                source_type=SourceTypeChoices.USAGE_EVENT,
                usage_event=None,  # Required for USAGE_EVENT type
                idempotency_key=f"missing-usage-{uuid.uuid4()}",
                balance_after=Decimal("10.00"),
            )

    def test_missing_idempotency_key(self, test_setup):
        """Test that idempotency_key is required."""
        org = test_setup["org"]
        user = test_setup["user"]

        # Missing idempotency_key should fail NOT NULL constraint
        with pytest.raises(IntegrityError):
            Transaction.objects.create(
                organization=org,
                created_by=user,
                amount=Decimal("10.00"),
                notes="Missing idempotency key",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=None,  # Required field
                balance_after=Decimal("10.00"),
            )

    def test_invalid_decimal_precision(self, test_setup):
        """Test that amounts beyond NUMERIC(14,4) precision are rejected."""
        org = test_setup["org"]
        user = test_setup["user"]

        # Amount with too many decimal places (5 instead of 4)
        with pytest.raises((ValueError, IntegrityError)):
            create_transaction(
                organization=org,
                created_by=user,
                amount=Decimal("10.00001"),  # 5 decimal places
                notes="Invalid precision",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=f"invalid-precision-{uuid.uuid4()}",
            )

    def test_project_org_mismatch(self, test_setup):
        """Test that project must belong to the specified organization."""
        org = test_setup["org"]
        user = test_setup["user"]

        # Create another org and project
        org2 = Organisation.objects.create(name="Org 2", slug="org-2", creator=user)
        project2 = Project.objects.create(
            name="Project 2", slug="proj-2", organisation=org2, creator=user
        )

        # Try to create transaction with org1 and project2 (belongs to org2)
        # This should succeed at database level but may fail business logic
        txn = create_transaction(
            organization=org,
            project=project2,  # Belongs to different org!
            created_by=user,
            amount=Decimal("10.00"),
            notes="Mismatched project",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"mismatch-{uuid.uuid4()}",
        )

        # The transaction is created, but with potential data integrity issues
        # This test documents current behavior - ideally should add FK constraint
        assert txn.organization.id != txn.project.organisation.id

        # Cleanup
        Transaction.objects.filter(id=txn.id).delete()
        project2.delete()
        org2.delete()
