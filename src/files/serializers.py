from files.models import FileAsset
from rest_framework import serializers


class FileAssetSerializer(serializers.ModelSerializer):
    """
    Serializer for reading FileAsset details.
    Includes storage_path and optionally a presigned URL for private files.
    """

    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)
    presigned_url = serializers.SerializerMethodField()

    class Meta:
        model = FileAsset
        fields = [
            "id",
            "organization",
            "uploaded_by",
            "uploaded_by_name",
            "original_name",
            "storage_path",
            "file_size",
            "mime_type",
            "is_public",
            "presigned_url",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_presigned_url(self, obj):
        """Generate a presigned URL for private files."""
        if obj.is_public:
            # Public files don't need presigned URLs (direct S3 URL works)
            return None
        try:
            from files.storage import get_storage_backend

            backend = get_storage_backend()
            return backend.url(obj.storage_path, expire_seconds=3600)
        except Exception:
            return None


class FileUploadSerializer(serializers.Serializer):
    """
    Serializer for file uploads.
    """

    file = serializers.FileField()
    is_public = serializers.BooleanField(default=False, required=False)
