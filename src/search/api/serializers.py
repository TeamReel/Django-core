from rest_framework import serializers
from search.models import SearchEntry


class SearchEntrySerializer(serializers.ModelSerializer):
    content_type = serializers.SerializerMethodField()
    highlight = serializers.CharField(read_only=True, default=None)

    class Meta:
        model = SearchEntry
        fields = [
            "id",
            "title",
            "description",
            "url",
            "image_url",
            "content_type",
            "highlight",
            "object_id",
        ]

    def get_content_type(self, obj):
        return f"{obj.content_type.app_label}.{obj.content_type.model}"
