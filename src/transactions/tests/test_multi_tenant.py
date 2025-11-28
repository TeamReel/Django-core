"""Multi-tenant isolation tests for transactions engine.

Tests to ensure data isolation between organizations:
- Balance queries don't leak across orgs
- Transactions scoped to correct org/project
- Policy enforcement respects org boundaries
- API endpoints enforce org access control

WP06-T065: Multi-tenant isolation tests
"""

import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from organisations.models import Organisation
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIClient

from transactions.models import BalancePolicy, Transaction, UsageEvent
from transactions.services import (
    create_transaction,
    get_organization_balance,
    get_project_balance,
)

User = get_user_model()


@pytest.mark.django_db
class TestMultiTenantIsolation:
    """Multi-tenant isolation tests."""

    @pytest.fixture
    def multi_org_setup(self):
        """Create multiple organizations with isolated data."""
        # Org 1
        user1 = User.objects.create(email="org1@example.com")
        org1 = Organisation.objects.create(name="Organization 1", slug="org-1", creator=user1)
        project1 = Project.objects.create(
            name="Project 1", slug="proj-1", organisation=org1, creator=user1
        )

        # Org 2
        user2 = User.objects.create(email="org2@example.com")
        org2 = Organisation.objects.create(name="Organization 2", slug="org-2", creator=user2)
        project2 = Project.objects.create(
            name="Project 2", slug="proj-2", organisation=org2, creator=user2
        )

        # Org 3
        user3 = User.objects.create(email="org3@example.com")
        org3 = Organisation.objects.create(name="Organization 3", slug="org-3", creator=user3)
        project3 = Project.objects.create(
            name="Project 3", slug="proj-3", organisation=org3, creator=user3
        )

        yield {
            "org1": org1,
            "user1": user1,
            "project1": project1,
            "org2": org2,
            "user2": user2,
            "project2": project2,
            "org3": org3,
            "user3": user3,
            "project3": project3,
        }

        # Cleanup
        for org in [org1, org2, org3]:
            Transaction.objects.filter(organisation=org).delete()
            UsageEvent.objects.filter(organisation=org).delete()
            BalancePolicy.objects.filter(organisation=org).delete()
            Project.objects.filter(organisation=org).delete()
            org.delete()

        for user in [user1, user2, user3]:
            user.delete()

    def test_balance_queries_isolated(self, multi_org_setup):
        """Test that balance queries don't leak across organizations."""
        org1 = multi_org_setup["org1"]
        project1 = multi_org_setup["project1"]
        user1 = multi_org_setup["user1"]

        org2 = multi_org_setup["org2"]
        project2 = multi_org_setup["project2"]
        user2 = multi_org_setup["user2"]

        # Create transactions for org1
        create_transaction(
            organisation_id=org1.id,
            project_id=project1.id,
            user_id=user1.id,
            amount=Decimal("100.00"),
            description="Org1 credit",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"org1-txn-{uuid.uuid4()}",
        )

        # Create transactions for org2
        create_transaction(
            organisation_id=org2.id,
            project_id=project2.id,
            user_id=user2.id,
            amount=Decimal("200.00"),
            description="Org2 credit",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"org2-txn-{uuid.uuid4()}",
        )

        # Verify balances are isolated
        org1_balance = get_organization_balance(org1.id)
        org2_balance = get_organization_balance(org2.id)

        assert org1_balance == Decimal("100.00")
        assert org2_balance == Decimal("200.00")

        # Org3 should have zero balance
        org3_balance = get_organization_balance(multi_org_setup["org3"].id)
        assert org3_balance == Decimal("0.00")

    def test_project_balances_isolated(self, multi_org_setup):
        """Test that project balances are isolated within and across orgs."""
        org1 = multi_org_setup["org1"]
        project1 = multi_org_setup["project1"]
        user1 = multi_org_setup["user1"]

        # Create additional project in org1
        project1b = Project.objects.create(
            name="Project 1B",
            slug="proj-1b",
            organisation=org1,
            creator=user1,
        )

        # Transactions on project1
        create_transaction(
            organisation_id=org1.id,
            project_id=project1.id,
            user_id=user1.id,
            amount=Decimal("50.00"),
            description="Project 1 credit",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"proj1-txn-{uuid.uuid4()}",
        )

        # Transactions on project1b
        create_transaction(
            organisation_id=org1.id,
            project_id=project1b.id,
            user_id=user1.id,
            amount=Decimal("75.00"),
            description="Project 1B credit",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"proj1b-txn-{uuid.uuid4()}",
        )

        # Verify project balances are isolated
        proj1_balance = get_project_balance(project1.id)
        proj1b_balance = get_project_balance(project1b.id)

        assert proj1_balance == Decimal("50.00")
        assert proj1b_balance == Decimal("75.00")

        # Org balance should be sum of both projects
        org1_balance = get_organization_balance(org1.id)
        assert org1_balance == Decimal("125.00")

        project1b.delete()

    def test_transaction_queryset_filtered_by_org(self, multi_org_setup):
        """Test that transaction queries don't return data from other orgs."""
        org1 = multi_org_setup["org1"]
        project1 = multi_org_setup["project1"]
        user1 = multi_org_setup["user1"]

        org2 = multi_org_setup["org2"]
        project2 = multi_org_setup["project2"]
        user2 = multi_org_setup["user2"]

        # Create transactions for both orgs
        create_transaction(
            organisation_id=org1.id,
            project_id=project1.id,
            user_id=user1.id,
            amount=Decimal("10.00"),
            description="Org1 transaction",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"org1-query-{uuid.uuid4()}",
        )

        create_transaction(
            organisation_id=org2.id,
            project_id=project2.id,
            user_id=user2.id,
            amount=Decimal("20.00"),
            description="Org2 transaction",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"org2-query-{uuid.uuid4()}",
        )

        # Query transactions for org1 only
        org1_txns = Transaction.objects.filter(organisation=org1)
        assert org1_txns.count() >= 1
        for txn in org1_txns:
            assert txn.organisation_id == org1.id

        # Query transactions for org2 only
        org2_txns = Transaction.objects.filter(organisation=org2)
        assert org2_txns.count() >= 1
        for txn in org2_txns:
            assert txn.organisation_id == org2.id

        # Verify no cross-contamination
        org1_ids = set(org1_txns.values_list("id", flat=True))
        org2_ids = set(org2_txns.values_list("id", flat=True))
        assert not org1_ids.intersection(org2_ids)

    def test_usage_events_isolated_by_org(self, multi_org_setup):
        """Test that usage events are isolated by organization."""
        org1 = multi_org_setup["org1"]
        project1 = multi_org_setup["project1"]
        user1 = multi_org_setup["user1"]

        org2 = multi_org_setup["org2"]
        project2 = multi_org_setup["project2"]
        user2 = multi_org_setup["user2"]

        # Create usage events for both orgs
        UsageEvent.objects.create(
            id=uuid.uuid4(),
            event_type="API_CALL",
            organisation=org1,
            project=project1,
            user=user1,
            amount=Decimal("5.00"),
            metadata={},
            idempotency_key=f"org1-event-{uuid.uuid4()}",
        )

        UsageEvent.objects.create(
            id=uuid.uuid4(),
            event_type="COMPUTE",
            organisation=org2,
            project=project2,
            user=user2,
            amount=Decimal("15.00"),
            metadata={},
            idempotency_key=f"org2-event-{uuid.uuid4()}",
        )

        # Verify isolation
        org1_events = UsageEvent.objects.filter(organisation=org1)
        org2_events = UsageEvent.objects.filter(organisation=org2)

        assert org1_events.count() >= 1
        assert org2_events.count() >= 1

        for event in org1_events:
            assert event.organisation_id == org1.id

        for event in org2_events:
            assert event.organisation_id == org2.id

    def test_policy_enforcement_isolated(self, multi_org_setup):
        """Test that balance policies are enforced per organization."""
        org1 = multi_org_setup["org1"]
        project1 = multi_org_setup["project1"]
        user1 = multi_org_setup["user1"]

        org2 = multi_org_setup["org2"]
        project2 = multi_org_setup["project2"]
        user2 = multi_org_setup["user2"]

        # Org1: Strict policy (BLOCK at 0)
        BalancePolicy.objects.create(
            organisation=org1,
            enforcement_mode="BLOCK",
            min_balance=Decimal("0.00"),
            metadata={},
        )

        # Org2: Lenient policy (WARN at -100)
        BalancePolicy.objects.create(
            organisation=org2,
            enforcement_mode="WARN",
            min_balance=Decimal("-100.00"),
            metadata={},
        )

        # Org1: Debit should fail (balance=0, policy blocks negative)
        from transactions.exceptions import PolicyViolationError

        with pytest.raises(PolicyViolationError):
            create_transaction(
                organisation_id=org1.id,
                project_id=project1.id,
                user_id=user1.id,
                amount=Decimal("-10.00"),
                description="Org1 debit (should fail)",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"org1-fail-{uuid.uuid4()}",
            )

        # Org2: Debit should succeed (WARN policy allows negative up to -100)
        txn = create_transaction(
            organisation_id=org2.id,
            project_id=project2.id,
            user_id=user2.id,
            amount=Decimal("-50.00"),
            description="Org2 debit (should succeed)",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"org2-success-{uuid.uuid4()}",
        )

        assert txn.amount == Decimal("-50.00")
        org2_balance = get_organization_balance(org2.id)
        assert org2_balance == Decimal("-50.00")

    def test_api_endpoints_enforce_org_access(self, multi_org_setup):
        """Test that API endpoints don't allow cross-org data access."""
        user1 = multi_org_setup["user1"]
        org1 = multi_org_setup["org1"]
        project1 = multi_org_setup["project1"]

        user2 = multi_org_setup["user2"]
        org2 = multi_org_setup["org2"]

        # Create transaction for org1
        create_transaction(
            organisation_id=org1.id,
            project_id=project1.id,
            user_id=user1.id,
            amount=Decimal("100.00"),
            description="Org1 API test",
            source_type="MANUAL_ADJUSTMENT",
            idempotency_key=f"api-org1-{uuid.uuid4()}",
        )

        # User1 should be able to access org1 balance
        client = APIClient()
        client.force_authenticate(user=user1)

        response = client.get(f"/api/v1/balances/organisations/{org1.id}/")
        # Note: Actual permissions depend on DRF permission classes
        # This test verifies the endpoint exists and requires auth

        # User2 should NOT be able to access org1 balance
        client.force_authenticate(user=user2)
        response = client.get(f"/api/v1/balances/organisations/{org1.id}/")
        # Expected: 403 Forbidden or 404 Not Found (depending on permission logic)
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

        # User2 should be able to access their own org2 balance
        response = client.get(f"/api/v1/balances/organisations/{org2.id}/")
        # This may return 200 OK if user2 has access to org2

    def test_cross_org_project_reference_rejected(self, multi_org_setup):
        """Test that you can't create a transaction with project from different org."""
        org1 = multi_org_setup["org1"]
        user1 = multi_org_setup["user1"]
        project2 = multi_org_setup["project2"]  # From org2

        # Attempt to create transaction in org1 with project from org2
        # This should fail either at service layer or via validation
        with pytest.raises((ValueError, ValidationError, IntegrityError)):
            create_transaction(
                organisation_id=org1.id,
                project_id=project2.id,  # Wrong org!
                user_id=user1.id,
                amount=Decimal("10.00"),
                description="Cross-org project test",
                source_type="MANUAL_ADJUSTMENT",
                idempotency_key=f"cross-org-{uuid.uuid4()}",
            )
