"""Integration tests for B34 Generative Pipelines.

WP06 T053-T054: Integration Tests

Tests for brand context, file storage, and WebSocket integrations.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest
from django.utils import timezone

from src.generative.models import GenerationOutput, OutputType
from src.generative.services.brand import BrandContextService
from src.generative.services.file_storage import GenerationFileService
from src.generative.services.websocket import GenerationWebSocketService


@pytest.mark.django_db
class TestBrandIntegration:
    """Test B33 Brand Identity integration (WP06 T044-T045)."""

    def test_get_brand_context_with_specific_brand(self, organisation, brand_profile):
        """Test brand context retrieval with specific brand ID."""
        context = BrandContextService.get_brand_context(organisation.id, str(brand_profile.id))

        assert context["brand_name"] == brand_profile.name
        assert "colors" in context
        assert context["colors"]["primary"] == "#FF0000"
        assert context["colors"]["secondary"] == "#00FF00"
        assert "fonts" in context
        assert context["fonts"]["heading"] == "Arial"
        assert context["fonts"]["body"] == "Helvetica"

    def test_get_brand_context_default_brand(self, organisation, brand_profile):
        """Test brand context retrieval with active brand (one per org)."""
        # BrandProfile has unique constraint: one active brand per organisation
        context = BrandContextService.get_brand_context(organisation.id)

        assert context["brand_name"] == brand_profile.name

    def test_get_brand_context_no_brand(self, organisation):
        """Test brand context returns empty dict when no brand found."""
        context = BrandContextService.get_brand_context(organisation.id)

        assert context == {}

    def test_inject_brand_context_enabled(self, organisation, brand_profile):
        """Test brand context injection when enabled."""
        input_data = {"prompt": "Generate content"}
        template_config = {
            "use_brand_context": True,
            "brand_id": str(brand_profile.id),
        }

        result = BrandContextService.inject_brand_context(
            input_data, template_config, organisation.id
        )

        assert "brand" in result
        assert result["brand"]["brand_name"] == brand_profile.name
        assert result["prompt"] == "Generate content"  # Original data preserved

    def test_inject_brand_context_disabled(self, organisation):
        """Test brand context injection when disabled."""
        input_data = {"prompt": "Generate content"}
        template_config = {"use_brand_context": False}

        result = BrandContextService.inject_brand_context(
            input_data, template_config, organisation.id
        )

        assert "brand" not in result
        assert result["prompt"] == "Generate content"

    def test_inject_brand_context_default_brand(self, organisation, brand_profile):
        """Test brand context uses active brand when brand_id not specified."""
        # BrandProfile has unique constraint: one active brand per organisation
        input_data = {"prompt": "Generate content"}
        template_config = {"use_brand_context": True}

        result = BrandContextService.inject_brand_context(
            input_data, template_config, organisation.id
        )

        assert "brand" in result
        assert result["brand"]["brand_name"] == brand_profile.name


@pytest.mark.django_db
class TestFileStorageIntegration:
    """Test B35 File Storage integration (WP06 T046-T049)."""

    @patch("files.utils.get_storage_backend")
    def test_store_output_file(self, mock_backend, user, organisation):
        """Test file output metadata stored correctly."""
        # Mock the storage backend
        mock_backend_instance = Mock()
        mock_backend_instance.save.return_value = "storage/path/output.png"
        mock_backend.return_value = mock_backend_instance

        file_content = b"fake image data"
        file_id = GenerationFileService.store_output_file(
            content=file_content,
            filename="output.png",
            mime_type="image/png",
            user_id=user.id,
            organisation_id=organisation.id,
        )

        # Verify FileAsset created
        from files.models import FileAsset

        asset = FileAsset.objects.get(id=file_id)
        assert asset.original_name == "output.png"
        assert asset.mime_type == "image/png"
        assert asset.file_size == len(file_content)
        assert asset.uploaded_by_id == user.id
        assert asset.organization_id == organisation.id

    @patch("files.utils.get_storage_backend")
    def test_get_presigned_url(self, mock_backend, user, organisation):
        """Test presigned URL generation."""
        # Mock the storage backend
        mock_backend_instance = Mock()
        mock_backend_instance.get_url.return_value = "https://presigned.example.com/output.png"
        mock_backend.return_value = mock_backend_instance

        # Create FileAsset
        from files.models import FileAsset

        asset = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            original_name="output.png",
            storage_path="storage/path/output.png",
            file_size=1024,
            mime_type="image/png",
        )

        url = GenerationFileService.get_presigned_url(file_id=str(asset.id))

        assert url == "https://presigned.example.com/output.png"
        assert mock_backend_instance.get_url.called

    @patch("files.utils.get_storage_backend")
    def test_delete_file(self, mock_backend, user, organisation):
        """Test file deletion."""
        # Mock the storage backend
        mock_backend_instance = Mock()
        mock_backend.return_value = mock_backend_instance

        # Create FileAsset
        from files.models import FileAsset

        asset = FileAsset.objects.create(
            organization=organisation,
            uploaded_by=user,
            original_name="output.png",
            storage_path="storage/path/output.png",
            file_size=1024,
            mime_type="image/png",
        )

        GenerationFileService.delete_file(file_id=str(asset.id))

        # Verify soft-deleted or removed
        assert not FileAsset.objects.filter(id=asset.id, is_deleted=False).exists()

    def test_file_expiration_cleanup(self, generation_request):
        """Test expired files identified for cleanup."""
        import uuid

        # Create expired output
        expired_output = GenerationOutput.objects.create(
            request=generation_request,
            output_type=OutputType.IMAGE,
            file_id=uuid.uuid4(),
            expires_at=timezone.now() - timezone.timedelta(days=1),
        )

        # Query expired outputs
        expired = GenerationOutput.objects.filter(
            expires_at__lt=timezone.now(), file_id__isnull=False
        )

        assert expired.count() == 1
        assert expired.first().request_id == expired_output.request_id


@pytest.mark.django_db
class TestWebSocketIntegration:
    """Test B23 WebSocket integration (WP06 T050-T051)."""

    @patch("rtc_websockets.services.NotificationService.send_user_notification")
    def test_send_status_update(self, mock_send, generation_request):
        """Test WebSocket status update sent."""
        GenerationWebSocketService.send_status_update(generation_request)

        assert mock_send.called
        call_kwargs = mock_send.call_args.kwargs

        assert call_kwargs["user_id"] == generation_request.requester_id
        assert call_kwargs["message_type"] == "generation_status"
        payload = call_kwargs["payload"]
        assert payload["request_id"] == generation_request.id
        assert payload["status"] == generation_request.status

    @patch("src.generative.services.websocket.settings")
    @patch("rtc_websockets.services.NotificationService.send_user_notification")
    def test_websocket_disabled_via_feature_flag(
        self, mock_send, mock_settings, generation_request
    ):
        """Test WebSocket events disabled via feature flag."""
        mock_settings.GENERATIVE_WEBSOCKET_ENABLED = False

        GenerationWebSocketService.send_status_update(generation_request)

        assert not mock_send.called

    @patch("rtc_websockets.services.NotificationService.send_user_notification")
    def test_websocket_error_handled_gracefully(self, mock_send, generation_request):
        """Test WebSocket errors don't fail the task."""
        mock_send.side_effect = Exception("WebSocket connection failed")

        # Should not raise exception
        GenerationWebSocketService.send_status_update(generation_request)


@pytest.mark.django_db
class TestBrandFileIntegration:
    """Test end-to-end brand + file integration."""

    @patch("files.utils.get_storage_backend")
    def test_template_with_brand_and_file_output(
        self, mock_backend, generation_template, brand_profile, user, organisation
    ):
        """Test template with brand context produces file output."""
        # Mock the storage backend
        mock_backend_instance = Mock()
        mock_backend_instance.save.return_value = "storage/path/logo.png"
        mock_backend.return_value = mock_backend_instance

        # Configure template with brand context
        generation_template.pipeline_config["use_brand_context"] = True
        generation_template.pipeline_config["brand_id"] = str(brand_profile.id)
        generation_template.save()

        # Inject brand context
        input_data = {"prompt": "Generate logo"}
        result = BrandContextService.inject_brand_context(
            input_data,
            generation_template.pipeline_config,
            organisation.id,
        )

        assert "brand" in result
        assert result["brand"]["brand_name"] == brand_profile.name

        # Simulate file output storage
        file_id = GenerationFileService.store_output_file(
            content=b"logo image data",
            filename="logo.png",
            mime_type="image/png",
            user_id=user.id,
            organisation_id=organisation.id,
        )

        # Verify FileAsset created
        from files.models import FileAsset

        asset = FileAsset.objects.get(id=file_id)
        assert asset.original_name == "logo.png"


@pytest.mark.django_db
class TestOutputSerializerPresignedURL:
    """Test presigned URL generation in serializer (WP06 T048)."""

    @patch("files.utils.get_storage_backend")
    def test_presigned_url_generated_for_file_output(self, mock_get_storage, generation_request):
        """Test presigned URL included in serializer output."""
        import uuid
        from files.models import FileAsset
        from src.generative.serializers import GenerationOutputSerializer

        file_id = uuid.uuid4()

        # Create FileAsset the serializer will look up
        FileAsset.objects.create(
            id=file_id,
            organization=generation_request.template.organisation,
            original_name="logo.png",
            storage_path=f"test/{file_id}/logo.png",
            file_size=1024,
            mime_type="image/png",
        )

        # Create output with file
        output = GenerationOutput.objects.create(
            request=generation_request,
            output_type=OutputType.IMAGE,
            file_id=file_id,
        )

        mock_storage = MagicMock()
        mock_storage.get_url.return_value = "https://presigned-url.example.com"
        mock_get_storage.return_value = mock_storage

        serializer = GenerationOutputSerializer(output)

        assert serializer.data["presigned_url"] == "https://presigned-url.example.com"
        assert mock_get_storage.called

    def test_presigned_url_none_for_text_output(self, generation_request):
        """Test presigned URL is None for text outputs."""
        from src.generative.serializers import GenerationOutputSerializer

        # Create text output
        output = GenerationOutput.objects.create(
            request=generation_request,
            output_type=OutputType.TEXT,
            text_content="Generated text",
            file_id=None,
        )

        serializer = GenerationOutputSerializer(output)

        assert serializer.data["presigned_url"] is None
