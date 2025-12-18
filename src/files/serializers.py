from rest_framework import serializers

from files.models import FileAsset


class FileAssetSerializer(serializers.ModelSerializer):
    """
    Serializer for reading FileAsset details.
    """

    uploaded_by_name = serializers.CharField(source="uploaded_by.get_full_name", read_only=True)

    class Meta:
        model = FileAsset
        fields = [
            "id",
            "organization",
            "uploaded_by",
            "uploaded_by_name",
            "original_name",
            "file_size",
            "mime_type",
            "is_public",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class FileUploadSerializer(serializers.Serializer):
    """
    Serializer for file uploads.
    """

    file = serializers.FileField()
    is_public = serializers.BooleanField(default=False, required=False)
