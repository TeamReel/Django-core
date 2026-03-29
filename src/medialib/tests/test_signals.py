import pytest
from django.contrib.auth import get_user_model
from files.models import FileAsset
from medialib.models import MediaItem
from organisations.models import Organisation
from projects.models import Project

from src.generative.models import GenerationOutput, GenerationRequest, GenerationTemplate

User = get_user_model()


@pytest.mark.django_db
class TestAutoLinkingSignals:
    def test_media_item_created_on_generation_output(self):
        # Setup
        user = User.objects.create_user(
            username="testuser", email="test@example.com", password="password"
        )
        org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)
        project = Project.objects.create(name="Test Project", organisation=org, creator=user)

        template = GenerationTemplate.objects.create(
            organisation=org,
            name="Test Template",
            slug="test-template",
            created_by=user,
            input_schema={"type": "object"},
            pipeline_config={"provider": "openai", "model": "gpt-4"},
        )

        request = GenerationRequest.objects.create(
            template=template, requester=user, project=project, input_data={}, status="processing"
        )

        file_asset = FileAsset.objects.create(
            organization=org,
            uploaded_by=user,
            original_name="generated.png",
            storage_path="path/to/generated.png",
            file_size=1024,
            mime_type="image/png",
            metadata={"width": 800, "height": 600},
        )

        # Action: Create GenerationOutput
        GenerationOutput.objects.create(request=request, output_type="image", file_id=file_asset.id)

        # Assertions
        assert MediaItem.objects.count() == 1
        item = MediaItem.objects.first()

        # Check T034
        assert item.project == project
        assert item.generation_request == request
        assert item.created_by == user
        assert item.file == file_asset

        # Check Metadata
        assert item.title == "Generated: Test Template"
        assert item.mime_type == "image/png"
        assert item.width == 800
        assert item.height == 600

        # Check T035 (Tags)
        assert item.tags.count() == 1
        tag = item.tags.first()
        assert tag.slug == "template-test-template"
        assert tag.project == project
        assert tag.name == "Template: Test Template"

    def test_no_media_item_if_no_project(self):
        # Setup without project
        user = User.objects.create_user(
            username="testuser2", email="test2@example.com", password="password"
        )
        org = Organisation.objects.create(name="Test Org 2", slug="test-org-2", creator=user)

        template = GenerationTemplate.objects.create(
            organisation=org,
            name="Test Template",
            slug="test-template",
            created_by=user,
            input_schema={"type": "object"},
            pipeline_config={"provider": "openai", "model": "gpt-4"},
        )

        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            project=None,  # No project
            input_data={},
            status="processing",
        )

        file_asset = FileAsset.objects.create(
            organization=org,
            uploaded_by=user,
            original_name="generated.png",
            storage_path="path/to/generated.png",
            file_size=1024,
            mime_type="image/png",
        )

        # Action
        GenerationOutput.objects.create(request=request, output_type="image", file_id=file_asset.id)

        # Assertions
        assert MediaItem.objects.count() == 0
