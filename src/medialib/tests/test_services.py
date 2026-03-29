from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from medialib.services.metadata import extract_image_metadata, extract_video_metadata
from medialib.services.tags import MediaTagService
from organisations.models import Organisation
from projects.models import Project


class MetadataServiceTests(TestCase):
    def test_extract_image_metadata_success(self):
        # Mock Pillow Image
        with patch("medialib.services.metadata.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_img.width = 800
            mock_img.height = 600
            mock_img.format = "JPEG"
            mock_img.mode = "RGB"
            mock_img._getexif.return_value = {271: "Brand", 272: "Model"}  # 271=Make, 272=Model
            mock_open.return_value.__enter__.return_value = mock_img

            data = extract_image_metadata(b"fake_image_bytes")

            self.assertEqual(data["width"], 800)
            self.assertEqual(data["height"], 600)
            self.assertEqual(data["format"], "JPEG")
            self.assertEqual(data["exif"]["Make"], "Brand")

    def test_extract_image_metadata_failure(self):
        with patch("medialib.services.metadata.Image.open", side_effect=Exception("Corrupt")):
            data = extract_image_metadata(b"bad_bytes")
            self.assertIn("error", data)
            self.assertEqual(data["error"], "Corrupt")

    def test_extract_video_metadata_success(self):
        # Mock subprocess.run
        mock_output = {
            "streams": [
                {
                    "codec_type": "video",
                    "width": 1920,
                    "height": 1080,
                    "codec_name": "h264",
                    "r_frame_rate": "30/1",
                }
            ],
            "format": {"duration": "120.5"},
        }

        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0
            # Mock json.loads directly if needed, but if exact match is simple check for valid string
            import json

            mock_run.return_value.stdout = json.dumps(mock_output)

            data = extract_video_metadata(b"fake_video_bytes")

            self.assertEqual(data["width"], 1920)
            self.assertEqual(data["height"], 1080)
            self.assertEqual(data["fps"], 30.0)
            self.assertEqual(data["duration_seconds"], 120.5)

    def test_extract_video_metadata_failure(self):
        with patch("subprocess.run", side_effect=Exception("No ffprobe")):
            data = extract_video_metadata(b"bytes")
            self.assertIn("error", data)


class MediaTagServiceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create(email="tagtester@example.com")
        self.org = Organisation.objects.create(name="Tag Org", slug="tag-org", creator=self.user)
        self.project = Project.objects.create(
            name="Tag Project", slug="tag-project", organisation=self.org, creator=self.user
        )

    def test_generate_tags_from_filename(self):
        filename = "My_Awesome_Video-2024 final_v2.mp4"
        tags = MediaTagService.generate_tags_from_filename(filename)

        # expected = {"awesome", "video", "2024", "final", "my"} # Set comparison
        self.assertTrue(set(tags).issuperset({"awesome", "video"}))
        self.assertNotIn("v2", tags)  # "v2" is < 3 chars
        self.assertNotIn("mp4", tags)  # extension removed

    def test_get_or_create_tag_system(self):
        # Create system tag
        sys_tag = MediaTagService.create_system_tag("Common")
        self.assertTrue(sys_tag.is_system)

        # Try to get/create "Common" for project
        tag, created = MediaTagService.get_or_create_tag("Common", str(self.project.id))

        self.assertFalse(created)
        self.assertEqual(tag.id, sys_tag.id)
        self.assertTrue(tag.is_system)

    def test_get_or_create_tag_project(self):
        tag, created = MediaTagService.get_or_create_tag("Specific", str(self.project.id))
        self.assertTrue(created)
        self.assertFalse(tag.is_system)
        self.assertEqual(tag.project, self.project)

        # Again
        tag2, created2 = MediaTagService.get_or_create_tag("Specific", str(self.project.id))
        self.assertFalse(created2)
        self.assertEqual(tag.id, tag2.id)
