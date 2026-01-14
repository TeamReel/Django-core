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
