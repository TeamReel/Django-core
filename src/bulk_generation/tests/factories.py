"""Factories for bulk_generation test suite."""

from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from src.bulk_generation.models import (
    BulkContentType,
    BulkGenerationItem,
    BulkGenerationJob,
    ItemStatus,
    JobStatus,
)


class BulkGenerationJobFactory(DjangoModelFactory):
    """Factory for BulkGenerationJob model."""

    class Meta:
        model = BulkGenerationJob

    project = factory.SubFactory("tests.video.factories.ProjectFactory")
    created_by = factory.SubFactory("tests.accounts.factories.UserFactory")
    content_type = BulkContentType.LINEUP
    status = JobStatus.QUEUED
    metadata = factory.LazyFunction(dict)
    total_items = 0


class BulkGenerationItemFactory(DjangoModelFactory):
    """Factory for BulkGenerationItem model."""

    class Meta:
        model = BulkGenerationItem

    bulk_job = factory.SubFactory(BulkGenerationJobFactory)
    activity = factory.SubFactory("src.bulk_generation.tests.factories.ActivityFactory")
    status = ItemStatus.PENDING


class ActivityFactory(DjangoModelFactory):
    """Minimal Activity factory for bulk generation tests."""

    class Meta:
        model = "activities.Activity"

    title = factory.Sequence(lambda n: f"Match {n}")
    activity_type = "match"
    project = factory.SubFactory("tests.video.factories.ProjectFactory")
    period = factory.SubFactory("src.bulk_generation.tests.factories.PeriodFactory")
    start_time = factory.LazyFunction(
        lambda: __import__("django.utils.timezone", fromlist=["now"]).now()
    )
    end_time = factory.LazyAttribute(
        lambda o: o.start_time + __import__("datetime").timedelta(hours=2)
    )


class PeriodFactory(DjangoModelFactory):
    """Minimal Period factory for bulk generation tests."""

    class Meta:
        model = "activities.Period"

    name = factory.Sequence(lambda n: f"Season {n}")
    organisation = factory.SubFactory("tests.video.factories.OrganisationFactory")
    start_date = factory.LazyFunction(
        lambda: __import__("django.utils.timezone", fromlist=["now"]).now().date()
    )
    end_date = factory.LazyAttribute(
        lambda o: o.start_date + __import__("datetime").timedelta(days=365)
    )
