"""Data models for the transactions app."""

import uuid
from decimal import Decimal

from accounts.models import User
from django.db import models
from organisations.models import Organisation
from projects.models import Project

from .managers import TransactionManager, UsageEventManager


class SourceTypeChoices(models.TextChoices):
    """Transaction source type choices."""

    USAGE_EVENT = "usage_event", "Usage Event"
    ADJUSTMENT = "adjustment", "Adjustment"
    EXTERNAL_BILLING = "external_billing", "External Billing"


class EnforcementModeChoices(models.TextChoices):
    """Balance policy enforcement mode choices."""

    BLOCK = "block", "Block"
    WARN = "warn", "Warn"
    ALLOW = "allow", "Allow"


class WalletScopeChoices(models.TextChoices):
    """Which wallet this transaction affects."""

    ORGANIZATION = "organization", "Organization"
    PROJECT = "project", "Project"
    USER = "user", "User"


class UsageEvent(models.Model):
    """Immutable record of a billable action.

    Stores usage events that may later be converted into transactions.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=100, db_index=True)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="usage_events")
    organization = models.ForeignKey(
        Organisation, on_delete=models.PROTECT, related_name="usage_events"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.PROTECT,
        related_name="usage_events",
        null=True,
        blank=True,
    )
    metadata = models.JSONField(default=dict, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    idempotency_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UsageEventManager()

    class Meta:
        """Model metadata."""

        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["organization", "-timestamp"], name="usevt_org_ts_idx"),
            models.Index(
                fields=["project", "-timestamp"],
                name="usevt_proj_ts_idx",
                condition=models.Q(project__isnull=False),
            ),
            models.Index(fields=["event_type", "-timestamp"], name="usevt_type_ts_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["idempotency_key"],
                name="usevt_idem_unique",
                condition=models.Q(idempotency_key__isnull=False),
            ),
        ]

    def __str__(self) -> str:
        """Return string representation."""
        return f"{self.event_type} - {self.organization} - {self.timestamp}"


class Transaction(models.Model):
    """Financial ledger entry (single-ledger with signed amounts).

    Immutable record of balance changes. Positive amounts increase balance,
    negative amounts decrease balance.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    amount = models.DecimalField(max_digits=14, decimal_places=4)
    organization = models.ForeignKey(
        Organisation, on_delete=models.PROTECT, related_name="transactions"
    )
    wallet_scope = models.CharField(
        max_length=20,
        choices=WalletScopeChoices.choices,
        db_index=True,
        default=WalletScopeChoices.ORGANIZATION,
        help_text="Which wallet balance this transaction affects",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.PROTECT,
        related_name="transactions",
        null=True,
        blank=True,
    )
    charged_user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="charged_transactions",
        null=True,
        blank=True,
        help_text="If wallet_scope=user, the user whose balance is charged/credited",
    )
    source_type = models.CharField(max_length=50, choices=SourceTypeChoices.choices, db_index=True)
    usage_event = models.ForeignKey(
        "UsageEvent",
        on_delete=models.PROTECT,
        related_name="transactions",
        null=True,
        blank=True,
    )
    external_reference_id = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    created_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="created_transactions"
    )
    idempotency_key = models.CharField(max_length=255, unique=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = TransactionManager()

    class Meta:
        """Model metadata."""

        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["organization", "-timestamp"], name="txn_org_ts_idx"),
            models.Index(
                fields=["project", "-timestamp"],
                name="txn_proj_ts_idx",
                condition=models.Q(project__isnull=False),
            ),
            models.Index(
                fields=["charged_user", "-timestamp"],
                name="txn_user_ts_idx",
                condition=models.Q(charged_user__isnull=False),
            ),
            models.Index(fields=["source_type", "-timestamp"], name="txn_src_ts_idx"),
            models.Index(fields=["wallet_scope", "-timestamp"], name="txn_scope_ts_idx"),
        ]
        constraints = [
            models.CheckConstraint(check=~models.Q(amount=Decimal("0")), name="txn_amount_nonzero"),
            models.CheckConstraint(
                check=(
                    models.Q(
                        source_type=SourceTypeChoices.USAGE_EVENT,
                        usage_event__isnull=False,
                    )
                    | ~models.Q(source_type=SourceTypeChoices.USAGE_EVENT)
                ),
                name="txn_usage_evt_src_match",
            ),
        ]

    def __str__(self) -> str:
        """Return string representation."""
        return f"{self.amount} - {self.organization} - {self.timestamp}"

    def save(self, *args, **kwargs):
        # Normalize wallet scope for legacy/test call sites that create transactions
        # directly without passing wallet_scope.
        if self.charged_user_id is not None and self.wallet_scope != WalletScopeChoices.USER:
            self.wallet_scope = WalletScopeChoices.USER
        elif (
            self.charged_user_id is None
            and self.project_id is not None
            and self.wallet_scope == WalletScopeChoices.ORGANIZATION
        ):
            self.wallet_scope = WalletScopeChoices.PROJECT
        elif self.project_id is None and self.wallet_scope == WalletScopeChoices.PROJECT:
            self.wallet_scope = WalletScopeChoices.ORGANIZATION

        return super().save(*args, **kwargs)


class BalancePolicy(models.Model):
    """Configuration for billing policy enforcement (prepaid vs postpaid)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name="balance_policies"
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="balance_policies",
        null=True,
        blank=True,
    )
    allow_negative = models.BooleanField(
        default=False,
        help_text="Can balance go negative? False=prepaid, True=postpaid",
    )
    warn_threshold = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Balance level to trigger warnings",
    )
    enforcement_mode = models.CharField(
        max_length=20,
        choices=EnforcementModeChoices.choices,
        default=EnforcementModeChoices.BLOCK,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        """Model metadata."""

        verbose_name_plural = "Balance policies"
        indexes = [
            models.Index(
                fields=["organization"],
                name="balpol_org_idx",
                condition=models.Q(project__isnull=True),
            ),
            models.Index(
                fields=["project"],
                name="balpol_proj_idx",
                condition=models.Q(project__isnull=False),
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "project"], name="balpol_org_proj_unique"
            ),
        ]

    def __str__(self) -> str:
        """Return string representation."""
        scope = f"Project {self.project}" if self.project else f"Org {self.organization}"
        return f"Policy for {scope}: {self.enforcement_mode}"
