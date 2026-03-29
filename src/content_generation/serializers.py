"""
B31 Content Templates & Generation - DRF Serializers

Serializers for ContentTemplate, ContentItem, and ContentApproval models
with nested relationships and validation logic.
"""

import logging

from rest_framework import serializers

from .models import ContentApproval, ContentItem, ContentTemplate

logger = logging.getLogger(__name__)


class ContentTemplateSerializer(serializers.ModelSerializer):
    """Serializer for ContentTemplate model"""

    created_by_detail = serializers.SerializerMethodField()
    organisation_detail = serializers.SerializerMethodField()
    project_detail = serializers.SerializerMethodField()
    sport_detail = serializers.SerializerMethodField()
    formation_detail = serializers.SerializerMethodField()

    class Meta:
        model = ContentTemplate
        fields = [
            "id",
            "name",
            "description",
            "template_type",
            "template_subtype",
            "sport_type",
            "sport",
            "sport_detail",
            "formation",
            "formation_detail",
            "style_variant",
            "input_requirements",
            "ai_workflow_id",
            "template_settings",
            "timeout_minutes",
            "is_active",
            "credits_required",
            "organisation",
            "organisation_detail",
            "project",
            "project_detail",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_by", "created_at", "updated_at"]

    def get_created_by_detail(self, obj):
        if obj.created_by:
            return {"id": obj.created_by.id, "username": obj.created_by.username}
        return None

    def get_organisation_detail(self, obj):
        if obj.organisation:
            return {"id": obj.organisation.id, "name": obj.organisation.name}
        return None

    def get_project_detail(self, obj):
        if obj.project:
            return {"id": obj.project.id, "name": obj.project.name}
        return None

    def get_sport_detail(self, obj):
        if obj.sport:
            return {
                "id": obj.sport.id,
                "name": obj.sport.name,
                "slug": obj.sport.slug,
                "parent_sport_id": obj.sport.parent_sport_id,
            }
        return None

    def get_formation_detail(self, obj):
        if obj.formation:
            return {
                "id": obj.formation.id,
                "code": obj.formation.code,
                "name": obj.formation.name,
            }
        return None

    def validate_timeout_minutes(self, value):
        """Validate timeout is within reasonable bounds (1-1440 minutes / 24 hours)"""
        if value is not None and (value < 1 or value > 1440):
            raise serializers.ValidationError(
                "Timeout must be between 1 and 1440 minutes (24 hours)"
            )
        return value

    def validate_template_settings(self, value):
        """Validate template_settings is a valid JSON object"""
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("template_settings must be a valid JSON object")
        return value

    def validate_input_requirements(self, value):
        """Validate input_requirements is a valid JSON object"""
        logger.info(
            f"validate_input_requirements called with value type: {type(value)}, value: {value}"
        )
        if value is not None and not isinstance(value, dict):
            raise serializers.ValidationError("input_requirements must be a valid JSON object")
        return value if value is not None else {}

    def validate(self, attrs):
        """Log all incoming attributes for debugging."""
        logger.info(f"ContentTemplateSerializer.validate() called with attrs: {attrs}")
        return super().validate(attrs)

    def update(self, instance, validated_data):
        """Log update operation for debugging."""
        logger.info(
            f"ContentTemplateSerializer.update() called"
            f" for {instance.id} with data: {validated_data}"
        )
        try:
            # Handle each field explicitly to catch specific errors
            for attr, value in validated_data.items():
                logger.info(f"Setting {attr} = {value} (type: {type(value).__name__})")
                setattr(instance, attr, value)
            instance.save()
            logger.info(f"ContentTemplateSerializer.update() succeeded for {instance.id}")
            return instance
        except Exception as e:
            logger.exception(f"ContentTemplateSerializer.update() FAILED for {instance.id}: {e}")
            raise

    def validate_sport_type(self, value):
        """
        Validate sport_type against B32 Sport Config if available.

        Falls back to accepting any value if B32 is not installed.
        """
        if value:
            try:
                from sport_configuration.models import Sport

                if not Sport.objects.filter(slug=value).exists():
                    raise serializers.ValidationError(f"Invalid sport_type: {value}")
            except ImportError:
                # B32 not installed, skip validation
                pass
        return value


class ContentItemSerializer(serializers.ModelSerializer):
    """Serializer for ContentItem with nested relationships"""

    template = serializers.PrimaryKeyRelatedField(
        queryset=ContentTemplate.objects.filter(is_active=True)
    )
    template_detail = serializers.SerializerMethodField()
    activity_detail = serializers.SerializerMethodField()
    output_file_detail = serializers.SerializerMethodField()
    created_by_detail = serializers.SerializerMethodField()
    approval_history = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()

    class Meta:
        model = ContentItem
        fields = [
            "id",
            "template",
            "template_detail",
            "project",
            "activity",
            "activity_detail",
            "status",
            "input_data",
            "output_file",
            "output_file_detail",
            "thumbnail_url",
            "error_message",
            "metadata",
            "created_by",
            "created_by_detail",
            "created_at",
            "updated_at",
            "deleted_at",
            "approval_history",
        ]
        read_only_fields = [
            "status",
            "output_file",
            "error_message",
            "metadata",
            "created_by",
            "created_at",
            "updated_at",
            "deleted_at",
        ]

    def get_template_detail(self, obj):
        return {
            "id": obj.template.id,
            "name": obj.template.name,
            "template_type": obj.template.template_type,
        }

    def get_activity_detail(self, obj):
        if obj.activity:
            return {"id": obj.activity.id, "name": obj.activity.name}
        return None

    def get_output_file_detail(self, obj):
        if obj.output_file:
            return {
                "id": obj.output_file.id,
                "url": obj.output_file.file.url if obj.output_file.file else None,
                "file_size": obj.output_file.file_size,
                "mime_type": obj.output_file.mime_type,
            }
        return None

    def get_created_by_detail(self, obj):
        return {"id": obj.created_by.id, "username": obj.created_by.username}

    def get_approval_history(self, obj):
        approvals = obj.contentapproval_set.all().order_by("-reviewed_at")
        return ContentApprovalSerializer(approvals, many=True).data

    def get_thumbnail_url(self, obj):
        """Return thumbnail URL from output_file if available."""
        if obj.output_file and hasattr(obj.output_file, "thumbnail") and obj.output_file.thumbnail:
            return obj.output_file.thumbnail.url
        return None

    def validate_template(self, value):
        """Ensure template is active"""
        if not value.is_active:
            raise serializers.ValidationError("Template is not active")
        return value

    def validate_input_data(self, value):
        """Basic validation - schema validation can be added per template type"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("input_data must be a valid JSON object")
        return value


class ContentApprovalSerializer(serializers.ModelSerializer):
    """Serializer for ContentApproval model"""

    reviewer_detail = serializers.SerializerMethodField()
    content_item_detail = serializers.SerializerMethodField()

    class Meta:
        model = ContentApproval
        fields = [
            "id",
            "content_item",
            "content_item_detail",
            "reviewer",
            "reviewer_detail",
            "status",
            "feedback_text",
            "reviewed_at",
        ]
        read_only_fields = ["reviewer", "reviewed_at"]

    def get_reviewer_detail(self, obj):
        return {"id": obj.reviewer.id, "username": obj.reviewer.username}

    def get_content_item_detail(self, obj):
        return {
            "id": obj.content_item.id,
            "template_name": obj.content_item.template.name,
            "status": obj.content_item.status,
        }

    def validate(self, attrs):
        """Ensure feedback is provided for rejected/revision_requested"""
        status = attrs.get("status")
        feedback = attrs.get("feedback_text", "").strip()

        if status in ["rejected", "revision_requested"] and not feedback:
            raise serializers.ValidationError(
                {"feedback_text": f"Feedback is required for {status}"}
            )

        return attrs
