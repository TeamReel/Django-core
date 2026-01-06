"""
DRF serializers for Activities & Period Hierarchy API.
"""

from rest_framework import serializers
from activities.models import Period


class PeriodSerializer(serializers.ModelSerializer):
    """
    Serializer for Period model with nested representations and validation.

    Read fields include nested organisation, project, parent_period, created_by.
    Write fields use _id suffix for foreign key assignments.
    """

    # Nested read-only representations
    organisation = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    parent_period = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    # Annotated counts (populated by ViewSet queryset annotation)
    children_count = serializers.IntegerField(read_only=True, required=False)
    activities_count = serializers.IntegerField(read_only=True, required=False)

    # Write fields (use _id suffix for FK assignment)
    organisation_id = serializers.UUIDField(write_only=True)
    project_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    parent_period_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Period
        fields = [
            "id",
            "organisation",
            "organisation_id",
            "project",
            "project_id",
            "parent_period",
            "parent_period_id",
            "name",
            "description",
            "start_date",
            "end_date",
            "data",
            "created_at",
            "updated_at",
            "created_by",
            "children_count",
            "activities_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_organisation(self, obj):
        """Return nested organisation representation"""
        if obj.organisation:
            return {"id": str(obj.organisation.id), "name": obj.organisation.name}
        return None

    def get_project(self, obj):
        """Return nested project representation"""
        if obj.project:
            return {"id": str(obj.project.id), "name": obj.project.name}
        return None

    def get_parent_period(self, obj):
        """Return nested parent period representation"""
        if obj.parent_period:
            return {
                "id": str(obj.parent_period.id),
                "name": obj.parent_period.name,
                "start_date": obj.parent_period.start_date,
                "end_date": obj.parent_period.end_date,
            }
        return None

    def get_created_by(self, obj):
        """Return nested user representation"""
        if obj.created_by:
            return {
                "id": str(obj.created_by.id),
                "name": obj.created_by.get_full_name() or obj.created_by.username,
            }
        return None

    def validate(self, data):
        """
        Validate:
        1. end_date > start_date
        2. If parent_period set, child organisation must match parent organisation
        """
        start_date = data.get("start_date")
        end_date = data.get("end_date")

        # Validate date range
        if end_date and start_date and end_date <= start_date:
            raise serializers.ValidationError({"end_date": "End date must be after start date"})

        # Validate parent-child organisation matching
        parent_period_id = data.get("parent_period_id")
        organisation_id = data.get("organisation_id")

        if parent_period_id:
            try:
                parent = Period.objects.get(id=parent_period_id)
                if str(parent.organisation_id) != str(organisation_id):
                    raise serializers.ValidationError(
                        {
                            "parent_period_id": "Child period must belong to same organisation as parent"
                        }
                    )
            except Period.DoesNotExist:
                raise serializers.ValidationError(
                    {"parent_period_id": "Parent period does not exist"}
                )

        return data

    def create(self, validated_data):
        """Create new period with FK assignment"""
        # Extract write-only FK fields
        organisation_id = validated_data.pop("organisation_id")
        project_id = validated_data.pop("project_id", None)
        parent_period_id = validated_data.pop("parent_period_id", None)

        # Set request user as created_by
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        # Create period
        period = Period.objects.create(
            organisation_id=organisation_id,
            project_id=project_id,
            parent_period_id=parent_period_id,
            **validated_data,
        )

        return period

    def update(self, instance, validated_data):
        """Update period (FK fields are immutable after creation)"""
        # Remove write-only FK fields (don't allow changing FKs after creation)
        validated_data.pop("organisation_id", None)
        validated_data.pop("project_id", None)
        validated_data.pop("parent_period_id", None)

        # Update mutable fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
