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


@pytest.mark.django_db
class TestMultiTenantIsolation:
    """Multi-tenant isolation tests."""

    def test_balance_queries_isolated(self, user, organization, project):
        """Test that balance queries don't leak across organizations."""
        from accounts.models import User
        from organisations.models import Organisation
        from projects.models import Project

        # Create second org with its own data
        user2 = User.objects.create_user(email="org2@example.com", password="test")
        org2 = Organisation.objects.create(name="Organization 2", creator=user2)
        project2 = Project.objects.create(name="Project 2", organisation=org2, creator=user2)

        # Create third org with no transactions
        user3 = User.objects.create_user(email="org3@example.com", password="test")
        org3 = Organisation.objects.create(name="Organization 3", creator=user3)

        # Create transactions for org1
        create_transaction(
            organization=organization,
            project=project,
            created_by=user,
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
        org1_balance_data = get_organization_balance(organization.id)
        org2_balance_data = get_organization_balance(org2.id)

        assert org1_balance_data["current_balance"] == Decimal("100.00")
        assert org2_balance_data["current_balance"] == Decimal("200.00")

        # Verify org3 has zero balance (no transactions)
        org3_balance_data = get_organization_balance(org3.id)
        assert org3_balance_data["current_balance"] == Decimal("0.00")

    def test_project_balance_isolated(self, user, organization, project):
        """Test that project balances are isolated per organization."""
        from accounts.models import User
        from organisations.models import Organisation
        from projects.models import Project

        # Create second org with its own project
        user2 = User.objects.create_user(email="org2@example.com", password="test")
        org2 = Organisation.objects.create(name="Organization 2", creator=user2)
        project2 = Project.objects.create(name="Project 2", organisation=org2, creator=user2)

        # Create project-scoped transactions
        create_transaction(
            organization=organization,
            project=project,
            created_by=user,
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
        proj1_balance_data = get_project_balance(project.id)
        proj2_balance_data = get_project_balance(project2.id)

        assert proj1_balance_data["current_balance"] == Decimal("50.00")
        assert proj2_balance_data["current_balance"] == Decimal("75.00")

    def test_transaction_queryset_filtering(self, user, organization):
        """Test that transaction queries are properly scoped to organization."""
        from accounts.models import User
        from organisations.models import Organisation

        # Create second org
        user2 = User.objects.create_user(email="org2@example.com", password="test")
        org2 = Organisation.objects.create(name="Organization 2", creator=user2)

        # Create transactions for each org
        create_transaction(
            organization=organization,
            created_by=user,
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
        org1_txns = Transaction.objects.filter(organization=organization)
        org2_txns = Transaction.objects.filter(organization=org2)

        assert org1_txns.count() == 1
        assert org2_txns.count() == 1
        assert org1_txns.first().amount == Decimal("100.00")
        assert org2_txns.first().amount == Decimal("200.00")

    def test_policy_enforcement_per_org(self, user, organization):
        """Test that balance policies are enforced per organization."""
        from accounts.models import User
        from organisations.models import Organisation
        from transactions.exceptions import InsufficientBalanceError

        # Create second org
        user2 = User.objects.create_user(email="org2@example.com", password="test")
        org2 = Organisation.objects.create(name="Organization 2", creator=user2)

        # Org1: strict prepaid (BLOCK)
        BalancePolicy.objects.create(
            organization=organization,
            enforcement_mode=EnforcementModeChoices.BLOCK,
            allow_negative=False,
        )

        # Org2: postpaid allowed (ALLOW)
        BalancePolicy.objects.create(
            organization=org2,
            enforcement_mode=EnforcementModeChoices.ALLOW,
            allow_negative=True,
        )

        # Org1: debit should fail (zero balance, prepaid policy)
        with pytest.raises(InsufficientBalanceError):
            create_transaction(
                organization=organization,
                created_by=user,
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

    def test_cross_org_balance_independence(self, user, organization):
        """Test that transactions in one org don't affect another's balance."""
        from accounts.models import User
        from organisations.models import Organisation

        # Create second org
        user2 = User.objects.create_user(email="org2@example.com", password="test")
        org2 = Organisation.objects.create(name="Organization 2", creator=user2)

        # Get initial balances
        org1_initial = get_organization_balance(organization.id)["current_balance"]
        org2_initial = get_organization_balance(org2.id)["current_balance"]

        # Create transaction in org1
        create_transaction(
            organization=organization,
            created_by=user,
            amount=Decimal("1000.00"),
            notes="Large org1 transaction",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"cross-org-{uuid.uuid4()}",
        )

        # Verify org2 balance unchanged
        org1_new = get_organization_balance(organization.id)["current_balance"]
        org2_new = get_organization_balance(org2.id)["current_balance"]

        assert org1_new == org1_initial + Decimal("1000.00")
        assert org2_new == org2_initial  # Unchanged

    def test_project_scope_within_org_only(self, user, organization, project):
        """Test that project balances don't affect org-level balances incorrectly."""
        # Create org-level transaction (no project)
        create_transaction(
            organization=organization,
            project=None,
            created_by=user,
            amount=Decimal("100.00"),
            notes="Org-level credit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"org-level-{uuid.uuid4()}",
        )

        # Create project-level transaction
        create_transaction(
            organization=organization,
            project=project,
            created_by=user,
            amount=Decimal("50.00"),
            notes="Project-level credit",
            source_type=SourceTypeChoices.ADJUSTMENT,
            idempotency_key=f"proj-level-{uuid.uuid4()}",
        )

        # Org balance should include both
        org_balance_data = get_organization_balance(organization.id)
        assert org_balance_data["current_balance"] == Decimal("150.00")

        # Project balance should only include project transaction
        proj_balance_data = get_project_balance(project.id)
        assert proj_balance_data["current_balance"] == Decimal("50.00")
