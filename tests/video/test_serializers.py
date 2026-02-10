"""Tests for video serializers."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from src.video.serializers import (
    VideoJobCreateSerializer,
    VideoJobListSerializer,
    VideoOverlayCreateSerializer,
)

if TYPE_CHECKING:
    pass


@pytest.mark.django_db
class TestVideoJobCreateSerializer:
    """Tests for VideoJobCreateSerializer."""

    def test_valid_transcode_job_creation(
        self,
        video_preset_factory,
        project_factory,
        file_factory,
        user_factory,
    ):
        """Test creating a valid transcode job."""
        preset = video_preset_factory()
        project = project_factory()
        file = file_factory(organization=project.organisation)
        user = user_factory()

        data = {
            "job_type": "transcode",
            "input_file_id": file.id,
            "preset_id": preset.id,
        }

        context = {"project": project, "created_by": user}
        serializer = VideoJobCreateSerializer(data=data, context=context)

        assert serializer.is_valid(), serializer.errors
        job = serializer.save()

        assert job.job_type == "transcode"
        assert job.project == project
        assert job.created_by == user
        assert job.input_file == file
        assert job.preset == preset

    def test_invalid_overlays_for_transcode_job(
        self,
        video_preset_factory,
        project_factory,
        file_factory,
        user_factory,
    ):
        """Test validation error when adding overlays to non-compose job."""
        project = project_factory()
        file = file_factory(organization=project.organisation)
        preset = video_preset_factory()

        data = {
            "job_type": "transcode",
            "input_file_id": file.id,
            "preset_id": preset.id,
            "overlays": [{"overlay_type": "text", "content": "test"}],
        }

        # Valid overlay structure needs to be respected or mocked?
        # Serializer expects nested writes

        serializer = VideoJobCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "overlays" in serializer.errors

    def test_valid_compose_job_with_overlays(
        self,
        project_factory,
        file_factory,
        user_factory,
        video_preset_factory,
    ):
        """Test creating a compose job with overlays."""
        project = project_factory()
        file = file_factory(organization=project.organisation)
        preset = video_preset_factory()
        user = user_factory()

        data = {
            "job_type": "compose",
            "input_file_id": file.id,
            "preset_id": preset.id,
            "overlays": [
                {
                    "overlay_type": "text",
                    "content": "Test Overlay",
                    "position": "center",
                    "position_x": 0,
                    "position_y": 0,
                }
            ],
        }

        context = {"project": project, "created_by": user}
        serializer = VideoJobCreateSerializer(data=data, context=context)

        assert serializer.is_valid(), serializer.errors
        job = serializer.save()

        assert job.job_type == "compose"
        assert job.overlays.count() == 1
        assert job.overlays.first().content == "Test Overlay"

    # Config field removed
    # def test_config_field...


@pytest.mark.django_db
class TestVideoOverlayCreateSerializer:
    """Tests for VideoOverlayCreateSerializer."""

    def test_valid_custom_position(self):
        """Test validation passes with custom position and coordinates."""
        data = {
            "overlay_type": "text",
            "content": "Test",
            "position": "custom",
            "position_x": 100,
            "position_y": 200,
        }
        serializer = VideoOverlayCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_missing_coordinates_for_custom_position(self):
        """Test validation fails when custom position lacks coordinates."""
        data = {
            "overlay_type": "text",
            "content": "Test",
            "position": "custom",
            # position_x and y missing
        }
        serializer = VideoOverlayCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert "position_x" in str(serializer.errors)


@pytest.mark.django_db
class TestVideoJobListSerializer:
    """Tests for VideoJobListSerializer."""

    def test_fields_presence(self, video_job_factory):
        """Test serializer fields."""
        job = video_job_factory()
        serializer = VideoJobListSerializer(job)
        data = serializer.data

        expected_fields = {
            "id",
            "job_type",
            "status",
            "progress_percent",
            "input_file",
            "output_file",
            "preset",
            "created_at",
        }
        assert expected_fields.issubset(data.keys())

    def test_output_url_generation(self, video_job_factory, file_factory, mocker):
        """Test output_url is generated correctly."""
        output_file = file_factory()
        job = video_job_factory(output_file=output_file)

        # Mock get_storage_backend logic
        mock_backend = mocker.patch("src.video.serializers.job.get_storage_backend")
        mock_backend.return_value.get_url.return_value = "http://test-url.com"

        serializer = VideoJobListSerializer(job)
        data = serializer.data

        assert data["output_url"] == "http://test-url.com"
