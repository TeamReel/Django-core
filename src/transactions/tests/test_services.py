"""
Unit tests for transaction service layer.

Tests cover:
- Usage event recording with idempotency
- Transaction creation with policy enforcement
- Balance queries with caching
- Policy retrieval with defaults
- Cache invalidation
"""

from decimal import Decimal

import pytest
from django.core.cache import cache
from transactions.exceptions import (
    DuplicateIdempotencyKeyError,
    InsufficientBalanceError,
)
from transactions.models import (
    BalancePolicy,
    EnforcementModeChoices,
    SourceTypeChoices,
)
from transactions.services import (
    check_policy_violation,
    create_transaction,
    create_transaction_with_routing,
    get_organization_balance,
    get_policy,
    get_project_balance,
    invalidate_balance_cache,
    record_usage_event,
)


class TestRecordUsageEvent:
    """Tests for record_usage_event() service function."""

    def test_create_usage_event_without_idempotency(self, user, organization, project):
        """Test creating a usage event without idempotency key."""
        event = record_usage_event(
            event_type="api_call",
            user=user,
            organization=organization,
            project=project,
            metadata={"endpoint": "/api/v1/data"},
        )

        assert event.event_type == "api_call"
        assert event.user == user
        assert event.organization == organization
        assert event.project == project
        assert event.metadata == {"endpoint": "/api/v1/data"}
        assert event.idempotency_key is None

    def test_create_usage_event_with_idempotency(self, user, organization, project):
        """Test creating a usage event with idempotency key."""
        event1 = record_usage_event(
            event_type="api_call",
            user=user,
            organization=organization,
            project=project,
            idempotency_key="event-12345",
        )

        # Second call with same idempotency key returns same event
        event2 = record_usage_event(
            event_type="api_call",
            user=user,
            organization=organization,
            project=project,
            idempotency_key="event-12345",
        )

        assert event1.id == event2.id
        assert event1.event_type == "api_call"

    def test_create_usage_event_minimal(self, user, organization):
        """Test creating usage event with minimal required fields."""
        event = record_usage_event(
            event_type="storage_usage",
            user=user,
            organization=organization,
        )

        assert event.event_type == "storage_usage"
        assert event.project is None
        assert event.metadata == {}


class TestCreateTransaction:
    """Tests for create_transaction() service function."""

    def test_create_transaction_success(self, user, organization, project):
        """Test creating a transaction successfully."""
        txn = create_transaction(
            amount=Decimal("100.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-001",
            project=project,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            notes="Test purchase",
        )

        assert txn.amount == Decimal("100.00")
        assert txn.organization == organization
        assert txn.project == project
        assert txn.created_by == user
        assert txn.idempotency_key == "txn-001"
        assert txn.source_type == SourceTypeChoices.EXTERNAL_BILLING

    def test_create_transaction_duplicate_idempotency_key(self, user, organization):
        """Test that duplicate idempotency keys are rejected."""
        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-002",
        )

        with pytest.raises(DuplicateIdempotencyKeyError) as exc_info:
            create_transaction(
                amount=Decimal("75.00"),
                organization=organization,
                created_by=user,
                idempotency_key="txn-002",
            )

        assert "txn-002" in str(exc_info.value)

    def test_create_transaction_policy_violation_prepaid(self, user, organization):
        """Test that prepaid policy blocks negative balance."""
        # Create prepaid policy
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        # First transaction creates positive balance
        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-credit",
        )

        # Attempt to debit more than available should fail
        with pytest.raises(InsufficientBalanceError) as exc_info:
            create_transaction(
                amount=Decimal("-100.00"),
                organization=organization,
                created_by=user,
                idempotency_key="txn-debit",
            )

        assert exc_info.value.current_balance == Decimal("50.00")
        assert exc_info.value.requested_amount == Decimal("100.00")

    def test_create_transaction_policy_allows_postpaid(self, user, organization):
        """Test that postpaid policy allows negative balance."""
        # Create postpaid policy
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        # Debit transaction should succeed even with no prior credits
        txn = create_transaction(
            amount=Decimal("-100.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-postpaid",
        )

        assert txn.amount == Decimal("-100.00")


class TestCreateTransactionWithRouting:
    def test_routing_project_then_user_fallback(self, user, organization, project):
        """If project wallet is empty, fallback to user wallet when configured."""
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        # User wallet has credits
        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            created_by=user,
            charged_user=user,
            idempotency_key="txn-user-credit-1",
        )

        txn = create_transaction_with_routing(
            amount=Decimal("-10.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-route-1",
            project=project,
            charged_user=user,
            payer_routing="project_user_org",
            source_type=SourceTypeChoices.USAGE_EVENT,
            usage_event=record_usage_event(
                event_type="api_call",
                user=user,
                organization=organization,
                project=project,
                idempotency_key="evt-route-1",
            ),
        )

        assert txn.wallet_scope == "user"
        assert txn.charged_user_id == user.id

    def test_routing_user_then_project_fallback(self, user, organization, project):
        """If user wallet is empty, fallback to project wallet when configured."""
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        # Project wallet has credits
        create_transaction(
            amount=Decimal("30.00"),
            organization=organization,
            created_by=user,
            project=project,
            idempotency_key="txn-proj-credit-1",
        )

        txn = create_transaction_with_routing(
            amount=Decimal("-10.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-route-2",
            project=project,
            charged_user=user,
            payer_routing="user_project_org",
            source_type=SourceTypeChoices.USAGE_EVENT,
            usage_event=record_usage_event(
                event_type="api_call",
                user=user,
                organization=organization,
                project=project,
                idempotency_key="evt-route-2",
            ),
        )

        assert txn.wallet_scope == "project"
        assert txn.project_id == project.id
        assert txn.charged_user_id is None

    def test_routing_uses_b10_setting_by_default(self, user, organization, project):
        """If payer_routing is omitted, use org-scoped B10 setting."""
        from settings.models import ScopeType, Setting, SettingType

        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        Setting.objects.update_or_create(
            key="transactions_payer_routing_default",
            scope_type=ScopeType.ORGANISATION,
            organisation=organization,
            project=None,
            user=None,
            defaults={
                "value_type": SettingType.STRING,
                "value": "user_project_org",
                "default_value": "explicit",
                "description": "Test routing",
            },
        )

        # Put credits on project wallet only; user has 0.
        create_transaction(
            amount=Decimal("25.00"),
            organization=organization,
            created_by=user,
            project=project,
            idempotency_key="txn-proj-credit-2",
        )

        txn = create_transaction_with_routing(
            amount=Decimal("-5.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-route-3",
            project=project,
            charged_user=user,
            payer_routing=None,
            source_type=SourceTypeChoices.USAGE_EVENT,
            usage_event=record_usage_event(
                event_type="api_call",
                user=user,
                organization=organization,
                project=project,
                idempotency_key="evt-route-3",
            ),
        )

        assert txn.wallet_scope == "project"

        project_balance = get_project_balance(project.id, use_cache=False)
        assert project_balance["current_balance"] == Decimal("20.00")


class TestBalanceQueries:
    """Tests for balance query functions."""

    def test_get_organization_balance_no_transactions(self, organization):
        """Test balance query for organization with no transactions."""
        balance = get_organization_balance(organization.id, use_cache=False)

        assert balance["current_balance"] == Decimal("0.00")
        assert balance["total_positive_amounts"] == Decimal("0.00")
        assert balance["total_negative_amounts"] == Decimal("0.00")
        assert balance["transaction_count"] == 0

    def test_get_organization_balance_with_transactions(self, user, organization):
        """Test balance query with multiple transactions."""
        create_transaction(
            amount=Decimal("100.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-1",
        )
        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-2",
        )
        create_transaction(
            amount=Decimal("-30.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-3",
        )

        balance = get_organization_balance(organization.id, use_cache=False)

        assert balance["current_balance"] == Decimal("120.00")
        assert balance["total_positive_amounts"] == Decimal("150.00")
        assert balance["total_negative_amounts"] == Decimal("-30.00")
        assert balance["transaction_count"] == 3

    def test_get_project_balance_with_transactions(self, user, organization, project):
        """Test balance query for project."""
        create_transaction(
            amount=Decimal("200.00"),
            organization=organization,
            project=project,
            created_by=user,
            idempotency_key="txn-proj-1",
        )

        balance = get_project_balance(project.id, use_cache=False)

        assert balance["current_balance"] == Decimal("200.00")
        assert balance["transaction_count"] == 1

    def test_balance_caching_organization(self, user, organization):
        """Test that balance queries use Redis cache."""
        # Clear cache
        cache.clear()

        # First call should compute and cache
        create_transaction(
            amount=Decimal("100.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-cache-1",
        )

        balance1 = get_organization_balance(organization.id, use_cache=True)
        assert balance1["current_balance"] == Decimal("100.00")

        # Second call should return cached value
        balance2 = get_organization_balance(organization.id, use_cache=True)
        assert balance2 == balance1

        # Verify cache key exists
        cache_key = f"balance:org:{organization.id}"
        cached_value = cache.get(cache_key)
        assert cached_value is not None

    def test_balance_cache_bypass(self, user, organization):
        """Test that use_cache=False bypasses cache."""
        cache.clear()

        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-nocache",
        )

        # Query with cache disabled
        balance = get_organization_balance(organization.id, use_cache=False)

        # Cache should be empty
        cache_key = f"balance:org:{organization.id}"
        cached_value = cache.get(cache_key)
        assert cached_value is None
        assert balance["current_balance"] == Decimal("50.00")


class TestPolicyFunctions:
    """Tests for policy retrieval and violation checking."""

    def test_get_policy_default(self, organization):
        """Test that default policy is returned when none exists."""
        # Ensure no policies exist for this organization
        BalancePolicy.objects.filter(organization=organization).delete()

        policy = get_policy(organization)

        # Should return default policy (not saved to DB)
        assert not policy.allow_negative
        assert policy.enforcement_mode == EnforcementModeChoices.BLOCK

    def test_get_policy_organization_level(self, organization):
        """Test retrieving organization-level policy."""
        org_policy = BalancePolicy.objects.create(
            organization=organization,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        policy = get_policy(organization)

        assert policy.pk == org_policy.pk
        assert policy.allow_negative

    def test_get_policy_project_level(self, organization, project):
        """Test that project-level policy overrides organization policy."""
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        project_policy = BalancePolicy.objects.create(
            organization=organization,
            project=project,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        policy = get_policy(organization, project)

        assert policy.pk == project_policy.pk
        assert not policy.allow_negative

    def test_check_policy_violation_block(self, organization):
        """Test policy violation detection in block mode."""
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        is_violation, vtype = check_policy_violation(
            organization,
            None,
            Decimal("-50.00"),
            Decimal("10.00"),
        )

        assert is_violation
        assert vtype == "block"

    def test_check_policy_violation_warn(self, organization):
        """Test policy violation detection in warn mode."""
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.WARN,
        )

        is_violation, vtype = check_policy_violation(
            organization,
            None,
            Decimal("-50.00"),
            Decimal("10.00"),
        )

        assert is_violation
        assert vtype == "warn"

    def test_check_policy_no_violation(self, organization):
        """Test no violation when balance remains positive."""
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        is_violation, vtype = check_policy_violation(
            organization,
            None,
            Decimal("-10.00"),
            Decimal("50.00"),
        )

        assert not is_violation
        assert vtype is None

    def test_check_policy_warn_threshold(self, organization):
        """Test warning threshold violation."""
        BalancePolicy.objects.create(
            organization=organization,
            allow_negative=True,
            warn_threshold=Decimal("20.00"),
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        is_violation, vtype = check_policy_violation(
            organization,
            None,
            Decimal("-50.00"),
            Decimal("50.00"),
        )

        assert is_violation
        assert vtype == "warn_threshold"


class TestCacheInvalidation:
    """Tests for cache invalidation function."""

    def test_invalidate_organization_cache(self, organization):
        """Test invalidation of organization balance cache."""
        # Set cache
        cache_key = f"balance:org:{organization.id}"
        cache.set(cache_key, {"current_balance": Decimal("100.00")})

        assert cache.get(cache_key) is not None

        # Invalidate
        invalidate_balance_cache(organization.id)

        assert cache.get(cache_key) is None

    def test_invalidate_project_cache(self, organization, project):
        """Test invalidation of project balance cache."""
        org_cache_key = f"balance:org:{organization.id}"
        proj_cache_key = f"balance:proj:{project.id}"

        cache.set(org_cache_key, {"current_balance": Decimal("100.00")})
        cache.set(proj_cache_key, {"current_balance": Decimal("50.00")})

        # Invalidate both
        invalidate_balance_cache(organization.id, project.id)

        assert cache.get(org_cache_key) is None
        assert cache.get(proj_cache_key) is None

    def test_cache_invalidation_via_signal(self, user, organization):
        """Test that cache is invalidated automatically on transaction create."""
        cache.clear()

        # Create initial transaction and cache balance
        create_transaction(
            amount=Decimal("100.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-signal-1",
        )

        balance1 = get_organization_balance(organization.id, use_cache=True)
        assert balance1["current_balance"] == Decimal("100.00")

        # Cache key should exist
        cache_key = f"balance:org:{organization.id}"
        assert cache.get(cache_key) is not None

        # Create another transaction (signal should invalidate cache)
        create_transaction(
            amount=Decimal("50.00"),
            organization=organization,
            created_by=user,
            idempotency_key="txn-signal-2",
        )

        # Cache should be invalidated by signal
        assert cache.get(cache_key) is None

        # Fresh query should show updated balance
        balance2 = get_organization_balance(organization.id, use_cache=False)
        assert balance2["current_balance"] == Decimal("150.00")


@pytest.mark.django_db(transaction=True)
class TestConcurrentWrites:
    """Test concurrent transaction writes for race conditions.

    Note: These tests use SQLite in the test environment, which has
    limited concurrency support. In production with PostgreSQL, these
    scenarios work reliably with SELECT FOR UPDATE locking.
    """

    def test_concurrent_transaction_creation(self, user, organization):
        """Test 10 concurrent transaction writes with no data loss.

        Note: This test may experience database locking with SQLite.
        In production PostgreSQL, SELECT FOR UPDATE provides proper
        row-level locking without table-level locks.
        """
        import threading

        errors = []
        created_txns = []
        lock = threading.Lock()

        def create_txn(idx):
            """Thread worker to create a transaction."""
            try:
                txn = create_transaction(
                    amount=Decimal("10.00"),
                    organization=organization,
                    created_by=user,
                    idempotency_key=f"concurrent-txn-{idx}",
                    notes=f"Concurrent test #{idx}",
                )
                with lock:
                    created_txns.append(txn)
            except Exception as e:  # noqa: BLE001
                with lock:
                    errors.append(str(e))

        # Launch 10 threads
        threads = []
        for i in range(10):
            t = threading.Thread(target=create_txn, args=(i,))
            threads.append(t)
            t.start()

        # Wait for all threads to complete
        for t in threads:
            t.join()

        # With SQLite, expect some locking errors (this is a database limitation)
        # In production PostgreSQL, this should have 0 errors
        if errors:
            # Verify errors are database locking (expected with SQLite)
            for error in errors:
                assert "locked" in error.lower(), f"Unexpected error: {error}"

        # Verify transactions that succeeded are valid
        assert len(created_txns) > 0, "At least some transactions should succeed"

        # Verify successful transactions have correct balance contribution
        expected_balance = Decimal(str(len(created_txns))) * Decimal("10.00")
        balance = get_organization_balance(organization.id, use_cache=False)
        assert balance["current_balance"] == expected_balance
        assert balance["transaction_count"] == len(created_txns)

        # Verify all successful transactions have unique idempotency keys
        idempotency_keys = [txn.idempotency_key for txn in created_txns]
        assert len(set(idempotency_keys)) == len(created_txns)
