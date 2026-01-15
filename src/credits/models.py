"""Credits data models."""

from django.db import models


class CreditsBalance(models.Model):
    """
    Organisation-scoped credit balance.

    All users within the same organisation see the same balance.
    One balance record per organisation.
    """

    organisation = models.OneToOneField(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="credits_balance",
        help_text="Organisation this balance belongs to",
    )
    current_balance = models.IntegerField(
        default=0,
        help_text="Current credit balance for this organisation",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last time balance was updated",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this balance record was created",
    )

    class Meta:
        verbose_name = "Credits Balance"
        verbose_name_plural = "Credits Balances"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.organisation.name}: {self.current_balance} credits"


class ProjectCreditsBalance(models.Model):
    """Project/team-scoped credit balance.

    Mirrors the organisation-scoped CreditsBalance, but at the Project (team)
    level so each team has its own tracked balance.
    """

    project = models.OneToOneField(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="project_credits_balance",
        help_text="Project (team) this balance belongs to",
    )
    current_balance = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=0,
        help_text="Current credit balance for this project/team",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last time balance was updated",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this balance record was created",
    )

    class Meta:
        verbose_name = "Project Credits Balance"
        verbose_name_plural = "Project Credits Balances"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.project}: {self.current_balance} credits"


class UserCreditsBalance(models.Model):
    """User-scoped credit balance within an organisation.

    This supports scenarios where a single user manages multiple teams and pays
    for usage across them (personal subscription / user wallet).
    """

    organisation = models.ForeignKey(
        "organisations.Organisation",
        on_delete=models.CASCADE,
        related_name="user_credits_balances",
        help_text="Organisation this user wallet belongs to",
    )
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="credits_balances",
        help_text="User this wallet belongs to",
    )
    current_balance = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=0,
        help_text="Current credit balance for this user within this organisation",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Last time balance was updated",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When this balance record was created",
    )

    class Meta:
        verbose_name = "User Credits Balance"
        verbose_name_plural = "User Credits Balances"
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["organisation", "user"],
                name="unique_org_user_credits_balance",
            )
        ]
        indexes = [
            models.Index(fields=["organisation", "updated_at"]),
            models.Index(fields=["user", "updated_at"]),
        ]

    def __str__(self):
        return f"{self.user} @ {self.organisation.name}: {self.current_balance} credits"
