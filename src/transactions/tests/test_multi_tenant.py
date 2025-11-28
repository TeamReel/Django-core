"""Multi-tenant isolation tests for transactions engine.

Tests to ensure data isolation between organizations:
- Balance queries don't leak across orgs
- Transactions scoped to correct org/project
- Policy enforcement respects org boundaries

WP06-T065: Multi-tenant isolation tests
"""

import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from organisations.models import Organisation
from projects.models import Project

from transactions.models import (
    BalancePolicy,
    EnforcementModeChoices,
    SourceTypeChoices,
    Transaction,
)
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
        cache.clear()
        for org in [org1, org2, org3]:
            Transaction.objects.filter(organization=org).delete()
            BalancePolicy.objects.filter(organization=org).delete()
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
            organization=org1,
            project=project1,
            created_by=user1,
            amount=Decimal("100.00"),
            notes="Org1 credit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"org1-txn-{uuid.uuid4()}",
        )

        # Create transactions for org2
        create_transaction(
            organization=org2,
            project=project2,
            created_by=user2,
            amount=Decimal("200.00"),
            notes="Org2 credit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"org2-txn-{uuid.uuid4()}",
        )

        # Verify balances are isolated
        org1_balance_data = get_organization_balance(org1.id)
        org2_balance_data = get_organization_balance(org2.id)

        assert org1_balance_data["current_balance"] == Decimal("100.00")
        assert org2_balance_data["current_balance"] == Decimal("200.00")

        # Verify org3 has zero balance (no transactions)
        org3_balance_data = get_organization_balance(multi_org_setup["org3"].id)
        assert org3_balance_data["current_balance"] == Decimal("0.00")

    def test_project_balance_isolated(self, multi_org_setup):
        """Test that project balances are isolated per organization."""
        org1 = multi_org_setup["org1"]
        project1 = multi_org_setup["project1"]
        user1 = multi_org_setup["user1"]

        org2 = multi_org_setup["org2"]
        project2 = multi_org_setup["project2"]
        user2 = multi_org_setup["user2"]

        # Create project-scoped transactions
        create_transaction(
            organization=org1,
            project=project1,
            created_by=user1,
            amount=Decimal("50.00"),
            notes="Project 1 credit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"proj1-txn-{uuid.uuid4()}",
        )

        create_transaction(
            organization=org2,
            project=project2,
            created_by=user2,
            amount=Decimal("75.00"),
            notes="Project 2 credit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"proj2-txn-{uuid.uuid4()}",
        )

        # Verify project balances are isolated
        proj1_balance_data = get_project_balance(project1.id)
        proj2_balance_data = get_project_balance(project2.id)

        assert proj1_balance_data["current_balance"] == Decimal("50.00")
        assert proj2_balance_data["current_balance"] == Decimal("75.00")

    def test_transaction_queryset_filtering(self, multi_org_setup):
        """Test that transaction queries are properly scoped to organization."""
        org1 = multi_org_setup["org1"]
        user1 = multi_org_setup["user1"]

        org2 = multi_org_setup["org2"]
        user2 = multi_org_setup["user2"]

        # Create transactions for each org
        create_transaction(
            organization=org1,
            created_by=user1,
            amount=Decimal("100.00"),
            notes="Org1 transaction",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"org1-filter-{uuid.uuid4()}",
        )

        create_transaction(
            organization=org2,
            created_by=user2,
            amount=Decimal("200.00"),
            notes="Org2 transaction",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"org2-filter-{uuid.uuid4()}",
        )

        # Query transactions for each org
        org1_txns = Transaction.objects.filter(organization=org1)
        org2_txns = Transaction.objects.filter(organization=org2)

        assert org1_txns.count() == 1
        assert org2_txns.count() == 1
        assert org1_txns.first().amount == Decimal("100.00")
        assert org2_txns.first().amount == Decimal("200.00")

    def test_policy_enforcement_per_org(self, multi_org_setup):
        """Test that balance policies are enforced per organization."""
        org1 = multi_org_setup["org1"]
        user1 = multi_org_setup["user1"]

        org2 = multi_org_setup["org2"]
        user2 = multi_org_setup["user2"]

        # Org1: strict prepaid (BLOCK)
        policy1 = BalancePolicy.objects.create(
            organization=org1,
            enforcement_mode=EnforcementModeChoices.BLOCK,
            allow_negative=False,
        )

        # Org2: postpaid allowed (ALLOW)
        policy2 = BalancePolicy.objects.create(
            organization=org2,
            enforcement_mode=EnforcementModeChoices.ALLOW,
            allow_negative=True,
        )

        # Org1: debit should fail (zero balance, prepaid policy)
        from transactions.exceptions import InsufficientBalanceError

        with pytest.raises(InsufficientBalanceError):
            create_transaction(
                organization=org1,
                created_by=user1,
                amount=Decimal("-10.00"),
                notes="Org1 debit",
                source_type=SourceTypeChoices.ADJUSTMENT,
                idempotency_key=f"org1-debit-{uuid.uuid4()}",
            )

        # Org2: debit should succeed (postpaid policy)
        txn2 = create_transaction(
            organization=org2,
            created_by=user2,
            amount=Decimal("-10.00"),
            notes="Org2 debit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"org2-debit-{uuid.uuid4()}",
        )

        assert txn2.amount == Decimal("-10.00")
        assert txn2.balance_after == Decimal("-10.00")

        # Cleanup policies
        policy1.delete()
        policy2.delete()

    def test_cross_org_balance_independence(self, multi_org_setup):
        """Test that transactions in one org don't affect another's balance."""
        org1 = multi_org_setup["org1"]
        user1 = multi_org_setup["user1"]

        org2 = multi_org_setup["org2"]
        _ = multi_org_setup["user2"]  # Not used but part of setup

        # Get initial balances
        org1_initial = get_organization_balance(org1.id)["current_balance"]
        org2_initial = get_organization_balance(org2.id)["current_balance"]

        # Create transaction in org1
        create_transaction(
            organization=org1,
            created_by=user1,
            amount=Decimal("1000.00"),
            notes="Large org1 transaction",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"cross-org-{uuid.uuid4()}",
        )

        # Verify org2 balance unchanged
        org1_new = get_organization_balance(org1.id)["current_balance"]
        org2_new = get_organization_balance(org2.id)["current_balance"]

        assert org1_new == org1_initial + Decimal("1000.00")
        assert org2_new == org2_initial  # Unchanged

    def test_project_scope_within_org_only(self, multi_org_setup):
        """Test that project balances don't affect org-level balances incorrectly."""
        org1 = multi_org_setup["org1"]
        project1 = multi_org_setup["project1"]
        user1 = multi_org_setup["user1"]

        # Create org-level transaction (no project)
        create_transaction(
            organization=org1,
            project=None,
            created_by=user1,
            amount=Decimal("100.00"),
            notes="Org-level credit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"org-level-{uuid.uuid4()}",
        )

        # Create project-level transaction
        create_transaction(
            organization=org1,
            project=project1,
            created_by=user1,
            amount=Decimal("50.00"),
            notes="Project-level credit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"proj-level-{uuid.uuid4()}",
        )

        # Org balance should include both
        org_balance_data = get_organization_balance(org1.id)
        assert org_balance_data["current_balance"] == Decimal("150.00")

        # Project balance should only include project transaction
        proj_balance_data = get_project_balance(project1.id)
        assert proj_balance_data["current_balance"] == Decimal("50.00")
