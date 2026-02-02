"""
B35 Smart Asset Library - API Serializers
"""
from rest_framework import serializers
from .models import MediaItem, MediaTag, Collection, CollectionMembership


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

    class Meta:
        model = MediaItem
        fields = [
            "id",
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

    memberships = CollectionMembershipSerializer(
        source="collectionmembership_set", many=True, read_only=True
    )

    class Meta(CollectionSerializer.Meta):
        fields = CollectionSerializer.Meta.fields + ["memberships"]
