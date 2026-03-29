"""
Integration tests for transactions service layer.

Tests end-to-end flows:
- Usage event → Transaction creation → Balance query
- Policy enforcement across the full workflow
- Cache behavior in realistic scenarios
"""

from decimal import Decimal

import pytest
from transactions.exceptions import InsufficientBalanceError
from transactions.models import BalancePolicy, EnforcementModeChoices, SourceTypeChoices
from transactions.services import (
    create_transaction,
    get_organization_balance,
    get_project_balance,
    record_usage_event,
)


class TestUsageEventToTransactionFlow:
    """Test complete flow from usage event to transaction."""

    def test_record_usage_and_create_transaction(self, user, organization, project):
        """Test full workflow: record usage → create transaction → query balance."""
        # Set postpaid policy to allow negative balance
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        # Step 1: Record usage event
        event = record_usage_event(
            event_type="api_call",
            user=user,
            organization=organization,
            project=project,
            metadata={"endpoint": "/api/v1/data", "count": 100},
            idempotency_key="usage-001",
        )

        assert event.event_type == "api_call"
        assert event.metadata["count"] == 100

        # Step 2: Create transaction linked to usage event
        txn = create_transaction(
            amount=Decimal("-5.00"),  # Debit for usage
            organization=organization,
            project=project,
            created_by=user,
            idempotency_key="txn-usage-001",
            source_type=SourceTypeChoices.USAGE_EVENT,
            usage_event=event,
            notes="Charge for 100 API calls",
        )

        assert txn.amount == Decimal("-5.00")
        assert txn.usage_event == event
        assert txn.source_type == SourceTypeChoices.USAGE_EVENT

        # Step 3: Query balance
        balance = get_project_balance(project.id, use_cache=False)

        assert balance["current_balance"] == Decimal("-5.00")
        assert balance["transaction_count"] == 1


class TestPrepaidPolicyEnforcement:
    """Test prepaid policy enforcement in realistic scenarios."""

    def test_prepaid_org_blocks_overdraft(self, user, organization):
        """Test that prepaid organization cannot overdraft."""
        # Set up prepaid policy
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        # Add initial credits
        create_transaction(
            amount=Decimal("100.00"),
            organization=organization,
            created_by=user,
            idempotency_key="credit-001",
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            notes="Purchase 100 credits",
        )

        balance = get_organization_balance(organization.id, use_cache=False)
        assert balance["current_balance"] == Decimal("100.00")

        # Record usage that stays within balance
        event1 = record_usage_event(
            event_type="compute_hours",
            user=user,
            organization=organization,
            metadata={"hours": 5},
        )

        txn1 = create_transaction(
            amount=Decimal("-50.00"),
            organization=organization,
            created_by=user,
            idempotency_key="usage-001",
            source_type=SourceTypeChoices.USAGE_EVENT,
            usage_event=event1,
        )

        assert txn1.amount == Decimal("-50.00")

        # Balance should now be 50.00
        balance = get_organization_balance(organization.id, use_cache=False)
        assert balance["current_balance"] == Decimal("50.00")

        # Attempt usage that exceeds balance should fail
        event2 = record_usage_event(
            event_type="compute_hours",
            user=user,
            organization=organization,
            metadata={"hours": 10},
        )

        with pytest.raises(InsufficientBalanceError):
            create_transaction(
                amount=Decimal("-100.00"),
                organization=organization,
                created_by=user,
                idempotency_key="usage-002",
                source_type=SourceTypeChoices.USAGE_EVENT,
                usage_event=event2,
            )  # Balance should remain unchanged
        balance = get_organization_balance(organization.id, use_cache=False)
        assert balance["current_balance"] == Decimal("50.00")


class TestPostpaidPolicyEnforcement:
    """Test postpaid policy enforcement in realistic scenarios."""

    def test_postpaid_org_allows_negative_balance(self, user, organization):
        """Test that postpaid organization can have negative balance."""
        # Set up postpaid policy
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        # Record usage with no prior credits
        event = record_usage_event(
            event_type="storage_gb_hours",
            user=user,
            organization=organization,
            metadata={"gb_hours": 1000},
        )

        txn = create_transaction(
            amount=Decimal("-75.00"),
            organization=organization,
            created_by=user,
            idempotency_key="usage-postpaid",
            source_type=SourceTypeChoices.USAGE_EVENT,
            usage_event=event,
            notes="Storage usage charge",
        )

        assert txn.amount == Decimal("-75.00")

        # Balance should be negative
        balance = get_organization_balance(organization.id, use_cache=False)
        assert balance["current_balance"] == Decimal("-75.00")


class TestProjectLevelPolicyOverride:
    """Test project-level policies override organization policies."""

    def test_project_prepaid_overrides_org_postpaid(self, user, organization, project):
        """Test that project can have stricter policy than organization."""
        # Organization allows negative balance
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        # Project requires prepaid
        BalancePolicy.objects.create(
            organization=organization,
            project=project,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        # Add credits to project
        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            project=project,
            created_by=user,
            idempotency_key="proj-credit",
        )

        # Usage within balance succeeds
        event1 = record_usage_event(
            event_type="api_calls",
            user=user,
            organization=organization,
            project=project,
        )

        create_transaction(
            amount=Decimal("-30.00"),
            organization=organization,
            project=project,
            created_by=user,
            idempotency_key="proj-usage-1",
            usage_event=event1,
        )

        balance = get_project_balance(project.id, use_cache=False)
        assert balance["current_balance"] == Decimal("20.00")

        # Usage exceeding balance fails (project policy enforced)
        event2 = record_usage_event(
            event_type="api_calls",
            user=user,
            organization=organization,
            project=project,
        )

        with pytest.raises(InsufficientBalanceError):
            create_transaction(
                amount=Decimal("-50.00"),
                organization=organization,
                project=project,
                created_by=user,
                idempotency_key="proj-usage-2",
                usage_event=event2,
            )


class TestCacheBehaviorIntegration:
    """Test cache behavior in realistic transaction scenarios."""

    def test_cache_invalidation_on_transaction_create(self, user, organization):
        """Test that cache is invalidated when transactions are created."""
        # Create initial transaction
        create_transaction(
            amount=Decimal("100.00"),
            organization=organization,
            created_by=user,
            idempotency_key="cache-test-1",
        )

        # First balance query caches result
        balance1 = get_organization_balance(organization.id, use_cache=True)
        assert balance1["current_balance"] == Decimal("100.00")

        # Create another transaction (cache should be invalidated by signal)
        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            created_by=user,
            idempotency_key="cache-test-2",
        )

        # Next balance query should reflect new transaction
        balance2 = get_organization_balance(organization.id, use_cache=True)
        assert balance2["current_balance"] == Decimal("150.00")

    def test_separate_org_and_project_caches(self, user, organization, project):
        """Test that organization and project caches are independent."""
        # Create org-level transaction
        create_transaction(
            amount=Decimal("200.00"),
            organization=organization,
            created_by=user,
            idempotency_key="org-txn",
        )

        # Create project-level transaction
        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            project=project,
            created_by=user,
            idempotency_key="proj-txn",
        )

        # Query and cache both balances
        org_balance = get_organization_balance(organization.id, use_cache=True)
        proj_balance = get_project_balance(project.id, use_cache=True)

        # Org balance includes both org-level and project-level transactions
        assert org_balance["current_balance"] == Decimal("250.00")
        # Project balance includes only project-specific transaction
        assert proj_balance["current_balance"] == Decimal("50.00")

        # Create another org transaction (should only invalidate org cache)
        create_transaction(
            amount=Decimal("25.00"),
            organization=organization,
            created_by=user,
            idempotency_key="org-txn-2",
        )

        # Org balance updated, project balance unchanged
        org_balance2 = get_organization_balance(organization.id, use_cache=True)
        assert org_balance2["current_balance"] == Decimal("275.00")


class TestIdempotencyIntegration:
    """Test idempotency across usage events and transactions."""

    def test_idempotent_usage_event_prevents_duplicate_charges(self, user, organization):
        """Test that idempotency prevents duplicate usage charges."""
        # Set postpaid policy to allow negative balance for this test
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        # Record usage event with idempotency key
        event1 = record_usage_event(
            event_type="data_transfer_gb",
            user=user,
            organization=organization,
            metadata={"gb": 10},
            idempotency_key="transfer-001",
        )

        # Create transaction for this usage
        create_transaction(
            amount=Decimal("-15.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-transfer-001",
            usage_event=event1,
        )

        # Attempt to record same usage event again
        event2 = record_usage_event(
            event_type="data_transfer_gb",
            user=user,
            organization=organization,
            metadata={"gb": 10},
            idempotency_key="transfer-001",
        )

        # Should return same event
        assert event1.id == event2.id

        # Balance should only reflect single charge
        balance = get_organization_balance(organization.id, use_cache=False)
        assert balance["current_balance"] == Decimal("-15.00")
        assert balance["transaction_count"] == 1
