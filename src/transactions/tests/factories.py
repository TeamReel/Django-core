"""Factory Boy fixtures for transaction models.

Provides test data factories for UsageEvent, Transaction, and BalancePolicy models.
Uses factory_boy to generate realistic test data with proper relationships.

WP06-T058: factory_boy fixtures for tests
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import factory
from accounts.models import User
from factory import fuzzy
from factory.django import DjangoModelFactory
from organisations.models import Organisation
from projects.models import Project

from transactions.models import (
    BalancePolicy,
    EnforcementModeChoices,
    EventTypeChoices,
    SourceTypeChoices,
    Transaction,
    UsageEvent,
)


class UserFactory(DjangoModelFactory):
    """Factory for User model."""

    class Meta:
        model = User
        django_get_or_create = ("email",)

    email = factory.Sequence(lambda n: f"testuser{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True
    is_staff = False


class OrganisationFactory(DjangoModelFactory):
    """Factory for Organisation model."""

    class Meta:
        model = Organisation
        django_get_or_create = ("slug",)

    name = factory.Sequence(lambda n: f"Test Org {n}")
    slug = factory.Sequence(lambda n: f"test-org-{n}")
    description = factory.Faker("text", max_nb_chars=200)
    is_active = True
    created_by = factory.SubFactory(UserFactory)


class ProjectFactory(DjangoModelFactory):
    """Factory for Project model."""

    class Meta:
        model = Project
        django_get_or_create = ("slug", "organisation")

    name = factory.Sequence(lambda n: f"Test Project {n}")
    slug = factory.Sequence(lambda n: f"test-project-{n}")
    description = factory.Faker("text", max_nb_chars=200)
    organisation = factory.SubFactory(OrganisationFactory)
    created_by = factory.SubFactory(UserFactory)
    is_active = True


class BalancePolicyFactory(DjangoModelFactory):
    """Factory for BalancePolicy model."""

    class Meta:
        model = BalancePolicy
        django_get_or_create = ("organisation",)

    organisation = factory.SubFactory(OrganisationFactory)
    project = None  # Can be set for project-specific policies
    enforcement_mode = EnforcementModeChoices.BLOCK
    min_balance = Decimal("0.00")
    metadata = {}


class UsageEventFactory(DjangoModelFactory):
    """Factory for UsageEvent model."""

    class Meta:
        model = UsageEvent

    id = factory.LazyFunction(uuid.uuid4)
    event_type = fuzzy.FuzzyChoice(EventTypeChoices.choices, getter=lambda c: c[0])
    organisation = factory.SubFactory(OrganisationFactory)
    project = factory.SubFactory(
        ProjectFactory, organisation=factory.SelfAttribute("..organisation")
    )
    user = factory.SubFactory(UserFactory)
    amount = fuzzy.FuzzyDecimal(low=0.01, high=999.99, precision=4)
    metadata = factory.LazyFunction(
        lambda: {
            "source": "test_factory",
            "ip_address": "127.0.0.1",
            "user_agent": "Test Client/1.0",
        }
    )
    idempotency_key = factory.LazyFunction(lambda: f"test-{uuid.uuid4()}")
    occurred_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class TransactionFactory(DjangoModelFactory):
    """Factory for Transaction model."""

    class Meta:
        model = Transaction

    id = factory.LazyFunction(uuid.uuid4)
    organisation = factory.SubFactory(OrganisationFactory)
    project = factory.SubFactory(
        ProjectFactory, organisation=factory.SelfAttribute("..organisation")
    )
    user = factory.SubFactory(UserFactory)
    amount = fuzzy.FuzzyDecimal(low=-999.99, high=999.99, precision=4)
    balance_after = Decimal("0.00")  # Should be computed in service layer
    description = factory.Faker("sentence", nb_words=6)
    source_type = fuzzy.FuzzyChoice(SourceTypeChoices.choices, getter=lambda c: c[0])
    source_id = factory.LazyFunction(uuid.uuid4)
    idempotency_key = factory.LazyFunction(lambda: f"txn-{uuid.uuid4()}")
    metadata = factory.LazyFunction(
        lambda: {
            "source": "test_factory",
            "created_via": "factory_boy",
        }
    )


class CreditTransactionFactory(TransactionFactory):
    """Factory for credit transactions (positive amounts)."""

    amount = fuzzy.FuzzyDecimal(low=0.01, high=999.99, precision=4)


class DebitTransactionFactory(TransactionFactory):
    """Factory for debit transactions (negative amounts)."""

    amount = fuzzy.FuzzyDecimal(low=-999.99, high=-0.01, precision=4)


class UsageEventWithTransactionFactory(UsageEventFactory):
    """Factory that creates a UsageEvent with an associated Transaction."""

    @factory.post_generation
    def with_transaction(self, create, extracted, **kwargs):  # noqa: N805
        """Create a transaction linked to this usage event."""
        if not create:
            return

        if extracted:
            # Use provided transaction details
            transaction_amount = kwargs.get("amount", self.amount)
            transaction_desc = kwargs.get("description", f"Transaction for {self.event_type}")
        else:
            transaction_amount = self.amount
            transaction_desc = f"Automated transaction for event {self.id}"

        TransactionFactory.create(
            organisation=self.organisation,
            project=self.project,
            user=self.user,
            amount=transaction_amount,
            source_type=SourceTypeChoices.USAGE_EVENT,
            source_id=self.id,
            description=transaction_desc,
            **kwargs,
        )
