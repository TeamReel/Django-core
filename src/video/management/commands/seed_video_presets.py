"""Management command to seed system video presets and platform exports."""

from __future__ import annotations

from django.core.management.base import BaseCommand

from src.video.models import PlatformExport, VideoPreset


class Command(BaseCommand):
    """Seed system video presets and platform exports."""

    help = "Seed system video presets and platform exports for common video processing scenarios"

    # Platform specs last updated: 2026-02-10
    # Sources:
    # - Instagram: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
    # - TikTok: https://developers.tiktok.com/doc/video-upload-guidelines
    # - YouTube: https://support.google.com/youtube/answer/1722171
    # - Twitter/X: https://developer.twitter.com/en/docs/twitter-api/v1/media/upload-media

    SYSTEM_PRESETS = [
        {
            "name": "1080p_high",
            "description": "High quality 1080p for archival and professional use",
            "output_format": "mp4",
            "video_codec": "libx264",
            "audio_codec": "aac",
            "resolution": "1920x1080",
            "bitrate_video": "8000k",
            "bitrate_audio": "192k",
            "framerate": 30,
            "crf": 18,
            "is_system": True,
        },
        {
            "name": "1080p_standard",
            "description": "Standard quality 1080p for general use",
            "output_format": "mp4",
            "video_codec": "libx264",
            "audio_codec": "aac",
            "resolution": "1920x1080",
            "bitrate_video": "5000k",
            "bitrate_audio": "128k",
            "framerate": 30,
            "crf": 23,
            "is_system": True,
        },
        {
            "name": "720p_standard",
            "description": "Standard quality 720p for web and mobile",
            "output_format": "mp4",
            "video_codec": "libx264",
            "audio_codec": "aac",
            "resolution": "1280x720",
            "bitrate_video": "3000k",
            "bitrate_audio": "128k",
            "framerate": 30,
            "crf": 23,
            "is_system": True,
        },
        {
            "name": "480p_web",
            "description": "Low bandwidth 480p for web streaming",
            "output_format": "mp4",
            "video_codec": "libx264",
            "audio_codec": "aac",
            "resolution": "854x480",
            "bitrate_video": "1500k",
            "bitrate_audio": "96k",
            "framerate": 30,
            "crf": 25,
            "is_system": True,
        },
        {
            "name": "thumbnail",
            "description": "Thumbnail image extraction",
            "output_format": "mp4",  # Placeholder, actual thumbnail generation uses jpg
            "video_codec": "",
            "audio_codec": "",
            "resolution": "640x360",
            "bitrate_video": "",
            "bitrate_audio": "",
            "framerate": None,
            "crf": None,
            "is_system": True,
        },
        {
            "name": "webm_vp9",
            "description": "High quality WebM with VP9 codec",
            "output_format": "webm",
            "video_codec": "libvpx-vp9",
            "audio_codec": "libopus",
            "resolution": "1920x1080",
            "bitrate_video": "4000k",
            "bitrate_audio": "128k",
            "framerate": 30,
            "crf": 31,
            "is_system": True,
        },
    ]

    PLATFORM_EXPORTS = [
        {
            "platform": "instagram",
            "name": "Feed Square",
            "aspect_ratio": "1:1",
            "resolution": "1080x1080",
            "max_duration_seconds": 60,
            "max_file_size_mb": 250,
            "crop_strategy": "crop",
            "recommended": True,
        },
        {
            "platform": "instagram",
            "name": "Feed Portrait",
            "aspect_ratio": "4:5",
            "resolution": "1080x1350",
            "max_duration_seconds": 60,
            "max_file_size_mb": 250,
            "crop_strategy": "crop",
            "recommended": False,
        },
        {
            "platform": "instagram",
            "name": "Reels",
            "aspect_ratio": "9:16",
            "resolution": "1080x1920",
            "max_duration_seconds": 90,
            "max_file_size_mb": 250,
            "crop_strategy": "crop",
            "recommended": True,
        },
        {
            "platform": "stories",
            "name": "Instagram Stories",
            "aspect_ratio": "9:16",
            "resolution": "1080x1920",
            "max_duration_seconds": 15,
            "max_file_size_mb": 250,
            "crop_strategy": "crop",
            "recommended": True,
        },
        {
            "platform": "tiktok",
            "name": "Standard",
            "aspect_ratio": "9:16",
            "resolution": "1080x1920",
            "max_duration_seconds": 180,
            "max_file_size_mb": 287,
            "crop_strategy": "crop",
            "recommended": True,
        },
        {
            "platform": "youtube",
            "name": "Shorts",
            "aspect_ratio": "9:16",
            "resolution": "1080x1920",
            "max_duration_seconds": 60,
            "max_file_size_mb": 256,
            "crop_strategy": "crop",
            "recommended": True,
        },
        {
            "platform": "youtube",
            "name": "Standard",
            "aspect_ratio": "16:9",
            "resolution": "1920x1080",
            "max_duration_seconds": 43200,  # 12 hours
            "max_file_size_mb": 256000,  # 256GB
            "crop_strategy": "letterbox",
            "recommended": True,
        },
    ]

    def handle(self, *args, **options):
        """Execute the seeding operation."""
        self.stdout.write("Seeding video presets and platform exports...")

        presets_created, presets_updated = self.seed_presets()
        exports_created, exports_updated = self.seed_platform_exports()

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ Seeding complete!\n"
                f"  Presets: {presets_created} created, {presets_updated} updated\n"
                f"  Platform Exports: {exports_created} created, {exports_updated} updated"
            )
        )

    def seed_presets(self) -> tuple[int, int]:
        """
        Seed system video presets.

        Returns:
            Tuple of (created_count, updated_count)
        """
        created_count = 0
        updated_count = 0

        for preset_data in self.SYSTEM_PRESETS:
            preset, created = VideoPreset.objects.update_or_create(
                name=preset_data["name"],
                is_system=True,
                defaults=preset_data,
            )

            if created:
                created_count += 1
                self.stdout.write(f"  ✓ Created preset: {preset.name}")
            else:
                updated_count += 1
                self.stdout.write(f"  ↻ Updated preset: {preset.name}")

        return created_count, updated_count

    def seed_platform_exports(self) -> tuple[int, int]:
        """
        Seed platform-specific export configurations.

        Returns:
            Tuple of (created_count, updated_count)
        """
        created_count = 0
        updated_count = 0

        # Get default preset for platform exports
        try:
            default_preset = VideoPreset.objects.get(name="1080p_standard", is_system=True)
        except VideoPreset.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(
                    "  ✗ Error: '1080p_standard' preset not found. Run preset seeding first."
                )
            )
            return 0, 0

        for export_data in self.PLATFORM_EXPORTS:
            export, created = PlatformExport.objects.update_or_create(
                platform=export_data["platform"],
                name=export_data["name"],
                defaults={**export_data, "preset": default_preset},
            )

            if created:
                created_count += 1
                self.stdout.write(f"  ✓ Created export: {export.platform} - {export.name}")
            else:
                updated_count += 1
                self.stdout.write(f"  ↻ Updated export: {export.platform} - {export.name}")

        return created_count, updated_count
