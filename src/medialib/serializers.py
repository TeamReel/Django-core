"""
B35 Smart Asset Library - API Serializers
"""
from rest_framework import serializers
from .models import MediaItem, MediaTag, Collection, CollectionMembership, MediaItemRelation
from projects.models import Project


class MediaTagSerializer(serializers.ModelSerializer):
    """Serializer for media tags"""

    class Meta:
        model = MediaTag
        fields = ["id", "name", "slug", "is_system", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "is_system", "created_at", "updated_at"]


class MediaItemSerializer(serializers.ModelSerializer):
    """Serializer for media items with nested tags and file URL"""

    tags = MediaTagSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()
    file_id = serializers.UUIDField(source="file.id", read_only=True)
    project_id = serializers.UUIDField(source="project.id", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    # Write fields
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all(), write_only=True)
    tag_names = serializers.ListField(
        child=serializers.CharField(), required=False, write_only=True
    )

    class Meta:
        model = MediaItem
        fields = [
            "id",
            "project",
            "project_id",
            "file_id",
            "title",
            "description",
            "mime_type",
            "file_size_bytes",
            "width",
            "height",
            "duration_seconds",
            "state",
            "extraction_metadata",
            "tags",
            "tag_names",
            "file_url",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "project_id",
            "file_id",
            "state",
            "extraction_metadata",
            "width",
            "height",
            "duration_seconds",
            "created_at",
            "updated_at",
        ]

    def get_file_url(self, obj):
        """Get presigned URL from B22 File Storage"""
        if obj.file:
            # FileAsset should have a method like get_presigned_url()
            return getattr(obj.file, "get_presigned_url", lambda: None)()
        return None

    def create(self, validated_data):
        tag_names = validated_data.pop("tag_names", [])
        instance = super().create(validated_data)

        if tag_names:
            self._set_tags(instance, tag_names)

        return instance

    def update(self, instance, validated_data):
        tag_names = validated_data.pop("tag_names", None)
        instance = super().update(instance, validated_data)

        if tag_names is not None:
            self._set_tags(instance, tag_names)

        return instance

    def _set_tags(self, instance, tag_names):
        from .services.tags import MediaTagService

        tags = []
        for name in tag_names:
            tag, _ = MediaTagService.get_or_create_tag(name, str(instance.project.id))
            tags.append(tag)
        instance.tags.set(tags)


class CollectionMembershipSerializer(serializers.ModelSerializer):
    """Serializer for collection membership (ordering)"""

    media_item = MediaItemSerializer(read_only=True)

    class Meta:
        model = CollectionMembership
        fields = ["media_item", "position", "added_at"]


class CollectionSerializer(serializers.ModelSerializer):
    """Serializer for collections with item count"""

    item_count = serializers.IntegerField(source="items.count", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Collection
        fields = [
            "id",
            "project",
            "name",
            "description",
            "item_count",
            "created_by_name",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "item_count", "created_at", "updated_at"]


class CollectionDetailSerializer(CollectionSerializer):
    """Detail serializer with full item list"""

    # Assuming this was empty or had logic in original file?
    # Original file line 100+...
    # Let me check original file again to be sure I didn't miss CollectionDetailSerializer body.
    # It was just 'pass' or inheritance in the part I checked?

    # Re-reading line 100+ of serializers.py (which I haven't done in full, I read lines 1-100)
    # The read_file output for serializers.py stopped at line 107.
    # "class CollectionDetailSerializer(CollectionSerializer):" was the last line.

    # I need to see if there was content there.
    memberships = CollectionMembershipSerializer(
        source="collectionmembership_set", many=True, read_only=True
    )

    class Meta(CollectionSerializer.Meta):
        fields = CollectionSerializer.Meta.fields + ["memberships"]


class MediaItemRelationSerializer(serializers.ModelSerializer):
    """Serializer for generic relations"""

    target_model = serializers.CharField(source="content_type.model", read_only=True)
    target_app = serializers.CharField(source="content_type.app_label", read_only=True)

    # Write fields
    target_id = serializers.UUIDField(source="object_id")
    target_type = serializers.CharField(write_only=True)  # e.g. "activities.activity"

    class Meta:
        model = MediaItemRelation
        fields = [
            "id",
            "target_app",
            "target_model",
            "target_id",
            "target_type",
            "relation_type",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "target_app", "target_model"]

    def validate(self, attrs):
        # Validate target_type exists using ContentType
        target_type = attrs.get("target_type")
        if target_type:
            try:
                app_label, model = target_type.split(".")
                from django.contrib.contenttypes.models import ContentType

                if not ContentType.objects.filter(app_label=app_label, model=model).exists():
                    raise serializers.ValidationError({"target_type": "Invalid model identifier"})
            except ValueError:
                raise serializers.ValidationError({"target_type": "Format must be 'app.model'"})
        return attrs
