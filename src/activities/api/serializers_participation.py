"""
Participation serializers for Activities API.
"""

from rest_framework import serializers

from activities.models import Activity, Participation, Period


class ParticipationSerializer(serializers.ModelSerializer):
    """
    Serializer for Participation model with XOR constraint validation.

    Enforces that participation links to EITHER activity OR period, never both or neither.
    """

    # Nested read-only representations
    member = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()
    period = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    # Write fields (use _id suffix for FK assignment)
    member_id = serializers.UUIDField(write_only=True)
    activity_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    period_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Participation
        fields = [
            "id",
            "member",
            "member_id",
            "activity",
            "activity_id",
            "period",
            "period_id",
            "role",
            "status",
            "notes",
            "data",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_member(self, obj):
        """Return nested member representation"""
        if obj.member:
            return {
                "id": str(obj.member.id),
                "user_name": (
                    obj.member.user.get_full_name() or obj.member.user.email
                    if obj.member.user
                    else None
                ),
            }
        return None

    def get_activity(self, obj):
        """Return nested activity representation"""
        if obj.activity:
            return {
                "id": str(obj.activity.id),
                "title": obj.activity.title,
                "start_time": obj.activity.start_time,
            }
        return None

    def get_period(self, obj):
        """Return nested period representation"""
        if obj.period:
            return {
                "id": str(obj.period.id),
                "name": obj.period.name,
                "start_date": obj.period.start_date,
                "end_date": obj.period.end_date,
            }
        return None

    def get_created_by(self, obj):
        """Return nested user representation"""
        if obj.created_by:
            return {
                "id": str(obj.created_by.id),
                "name": obj.created_by.get_full_name() or obj.created_by.email,
            }
        return None

    def validate(self, data):
        """
        Validate:
        1. XOR constraint: Exactly one of (activity_id, period_id) must be set
        2. Member organisation matches activity/period organisation
        """
        # For updates, check instance if fields not in data
        if self.instance:
            activity_id = data.get(
                "activity_id", self.instance.activity_id if self.instance.activity else None
            )
            period_id = data.get(
                "period_id", self.instance.period_id if self.instance.period else None
            )
        else:
            activity_id = data.get("activity_id")
            period_id = data.get("period_id")

        # XOR logic: exactly one must be set
        if (activity_id and period_id) or (not activity_id and not period_id):
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "Participation must link to exactly one of (activity, period)"
                    ]
                }
            )

        # Verify member organisation matches activity/period organisation
        member_id = data.get("member_id")
        if member_id:
            try:
                from organisations.models import Membership

                member = Membership.objects.select_related("organisation").get(id=member_id)

                if activity_id:
                    activity = Activity.objects.select_related(
                        "project__organisation", "period__organisation"
                    ).get(id=activity_id)
                    # Activity's organisation comes from period
                    activity_org_id = activity.period.organisation_id if activity.period else None
                    if activity_org_id and str(member.organisation_id) != str(activity_org_id):
                        raise serializers.ValidationError(
                            {
                                "member_id": "Member must belong to same organisation as activity's period"
                            }
                        )

                if period_id:
                    period = Period.objects.get(id=period_id)
                    if str(member.organisation_id) != str(period.organisation_id):
                        raise serializers.ValidationError(
                            {"member_id": "Member must belong to same organisation as period"}
                        )

            except Membership.DoesNotExist:
                raise serializers.ValidationError({"member_id": "Member does not exist"})
            except Activity.DoesNotExist:
                raise serializers.ValidationError({"activity_id": "Activity does not exist"})
            except Period.DoesNotExist:
                raise serializers.ValidationError({"period_id": "Period does not exist"})

        return data

    def create(self, validated_data):
        """Create new participation with FK assignment"""
        # Extract write-only FK fields
        member_id = validated_data.pop("member_id")
        activity_id = validated_data.pop("activity_id", None)
        period_id = validated_data.pop("period_id", None)

        # Set request user as created_by
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        # Create participation
        participation = Participation.objects.create(
            member_id=member_id,
            activity_id=activity_id,
            period_id=period_id,
            **validated_data,
        )

        return participation

    def update(self, instance, validated_data):
        """Update participation (FK fields are immutable after creation)"""
        # Remove write-only FK fields (don't allow changing FKs after creation)
        validated_data.pop("member_id", None)
        validated_data.pop("activity_id", None)
        validated_data.pop("period_id", None)

        # Update mutable fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance
