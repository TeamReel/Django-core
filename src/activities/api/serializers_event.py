"""
ActivityEvent serializers for Activities API.
"""

from activities.models import ActivityEvent
from rest_framework import serializers


class ActivityEventSerializer(serializers.ModelSerializer):
    """Serializer for ActivityEvent.

    Product-agnostic structure (B30): event_type + optional members/projects + JSON data.
    """

    activity = serializers.SerializerMethodField()
    member = serializers.SerializerMethodField()
    related_member = serializers.SerializerMethodField()
    team_project = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    activity_id = serializers.UUIDField(write_only=True)
    member_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    related_member_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    team_project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = ActivityEvent
        fields = [
            "id",
            "activity",
            "activity_id",
            "event_type",
            "minute",
            "occurred_at",
            "member",
            "member_id",
            "related_member",
            "related_member_id",
            "team_project",
            "team_project_id",
            "data",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_activity(self, obj):
        if obj.activity:
            return {
                "id": str(obj.activity.id),
                "title": obj.activity.title,
                "start_time": obj.activity.start_time,
            }
        return None

    def _member_payload(self, member):
        if not member:
            return None
        user = getattr(member, "user", None)
        return {
            "id": str(member.id),
            "user_name": (user.get_full_name() or user.email) if user else None,
        }

    def get_member(self, obj):
        return self._member_payload(obj.member)

    def get_related_member(self, obj):
        return self._member_payload(obj.related_member)

    def get_team_project(self, obj):
        if obj.team_project:
            return {"id": str(obj.team_project.id), "name": obj.team_project.name}
        return None

    def get_created_by(self, obj):
        if obj.created_by:
            return {
                "id": str(obj.created_by.id),
                "name": obj.created_by.get_full_name() or obj.created_by.email,
            }
        return None

    def create(self, validated_data):
        activity_id = validated_data.pop("activity_id")
        member_id = validated_data.pop("member_id", None)
        related_member_id = validated_data.pop("related_member_id", None)
        team_project_id = validated_data.pop("team_project_id", None)

        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        return ActivityEvent.objects.create(
            activity_id=activity_id,
            member_id=member_id,
            related_member_id=related_member_id,
            team_project_id=team_project_id,
            **validated_data,
        )

    def update(self, instance, validated_data):
        # Allow changing associations (keeps it flexible for generic use-cases)
        activity_id = validated_data.pop("activity_id", None)
        if activity_id is not None:
            instance.activity_id = activity_id

        member_id = validated_data.pop("member_id", None) if "member_id" in validated_data else None
        if "member_id" in validated_data:
            instance.member_id = member_id

        related_member_id = (
            validated_data.pop("related_member_id", None)
            if "related_member_id" in validated_data
            else None
        )
        if "related_member_id" in validated_data:
            instance.related_member_id = related_member_id

        team_project_id = (
            validated_data.pop("team_project_id", None)
            if "team_project_id" in validated_data
            else None
        )
        if "team_project_id" in validated_data:
            instance.team_project_id = team_project_id

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
