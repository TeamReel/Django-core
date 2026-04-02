"""Tests for bulk_generation Celery tasks."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from src.bulk_generation.models import (
    BulkContentType,
    BulkGenerationItem,
    ItemStatus,
    JobStatus,
)
from src.bulk_generation.tasks import (
    on_bulk_item_video_completed,
    process_bulk_generation_job,
)

from .factories import (
    ActivityFactory,
    BulkGenerationItemFactory,
    BulkGenerationJobFactory,
)


@pytest.mark.django_db
class TestProcessBulkGenerationJob:
    """Tests for process_bulk_generation_job task."""

    def test_job_not_found(self):
        result = process_bulk_generation_job("00000000-0000-0000-0000-000000000000")
        assert "not found" in result

    def test_cancelled_job_skipped(self):
        job = BulkGenerationJobFactory(status=JobStatus.CANCELLED)
        result = process_bulk_generation_job(str(job.id))
        assert "cancelled" in result

    def test_no_pending_items(self):
        job = BulkGenerationJobFactory(status=JobStatus.PROCESSING, total_items=0)
        result = process_bulk_generation_job(str(job.id))
        assert "no pending items" in result

    @patch("src.bulk_generation.tasks._dispatch_single_item")
    def test_dispatches_video_items(self, mock_dispatch):
        """Items for video content types get dispatched via _dispatch_single_item."""
        job = BulkGenerationJobFactory(
            content_type=BulkContentType.LINEUP,
            total_items=2,
        )
        activity1 = ActivityFactory(project=job.project)
        activity2 = ActivityFactory(project=job.project)
        BulkGenerationItemFactory(bulk_job=job, activity=activity1, status=ItemStatus.PENDING)
        BulkGenerationItemFactory(bulk_job=job, activity=activity2, status=ItemStatus.PENDING)

        result = process_bulk_generation_job(str(job.id))

        assert "dispatched 2 items" in result
        assert mock_dispatch.call_count == 2

        job.refresh_from_db()
        assert job.status == JobStatus.PROCESSING

    def test_starts_queued_job(self):
        job = BulkGenerationJobFactory(status=JobStatus.QUEUED, total_items=0)
        # No items → goes to no pending items path, but status should change
        process_bulk_generation_job(str(job.id))
        job.refresh_from_db()
        assert job.status == JobStatus.PROCESSING


@pytest.mark.django_db
class TestOnBulkItemVideoCompleted:
    """Tests for on_bulk_item_video_completed callback."""

    def test_video_job_not_found(self):
        """Non-existent video job is handled gracefully."""
        on_bulk_item_video_completed("00000000-0000-0000-0000-000000000000", True)

    def test_no_bulk_item_id_in_config(self):
        """Video jobs without bulk_item_id are silently skipped."""
        from tests.video.factories import VideoJobFactory

        video_job = VideoJobFactory(config={})
        on_bulk_item_video_completed(str(video_job.id), True)

    def test_success_marks_item_completed(self):
        """Successful video job marks bulk item as completed."""
        from tests.video.factories import VideoJobFactory

        job = BulkGenerationJobFactory(total_items=1, status=JobStatus.PROCESSING)
        activity = ActivityFactory(project=job.project)
        item = BulkGenerationItemFactory(
            bulk_job=job, activity=activity, status=ItemStatus.GENERATING
        )

        video_job = VideoJobFactory(config={"bulk_item_id": str(item.id)})
        on_bulk_item_video_completed(str(video_job.id), True)

        item.refresh_from_db()
        assert item.status == ItemStatus.COMPLETED

        job.refresh_from_db()
        assert job.completed_items == 1
        assert job.status == JobStatus.COMPLETED

    def test_failure_marks_item_failed(self):
        """Failed video job marks bulk item as failed."""
        from tests.video.factories import VideoJobFactory

        job = BulkGenerationJobFactory(total_items=1, status=JobStatus.PROCESSING)
        activity = ActivityFactory(project=job.project)
        item = BulkGenerationItemFactory(
            bulk_job=job, activity=activity, status=ItemStatus.GENERATING
        )

        video_job = VideoJobFactory(config={"bulk_item_id": str(item.id)})
        on_bulk_item_video_completed(str(video_job.id), False, "FFmpeg crashed")

        item.refresh_from_db()
        assert item.status == ItemStatus.FAILED
        assert "FFmpeg crashed" in item.error_message
