"""
DRF serializers for Activities & Period Hierarchy API.
"""

from rest_framework import serializers
from activities.models import Period, Activity, Participation


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
    project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
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
                "name": obj.created_by.get_full_name() or obj.created_by.email,
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


class ActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for Activity model with timezone-aware datetime handling.

    Provides nested representations and soft warnings for date range validation.
    """

    # Nested read-only representations
    project = serializers.SerializerMethodField()
    period = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    # Write fields (use _id suffix for FK assignment)
    project_id = serializers.IntegerField(write_only=True)
    period_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Activity
        fields = [
            "id",
            "project",
            "project_id",
            "period",
            "period_id",
            "title",
            "activity_type",
            "start_time",
            "end_time",
            "location",
            "description",
            "data",
            "created_at",
            "updated_at",
            "created_by",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_project(self, obj):
        """Return nested project representation"""
        if obj.project:
            return {"id": str(obj.project.id), "name": obj.project.name}
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
        1. end_time > start_time
        2. Soft warning if activity scheduled outside period date range
        """
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        # Validate time range
        if end_time and start_time and end_time <= start_time:
            raise serializers.ValidationError({"end_time": "End time must be after start time"})

        # Soft warning if activity outside period date range
        period_id = data.get("period_id")
        if period_id and start_time:
            try:
                period = Period.objects.get(id=period_id)
                activity_date = start_time.date()

                if not (period.start_date <= activity_date <= period.end_date):
                    # Store as non-field warning (doesn't block save)
                    if not hasattr(self, "warnings"):
                        self.warnings = []
                    self.warnings.append(
                        f"Activity scheduled outside period date range "
                        f"({period.start_date} to {period.end_date})"
                    )
            except Period.DoesNotExist:
                raise serializers.ValidationError({"period_id": "Period does not exist"})

        return data

    def create(self, validated_data):
        """Create new activity with FK assignment"""
        # Extract write-only FK fields
        project_id = validated_data.pop("project_id")
        period_id = validated_data.pop("period_id")

        # Set request user as created_by
        request = self.context.get("request")
        if request and hasattr(request, "user"):
            validated_data["created_by"] = request.user

        # Create activity
        activity = Activity.objects.create(
            project_id=project_id,
            period_id=period_id,
            **validated_data,
        )

        return activity

    def update(self, instance, validated_data):
        """Update activity (FK fields are immutable after creation)"""
        # Remove write-only FK fields (don't allow changing FKs after creation)
        validated_data.pop("project_id", None)
        validated_data.pop("period_id", None)

        # Update mutable fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()
        return instance


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
