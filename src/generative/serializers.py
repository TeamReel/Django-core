"""DRF serializers for B34 Generative Pipelines.

This module defines REST API serializers with validation for:
- GenerationTemplate: JSON Schema validation, provider config checks
- GenerationRequest: Input data validation against template schema
- GenerationOutput: Presigned URL generation for file outputs

Constitution Principle VII: DRF standards with consistent error responses.
"""

from decimal import Decimal
from typing import Any

import jsonschema
from rest_framework import serializers

from .models import (
    GenerationOutput,
    GenerationRequest,
    GenerationTemplate,
    OutputType,
    ProviderChoices,
)


class GenerationTemplateSerializer(serializers.ModelSerializer):
    """Template serializer with JSON Schema and provider validation."""

    created_by_username = serializers.CharField(source="created_by.username", read_only=True)
    organisation_name = serializers.CharField(source="organisation.name", read_only=True)
    parent_template_name = serializers.CharField(
        source="parent_template.name", read_only=True, allow_null=True
    )
    provider = serializers.SerializerMethodField()
    estimated_cost = serializers.SerializerMethodField()

    class Meta:
        model = GenerationTemplate
        fields = [
            "id",
            "organisation",
            "organisation_name",
            "name",
            "slug",
            "version",
            "parent_template",
            "parent_template_name",
            "is_latest",
            "description",
            "template_type",
            "template_subtype",
            "input_schema",
            "pipeline_config",
            "provider",
            "estimated_cost",
            "retention_days",
            "is_active",
            "created_at",
            "updated_at",
            "created_by",
            "created_by_username",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "created_by",
            "organisation",
        ]

    def get_provider(self, obj: GenerationTemplate) -> str | None:
        """Extract provider from pipeline_config."""
        return obj.provider

    def get_estimated_cost(self, obj: GenerationTemplate) -> Decimal:
        """Extract estimated cost from pipeline_config."""
        return obj.estimated_cost

    def validate_input_schema(self, value: dict[str, Any]) -> dict[str, Any]:
        """Validate that input_schema is valid JSON Schema Draft 7."""
        try:
            jsonschema.Draft7Validator.check_schema(value)
        except jsonschema.SchemaError as e:
            raise serializers.ValidationError(f"Invalid JSON Schema: {e.message}") from None
        return value

    def validate_pipeline_config(self, value: dict[str, Any]) -> dict[str, Any]:
        """Validate pipeline_config has required keys per provider.

        WP06 T052: Support brand configuration in pipeline_config.

        Brand context options (optional):
            - use_brand_context (bool): Enable brand injection
            - brand_id (int): Specific brand ID (defaults to organisation default)
        """
        provider = value.get("provider")

        # Validate provider exists
        if provider not in [c.value for c in ProviderChoices]:
            valid = ", ".join([c.value for c in ProviderChoices])
            raise serializers.ValidationError(
                f"Invalid provider: '{provider}'. Must be one of: {valid}"
            )

        # Provider-specific validation
        if provider == ProviderChoices.OPENAI and "model" not in value:
            raise serializers.ValidationError("OpenAI provider requires 'model' in pipeline_config")
        elif provider == ProviderChoices.LANGGRAPH and "graph_id" not in value:
            raise serializers.ValidationError(
                "LangGraph provider requires 'graph_id' in pipeline_config"
            )

        # Validate estimated_cost if present
        if "estimated_cost" in value:
            try:
                cost = Decimal(str(value["estimated_cost"]))
                if cost < 0:
                    raise serializers.ValidationError("estimated_cost must be non-negative")
            except (ValueError, TypeError):
                raise serializers.ValidationError("estimated_cost must be a valid number") from None

        # WP06 T052: Validate brand configuration if present
        if value.get("use_brand_context") and "brand_id" in value:
            try:
                brand_id = int(value["brand_id"])
                if brand_id < 1:
                    raise ValueError("brand_id must be positive")
            except (ValueError, TypeError):
                raise serializers.ValidationError("brand_id must be a valid positive integer") from None

        return value

    def validate_version(self, value: str) -> str:
        """Validate semantic version format."""
        import re

        SEMVER_REGEX = re.compile(
            r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
        )
        if not SEMVER_REGEX.match(value):
            raise serializers.ValidationError(
                f"Invalid version format: '{value}'. Use semantic versioning (e.g., 1.0.0)"
            )
        return value


class GenerationRequestSerializer(serializers.ModelSerializer):
    """Request serializer with status tracking and input validation."""

    template_name = serializers.CharField(source="template.name", read_only=True)
    template_version = serializers.CharField(read_only=True)
    requester_username = serializers.CharField(source="requester.username", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True, allow_null=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    error_category_display = serializers.CharField(
        source="get_error_category_display", read_only=True, allow_null=True
    )
    has_output = serializers.SerializerMethodField()

    class Meta:
        model = GenerationRequest
        fields = [
            "id",
            "template",
            "template_name",
            "template_version",
            "requester",
            "requester_username",
            "project",
            "project_name",
            "status",
            "status_display",
            "input_data",
            "retry_count",
            "error_category",
            "error_category_display",
            "error_message",
            "estimated_cost",
            "actual_cost",
            "transaction_id",
            "metadata",
            "created_at",
            "started_at",
            "completed_at",
            "has_output",
        ]
        read_only_fields = [
            "id",
            "template_version",
            "requester",
            "status",
            "retry_count",
            "error_category",
            "error_message",
            "actual_cost",
            "transaction_id",
            "metadata",
            "created_at",
            "started_at",
            "completed_at",
        ]

    def get_has_output(self, obj: GenerationRequest) -> bool:
        """Check if request has output."""
        return hasattr(obj, "output")

    def validate_input_data(self, value: dict[str, Any]) -> dict[str, Any]:
        """Validate input_data matches template's input_schema."""
        # Get template from request data or context
        template_id = self.initial_data.get("template")
        if not template_id and self.instance:
            template_id = self.instance.template_id

        if template_id:
            try:
                template = GenerationTemplate.objects.get(id=template_id)
                # Validate against template's JSON Schema
                jsonschema.validate(value, template.input_schema)
            except GenerationTemplate.DoesNotExist:
                raise serializers.ValidationError("Template does not exist") from None
            except jsonschema.ValidationError as e:
                raise serializers.ValidationError(f"Input data validation failed: {e.message}") from None

        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Cross-field validation."""
        template = attrs.get("template")

        # Ensure template is active
        if template and not template.is_active:
            raise serializers.ValidationError({"template": "Template is not active"})

        # Validate project membership (if project specified)
        project = attrs.get("project")
        if project:
            request = self.context.get("request")
            if request and request.user:
                from projects.models import ProjectMembership

                if not ProjectMembership.objects.filter(
                    project=project, user=request.user
                ).exists():
                    raise serializers.ValidationError(
                        {"project": "User is not a member of this project"}
                    )

        return attrs


class GenerationOutputSerializer(serializers.ModelSerializer):
    """Output serializer with presigned URL support."""

    request_id = serializers.IntegerField(source="request.id", read_only=True)
    output_type_display = serializers.CharField(source="get_output_type_display", read_only=True)
    presigned_url = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = GenerationOutput
        fields = [
            "request",
            "request_id",
            "output_type",
            "output_type_display",
            "file_id",
            "text_content",
            "metadata",
            "presigned_url",
            "storage_info",
            "expires_at",
            "is_expired",
            "created_at",
        ]
        read_only_fields = [
            "request",
            "expires_at",
            "created_at",
        ]

    storage_info = serializers.SerializerMethodField()

    def get_storage_info(self, obj: GenerationOutput) -> dict | None:
        """Get storage location info for file outputs.

        Returns details about where the file is stored for debugging/transparency.
        """
        if not obj.file_id:
            return None

        try:
            from files.utils import get_storage_backend

            # Use bulk-prefetched asset from context (avoids N+1)
            file_assets = self.context.get("file_assets", {})
            asset = file_assets.get(str(obj.file_id))
            if not asset:
                from files.models import FileAsset

                asset = FileAsset.objects.get(id=obj.file_id, is_deleted=False)

            storage = get_storage_backend()

            return {
                "storage_backend": storage.__class__.__name__,
                "storage_path": asset.storage_path,
                "original_name": asset.original_name,
                "file_size_bytes": asset.file_size,
                "file_size_kb": round(asset.file_size / 1024, 1),
                "mime_type": asset.mime_type,
                "created_at": asset.created_at.isoformat(),
            }
        except Exception:
            return {"error": "Could not retrieve storage info"}

    def get_presigned_url(self, obj: GenerationOutput) -> str | None:
        """Generate presigned URL for file_id if exists.

        WP06 T048: Presigned URLs for file downloads.
        """
        if obj.file_id:
            try:
                # Use bulk-prefetched asset from context (avoids N+1)
                file_assets = self.context.get("file_assets", {})
                asset = file_assets.get(str(obj.file_id))
                if not asset:
                    from files.models import FileAsset

                    asset = FileAsset.objects.get(id=obj.file_id, is_deleted=False)

                from files.utils import get_storage_backend

                storage = get_storage_backend()
                return storage.get_url(asset.storage_path, signed=True)
            except Exception as e:
                # Log error but don't fail serialization
                import logging

                logger = logging.getLogger("generative.serializers")
                logger.error(
                    f"Failed to generate presigned URL for file_id={obj.file_id}: {e}",
                    exc_info=True,
                )
                return None
        return None

    def get_is_expired(self, obj: GenerationOutput) -> bool:
        """Check if output has expired."""
        if not obj.expires_at:
            return False

        from django.utils import timezone

        return timezone.now() > obj.expires_at

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """Validate that file_id or text_content exists (XOR)."""
        file_id = attrs.get("file_id")
        text_content = attrs.get("text_content")

        if not file_id and not text_content:
            raise serializers.ValidationError("Output must have either file_id or text_content")

        if file_id and text_content:
            raise serializers.ValidationError("Output cannot have both file_id and text_content")

        # Validate output_type consistency
        output_type = attrs.get("output_type")
        if output_type in [OutputType.IMAGE, OutputType.VIDEO] and not file_id:
            raise serializers.ValidationError(f"{output_type} output requires file_id")
        elif output_type in [OutputType.TEXT, OutputType.JSON] and not text_content:
            raise serializers.ValidationError(f"{output_type} output requires text_content")

        return attrs
