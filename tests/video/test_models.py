"""Tests for video processing models."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

if TYPE_CHECKING:
    pass


@pytest.mark.django_db
class TestVideoPreset:
    """Tests for VideoPreset model."""

    def test_create_preset_with_required_fields(self, video_preset_factory):
        """Test creating a preset with all required fields."""
        preset = video_preset_factory(
            name="test_preset",
            output_format="mp4",
            video_codec="libx264",
            resolution="1920x1080",
        )

        assert preset.id is not None
        assert preset.name == "test_preset"
        assert preset.output_format == "mp4"
        assert preset.is_system is False

    def test_system_preset_flag(self, video_preset_factory):
        """Test is_system flag for read-only presets."""
        preset = video_preset_factory(is_system=True)

        assert preset.is_system is True

    def test_preset_with_extra_params(self, video_preset_factory):
        """Test extra_params JSON field."""
        preset = video_preset_factory(extra_params={"custom_flag": "-preset slow", "tune": "film"})

        assert preset.extra_params["custom_flag"] == "-preset slow"
        assert preset.extra_params["tune"] == "film"

    def test_preset_string_representation(self, video_preset_factory):
        """Test __str__ method."""
        preset = video_preset_factory(name="1080p_high")

        assert str(preset) == "1080p_high"

    def test_preset_resolution_format(self, video_preset_factory):
        """Test resolution is stored as WIDTHxHEIGHT string."""
        preset = video_preset_factory(resolution="1280x720")

        assert preset.resolution == "1280x720"


@pytest.mark.django_db
class TestPlatformExport:
    """Tests for PlatformExport model."""

    def test_create_platform_export(self, platform_export_factory):
        """Test creating a platform export configuration."""
        export = platform_export_factory(
            platform="instagram",
            name="Feed Square",
            aspect_ratio="1:1",
            max_duration_seconds=60,
        )

        assert export.id is not None
        assert export.platform == "instagram"
        assert export.aspect_ratio == "1:1"

    def test_platform_choices(self, platform_export_factory):
        """Test valid platform choices."""
        valid_platforms = ["instagram", "tiktok", "youtube", "stories"]

        for platform in valid_platforms:
            export = platform_export_factory(platform=platform)
            assert export.platform == platform

    def test_crop_strategy_choices(self, platform_export_factory):
        """Test valid crop strategy choices."""
        strategies = ["crop", "letterbox", "fit"]

        for strategy in strategies:
            export = platform_export_factory(crop_strategy=strategy)
            assert export.crop_strategy == strategy

    def test_preset_relationship(self, platform_export_factory, video_preset_factory):
        """Test FK relationship to VideoPreset."""
        preset = video_preset_factory(name="custom_preset")
        export = platform_export_factory(preset=preset)

        assert export.preset.id == preset.id
        assert export.preset.name == "custom_preset"

    def test_recommended_flag(self, platform_export_factory):
        """Test recommended platform export flag."""
        export = platform_export_factory(recommended=True)

        assert export.recommended is True

    def test_string_representation(self, platform_export_factory):
        """Test __str__ method."""
        export = platform_export_factory(platform="tiktok", name="Standard")

        assert str(export) == "tiktok - Standard"


@pytest.mark.django_db
class TestVideoJob:
    """Tests for VideoJob model."""

    def test_create_job_with_required_fields(self, video_job_factory):
        """Test creating a job with required fields."""
        job = video_job_factory(
            job_type="transcode",
            status="pending",
        )

        assert job.id is not None
        assert job.status == "pending"
        assert job.job_type == "transcode"
        assert job.progress_percent == 0

    def test_job_type_choices(self, video_job_factory):
        """Test valid job_type choices."""
        job_types = ["transcode", "thumbnail", "compose"]

        for job_type in job_types:
            job = video_job_factory(job_type=job_type)
            assert job.job_type == job_type

    def test_status_transitions(self, video_job_factory):
        """Test job status lifecycle transitions."""
        job = video_job_factory(status="pending")

        # Pending → Queued
        job.status = "queued"
        job.save()
        job.refresh_from_db()
        assert job.status == "queued"

        # Queued → Processing
        job.status = "processing"
        job.save()
        job.refresh_from_db()
        assert job.status == "processing"

        # Processing → Completed
        job.status = "completed"
        job.save()
        job.refresh_from_db()
        assert job.status == "completed"

    def test_status_failure_path(self, video_job_factory):
        """Test job failure status and error message."""
        job = video_job_factory(status="processing")

        job.status = "failed"
        job.error_message = "FFmpeg encoding failed"
        job.save()

        job.refresh_from_db()
        assert job.status == "failed"
        assert "FFmpeg" in job.error_message

    def test_progress_tracking(self, video_job_factory):
        """Test progress_percent updates during processing."""
        job = video_job_factory(status="processing", progress_percent=0)

        job.progress_percent = 25
        job.save()
        assert job.progress_percent == 25

        job.progress_percent = 100
        job.save()
        assert job.progress_percent == 100

    def test_output_file_relationship(self, video_job_factory):
        """Test optional output_file FK."""
        job = video_job_factory(output_file=None)
        assert job.output_file is None

        # Simulating completion with output
        from tests.files.factories import FileFactory

        output_file = FileFactory()
        job.output_file = output_file
        job.save()

        job.refresh_from_db()
        assert job.output_file.id == output_file.id

    def test_project_membership(self, video_job_factory):
        """Test job belongs to project."""
        job = video_job_factory()

        assert job.project is not None
        assert job.project.id is not None

    def test_priority_levels(self, video_job_factory):
        """Test priority field values."""
        priorities = ["low", "normal", "high", "urgent"]

        for priority in priorities:
            job = video_job_factory(priority=priority)
            assert job.priority == priority

    def test_config_jsonfield(self, video_job_factory):
        """Test config JSONField stores job parameters."""
        config = {
            "output_format": "mp4",
            "quality": "high",
            "custom_flags": ["-preset", "slow"],
        }
        job = video_job_factory(config=config)

        assert job.config["output_format"] == "mp4"
        assert job.config["quality"] == "high"
        assert len(job.config["custom_flags"]) == 2

    def test_timestamps(self, video_job_factory):
        """Test created_at and updated_at timestamps."""
        job = video_job_factory()

        assert job.created_at is not None
        assert job.updated_at is not None
        assert job.updated_at >= job.created_at

    def test_workflow_integration_optional(self, video_job_factory):
        """Test workflow_instance FK is nullable."""
        job = video_job_factory(workflow_instance=None)

        assert job.workflow_instance is None

    def test_string_representation(self, video_job_factory):
        """Test __str__ method."""
        job = video_job_factory(job_type="transcode")

        job_str = str(job)
        assert "transcode" in job_str.lower()


@pytest.mark.django_db
class TestVideoOverlay:
    """Tests for VideoOverlay model."""

    def test_create_overlay(self, video_overlay_factory):
        """Test creating an overlay with required fields."""
        overlay = video_overlay_factory(
            overlay_type="text",
            content="Test Text",
            position_x=100,
            position_y=50,
        )

        assert overlay.id is not None
        assert overlay.overlay_type == "text"
        assert overlay.content == "Test Text"

    def test_overlay_types(self, video_overlay_factory):
        """Test valid overlay_type choices."""
        overlay_types = ["text", "image", "logo", "watermark"]

        for overlay_type in overlay_types:
            overlay = video_overlay_factory(overlay_type=overlay_type)
            assert overlay.overlay_type == overlay_type

    def test_overlay_timing(self, video_overlay_factory):
        """Test start_time and end_time fields."""
        overlay = video_overlay_factory(start_time=5, end_time=15)

        assert overlay.start_time == 5
        assert overlay.end_time == 15
        assert overlay.end_time > overlay.start_time

    def test_overlay_positioning(self, video_overlay_factory):
        """Test position_x and position_y coordinates."""
        overlay = video_overlay_factory(position_x=1920 // 2, position_y=1080 // 2)

        assert overlay.position_x == 960
        assert overlay.position_y == 540

    def test_overlay_config_jsonfield(self, video_overlay_factory):
        """Test config JSONField for overlay-specific options."""
        config = {
            "font_size": 48,
            "font_color": "#FFFFFF",
            "background_color": "#000000",
            "opacity": 0.8,
        }
        overlay = video_overlay_factory(config=config)

        assert overlay.config["font_size"] == 48
        assert overlay.config["opacity"] == 0.8

    def test_overlay_job_relationship(self, video_overlay_factory, video_job_factory):
        """Test FK relationship to VideoJob."""
        job = video_job_factory(job_type="compose")
        overlay = video_overlay_factory(job=job)

        assert overlay.job.id == job.id
        assert overlay.job.job_type == "compose"

    def test_overlay_cascade_deletion(self, video_overlay_factory):
        """Test overlays are deleted when parent job is deleted."""
        overlay = video_overlay_factory()
        job = overlay.job
        job_id = job.id

        job.delete()

        from src.video.models import VideoOverlay

        assert not VideoOverlay.objects.filter(job_id=job_id).exists()

    def test_string_representation(self, video_overlay_factory):
        """Test __str__ method."""
        overlay = video_overlay_factory(overlay_type="logo")

        overlay_str = str(overlay)
        assert "logo" in overlay_str.lower()
