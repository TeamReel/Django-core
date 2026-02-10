"""Factory classes for video processing test data."""

from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from src.video.models import PlatformExport, VideoJob, VideoOverlay, VideoPreset


class VideoPresetFactory(DjangoModelFactory):
    """Factory for VideoPreset model."""

    class Meta:
        model = VideoPreset
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"test_preset_{n}")
    description = factory.Faker("sentence")
    output_format = "mp4"
    video_codec = "libx264"
    audio_codec = "aac"
    resolution = "1920x1080"
    bitrate_video = "5000k"
    bitrate_audio = "128k"
    framerate = 30
    crf = 23
    is_system = False


class PlatformExportFactory(DjangoModelFactory):
    """Factory for PlatformExport model."""

    class Meta:
        model = PlatformExport
        django_get_or_create = ("platform", "name")

    platform = "instagram"
    name = factory.Sequence(lambda n: f"Test Export {n}")
    aspect_ratio = "16:9"
    resolution = "1920x1080"
    max_duration_seconds = 60
    max_file_size_mb = 250
    preset = factory.SubFactory(VideoPresetFactory)
    crop_strategy = "crop"
    recommended = False
    is_active = True


class VideoJobFactory(DjangoModelFactory):
    """Factory for VideoJob model."""

    class Meta:
        model = VideoJob

    project = factory.SubFactory("tests.projects.factories.ProjectFactory")
    created_by = factory.SubFactory("tests.accounts.factories.UserFactory")
    job_type = "transcode"
    status = "pending"
    source_file = factory.SubFactory("tests.files.factories.FileFactory")
    preset = factory.SubFactory(VideoPresetFactory)
    priority = "normal"
    progress_percent = 0


class VideoOverlayFactory(DjangoModelFactory):
    """Factory for VideoOverlay model."""

    class Meta:
        model = VideoOverlay

    job = factory.SubFactory(VideoJobFactory)
    overlay_type = "text"
    content = "Test Overlay"
    position_x = 10
    position_y = 10
    start_time = 0
    end_time = 5
    config = {}
