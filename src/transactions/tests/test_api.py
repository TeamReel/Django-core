"""API tests for transactions endpoints."""

from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status
from transactions.models import (
    BalancePolicy,
    EnforcementModeChoices,
    SourceTypeChoices,
    Transaction,
    UsageEvent,
)


@pytest.mark.django_db
class TestUsageEventAPI:
    """Test UsageEvent API endpoints."""

    def test_create_usage_event_success(self, authenticated_client, user, organisation, project):
        """Test creating a usage event via API."""
        client = authenticated_client
        url = reverse("transactions:usage-event-list")

        data = {
            "event_type": "api_call",
            "user_id": str(user.id),
            "organization_id": str(organisation.id),
            "project_id": str(project.id),
            "metadata": {"endpoint": "/api/test", "method": "GET"},
            "idempotency_key": "test-usage-001",
        }

        response = client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["event_type"] == "api_call"
        assert response.data["idempotency_key"] == "test-usage-001"

        # Verify DB record
        assert UsageEvent.objects.filter(idempotency_key="test-usage-001").exists()

    def test_create_usage_event_duplicate_idempotency_key(self, authenticated_client, user, organisation):
        """Test duplicate idempotency key returns 409 with existing event."""
        client = authenticated_client
        url = reverse("transactions:usage-event-list")

        data = {
            "event_type": "api_call",
            "user_id": str(user.id),
            "organization_id": str(organisation.id),
            "metadata": {},
            "idempotency_key": "test-usage-duplicate",
        }

        # First request creates
        response1 = client.post(url, data, format="json")
        assert response1.status_code == status.HTTP_201_CREATED
        event_id_1 = response1.data["id"]

        # Second request returns existing
        response2 = client.post(url, data, format="json")
        assert response2.status_code == status.HTTP_409_CONFLICT
        assert response2.data["id"] == event_id_1

    def test_create_usage_event_validation_error(self, authenticated_client, user, organisation):
        """Test validation errors return 400."""
        client = authenticated_client
        url = reverse("transactions:usage-event-list")

        # Missing required field: event_type
        data = {
            "user_id": str(user.id),
            "organization_id": str(organisation.id),
            "metadata": {},
        }

        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "event_type" in response.data

    def test_create_usage_event_project_org_mismatch(self, authenticated_client, user, organisation, project):
        """Test validation error when project doesn't belong to org."""
        # Create another org
        from organisations.models import Organisation

        other_org = Organisation.objects.create(name="Other Org", creator=user)

        client = authenticated_client
        url = reverse("transactions:usage-event-list")

        data = {
            "event_type": "api_call",
            "user_id": str(user.id),
            "organization_id": str(other_org.id),
            "project_id": str(project.id),  # Project belongs to `organisation`, not `other_org`
            "metadata": {},
        }

        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "project_id" in response.data

    def test_list_usage_events(self, authenticated_client, user, organisation, project):
        """Test listing usage events."""
        # Create some usage events
        UsageEvent.objects.create(
            event_type="api_call",
            user=user,
            organization=organisation,
            project=project,
        )
        UsageEvent.objects.create(
            event_type="compute_task",
            user=user,
            organization=organisation,
        )

        client = authenticated_client
        url = reverse("transactions:usage-event-list")

        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_filter_usage_events_by_organization(self, authenticated_client, user, organisation):
        """Test filtering usage events by organization_id."""
        # Get initial count for this org
        initial_count = UsageEvent.objects.filter(organization=organisation).count()

        # Create usage events for different orgs
        from organisations.models import Organisation

        other_org = Organisation.objects.create(name="Other Org", creator=user)

        UsageEvent.objects.create(event_type="api_call", user=user, organization=organisation)
        UsageEvent.objects.create(event_type="api_call", user=user, organization=other_org)

        client = authenticated_client
        url = reverse("transactions:usage-event-list")

        response = client.get(url, {"organization_id": str(organisation.id)})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == initial_count + 1  # One more than initial

    def test_filter_usage_events_by_unbilled(self, authenticated_client, user, organisation):
        """Test filtering usage events by unbilled status."""
        # Create usage event without transaction (unbilled)
        unbilled_event = UsageEvent.objects.create(
            event_type="api_call_unbilled",  # Unique event type
            user=user,
            organization=organisation,
        )

        # Create usage event with transaction (billed)
        billed_event = UsageEvent.objects.create(
            event_type="compute_task_billed",  # Unique event type
            user=user,
            organization=organisation,
        )
        Transaction.objects.create(
            amount=Decimal("-10.0000"),
            organization=organisation,
            source_type=SourceTypeChoices.USAGE_EVENT,
            usage_event=billed_event,
            created_by=user,
            idempotency_key="txn-billed-001",
        )

        client = authenticated_client
        url = reverse("transactions:usage-event-list")

        # Filter for unbilled
        response = client.get(url, {"unbilled": "true"})
        assert response.status_code == status.HTTP_200_OK
        # Check that unbilled_event is in the results
        result_ids = [r["id"] for r in response.data["results"]]
        assert str(unbilled_event.id) in result_ids
        assert str(billed_event.id) not in result_ids


@pytest.mark.django_db
class TestTransactionAPI:
    """Test Transaction API endpoints."""

    def test_create_transaction_success(self, authenticated_client, user, organisation):
        """Test creating a transaction via API."""
        client = authenticated_client
        url = reverse("transactions:transaction-list")

        data = {
            "amount": "100.0000",
            "organization_id": str(organisation.id),
            "source_type": SourceTypeChoices.EXTERNAL_BILLING,
            "created_by_id": str(user.id),
            "idempotency_key": "txn-api-001",
            "notes": "Test purchase",
        }

        response = client.post(url, data, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert Decimal(response.data["amount"]) == Decimal("100.0000")
        assert response.data["source_type"] == SourceTypeChoices.EXTERNAL_BILLING

        # Verify DB record
        assert Transaction.objects.filter(idempotency_key="txn-api-001").exists()

    def test_create_transaction_duplicate_idempotency_key(self, authenticated_client, user, organisation):
        """Test duplicate idempotency key returns 409."""
        client = authenticated_client
        url = reverse("transactions:transaction-list")

        data = {
            "amount": "100.0000",
            "organization_id": str(organisation.id),
            "source_type": SourceTypeChoices.EXTERNAL_BILLING,
            "created_by_id": str(user.id),
            "idempotency_key": "txn-duplicate-001",
            "notes": "",
        }

        # First request creates
        response1 = client.post(url, data, format="json")
        assert response1.status_code == status.HTTP_201_CREATED
        txn_id_1 = response1.data["id"]

        # Second request returns 409
        response2 = client.post(url, data, format="json")
        assert response2.status_code == status.HTTP_409_CONFLICT
        assert response2.data["error"] == "duplicate_idempotency_key"
        assert response2.data["existing_transaction_id"] == txn_id_1

    def test_create_transaction_insufficient_balance(self, authenticated_client, user, organisation):
        """Test prepaid policy blocks negative balance."""
        # Create prepaid policy (default is prepaid)
        BalancePolicy.objects.create(
            organization=organisation,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        client = authenticated_client
        url = reverse("transactions:transaction-list")

        data = {
            "amount": "-50.0000",  # Negative amount (debit)
            "organization_id": str(organisation.id),
            "source_type": SourceTypeChoices.ADJUSTMENT,
            "created_by_id": str(user.id),
            "idempotency_key": "txn-insufficient-001",
            "notes": "Should fail",
        }

        response = client.post(url, data, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["error"] == "insufficient_balance"
        assert "current_balance" in response.data
        assert "requested_amount" in response.data

    def test_create_transaction_validation_error_zero_amount(self, authenticated_client, user, organisation):
        """Test validation error for zero amount."""
        client = authenticated_client
        url = reverse("transactions:transaction-list")

        data = {
            "amount": "0.0000",  # Invalid: zero amount
            "organization_id": str(organisation.id),
            "source_type": SourceTypeChoices.ADJUSTMENT,
            "created_by_id": str(user.id),
            "idempotency_key": "txn-zero-001",
        }

        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "amount" in response.data

    def test_list_transactions(self, authenticated_client, user, organisation):
        """Test listing transactions."""
        # Create some transactions
        Transaction.objects.create(
            amount=Decimal("100.0000"),
            organization=organisation,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user,
            idempotency_key="txn-list-001",
        )
        Transaction.objects.create(
            amount=Decimal("-25.5000"),
            organization=organisation,
            source_type=SourceTypeChoices.ADJUSTMENT,
            created_by=user,
            idempotency_key="txn-list-002",
        )

        client = authenticated_client
        url = reverse("transactions:transaction-list")

        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 2

    def test_filter_transactions_by_source_type(self, authenticated_client, user, organisation):
        """Test filtering transactions by source_type."""
        # Create transactions with unique keys
        txn_external = Transaction.objects.create(
            amount=Decimal("100.0000"),
            organization=organisation,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user,
            idempotency_key="txn-filter-ext-unique-001",
        )
        Transaction.objects.create(
            amount=Decimal("-25.0000"),
            organization=organisation,
            source_type=SourceTypeChoices.ADJUSTMENT,
            created_by=user,
            idempotency_key="txn-filter-adj-unique-001",
        )

        client = authenticated_client
        url = reverse("transactions:transaction-list")

        response = client.get(url, {"source_type": SourceTypeChoices.EXTERNAL_BILLING})
        assert response.status_code == status.HTTP_200_OK
        # Check that our external billing transaction is in results
        result_ids = [r["id"] for r in response.data["results"]]
        assert str(txn_external.id) in result_ids
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] == 1
        assert response.data["results"][0]["source_type"] == SourceTypeChoices.EXTERNAL_BILLING

    def test_export_transactions_csv(self, authenticated_client, user, organisation):
        """Test CSV export of transactions."""
        Transaction.objects.create(
            amount=Decimal("100.0000"),
            organization=organisation,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user,
            idempotency_key="txn-csv-001",
            notes="Purchase",
        )

        client = authenticated_client
        url = reverse("transactions:transaction-list")

        # Use 'export=csv' param (not 'format' which DRF intercepts)
        response = client.get(url, {"export": "csv"})
        assert response.status_code == status.HTTP_200_OK
        assert response["Content-Type"] == "text/csv"
        assert "attachment" in response["Content-Disposition"]

        # Check CSV content
        content = b"".join(response.streaming_content).decode("utf-8")
        assert "transaction_id" in content
        assert "100.0000" in content
        assert "Purchase" in content


@pytest.mark.django_db
class TestBalanceAPI:
    """Test Balance query endpoints."""

    def test_get_organization_balance(self, authenticated_client, user, organisation):
        """Test getting organization balance."""
        # Create transactions
        Transaction.objects.create(
            amount=Decimal("100.0000"),
            organization=organisation,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user,
            idempotency_key="bal-org-001",
        )
        Transaction.objects.create(
            amount=Decimal("-25.0000"),
            organization=organisation,
            source_type=SourceTypeChoices.ADJUSTMENT,
            created_by=user,
            idempotency_key="bal-org-002",
        )

        client = authenticated_client
        url = reverse(
            "transactions:organization-balance", kwargs={"organization_id": str(organisation.id)}
        )

        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert Decimal(response.data["current_balance"]) == Decimal("75.0000")
        assert response.data["transaction_count"] == 2

    def test_get_organization_balance_not_found(self, authenticated_client):
        """Test 404 for non-existent organization."""
        import uuid

        fake_id = uuid.uuid4()

        client = authenticated_client
        url = reverse("transactions:organization-balance", kwargs={"organization_id": str(fake_id)})

        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_project_balance(self, authenticated_client, user, organisation, project):
        """Test getting project balance."""
        # Create transactions for project
        Transaction.objects.create(
            amount=Decimal("50.0000"),
            organization=organisation,
            project=project,
            source_type=SourceTypeChoices.EXTERNAL_BILLING,
            created_by=user,
            idempotency_key="bal-proj-001",
        )
        Transaction.objects.create(
            amount=Decimal("-15.0000"),
            organization=organisation,
            project=project,
            source_type=SourceTypeChoices.ADJUSTMENT,
            created_by=user,
            idempotency_key="bal-proj-002",
        )

        client = authenticated_client
        url = reverse("transactions:project-balance", kwargs={"project_id": str(project.id)})

        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert Decimal(response.data["current_balance"]) == Decimal("35.0000")
        assert response.data["transaction_count"] == 2

    def test_get_project_balance_not_found(self, authenticated_client):
        """Test 404 for non-existent project."""
        fake_id = 999999  # Non-existent integer project ID

        client = authenticated_client
        url = reverse("transactions:project-balance", kwargs={"project_id": fake_id})

        response = client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestBalancePolicyAPI:
    """Test BalancePolicy API endpoints."""

    def test_get_policy_by_organization(self, authenticated_client, organisation):
        """Test getting policy by organization scope."""
        # Create policy
        policy = BalancePolicy.objects.create(
            organization=organisation,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        client = authenticated_client
        url = reverse(
            "transactions:balance-policy-get-by-scope",
            kwargs={"scope_type": "organization", "scope_id": str(organisation.id)},
        )

        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(policy.id)
        assert response.data["allow_negative"] is False
        assert response.data["enforcement_mode"] == EnforcementModeChoices.BLOCK

    def test_get_policy_by_project(self, authenticated_client, organisation, project):
        """Test getting policy by project scope."""
        # Create project-level policy
        policy = BalancePolicy.objects.create(
            organization=organisation,
            project=project,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        client = authenticated_client
        url = reverse(
            "transactions:balance-policy-get-by-scope",
            kwargs={"scope_type": "project", "scope_id": str(project.id)},
        )

        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == str(policy.id)
        assert response.data["allow_negative"] is True

    def test_get_policy_returns_default_if_not_found(self, authenticated_client, organisation):
        """Test getting policy returns default when no explicit policy exists."""
        # No policy created - should return default

        client = authenticated_client
        url = reverse(
            "transactions:balance-policy-get-by-scope",
            kwargs={"scope_type": "organization", "scope_id": str(organisation.id)},
        )

        response = client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # Should return default policy (prepaid, block)
        assert response.data["allow_negative"] is False
        assert response.data["enforcement_mode"] == EnforcementModeChoices.BLOCK

    def test_update_policy(self, authenticated_client, organisation):
        """Test updating a policy."""
        policy = BalancePolicy.objects.create(
            organization=organisation,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )

        client = authenticated_client
        url = reverse("transactions:balance-policy-detail", kwargs={"pk": str(policy.id)})

        data = {
            "allow_negative": True,
            "enforcement_mode": EnforcementModeChoices.WARN,
        }

        response = client.patch(url, data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["allow_negative"] is True
        assert response.data["enforcement_mode"] == EnforcementModeChoices.WARN

        # Verify DB update
        policy.refresh_from_db()
        assert policy.allow_negative is True
        assert policy.enforcement_mode == EnforcementModeChoices.WARN

    def test_get_effective_policy_project_override(self, authenticated_client, organisation, project):
        """Effective policy returns project override when present."""
        BalancePolicy.objects.create(
            organization=organisation,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.BLOCK,
        )
        proj_policy = BalancePolicy.objects.create(
            organization=organisation,
            project=project,
            allow_negative=True,
            enforcement_mode=EnforcementModeChoices.ALLOW,
        )

        client = authenticated_client
        url = reverse("transactions:balance-policy-effective")
        response = client.get(
            url,
            {"organization_id": str(organisation.id), "project_id": str(project.id)},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["source"] == "project"
        assert response.data["policy"]["id"] == str(proj_policy.id)
        assert response.data["policy"]["allow_negative"] is True

    def test_get_effective_policy_org_fallback(self, authenticated_client, organisation, project):
        """Effective policy falls back to organisation policy when no project override exists."""
        org_policy = BalancePolicy.objects.create(
            organization=organisation,
            allow_negative=False,
            enforcement_mode=EnforcementModeChoices.WARN,
        )

        client = authenticated_client
        url = reverse("transactions:balance-policy-effective")
        response = client.get(
            url,
            {"organization_id": str(organisation.id), "project_id": str(project.id)},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["source"] == "organization"
        assert response.data["policy"]["id"] == str(org_policy.id)

    def test_get_effective_policy_default(self, authenticated_client, organisation, project):
        """Effective policy returns default when neither org nor project policy exists."""
        client = authenticated_client
        url = reverse("transactions:balance-policy-effective")
        response = client.get(
            url,
            {"organization_id": str(organisation.id), "project_id": str(project.id)},
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data["source"] == "default"
        assert response.data["policy"]["allow_negative"] is False
        assert response.data["policy"]["enforcement_mode"] == EnforcementModeChoices.BLOCK


@pytest.mark.django_db
class TestMultiTenantIsolation:
    """Test multi-tenant isolation (TODO: integrate with B08 permissions)."""

    def test_transaction_creation_enforces_org_project_match(self, authenticated_client, user, organisation, project):
        """Test that project must belong to organization."""
        from organisations.models import Organisation

        other_org = Organisation.objects.create(name="Other Org", creator=user)

        client = authenticated_client
        url = reverse("transactions:transaction-list")

        data = {
            "amount": "100.0000",
            "organization_id": str(other_org.id),
            "project_id": str(project.id),  # Project belongs to `organisation`, not `other_org`
            "source_type": SourceTypeChoices.EXTERNAL_BILLING,
            "created_by_id": str(user.id),
            "idempotency_key": "txn-isolation-001",
        }

        response = client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "project_id" in response.data

    # TODO: Add tests for B08 permission checks (org/project access)
    # These will be added when B08 integration is complete
