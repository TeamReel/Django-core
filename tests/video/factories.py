"""Factory classes for video processing test data."""

from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from files.models import FileAsset
from projects.models import Project
from organisations.models import Organisation
from src.video.models import PlatformExport, VideoJob, VideoOverlay, VideoPreset


class OrganisationFactory(DjangoModelFactory):
    """Minimal factory for Organisation model."""

    class Meta:
        model = Organisation

    name = factory.Sequence(lambda n: f"Test Org {n}")
    slug = factory.Sequence(lambda n: f"test-org-{n}")
    creator = factory.SubFactory("tests.accounts.factories.UserFactory")


class ProjectFactory(DjangoModelFactory):
    """Minimal factory for Project model."""

    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f"Test Project {n}")
    slug = factory.Sequence(lambda n: f"test-project-{n}")
    creator = factory.SubFactory("tests.accounts.factories.UserFactory")
    organisation = factory.SubFactory(OrganisationFactory)


class FileFactory(DjangoModelFactory):
    """Minimal factory for FileAsset model."""

    class Meta:
        model = FileAsset

    organization = factory.SubFactory(OrganisationFactory)
    original_name = factory.Sequence(lambda n: f"video_{n}.mp4")
    storage_path = factory.Sequence(lambda n: f"tests/video_{n}.mp4")
    mime_type = "video/mp4"
    file_size = 1024 * 1024 * 10  # 10MB
    uploaded_by = factory.SubFactory("tests.accounts.factories.UserFactory")


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
    bitrate_video = 5000000
    bitrate_audio = "128k"
    framerate = 30
    crf = 23
    is_system = False


class PlatformExportFactory(DjangoModelFactory):
    """Factory for PlatformExport model."""

    class Meta:
        model = PlatformExport

    name = factory.Sequence(lambda n: f"Platform {n}")
    platform = "tiktok"
    preset = factory.SubFactory(VideoPresetFactory)


class VideoJobFactory(DjangoModelFactory):
    """Factory for VideoJob model."""

    class Meta:
        model = VideoJob

    project = factory.SubFactory(ProjectFactory)
    created_by = factory.SubFactory("tests.accounts.factories.UserFactory")
    job_type = "transcode"
    status = "queued"
    input_file = factory.SubFactory(FileFactory)
    preset = factory.SubFactory(VideoPresetFactory)


class VideoOverlayFactory(DjangoModelFactory):
    """Factory for VideoOverlay model."""

    class Meta:
        model = VideoOverlay

    job = factory.SubFactory(VideoJobFactory)
    overlay_type = "text"
    content = "Sample Overlay"
    position_x = 10
    position_y = 10
    start_time = 0.0
    end_time = 5.0
