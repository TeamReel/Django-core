"""Tests for BulkGenerationJob and BulkGenerationItem models."""

from __future__ import annotations

import pytest
from django.utils import timezone

from src.bulk_generation.models import (
    BulkContentType,
    BulkGenerationItem,
    BulkGenerationJob,
    ItemStatus,
    JobStatus,
)

from .factories import (
    ActivityFactory,
    BulkGenerationItemFactory,
    BulkGenerationJobFactory,
)


@pytest.mark.django_db
class TestBulkGenerationJob:
    """Tests for BulkGenerationJob model."""

    def test_create_job(self):
        job = BulkGenerationJobFactory(
            content_type=BulkContentType.LINEUP,
            total_items=5,
        )
        assert job.status == JobStatus.QUEUED
        assert job.content_type == BulkContentType.LINEUP
        assert job.total_items == 5
        assert job.completed_items == 0
        assert job.failed_items == 0
        assert job.id is not None

    def test_str_representation(self):
        job = BulkGenerationJobFactory(content_type=BulkContentType.MATCH_INTRO)
        assert "match_intro" in str(job)
        assert "queued" in str(job)

    def test_org_property(self):
        job = BulkGenerationJobFactory()
        assert job.organisation == job.project.organisation

    def test_progress_percent_empty(self):
        job = BulkGenerationJobFactory(total_items=0)
        assert job.progress_percent == 0

    def test_progress_percent_partial(self):
        job = BulkGenerationJobFactory(total_items=10, completed_items=3, failed_items=2)
        assert job.progress_percent == 50

    def test_progress_percent_complete(self):
        job = BulkGenerationJobFactory(total_items=5, completed_items=5)
        assert job.progress_percent == 100

    def test_start_processing(self):
        job = BulkGenerationJobFactory()
        assert job.started_at is None

        job.start_processing()
        job.refresh_from_db()
        assert job.status == JobStatus.PROCESSING
        assert job.started_at is not None

    def test_refresh_stats_all_completed(self):
        job = BulkGenerationJobFactory(total_items=2)
        activity = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity, status=ItemStatus.COMPLETED
        )
        activity2 = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity2, status=ItemStatus.COMPLETED
        )

        job.refresh_stats()
        job.refresh_from_db()
        assert job.completed_items == 2
        assert job.failed_items == 0
        assert job.status == JobStatus.COMPLETED
        assert job.completed_at is not None

    def test_refresh_stats_partial_failure(self):
        job = BulkGenerationJobFactory(total_items=2)
        activity = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity, status=ItemStatus.COMPLETED
        )
        activity2 = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity2, status=ItemStatus.FAILED
        )

        job.refresh_stats()
        job.refresh_from_db()
        assert job.status == JobStatus.PARTIALLY_COMPLETED

    def test_refresh_stats_all_failed(self):
        job = BulkGenerationJobFactory(total_items=1)
        activity = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity, status=ItemStatus.FAILED
        )

        job.refresh_stats()
        job.refresh_from_db()
        assert job.status == JobStatus.FAILED

    def test_cancel(self):
        job = BulkGenerationJobFactory(total_items=2)
        activity = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity, status=ItemStatus.PENDING
        )
        activity2 = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(
            bulk_job=job, activity=activity2, status=ItemStatus.GENERATING
        )

        job.cancel()
        job.refresh_from_db()
        assert job.status == JobStatus.CANCELLED
        assert job.completed_at is not None
        # Only pending items get cancelled, not generating ones
        assert job.items.filter(status=ItemStatus.CANCELLED).count() == 1
        assert job.items.filter(status=ItemStatus.GENERATING).count() == 1

    def test_soft_delete(self):
        job = BulkGenerationJobFactory()
        job_id = job.id
        job.soft_delete()
        assert BulkGenerationJob.objects.filter(id=job_id).count() == 0
        assert BulkGenerationJob.all_objects.filter(id=job_id).count() == 1


@pytest.mark.django_db
class TestBulkGenerationItem:
    """Tests for BulkGenerationItem model."""

    def test_create_item(self):
        job = BulkGenerationJobFactory()
        activity = ActivityFactory(project=job.project)
        item = BulkGenerationItemFactory(bulk_job=job, activity=activity)
        assert item.status == ItemStatus.PENDING
        assert item.video_job is None
        assert item.error_message == ""

    def test_mark_generating(self):
        item = BulkGenerationItemFactory()
        item.mark_generating()
        item.refresh_from_db()
        assert item.status == ItemStatus.GENERATING
        assert item.started_at is not None

    def test_mark_completed(self):
        item = BulkGenerationItemFactory(status=ItemStatus.GENERATING)
        item.mark_completed()
        item.refresh_from_db()
        assert item.status == ItemStatus.COMPLETED
        assert item.completed_at is not None

    def test_mark_failed(self):
        item = BulkGenerationItemFactory(status=ItemStatus.GENERATING)
        item.mark_failed("Something went wrong")
        item.refresh_from_db()
        assert item.status == ItemStatus.FAILED
        assert item.error_message == "Something went wrong"
        assert item.completed_at is not None

    def test_mark_failed_truncates_long_error(self):
        item = BulkGenerationItemFactory(status=ItemStatus.GENERATING)
        item.mark_failed("x" * 5000)
        item.refresh_from_db()
        assert len(item.error_message) == 2000

    def test_unique_constraint_activity_per_job(self):
        job = BulkGenerationJobFactory()
        activity = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(bulk_job=job, activity=activity)

        from django.db import IntegrityError

        with pytest.raises(IntegrityError):
            BulkGenerationItemFactory(bulk_job=job, activity=activity)
