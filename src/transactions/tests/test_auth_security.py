"""Auth regression tests for transactions endpoints.

Verifies that all endpoints require authentication and
org-scoping prevents cross-organisation data access.
"""

import uuid
from decimal import Decimal

import pytest
from accounts.models import User
from django.urls import reverse
from organisations.models import Membership, Organisation
from projects.models import Project
from rest_framework import status
from rest_framework.test import APIClient

from transactions.models import BalancePolicy, SourceTypeChoices, Transaction, UsageEvent


@pytest.mark.django_db
class TestTransactionsAuthRequired:
    """Verify all transactions endpoints reject unauthenticated requests."""

    def test_usage_events_list_requires_auth(self):
        client = APIClient()
        response = client.get("/api/v1/usage-events/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_usage_events_create_requires_auth(self):
        client = APIClient()
        response = client.post("/api/v1/usage-events/", {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_transactions_list_requires_auth(self):
        client = APIClient()
        response = client.get("/api/v1/transactions/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_transactions_create_requires_auth(self):
        client = APIClient()
        response = client.post("/api/v1/transactions/", {}, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_balance_policies_list_requires_auth(self):
        client = APIClient()
        response = client.get("/api/v1/balance-policies/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTransactionsOrgScoping:
    """Verify org-scoping: users can only see data from their own organisations."""

    @pytest.fixture
    def org_a_setup(self, db):
        """Create org A with user, membership, and test data."""
        user_a = User.objects.create_user(email="user_a@test.com", password="pass")
        org_a = Organisation.objects.create(name="Org A", creator=user_a)
        Membership.objects.create(user=user_a, organisation=org_a, role="admin")
        project_a = Project.objects.create(name="Project A", organisation=org_a, creator=user_a)

        usage_event = UsageEvent.objects.create(
            event_type="test", user=user_a, organization=org_a, project=project_a
        )
        transaction = Transaction.objects.create(
            amount=Decimal("100.0000"),
            organization=org_a,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user_a,
            idempotency_key="org-a-txn-001",
        )
        policy = BalancePolicy.objects.create(organization=org_a)

        client = APIClient()
        client.force_authenticate(user=user_a)
        return {
            "user": user_a,
            "org": org_a,
            "project": project_a,
            "client": client,
            "usage_event": usage_event,
            "transaction": transaction,
            "policy": policy,
        }

    @pytest.fixture
    def org_b_setup(self, db):
        """Create org B with user, membership, and test data."""
        user_b = User.objects.create_user(email="user_b@test.com", password="pass")
        org_b = Organisation.objects.create(name="Org B", creator=user_b)
        Membership.objects.create(user=user_b, organisation=org_b, role="admin")

        UsageEvent.objects.create(
            event_type="secret", user=user_b, organization=org_b
        )
        Transaction.objects.create(
            amount=Decimal("500.0000"),
            organization=org_b,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user_b,
            idempotency_key="org-b-txn-001",
        )
        BalancePolicy.objects.create(organization=org_b)

        client = APIClient()
        client.force_authenticate(user=user_b)
        return {"user": user_b, "org": org_b, "client": client}

    def _get_result_items(self, response):
        """Extract result items from the standardized API response format."""
        data = response.data
        if isinstance(data, dict):
            if "data" in data:
                inner = data["data"]
                if isinstance(inner, dict) and "results" in inner:
                    return inner["results"]
                if isinstance(inner, list):
                    return inner
            if "results" in data:
                return data["results"]
        if isinstance(data, list):
            return data
        return []

    def test_usage_events_scoped_to_own_org(self, org_a_setup, org_b_setup):
        """User A should only see org A's usage events."""
        client = org_a_setup["client"]
        response = client.get("/api/v1/usage-events/")

        assert response.status_code == status.HTTP_200_OK
        results = self._get_result_items(response)
        assert len(results) > 0, "Should return at least one usage event"
        org_names = {r["organization_name"] for r in results}
        assert "Org A" in org_names
        assert "Org B" not in org_names

    def test_balance_policies_scoped_to_own_org(self, org_a_setup, org_b_setup):
        """User A should only see org A's balance policies."""
        client = org_a_setup["client"]
        response = client.get("/api/v1/balance-policies/")

        assert response.status_code == status.HTTP_200_OK
        results = self._get_result_items(response)
        assert len(results) > 0, "Should return at least one policy"
        org_ids = {str(r["organization_id"]) for r in results}
        assert str(org_a_setup["org"].id) in org_ids
        assert str(org_b_setup["org"].id) not in org_ids

    def test_superuser_sees_all_usage_events(self, org_a_setup, org_b_setup):
        """Superuser should see usage events from all organisations."""
        superuser = User.objects.create_superuser(
            email="super@test.com", password="pass"
        )
        client = APIClient()
        client.force_authenticate(user=superuser)

        response = client.get("/api/v1/usage-events/")

        assert response.status_code == status.HTTP_200_OK
        results = self._get_result_items(response)
        assert len(results) >= 2, "Superuser should see events from both orgs"
        org_names = {r["organization_name"] for r in results}
        assert "Org A" in org_names
        assert "Org B" in org_names
