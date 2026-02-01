---
work_package_id: "WP05"
subtasks:
  - "T036"
  - "T037"
  - "T038"
  - "T039"
  - "T040"
  - "T041"
  - "T042"
  - "T043"
title: "Credit Management Integration"
phase: "Phase 3 - Integrations"
lane: "planned"
assignee: ""
agent: ""
shell_pid: ""
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-01T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP05 – Credit Management Integration

## Review Feedback

*[Empty - populated by `/spec-kitty.review` if work needs changes]*

---

## Objectives & Success Criteria

**Outcomes**:
1. B11 Credits integration for request submission
2. Reserve credits on submit, settle on completion
3. Refund credits on cancellation or failure
4. Insufficient credits return HTTP 402 Payment Required
5. Credit transaction stored in GenerationRequest.transaction_id
6. Credit tests achieve >85% coverage

**Success Metrics**:
- Submit request → credits reserved
- Complete request → credits settled with actual cost
- Cancel request → credits refunded
- Insufficient credits → HTTP 402 with error message

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (models exist)
- WP02 complete (API exists)
- WP04 complete (async task exists)
- B11 Credits module exists (CreditService, Transaction model)

**Supporting Documents**:
- [spec.md](../spec.md) - FR-021 to FR-023 (credit requirements)
- B11 Credits module documentation

**Architectural Decisions**:
- Reserve estimated cost on submit (prevents over-spending)
- Settle actual cost on completion (refund difference if estimated > actual)
- Refund reserved credits on cancel or failure

**Constraints**:
- Atomic credit operations (prevent race conditions)
- Transaction rollback on failure (reserve + create request = atomic)
- Credit balance must be non-negative

---

## Subtasks & Detailed Guidance

### Subtask T036 – Add CreditService integration

**Purpose**: Integrate B11 CreditService for reserve/settle/refund operations

**Steps**:
1. Import CreditService:
   ```python
   # src/generative/services.py
   from src.credits.services import CreditService
   from src.credits.models import Transaction
   from django.db import transaction as db_transaction

   class GenerationCreditService:
       """Credit management for generation requests."""

       @staticmethod
       def reserve_credits(user, amount: float, description: str) -> int:
           """Reserve credits for generation request.

           Returns:
               transaction_id

           Raises:
               InsufficientCreditsException
           """
           txn = CreditService.reserve_credits(
               user=user,
               amount=amount,
               description=description,
               category='generation'
           )
           return txn.id

       @staticmethod
       def settle_credits(transaction_id: int, actual_amount: float):
           """Settle reserved credits with actual cost."""
           CreditService.settle_transaction(
               transaction_id=transaction_id,
               actual_amount=actual_amount
           )

       @staticmethod
       def refund_credits(transaction_id: int, reason: str):
           """Refund reserved credits."""
           CreditService.refund_transaction(
               transaction_id=transaction_id,
               reason=reason
           )
   ```

**Files**: `src/generative/services.py`

**Parallel?**: No (core integration)

**Notes**: Wrap CreditService for generation-specific logic

---

### Subtask T037 – Reserve credits on request submission

**Purpose**: Reserve estimated cost when request submitted

**Steps**:
1. Update `GenerationRequestViewSet.perform_create()`:
   ```python
   from django.db import transaction
   from src.credits.exceptions import InsufficientCreditsException
   from rest_framework.exceptions import PaymentRequired
   from .services import GenerationCreditService

   def perform_create(self, serializer):
       """Submit request and reserve credits."""
       template = serializer.validated_data['template']
       estimated_cost = template.pipeline_config.get('estimated_cost', 0.0)

       try:
           with transaction.atomic():
               # Reserve credits
               txn_id = GenerationCreditService.reserve_credits(
                   user=self.request.user,
                   amount=estimated_cost,
                   description=f"Generation: {template.name}"
               )

               # Create request
               request = serializer.save(
                   requester=self.request.user,
                   estimated_cost=estimated_cost,
                   transaction_id=txn_id
               )

               # Dispatch async processing
               from src.generative.tasks import process_generation_request
               process_generation_request.delay(request.id)

       except InsufficientCreditsException as e:
           raise PaymentRequired(detail=str(e))
   ```

**Files**: `src/generative/views.py`

**Parallel?**: After T036

**Notes**:
- Use `transaction.atomic()` for reserve + create atomicity
- Return HTTP 402 on insufficient credits

---

### Subtask T038 – Settle credits on completion

**Purpose**: Settle with actual cost when request completes

**Steps**:
1. Update `process_generation_request` task:
   ```python
   # In tasks.py, after successful execution
   if result.success:
       # Save output
       GenerationOutput.objects.create(...)

       # Settle credits with actual cost
       if request.transaction_id:
           GenerationCreditService.settle_credits(
               transaction_id=request.transaction_id,
               actual_amount=result.cost
           )

       request.status = 'completed'
       request.actual_cost = result.cost
       request.save()
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T036, T037

**Notes**: Settle refunds difference if estimated > actual

---

### Subtask T039 – Refund credits on cancellation

**Purpose**: Refund reserved credits when request cancelled

**Steps**:
1. Update `GenerationRequestViewSet.cancel()`:
   ```python
   @action(detail=True, methods=['post'])
   def cancel(self, request, pk=None):
       """Cancel request and refund credits."""
       obj = self.get_object()

       if obj.status not in ['pending', 'processing']:
           return Response(
               {'error': 'Request cannot be cancelled'},
               status=status.HTTP_400_BAD_REQUEST
           )

       with transaction.atomic():
           # Refund credits
           if obj.transaction_id:
               GenerationCreditService.refund_credits(
                   transaction_id=obj.transaction_id,
                   reason='Request cancelled by user'
               )

           # Update status
           obj.status = 'cancelled'
           obj.completed_at = timezone.now()
           obj.save()

       return Response({'status': 'cancelled'})
   ```

**Files**: `src/generative/views.py`

**Parallel?**: After T036, T037

**Notes**: Atomic refund + status update

---

### Subtask T040 – Refund credits on failure

**Purpose**: Refund reserved credits when request fails

**Steps**:
1. Update `_handle_error()` in `tasks.py`:
   ```python
   def _handle_error(self, request, result):
       """Handle error and refund credits on permanent failure."""
       # ... existing retry logic

       if request.status == 'failed':  # Permanent failure or max retries
           # Refund credits
           if request.transaction_id:
               GenerationCreditService.refund_credits(
                   transaction_id=request.transaction_id,
                   reason=f'Request failed: {result.error}'
               )
   ```

**Files**: `src/generative/tasks.py`

**Parallel?**: After T036, T038

**Notes**: Refund only on permanent failure (not during retries)

---

### Subtask T041 – Add insufficient credits handling

**Purpose**: Return HTTP 402 with error message when credits insufficient

**Steps**:
1. Create custom exception:
   ```python
   # src/generative/exceptions.py
   from rest_framework.exceptions import APIException

   class PaymentRequired(APIException):
       status_code = 402
       default_detail = 'Insufficient credits'
       default_code = 'payment_required'
   ```

2. Use in ViewSet:
   ```python
   from .exceptions import PaymentRequired
   from src.credits.exceptions import InsufficientCreditsException

   try:
       txn_id = GenerationCreditService.reserve_credits(...)
   except InsufficientCreditsException as e:
       raise PaymentRequired(detail=f"Insufficient credits: {e}")
   ```

**Files**: `src/generative/exceptions.py`, `src/generative/views.py`

**Parallel?**: After T037

**Notes**: HTTP 402 standard status for payment-related errors

---

### Subtask T042 – Add transaction tracking

**Purpose**: Store transaction ID in GenerationRequest for audit trail

**Steps**:
1. Already implemented in T037:
   ```python
   request = serializer.save(
       transaction_id=txn_id  # Store B11 Transaction FK
   )
   ```

2. Add to serializer:
   ```python
   class GenerationRequestSerializer(serializers.ModelSerializer):
       transaction = serializers.IntegerField(source='transaction_id', read_only=True)

       class Meta:
           fields = [..., 'transaction_id', 'estimated_cost', 'actual_cost']
   ```

**Files**: `src/generative/models.py`, `src/generative/serializers.py`

**Parallel?**: After T036

**Notes**: Transaction ID links to B11 Transaction for audit

---

### Subtask T043 – Write credit integration tests

**Purpose**: Achieve >85% credit integration test coverage

**Steps**:
1. Create `tests/generative/test_credits.py`:
   ```python
   import pytest
   from unittest.mock import Mock, patch
   from rest_framework.test import APIClient
   from src.generative.services import GenerationCreditService
   from src.credits.exceptions import InsufficientCreditsException

   @pytest.mark.django_db
   class TestCreditIntegration:
       @patch('src.generative.services.CreditService.reserve_credits')
       def test_reserve_credits_on_submit(self, mock_reserve, authenticated_client, template):
           """Test credits reserved when request submitted."""
           mock_reserve.return_value = Mock(id=123)

           response = authenticated_client.post(
               '/api/v1/generative/requests/',
               {'template': template.id, 'input_data': {'text': 'Hello'}},
               format='json'
           )

           assert response.status_code == 202
           assert mock_reserve.called
           assert response.data['transaction_id'] == 123

       @patch('src.generative.services.CreditService.reserve_credits')
       def test_insufficient_credits_returns_402(self, mock_reserve, authenticated_client, template):
           """Test HTTP 402 when credits insufficient."""
           mock_reserve.side_effect = InsufficientCreditsException("Insufficient credits")

           response = authenticated_client.post(
               '/api/v1/generative/requests/',
               {'template': template.id, 'input_data': {'text': 'Hello'}},
               format='json'
           )

           assert response.status_code == 402
           assert 'Insufficient credits' in response.data['detail']

       @patch('src.generative.services.CreditService.settle_transaction')
       def test_settle_credits_on_completion(self, mock_settle, request):
           """Test credits settled with actual cost."""
           request.transaction_id = 123
           request.save()

           # Simulate task completion
           GenerationCreditService.settle_credits(
               transaction_id=123,
               actual_amount=0.05
           )

           assert mock_settle.called
           mock_settle.assert_called_with(transaction_id=123, actual_amount=0.05)

       @patch('src.generative.services.CreditService.refund_transaction')
       def test_refund_credits_on_cancel(self, mock_refund, authenticated_client, request):
           """Test credits refunded when request cancelled."""
           request.transaction_id = 123
           request.save()

           response = authenticated_client.post(
               f'/api/v1/generative/requests/{request.id}/cancel/'
           )

           assert response.status_code == 200
           assert mock_refund.called
           mock_refund.assert_called_with(
               transaction_id=123,
               reason='Request cancelled by user'
           )

       @patch('src.generative.services.CreditService.refund_transaction')
       def test_refund_credits_on_failure(self, mock_refund, request):
           """Test credits refunded when request fails."""
           request.transaction_id = 123
           request.status = 'failed'
           request.save()

           GenerationCreditService.refund_credits(
               transaction_id=123,
               reason='Request failed'
           )

           assert mock_refund.called
   ```

2. Run tests: `pytest tests/generative/test_credits.py -v`

**Files**: `tests/generative/test_credits.py`

**Parallel?**: After T036-T042

**Notes**: Mock CreditService to avoid real credit transactions in tests

---

## Definition of Done Checklist

- [x] CreditService integration layer created
- [x] Reserve credits on request submission
- [x] Settle credits with actual cost on completion
- [x] Refund credits on cancellation
- [x] Refund credits on failure (permanent)
- [x] HTTP 402 returned for insufficient credits
- [x] Transaction ID tracked in GenerationRequest
- [x] Credit integration tests written with >85% coverage
- [x] All tests pass: `pytest tests/generative/test_credits.py`

---

## Review Guidance

**Acceptance Checkpoints**:
1. Submit request with sufficient credits → verify reserve transaction created
2. Complete request → verify settle transaction with actual cost
3. Cancel request → verify refund transaction
4. Submit with insufficient credits → verify HTTP 402
5. Check B11 Transaction log → verify all credit operations logged

**Critical Validations**:
- Credits reserved on submit (atomic with request creation)
- Actual cost settled on completion (refund difference)
- Credits refunded on cancel or failure
- HTTP 402 prevents request submission when credits low

---

## Activity Log

- 2026-02-01T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
