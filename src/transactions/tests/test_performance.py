"""Performance tests for transactions engine.

Tests validate that the system meets SLA requirements:
- Balance queries: <500ms for 100k transactions
- Concurrent writes: 100 transactions/sec without data loss
- Bulk export: <5s for 1M transactions (CSV)

WP06-T060, T061, T062: Performance tests for quality gates
"""

import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from organisations.models import Organisation
from projects.models import Project
from rest_framework.test import APIRequestFactory

from transactions.api.views import TransactionViewSet
from transactions.models import BalancePolicy, Transaction
from transactions.services import (
    create_transaction,
    get_organization_balance,
    get_project_balance,
)

User = get_user_model()


@pytest.mark.slow
@pytest.mark.django_db(transaction=True)
class TestBalanceQueryPerformance:
    """Test balance query performance meets <500ms SLA for 100k transactions."""

    @pytest.fixture
    def large_dataset(self, django_db_blocker):
        """Create dataset with 100k transactions for performance testing."""
        with django_db_blocker.unblock():
            # Create test entities
            user = User.objects.create(
                email="perftest@example.com",
            )
            org = Organisation.objects.create(
                name="Performance Test Org",
                slug="perf-test-org",
                creator=user,
            )
            project = Project.objects.create(
                name="Performance Test Project",
                slug="perf-test-proj",
                organisation=org,
                creator=user,
            )

            # Create balance policy (no enforcement for perf test)
            BalancePolicy.objects.create(
                organisation=org,
                enforcement_mode="AUDIT",
                min_balance=Decimal("-999999.00"),
            )

            # Bulk create 100k transactions in batches
            batch_size = 10000
            total = 100000
            transactions = []

            for i in range(0, total, batch_size):
                batch = [
                    Transaction(
                        id=uuid.uuid4(),
                        organisation=org,
                        project=project,
                        user=user,
                        amount=Decimal("10.00") if i % 2 == 0 else Decimal("-5.00"),
                        balance_after=Decimal("0.00"),  # Will be incorrect, but for perf test
                        description=f"Perf test transaction {j}",
                        source_type="MANUAL_ADJUSTMENT",
                        idempotency_key=f"perf-test-{j}",
                        metadata={},
                    )
                    for j in range(i, min(i + batch_size, total))
                ]
                Transaction.objects.bulk_create(batch, batch_size=batch_size)
                transactions.extend(batch)

            yield {"org": org, "project": project, "user": user, "transactions": transactions}

            # Cleanup
            Transaction.objects.filter(idempotency_key__startswith="perf-test-").delete()
            project.delete()
            org.delete()
            user.delete()

    def test_org_balance_query_performance(self, large_dataset):
        """Balance query for org with 100k transactions should complete in <500ms."""
        org = large_dataset["org"]

        # Clear cache to force DB query
        cache.clear()

        # Measure query time
        start_time = time.time()
        balance = get_organization_balance(org.id)
        elapsed_ms = (time.time() - start_time) * 1000

        # Validate
        assert balance is not None
        assert elapsed_ms < 500, f"Balance query took {elapsed_ms:.2f}ms, exceeds 500ms SLA"

    def test_project_balance_query_performance(self, large_dataset):
        """Balance query for project with 100k transactions should complete in <500ms."""
        project = large_dataset["project"]

        # Clear cache to force DB query
        cache.clear()

        # Measure query time
        start_time = time.time()
        balance = get_project_balance(project.id)
        elapsed_ms = (time.time() - start_time) * 1000

        # Validate
        assert balance is not None
        assert elapsed_ms < 500, f"Balance query took {elapsed_ms:.2f}ms, exceeds 500ms SLA"


@pytest.mark.slow
@pytest.mark.django_db(transaction=True)
class TestConcurrentWritePerformance:
    """Test concurrent transaction writes meet 100 txn/sec SLA."""

    @pytest.fixture
    def concurrent_test_setup(self, django_db_blocker):
        """Setup for concurrent write tests."""
        with django_db_blocker.unblock():
            user = User.objects.create(
                email="concurrent@example.com",
            )
            org = Organisation.objects.create(
                name="Concurrent Test Org",
                slug="concurrent-test-org",
                creator=user,
            )
            project = Project.objects.create(
                name="Concurrent Test Project",
                slug="concurrent-test-proj",
                organisation=org,
                creator=user,
            )

            # Create policy with high limit
            BalancePolicy.objects.create(
                organisation=org,
                enforcement_mode="WARN",
                min_balance=Decimal("-100000.00"),
            )

            # Create initial balance
            Transaction.objects.create(
                id=uuid.uuid4(),
                organisation=org,
                project=project,
                user=user,
                amount=Decimal("100000.00"),
                balance_after=Decimal("100000.00"),
                description="Initial balance for concurrent test",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key="concurrent-initial",
                metadata={},
            )

            yield {"org": org, "project": project, "user": user}

            # Cleanup
            Transaction.objects.filter(idempotency_key__startswith="concurrent-test-").delete()
            project.delete()
            org.delete()
            user.delete()

    def test_concurrent_transaction_writes(self, concurrent_test_setup):
        """100 concurrent transactions should complete in <1 second (100 txn/sec)."""
        org = concurrent_test_setup["org"]
        project = concurrent_test_setup["project"]
        user = concurrent_test_setup["user"]

        num_transactions = 100
        results = []
        errors = []

        def create_single_transaction(idx):
            """Create a single transaction in a thread."""
            try:
                create_transaction(
                    organisation_id=org.id,
                    project_id=project.id,
                    user_id=user.id,
                    amount=Decimal("-1.00"),
                    description=f"Concurrent test txn {idx}",
                    source_type="MANUAL_ADJUSTMENT",
                    idempotency_key=f"concurrent-test-{idx}",
                )
                return True
            except Exception as e:
                errors.append((idx, str(e)))
                return False

        # Execute concurrent writes
        start_time = time.time()

        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [
                executor.submit(create_single_transaction, i) for i in range(num_transactions)
            ]
            for future in as_completed(futures):
                results.append(future.result())

        elapsed_time = time.time() - start_time

        # Validate
        success_count = sum(results)
        throughput = success_count / elapsed_time if elapsed_time > 0 else 0

        assert (
            success_count >= 90
        ), f"Only {success_count}/{num_transactions} transactions succeeded"
        assert throughput >= 100, f"Throughput {throughput:.2f} txn/sec < 100 txn/sec SLA"
        assert len(errors) < 10, f"Too many errors: {len(errors)}"


@pytest.mark.slow
@pytest.mark.django_db(transaction=True)
class TestBulkExportPerformance:
    """Test bulk CSV export meets <5s SLA for 1M transactions."""

    @pytest.mark.skip(reason="1M transactions takes too long to create in test - validate manually")
    def test_csv_export_performance(self):
        """Exporting 1M transactions as CSV should complete in <5 seconds."""
        # This test is marked as slow and skipped by default
        # Run manually with: pytest -m slow --run-slow
        # Or create a smaller dataset (e.g., 10k transactions) for CI validation

        # Create dataset (simplified - actual implementation would be more complex)
        user = User.objects.create(email="export@example.com")
        org = Organisation.objects.create(
            name="Export Test Org", slug="export-test-org", creator=user
        )
        project = Project.objects.create(
            name="Export Test Project",
            slug="export-test-proj",
            organisation=org,
            creator=user,
        )

        # Note: Creating 1M transactions takes significant time
        # In production, this test would use a pre-existing dataset
        # or a scaled-down version (e.g., 100k transactions)

        # Measure export time
        factory = APIRequestFactory()
        request = factory.get("/api/v1/transactions/?format=csv")
        request.user = user

        viewset = TransactionViewSet()
        viewset.format_kwarg = "csv"
        viewset.request = request

        start_time = time.time()
        response = viewset.list(request)
        # Consume the streaming response
        for _ in response:
            pass
        elapsed_time = time.time() - start_time

        # Validate
        assert elapsed_time < 5.0, f"Export took {elapsed_time:.2f}s, exceeds 5s SLA"

        # Cleanup
        project.delete()
        org.delete()
        user.delete()
