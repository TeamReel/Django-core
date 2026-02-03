"""DRF serializers for hierarchy API responses."""

from __future__ import annotations

from rest_framework import serializers


class HierarchyNodeSerializer(serializers.Serializer):
    """
    Serializer for hierarchy tree nodes.

    Supports recursive structure for nested children.
    Matches the HierarchyNode schema in contracts/openapi.yaml.

    Usage:
        node = HierarchyNode(id="1", type="project", title="My Project")
        serializer = HierarchyNodeSerializer(node)
        json_data = serializer.data  # Dict ready for JSON response
    """

    id = serializers.CharField(required=True)
    type = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    url = serializers.CharField(required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_null=True)

    # Recursive field for children (handled in to_representation)
    children = serializers.ListField(child=serializers.DictField(), required=False, default=list)

    def validate_id(self, value: str) -> str:
        """
        Ensure id is non-empty.

        Args:
            value: The id value to validate

        Returns:
            Validated id as string

        Raises:
            ValidationError: If id is empty or whitespace only
        """
        if not value or not str(value).strip():
            raise serializers.ValidationError("Node id cannot be empty")
        return str(value)

    def validate_type(self, value: str) -> str:
        """
        Ensure type is non-empty.

        Args:
            value: The type value to validate

        Returns:
            Validated type string

        Raises:
            ValidationError: If type is empty or whitespace only
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Node type cannot be empty")
        return value

    def validate_title(self, value: str) -> str:
        """
        Ensure title is non-empty.

        Args:
            value: The title value to validate

        Returns:
            Validated title string

        Raises:
            ValidationError: If title is empty or whitespace only
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Node title cannot be empty")
        return value

    def to_representation(self, instance):
        """
        Custom representation to handle recursive children.

        Filters out None values for optional fields and recursively
        serializes child nodes.

        Args:
            instance: HierarchyNode dataclass instance

        Returns:
            Dictionary representation for JSON serialization
        """
        data = {
            "id": str(instance.id),
            "type": instance.type,
            "title": instance.title,
        }

        # Add optional fields only if they have values
        if instance.url:
            data["url"] = instance.url

        if instance.description:
            data["description"] = instance.description

        # Recursively serialize children
        if instance.children:
            data["children"] = self.get_children_representation(instance)

        return data

    def get_children_representation(self, instance) -> list[dict]:
        """
        Helper to serialize children recursively.

        Separated for clarity and potential performance optimization.

        Args:
            instance: HierarchyNode with children attribute

        Returns:
            List of serialized child node dictionaries
        """
        if not instance.children:
            return []

        return [self.to_representation(child) for child in instance.children]


class HierarchyAnchorSerializer(serializers.Serializer):
    """
    Serializer for hierarchy anchor metadata.

    Describes the entity chosen as the root of the hierarchy.
    Anchor data typically comes from search results (dict format).

    Usage:
        anchor_data = {
            'id': '123',
            'type': 'organisation',
            'title': 'ACME Corp',
            'url': '/orgs/123',
            'score': 0.95
        }
        serializer = HierarchyAnchorSerializer(anchor_data)
        json_data = serializer.data
    """

    id = serializers.CharField(required=True)
    type = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    url = serializers.CharField(required=False, allow_null=True)
    score = serializers.FloatField(required=False, allow_null=True)

    def validate_id(self, value: str) -> str:
        """Ensure anchor id is non-empty."""
        if not value or not str(value).strip():
            raise serializers.ValidationError("Anchor id cannot be empty")
        return str(value)

    def validate_type(self, value: str) -> str:
        """Ensure anchor type is non-empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Anchor type cannot be empty")
        return value

    def validate_title(self, value: str) -> str:
        """Ensure anchor title is non-empty."""
        if not value or not value.strip():
            raise serializers.ValidationError("Anchor title cannot be empty")
        return value

    def to_representation(self, instance):
        """
        Convert anchor data to dictionary.

        Handles both dict and object attribute access patterns.
        Filters out None values for optional fields.

        Args:
            instance: Dict or object with anchor attributes

        Returns:
            Dictionary representation for JSON serialization
        """
        # Support both dict and object access
        if isinstance(instance, dict):
            data = {
                "id": str(instance.get("id", "")),
                "type": instance.get("type", ""),
                "title": instance.get("title", ""),
            }

            if "url" in instance and instance["url"]:
                data["url"] = instance["url"]

            if "score" in instance and instance["score"] is not None:
                data["score"] = float(instance["score"])
        else:
            # Object attribute access
            data = {
                "id": str(getattr(instance, "id", "")),
                "type": getattr(instance, "type", ""),
                "title": getattr(instance, "title", ""),
            }

            url = getattr(instance, "url", None)
            if url:
                data["url"] = url

            score = getattr(instance, "score", None)
            if score is not None:
                data["score"] = float(score)

        return data
