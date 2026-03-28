"""Test cases for credits models.

Target coverage: CreditsBalance, ProjectCreditsBalance, UserCreditsBalance.
"""

import pytest
from decimal import Decimal
from django.db import IntegrityError

from credits.models import CreditsBalance, ProjectCreditsBalance, UserCreditsBalance


@pytest.mark.django_db
class TestCreditsBalanceModel:
    """Test CreditsBalance model constraints and behavior."""

    def test_create_credits_balance(self, organisation):
        """Credits balance can be created for an organisation."""
        balance = CreditsBalance.objects.create(
            organisation=organisation,
            current_balance=100,
        )
        assert balance.current_balance == 100
        assert balance.organisation == organisation

    def test_default_balance_zero(self, organisation):
        """Default balance is 0."""
        balance = CreditsBalance.objects.create(organisation=organisation)
        assert balance.current_balance == 0

    def test_str_representation(self, organisation):
        """String representation shows org name and balance."""
        balance = CreditsBalance.objects.create(
            organisation=organisation, current_balance=50
        )
        result = str(balance)
        assert organisation.name in result
        assert "50" in result
        assert "credits" in result

    def test_one_balance_per_organisation(self, organisation):
        """OneToOneField ensures only one balance per org."""
        CreditsBalance.objects.create(
            organisation=organisation, current_balance=100
        )
        with pytest.raises(IntegrityError):
            CreditsBalance.objects.create(
                organisation=organisation, current_balance=200
            )

    def test_negative_balance_allowed(self, organisation):
        """Negative balance is technically allowed at model level."""
        balance = CreditsBalance.objects.create(
            organisation=organisation, current_balance=-10
        )
        assert balance.current_balance == -10


@pytest.mark.django_db
class TestProjectCreditsBalanceModel:
    """Test ProjectCreditsBalance model constraints and behavior."""

    def test_create_project_balance(self, project):
        """Project credits balance can be created."""
        balance = ProjectCreditsBalance.objects.create(
            project=project, current_balance=Decimal("250.5000")
        )
        assert balance.current_balance == Decimal("250.5000")
        assert balance.project == project

    def test_default_balance_zero(self, project):
        """Default project balance is 0."""
        balance = ProjectCreditsBalance.objects.create(project=project)
        assert balance.current_balance == Decimal("0")

    def test_str_representation(self, project):
        """String representation shows project and balance."""
        balance = ProjectCreditsBalance.objects.create(
            project=project, current_balance=Decimal("75.0000")
        )
        result = str(balance)
        assert "credits" in result

    def test_one_balance_per_project(self, project):
        """OneToOneField ensures only one balance per project."""
        ProjectCreditsBalance.objects.create(project=project)
        with pytest.raises(IntegrityError):
            ProjectCreditsBalance.objects.create(project=project)


@pytest.mark.django_db
class TestUserCreditsBalanceModel:
    """Test UserCreditsBalance model constraints and behavior."""

    def test_create_user_balance(self, user, organisation):
        """User credits balance can be created."""
        balance = UserCreditsBalance.objects.create(
            organisation=organisation,
            user=user,
            current_balance=Decimal("500.0000"),
        )
        assert balance.current_balance == Decimal("500.0000")
        assert balance.user == user
        assert balance.organisation == organisation

    def test_default_balance_zero(self, user, organisation):
        """Default user balance is 0."""
        balance = UserCreditsBalance.objects.create(
            organisation=organisation, user=user
        )
        assert balance.current_balance == Decimal("0")

    def test_str_representation(self, user, organisation):
        """String representation shows user, org, and balance."""
        balance = UserCreditsBalance.objects.create(
            organisation=organisation,
            user=user,
            current_balance=Decimal("100.0000"),
        )
        result = str(balance)
        assert organisation.name in result
        assert "credits" in result

    def test_unique_per_org_user(self, user, organisation):
        """Only one balance per (org, user) pair."""
        UserCreditsBalance.objects.create(
            organisation=organisation, user=user
        )
        with pytest.raises(IntegrityError):
            UserCreditsBalance.objects.create(
                organisation=organisation, user=user
            )

    def test_same_user_different_orgs(self, user, organisation):
        """Same user can have balances in different organisations."""
        from organisations.models import Organisation

        other_org = Organisation.objects.create(name="Other Org", creator=user)
        UserCreditsBalance.objects.create(
            organisation=organisation, user=user, current_balance=Decimal("100.0000")
        )
        balance2 = UserCreditsBalance.objects.create(
            organisation=other_org, user=user, current_balance=Decimal("200.0000")
        )
        assert balance2.pk is not None
        assert UserCreditsBalance.objects.filter(user=user).count() == 2
