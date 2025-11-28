"""
Service layer for transactions and balance management.

This module provides business logic functions that coordinate between models,
implement caching strategies, enforce policies, and manage transactional integrity.

Service Layer Pattern:
- Pure functions that call models/managers
- Coordinate database transactions with SELECT FOR UPDATE locking
- Implement Redis caching with invalidation
- Enforce balance policies (prepaid/postpaid)
- Raise domain-specific exceptions

Cache Strategy:
- Keys: balance:org:{id}, balance:proj:{id}
- TTL: 60 seconds
- Invalidation: Only on Transaction.save() success (NOT on UsageEvent)
"""

from decimal import Decimal
from typing import Optional

from django.core.cache import cache
from django.db import transaction as db_transaction

from .exceptions import DuplicateIdempotencyKeyError, InsufficientBalanceError
from .models import (
    BalancePolicy,
    EnforcementModeChoices,
    SourceTypeChoices,
    Transaction,
    UsageEvent,
)


def record_usage_event(
    event_type: str,
    user,
    organization,
    project=None,
    metadata: Optional[dict] = None,
    idempotency_key: Optional[str] = None,
) -> UsageEvent:
    """
    Record a billable usage event with optional idempotency.

    Args:
        event_type: Category of usage (e.g., 'api_call', 'storage_gb_hour')
        user: User who triggered the event
        organization: Organization context
        project: Optional project context
        metadata: Additional structured data about the event
        idempotency_key: Optional key to prevent duplicate event recording

    Returns:
        UsageEvent: The created or existing event (if idempotent)

    Example:
        >>> event = record_usage_event(
        ...     event_type='api_call',
        ...     user=request.user,
        ...     organization=org,
        ...     project=proj,
        ...     metadata={'endpoint': '/api/v1/data', 'method': 'POST'},
        ...     idempotency_key='req-12345'
        ... )
    """
    # Check for existing event with same idempotency key
    if idempotency_key:
        existing = UsageEvent.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            return existing  # Idempotent return

    # Create new usage event
    event = UsageEvent.objects.create(
        event_type=event_type,
        user=user,
        organization=organization,
        project=project,
        metadata=metadata or {},
        idempotency_key=idempotency_key,
    )
    return event


def create_transaction(
    amount: Decimal,
    organization,
    created_by,
    idempotency_key: str,
    project=None,
    source_type: str = SourceTypeChoices.ADJUSTMENT,
    usage_event=None,
    external_reference_id: Optional[str] = None,
    notes: str = "",
) -> Transaction:
    """
    Create a financial transaction with policy enforcement and pessimistic locking.

    This function:
    1. Checks idempotency to prevent duplicate transactions
    2. Acquires a database lock (SELECT FOR UPDATE) on the organization/project
    3. Computes current balance
    4. Checks balance policy violations
    5. Creates the transaction if policy allows
    6. Invalidates balance cache

    Args:
        amount: Transaction amount (positive=credit, negative=debit)
        organization: Organization context
        created_by: User creating the transaction
        idempotency_key: Required unique key to prevent duplicates
        project: Optional project context
        source_type: Type of transaction (USAGE, PURCHASE, ADJUSTMENT, etc.)
        usage_event: Optional linked usage event
        external_reference_id: Optional external system reference
        notes: Human-readable description

    Returns:
        Transaction: The created transaction

    Raises:
        DuplicateIdempotencyKeyError: If idempotency_key already exists
        InsufficientBalanceError: If transaction violates balance policy

    Example:
        >>> txn = create_transaction(
        ...     amount=Decimal('-10.00'),
        ...     organization=org,
        ...     created_by=user,
        ...     idempotency_key='txn-67890',
        ...     project=proj,
        ...     source_type=SourceTypeChoices.USAGE,
        ...     usage_event=event,
        ...     notes='Deduct for API calls'
        ... )
    """
    # Check idempotency
    existing = Transaction.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        raise DuplicateIdempotencyKeyError(idempotency_key=idempotency_key)

    with db_transaction.atomic():
        # Acquire pessimistic lock on organization or project
        # This prevents concurrent transactions from causing race conditions
        if project:
            lock_target = project
            lock_model = lock_target.__class__
            lock_model.objects.select_for_update().get(pk=lock_target.pk)
        else:
            lock_target = organization
            lock_model = lock_target.__class__
            lock_model.objects.select_for_update().get(pk=lock_target.pk)

        # Get current balance (bypass cache to ensure consistency)
        if project:
            current_balance_data = get_project_balance(project.id, use_cache=False)
        else:
            current_balance_data = get_organization_balance(organization.id, use_cache=False)
        current_balance = current_balance_data["current_balance"]

        # Check policy violation
        is_violation, violation_type = check_policy_violation(
            organization, project, amount, current_balance
        )

        if is_violation and violation_type == "block":
            raise InsufficientBalanceError(
                current_balance=current_balance,
                requested_amount=abs(amount),
                policy="prepaid_only",
            )

        # Create transaction
        txn = Transaction.objects.create(
            amount=amount,
            organization=organization,
            project=project,
            source_type=source_type,
            usage_event=usage_event,
            external_reference_id=external_reference_id,
            created_by=created_by,
            idempotency_key=idempotency_key,
            notes=notes,
        )

        # Invalidate balance cache
        invalidate_balance_cache(organization.id, project.id if project else None)

        return txn


def get_organization_balance(organization_id: int, use_cache: bool = True) -> dict:
    """
    Compute organization balance with optional Redis caching.

    Args:
        organization_id: ID of the organization
        use_cache: Whether to use Redis cache (default True)

    Returns:
        dict: Balance data with keys:
            - current_balance: Decimal
            - total_positive_amounts: Decimal (sum of credits)
            - total_negative_amounts: Decimal (sum of debits)
            - transaction_count: int

    Example:
        >>> balance = get_organization_balance(org_id=123)
        >>> print(balance['current_balance'])
        Decimal('450.75')
    """
    cache_key = f"balance:org:{organization_id}"

    # Try to get from cache
    if use_cache:
        cached = cache.get(cache_key)
        if cached:
            return cached

    # Compute balance from database
    balance_data = Transaction.objects.for_organization(organization_id).compute_balance()

    # Store in cache with 60s TTL
    if use_cache:
        cache.set(cache_key, balance_data, timeout=60)

    return balance_data


def get_project_balance(project_id: int, use_cache: bool = True) -> dict:
    """
    Compute project balance with optional Redis caching.

    Args:
        project_id: ID of the project
        use_cache: Whether to use Redis cache (default True)

    Returns:
        dict: Balance data with keys:
            - current_balance: Decimal
            - total_positive_amounts: Decimal (sum of credits)
            - total_negative_amounts: Decimal (sum of debits)
            - transaction_count: int

    Example:
        >>> balance = get_project_balance(project_id=456)
        >>> print(balance['current_balance'])
        Decimal('100.00')
    """
    cache_key = f"balance:proj:{project_id}"

    # Try to get from cache
    if use_cache:
        cached = cache.get(cache_key)
        if cached:
            return cached

    # Compute balance from database
    balance_data = Transaction.objects.for_project(project_id).compute_balance()

    # Store in cache with 60s TTL
    if use_cache:
        cache.set(cache_key, balance_data, timeout=60)

    return balance_data


def get_policy(organization, project=None) -> BalancePolicy:
    """
    Get balance policy for organization/project with fallback to defaults.

    Resolution order:
    1. Project-specific policy (if project provided)
    2. Organization-level policy
    3. Default policy (prepaid, block mode)

    Args:
        organization: Organization instance
        project: Optional project instance

    Returns:
        BalancePolicy: The applicable policy (may be unsaved default)

    Example:
        >>> policy = get_policy(org, project=proj)
        >>> if not policy.allow_negative:
        ...     print("Prepaid mode - must maintain positive balance")
    """
    # Try project-specific policy first
    if project:
        policy = BalancePolicy.objects.filter(organization=organization, project=project).first()
        if policy:
            return policy

    # Try organization-level policy
    policy = BalancePolicy.objects.filter(organization=organization, project__isnull=True).first()
    if policy:
        return policy

    # Return default policy (not saved to database)
    return BalancePolicy(
        organization=organization,
        allow_negative=False,
        enforcement_mode=EnforcementModeChoices.BLOCK,
    )


def check_policy_violation(
    organization, project, proposed_amount: Decimal, current_balance: Decimal
) -> tuple[bool, Optional[str]]:
    """
    Check if a proposed transaction would violate the balance policy.

    Args:
        organization: Organization instance
        project: Optional project instance
        proposed_amount: Transaction amount to check
        current_balance: Current balance before transaction

    Returns:
        tuple: (is_violation: bool, violation_type: Optional[str])
            violation_type can be: 'block', 'warn', 'warn_threshold', or None

    Example:
        >>> is_violation, vtype = check_policy_violation(
        ...     org, proj, Decimal('-500'), Decimal('100')
        ... )
        >>> if is_violation and vtype == 'block':
        ...     raise InsufficientBalanceError(...)
    """
    policy = get_policy(organization, project)
    hypothetical_balance = current_balance + proposed_amount

    # Check if transaction would create negative balance in prepaid mode
    if hypothetical_balance < 0 and not policy.allow_negative:
        if policy.enforcement_mode == EnforcementModeChoices.BLOCK:
            return (True, "block")
        elif policy.enforcement_mode == EnforcementModeChoices.WARN:
            return (True, "warn")

    # Check if balance would fall below warning threshold
    if policy.warn_threshold is not None and hypothetical_balance < policy.warn_threshold:
        return (True, "warn_threshold")

    return (False, None)


def invalidate_balance_cache(organization_id: int, project_id: Optional[int] = None) -> None:
    """
    Invalidate Redis cache keys for organization and/or project balances.

    This should be called after any Transaction is created to ensure
    subsequent balance queries reflect the updated state.

    Args:
        organization_id: ID of the organization
        project_id: Optional ID of the project

    Example:
        >>> invalidate_balance_cache(org_id=123, project_id=456)
    """
    cache.delete(f"balance:org:{organization_id}")
    if project_id:
        cache.delete(f"balance:proj:{project_id}")
