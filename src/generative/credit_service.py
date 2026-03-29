"""Service layer for credit management in B34 Generative Pipelines.

This module provides a wrapper around B11 Transactions for generation-specific
credit operations: reserve (on submit), settle (on completion), refund (on cancel/failure).

Architecture:
- Reserve estimated cost → creates negative transaction with status metadata
- Settle actual cost → updates transaction, refunds difference if estimated > actual
- Refund → reverses transaction (creates offsetting credit)

All operations use idempotency keys to prevent duplicate charges.
"""

import logging
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from django.contrib.auth import get_user_model

if TYPE_CHECKING:
    pass

User = get_user_model()

logger = logging.getLogger(__name__)


class InsufficientCreditsException(Exception):
    """Raised when user has insufficient credits for generation request."""

    def __init__(self, current_balance: Decimal, required_amount: Decimal):
        self.current_balance = current_balance
        self.required_amount = required_amount
        super().__init__(f"Insufficient credits: have {current_balance}, need {required_amount}")


class GenerationCreditService:
    """Credit management for AI generation requests."""

    @staticmethod
    def reserve_credits(
        user: User,
        organisation,
        project,
        amount: Decimal,
        description: str,
        idempotency_key: str,
    ) -> int:
        """Reserve credits for generation request.

        Creates a negative transaction (debit) to reserve estimated cost.
        Uses idempotency key to prevent duplicate reservations.

        Args:
            user: User requesting generation
            organisation: Organisation context
            project: Project context
            amount: Estimated cost to reserve (positive value)
            description: Human-readable description
            idempotency_key: Unique key for idempotency (e.g., "gen-req-{request_id}")

        Returns:
            transaction_id: B11 Transaction ID

        Raises:
            InsufficientCreditsException: If user lacks sufficient credits
            DuplicateIdempotencyKeyError: If idempotency_key already used
        """
        from transactions.exceptions import (
            DuplicateIdempotencyKeyError,
            InsufficientBalanceError,
        )
        from transactions.models import SourceTypeChoices
        from transactions.services import create_transaction

        if amount <= 0:
            raise ValueError("Amount must be positive")

        try:
            txn = create_transaction(
                amount=-amount,  # Negative = debit (reserve)
                organization=organisation,
                created_by=user,
                idempotency_key=idempotency_key,
                project=project,
                source_type=SourceTypeChoices.USAGE_EVENT,
                notes=description,
            )
            logger.info(
                "generation.credits.reserved",
                extra={
                    "transaction_id": txn.id,
                    "user_id": user.id,
                    "organisation_id": organisation.id,
                    "project_id": project.id if project else None,
                    "amount": float(amount),
                    "description": description,
                },
            )
            return txn.id

        except InsufficientBalanceError as e:
            # Convert B11 exception to generation-specific exception
            raise InsufficientCreditsException(
                current_balance=e.current_balance,
                required_amount=amount,
            ) from e

        except DuplicateIdempotencyKeyError:
            # Re-raise as-is (idempotency violation is a caller error)
            raise

    @staticmethod
    def settle_credits(
        transaction_id: int,
        actual_amount: Decimal,
        user: User,
        organisation,
    ) -> Optional[int]:
        """Settle reserved credits with actual cost.

        If actual_amount < estimated (reserved amount), creates a refund transaction
        for the difference. If actual_amount == estimated, no-op.

        Args:
            transaction_id: Original reserve transaction ID
            actual_amount: Actual cost incurred (positive value)
            user: User who created the request
            organisation: Organisation context

        Returns:
            refund_transaction_id: ID of refund transaction if created, else None

        Raises:
            ValueError: If transaction not found or invalid
        """
        from transactions.exceptions import DuplicateIdempotencyKeyError
        from transactions.models import SourceTypeChoices, Transaction
        from transactions.services import create_transaction

        if actual_amount < 0:
            raise ValueError("Actual amount must be non-negative")

        try:
            reserve_txn = Transaction.objects.get(id=transaction_id)
        except Transaction.DoesNotExist as e:
            raise ValueError(f"Transaction {transaction_id} not found") from e

        # Reserved amount is stored as negative (debit), so get absolute value
        reserved_amount = abs(reserve_txn.amount)

        # If actual > reserved, log warning but don't charge extra (our fault for underestimate)
        if actual_amount > reserved_amount:
            logger.warning(
                "generation.credits.underestimated",
                extra={
                    "transaction_id": transaction_id,
                    "reserved_amount": float(reserved_amount),
                    "actual_amount": float(actual_amount),
                    "difference": float(actual_amount - reserved_amount),
                },
            )
            return None

        # If actual == reserved, perfect estimate
        if actual_amount == reserved_amount:
            logger.info(
                "generation.credits.settled_exact",
                extra={
                    "transaction_id": transaction_id,
                    "amount": float(actual_amount),
                },
            )
            return None

        # If actual < reserved, refund the difference
        refund_amount = reserved_amount - actual_amount
        refund_idempotency_key = f"gen-settle-refund-{transaction_id}"

        try:
            refund_txn = create_transaction(
                amount=refund_amount,  # Positive = credit (refund)
                organization=organisation,
                created_by=user,
                idempotency_key=refund_idempotency_key,
                project=reserve_txn.project,
                source_type=SourceTypeChoices.ADJUSTMENT,
                external_reference_id=str(transaction_id),
                notes=f"Refund overestimate: reserved {reserved_amount}, actual {actual_amount}",
            )
            logger.info(
                "generation.credits.settled_with_refund",
                extra={
                    "reserve_transaction_id": transaction_id,
                    "refund_transaction_id": refund_txn.id,
                    "reserved_amount": float(reserved_amount),
                    "actual_amount": float(actual_amount),
                    "refund_amount": float(refund_amount),
                },
            )
            return refund_txn.id

        except DuplicateIdempotencyKeyError:
            # Settlement already processed (idempotent)
            logger.info(
                "generation.credits.settle_idempotent",
                extra={
                    "transaction_id": transaction_id,
                    "idempotency_key": refund_idempotency_key,
                },
            )
            # Return existing refund transaction ID
            existing_refund = Transaction.objects.get(idempotency_key=refund_idempotency_key)
            return existing_refund.id

    @staticmethod
    def refund_credits(
        transaction_id: int,
        reason: str,
        user: User,
        organisation,
    ) -> int:
        """Refund reserved credits (full reversal).

        Creates an offsetting credit transaction to fully reverse the reservation.
        Used when request is cancelled or fails permanently.

        Args:
            transaction_id: Original reserve transaction ID
            reason: Human-readable refund reason
            user: User who created the request
            organisation: Organisation context

        Returns:
            refund_transaction_id: ID of refund transaction

        Raises:
            ValueError: If transaction not found
            DuplicateIdempotencyKeyError: If refund already processed (idempotent)
        """
        from transactions.exceptions import DuplicateIdempotencyKeyError
        from transactions.models import SourceTypeChoices, Transaction
        from transactions.services import create_transaction

        try:
            reserve_txn = Transaction.objects.get(id=transaction_id)
        except Transaction.DoesNotExist as e:
            raise ValueError(f"Transaction {transaction_id} not found") from e

        # Reserved amount is negative (debit), refund is positive (credit)
        refund_amount = abs(reserve_txn.amount)
        refund_idempotency_key = f"gen-refund-{transaction_id}"

        try:
            refund_txn = create_transaction(
                amount=refund_amount,  # Positive = credit (refund)
                organization=organisation,
                created_by=user,
                idempotency_key=refund_idempotency_key,
                project=reserve_txn.project,
                source_type=SourceTypeChoices.ADJUSTMENT,
                external_reference_id=str(transaction_id),
                notes=f"Refund: {reason}",
            )
            logger.info(
                "generation.credits.refunded",
                extra={
                    "reserve_transaction_id": transaction_id,
                    "refund_transaction_id": refund_txn.id,
                    "amount": float(refund_amount),
                    "reason": reason,
                },
            )
            return refund_txn.id

        except DuplicateIdempotencyKeyError:
            # Refund already processed (idempotent)
            logger.info(
                "generation.credits.refund_idempotent",
                extra={
                    "transaction_id": transaction_id,
                    "idempotency_key": refund_idempotency_key,
                },
            )
            # Return existing refund transaction ID
            existing_refund = Transaction.objects.get(idempotency_key=refund_idempotency_key)
            return existing_refund.id
