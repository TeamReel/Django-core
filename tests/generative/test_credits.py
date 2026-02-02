"""Credit integration tests for B34 Generative Pipelines.

Tests the complete credit lifecycle:
- Reserve credits on request submission (T037)
- Settle credits on completion with actual cost (T038)
- Refund credits on cancellation (T039)
- Refund credits on permanent failure (T040)
- HTTP 402 on insufficient credits (T041)
- Transaction tracking (T042)

Target: >85% coverage for credit integration.
"""

import pytest
from decimal import Decimal
from unittest.mock import Mock, patch
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status as http_status

from src.generative.models import (
    GenerationTemplate,
    GenerationRequest,
    ProviderChoices,
    RequestStatus,
)
from src.generative.services import (
    GenerationCreditService,
    InsufficientCreditsException,
)
from src.transactions.exceptions import (
    InsufficientBalanceError,
    DuplicateIdempotencyKeyError,
)

User = get_user_model()


# ==============================================================================
# Fixtures
# ==============================================================================


@pytest.fixture
def user(db):
    """Create test user with active organisation membership."""
    from organisations.models import Organisation, Membership

    user = User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpass123",
    )
    org = Organisation.objects.create(
        name="Test Org",
        slug="test-org",
        creator=user,  # Organisation requires creator
    )
    Membership.objects.create(
        user=user,
        organisation=org,
        role="admin",
        is_active=True,
    )
    return user


@pytest.fixture
def organisation(user):
    """Get user's organisation from membership."""
    from organisations.models import Membership

    membership = Membership.objects.filter(user=user, is_active=True).first()
    return membership.organisation


@pytest.fixture
def project(organisation, user):
    """Create test project."""
    from projects.models import Project

    return Project.objects.create(
        organisation=organisation,
        name="Test Project",
        slug="test-project",
        creator=user,  # Project uses 'creator' not 'created_by'
    )


@pytest.fixture
def template(organisation, user):
    """Create test generation template."""
    return GenerationTemplate.objects.create(
        organisation=organisation,
        name="Test Template",
        slug="test-template",
        version="1.0.0",
        created_by=user,
        input_schema={
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
        pipeline_config={
            "provider": ProviderChoices.OPENAI,
            "model": "gpt-4",
            "estimated_cost": 0.10,
        },
        retention_days=30,
    )


@pytest.fixture
def authenticated_client(user):
    """Authenticated API client."""
    client = APIClient()
    client.force_authenticate(user=user)
    return client


# ==============================================================================
# T036: GenerationCreditService Tests
# ==============================================================================


@pytest.mark.django_db
class TestGenerationCreditService:
    """Unit tests for GenerationCreditService wrapper."""

    @patch("src.generative.services.create_transaction")
    def test_reserve_credits_success(self, mock_create_txn, user, organisation, project):
        """Test successful credit reservation."""
        # Mock transaction creation
        mock_txn = Mock(id=123)
        mock_create_txn.return_value = mock_txn

        # Reserve credits
        txn_id = GenerationCreditService.reserve_credits(
            user=user,
            organisation=organisation,
            project=project,
            amount=Decimal("0.10"),
            description="Test generation",
            idempotency_key="test-key-1",
        )

        # Assertions
        assert txn_id == 123
        assert mock_create_txn.called
        call_kwargs = mock_create_txn.call_args[1]
        assert call_kwargs["amount"] == Decimal("-0.10")  # Negative = debit
        assert call_kwargs["organization"] == organisation
        assert call_kwargs["created_by"] == user
        assert call_kwargs["project"] == project
        assert call_kwargs["idempotency_key"] == "test-key-1"

    @patch("src.generative.services.create_transaction")
    def test_reserve_credits_insufficient_balance(
        self, mock_create_txn, user, organisation, project
    ):
        """Test InsufficientCreditsException when balance too low."""
        # Mock InsufficientBalanceError from B11
        mock_create_txn.side_effect = InsufficientBalanceError(
            current_balance=Decimal("0.05"),
            requested_amount=Decimal("0.10"),
            policy="prepaid",
        )

        # Expect InsufficientCreditsException
        with pytest.raises(InsufficientCreditsException) as exc_info:
            GenerationCreditService.reserve_credits(
                user=user,
                organisation=organisation,
                project=project,
                amount=Decimal("0.10"),
                description="Test generation",
                idempotency_key="test-key-2",
            )

        # Check exception details
        assert exc_info.value.current_balance == Decimal("0.05")
        assert exc_info.value.required_amount == Decimal("0.10")

    @patch("src.generative.services.create_transaction")
    def test_reserve_credits_duplicate_idempotency(
        self, mock_create_txn, user, organisation, project
    ):
        """Test DuplicateIdempotencyKeyError re-raised."""
        mock_create_txn.side_effect = DuplicateIdempotencyKeyError(idempotency_key="duplicate-key")

        with pytest.raises(DuplicateIdempotencyKeyError):
            GenerationCreditService.reserve_credits(
                user=user,
                organisation=organisation,
                project=project,
                amount=Decimal("0.10"),
                description="Test generation",
                idempotency_key="duplicate-key",
            )

    def test_reserve_credits_invalid_amount(self, user, organisation, project):
        """Test ValueError for invalid amount."""
        with pytest.raises(ValueError, match="Amount must be positive"):
            GenerationCreditService.reserve_credits(
                user=user,
                organisation=organisation,
                project=project,
                amount=Decimal("0"),
                description="Test generation",
                idempotency_key="test-key-3",
            )

    @patch("src.generative.services.create_transaction")
    def test_settle_credits_exact_match(self, mock_create_txn, user, organisation, project):
        """Test settle with actual == estimated (no refund)."""
        # Create mock reserve transaction
        reserve_txn = Mock(id=123, amount=Decimal("-0.10"), project=project)

        with patch("src.generative.services.Transaction") as mock_txn_model:
            mock_txn_model.objects.get.return_value = reserve_txn

            refund_txn_id = GenerationCreditService.settle_credits(
                transaction_id=123,
                actual_amount=Decimal("0.10"),
                user=user,
                organisation=organisation,
            )

            # No refund transaction created
            assert refund_txn_id is None
            assert not mock_create_txn.called

    @patch("src.generative.services.create_transaction")
    def test_settle_credits_with_refund(self, mock_create_txn, user, organisation, project):
        """Test settle with actual < estimated (refund difference)."""
        # Create mock reserve transaction
        reserve_txn = Mock(id=123, amount=Decimal("-0.10"), project=project)
        mock_refund_txn = Mock(id=456)
        mock_create_txn.return_value = mock_refund_txn

        with patch("src.generative.services.Transaction") as mock_txn_model:
            mock_txn_model.objects.get.return_value = reserve_txn

            refund_txn_id = GenerationCreditService.settle_credits(
                transaction_id=123,
                actual_amount=Decimal("0.06"),
                user=user,
                organisation=organisation,
            )

            # Refund transaction created for difference
            assert refund_txn_id == 456
            assert mock_create_txn.called
            call_kwargs = mock_create_txn.call_args[1]
            assert call_kwargs["amount"] == Decimal("0.04")  # Positive = credit
            assert call_kwargs["idempotency_key"] == "gen-settle-refund-123"

    @patch("src.generative.services.create_transaction")
    def test_settle_credits_underestimated(self, mock_create_txn, user, organisation, project):
        """Test settle with actual > estimated (log warning, no extra charge)."""
        reserve_txn = Mock(id=123, amount=Decimal("-0.10"), project=project)

        with patch("src.generative.services.Transaction") as mock_txn_model:
            mock_txn_model.objects.get.return_value = reserve_txn

            refund_txn_id = GenerationCreditService.settle_credits(
                transaction_id=123,
                actual_amount=Decimal("0.15"),  # Over estimate
                user=user,
                organisation=organisation,
            )

            # No refund, no extra charge
            assert refund_txn_id is None
            assert not mock_create_txn.called

    @patch("src.generative.services.create_transaction")
    def test_refund_credits_success(self, mock_create_txn, user, organisation, project):
        """Test full credit refund on cancel/failure."""
        reserve_txn = Mock(id=123, amount=Decimal("-0.10"), project=project)
        mock_refund_txn = Mock(id=789)
        mock_create_txn.return_value = mock_refund_txn

        with patch("src.generative.services.Transaction") as mock_txn_model:
            mock_txn_model.objects.get.return_value = reserve_txn

            refund_txn_id = GenerationCreditService.refund_credits(
                transaction_id=123,
                reason="Request cancelled",
                user=user,
                organisation=organisation,
            )

            # Full refund transaction created
            assert refund_txn_id == 789
            assert mock_create_txn.called
            call_kwargs = mock_create_txn.call_args[1]
            assert call_kwargs["amount"] == Decimal("0.10")  # Positive = credit
            assert call_kwargs["idempotency_key"] == "gen-refund-123"
            assert "Request cancelled" in call_kwargs["notes"]

    @patch("src.generative.services.create_transaction")
    def test_refund_credits_idempotent(self, mock_create_txn, user, organisation, project):
        """Test refund idempotency (duplicate refund returns existing)."""
        reserve_txn = Mock(id=123, amount=Decimal("-0.10"), project=project)
        existing_refund = Mock(id=999)

        with patch("src.generative.services.Transaction") as mock_txn_model:
            mock_txn_model.objects.get.side_effect = [
                reserve_txn,  # First get for reserve txn
                existing_refund,  # Second get for existing refund
            ]
            mock_create_txn.side_effect = DuplicateIdempotencyKeyError(
                idempotency_key="gen-refund-123"
            )

            refund_txn_id = GenerationCreditService.refund_credits(
                transaction_id=123,
                reason="Request cancelled",
                user=user,
                organisation=organisation,
            )

            # Returns existing refund transaction ID
            assert refund_txn_id == 999


# ==============================================================================
# T037 & T041: API Tests - Reserve Credits & HTTP 402
# ==============================================================================


@pytest.mark.django_db
class TestReserveCreditsonSubmission:
    """Integration tests for credit reservation on request submission."""

    @patch("src.generative.views.GenerationCreditService.reserve_credits")
    @patch("src.generative.tasks.process_generation_request.delay")
    def test_submit_request_reserves_credits(
        self, mock_task, mock_reserve, authenticated_client, template
    ):
        """Test credits reserved when request submitted."""
        mock_reserve.return_value = 123  # Mock transaction ID

        response = authenticated_client.post(
            "/api/v1/generative/requests/",
            {
                "template": template.id,
                "input_data": {"text": "Hello world"},
            },
            format="json",
        )

        assert response.status_code == http_status.HTTP_202_ACCEPTED
        assert "transaction_id" in response.data
        assert response.data["transaction_id"] == 123
        assert mock_reserve.called
        assert mock_task.called

    @patch("src.generative.views.GenerationCreditService.reserve_credits")
    def test_insufficient_credits_returns_402(self, mock_reserve, authenticated_client, template):
        """Test HTTP 402 Payment Required when credits insufficient."""
        mock_reserve.side_effect = InsufficientCreditsException(
            current_balance=Decimal("0.05"),
            required_amount=Decimal("0.10"),
        )

        response = authenticated_client.post(
            "/api/v1/generative/requests/",
            {
                "template": template.id,
                "input_data": {"text": "Hello world"},
            },
            format="json",
        )

        assert response.status_code == http_status.HTTP_402_PAYMENT_REQUIRED
        assert "INSUFFICIENT_CREDITS" in str(response.data)
        assert "current_balance" in str(response.data)
        assert "required_amount" in str(response.data)

    @patch("src.generative.views.GenerationCreditService.reserve_credits")
    @patch("src.generative.tasks.process_generation_request.delay")
    def test_request_stores_transaction_id(
        self, mock_task, mock_reserve, authenticated_client, template
    ):
        """Test transaction_id stored in GenerationRequest."""
        mock_reserve.return_value = 456

        response = authenticated_client.post(
            "/api/v1/generative/requests/",
            {
                "template": template.id,
                "input_data": {"text": "Hello world"},
            },
            format="json",
        )

        assert response.status_code == http_status.HTTP_202_ACCEPTED

        # Verify transaction_id persisted in database
        request = GenerationRequest.objects.get(id=response.data["id"])
        assert request.transaction_id == 456
        assert request.estimated_cost == Decimal("0.10")


# ==============================================================================
# T038: Settle Credits on Completion
# ==============================================================================


@pytest.mark.django_db
class TestSettleCreditsOnCompletion:
    """Integration tests for credit settlement on task completion."""

    @patch("src.generative.services.GenerationCreditService.settle_credits")
    def test_settle_credits_on_success(self, mock_settle, user, organisation, project, template):
        """Test credits settled with actual cost on completion."""
        from src.generative.tasks import _handle_success
        from src.generative.executors.base import ExecutionResult

        # Create request with transaction ID
        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            project=project,
            input_data={"text": "Hello"},
            estimated_cost=Decimal("0.10"),
            transaction_id=123,
            status=RequestStatus.PROCESSING,
        )

        # Mock execution result
        result = ExecutionResult(
            success=True,
            content="Generated content",
            output_type="text",
            actual_cost=Decimal("0.06"),
            metadata={},
        )

        # Handle success (settlement happens here)
        _handle_success(request.id, result=result, duration_seconds=1.5)

        # Verify settlement called
        assert mock_settle.called
        call_kwargs = mock_settle.call_args[1]
        assert call_kwargs["transaction_id"] == 123
        assert call_kwargs["actual_amount"] == Decimal("0.06")

        # Verify request marked completed
        request.refresh_from_db()
        assert request.status == RequestStatus.COMPLETED
        assert request.actual_cost == Decimal("0.06")


# ==============================================================================
# T039: Refund Credits on Cancellation
# ==============================================================================


@pytest.mark.django_db
class TestRefundCreditsOnCancellation:
    """Integration tests for credit refund on request cancellation."""

    @patch("src.generative.services.GenerationCreditService.refund_credits")
    def test_cancel_request_refunds_credits(
        self, mock_refund, authenticated_client, user, project, template
    ):
        """Test credits refunded when request cancelled."""
        # Create pending request with transaction ID
        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            project=project,
            input_data={"text": "Hello"},
            estimated_cost=Decimal("0.10"),
            transaction_id=123,
            status=RequestStatus.PENDING,
        )

        response = authenticated_client.post(f"/api/v1/generative/requests/{request.id}/cancel/")

        assert response.status_code == http_status.HTTP_200_OK
        assert response.data["status"] == "cancelled"
        assert mock_refund.called
        call_kwargs = mock_refund.call_args[1]
        assert call_kwargs["transaction_id"] == 123
        assert "cancelled" in call_kwargs["reason"].lower()

    def test_cannot_cancel_completed_request(self, authenticated_client, user, project, template):
        """Test completed requests cannot be cancelled."""
        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            project=project,
            input_data={"text": "Hello"},
            status=RequestStatus.COMPLETED,
            transaction_id=123,
        )

        response = authenticated_client.post(f"/api/v1/generative/requests/{request.id}/cancel/")

        assert response.status_code == http_status.HTTP_400_BAD_REQUEST
        assert "CANNOT_CANCEL" in str(response.data)


# ==============================================================================
# T040: Refund Credits on Failure
# ==============================================================================


@pytest.mark.django_db
class TestRefundCreditsOnFailure:
    """Integration tests for credit refund on permanent failure."""

    @patch("src.generative.services.GenerationCreditService.refund_credits")
    def test_refund_credits_on_permanent_failure(
        self, mock_refund, user, organisation, project, template
    ):
        """Test credits refunded when request fails permanently."""
        from src.generative.tasks import _handle_failure
        from src.generative.executors.base import ErrorCategory

        # Create request with transaction ID
        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            project=project,
            input_data={"text": "Hello"},
            estimated_cost=Decimal("0.10"),
            transaction_id=123,
            status=RequestStatus.PROCESSING,
        )

        # Handle permanent failure (triggers refund)
        _handle_failure(
            request.id,
            error_message="API error",
            category=ErrorCategory.PERMANENT,
            duration_seconds=0.5,
        )

        # Verify refund called
        assert mock_refund.called
        call_kwargs = mock_refund.call_args[1]
        assert call_kwargs["transaction_id"] == 123
        assert "failed" in call_kwargs["reason"].lower()

        # Verify request marked failed
        request.refresh_from_db()
        assert request.status == RequestStatus.FAILED

    @patch("src.generative.services.GenerationCreditService.refund_credits")
    @patch("src.generative.tasks.process_generation_request.apply_async")
    def test_no_refund_on_transient_failure(
        self, mock_retry, mock_refund, user, organisation, project, template
    ):
        """Test credits NOT refunded on transient failure (retry pending)."""
        from src.generative.tasks import _handle_failure
        from src.generative.executors.base import ErrorCategory

        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            project=project,
            input_data={"text": "Hello"},
            estimated_cost=Decimal("0.10"),
            transaction_id=123,
            status=RequestStatus.PROCESSING,
            retry_count=0,
        )

        # Handle transient failure (schedules retry)
        _handle_failure(
            request.id,
            error_message="Network timeout",
            category=ErrorCategory.TRANSIENT,
            duration_seconds=0.5,
        )

        # Verify refund NOT called (retry scheduled)
        assert not mock_refund.called
        assert mock_retry.called  # Retry scheduled

        # Request still processing
        request.refresh_from_db()
        assert request.status == RequestStatus.PROCESSING
