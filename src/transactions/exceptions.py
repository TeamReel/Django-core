"""
Custom exceptions for the transactions app.

These exceptions provide domain-specific error handling for business logic
violations related to balance policies and transaction processing.
"""

from decimal import Decimal


class InsufficientBalanceError(Exception):
    """
    Raised when a transaction would violate a balance policy.

    Typically occurs when attempting to debit more credits than available
    in a prepaid (allow_negative=False) enforcement context.
    """

    def __init__(
        self,
        current_balance: Decimal,
        requested_amount: Decimal,
        policy: str,
    ):
        self.current_balance = current_balance
        self.requested_amount = requested_amount
        self.policy = policy
        super().__init__(
            f"Insufficient balance: current={current_balance}, "
            f"requested={requested_amount}, policy={policy}"
        )


class PolicyViolationError(Exception):
    """
    Raised when a transaction violates a balance policy in a non-blocking way.

    Used for warnings and threshold violations that don't prevent the transaction
    but should be logged or reported.
    """


class DuplicateIdempotencyKeyError(Exception):
    """
    Raised when attempting to create a transaction with an idempotency key
    that already exists.

    This prevents duplicate processing of the same transaction request.
    """

    def __init__(self, idempotency_key: str):
        self.idempotency_key = idempotency_key
        super().__init__(f"Transaction with idempotency key '{idempotency_key}' already exists")
