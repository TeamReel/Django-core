"""
DRF serializers for Activities & Period Hierarchy API.
"""

from activities.models import ActivityEvent
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
    sport = serializers.SerializerMethodField()

    # Annotated counts (populated by ViewSet queryset annotation). These are
    # SerializerMethodFields so missing annotations never crash production.
    children_count = serializers.SerializerMethodField()
    activities_count = serializers.SerializerMethodField()
    matches_count = serializers.SerializerMethodField()
    children_activities_count = serializers.SerializerMethodField()
    children_matches_count = serializers.SerializerMethodField()
    matches_total_count = serializers.SerializerMethodField()
    members_count = serializers.SerializerMethodField()

    # NOTE: We cannot declare a serializer field named "data" because DRF
    # reserves `.data` for the serialized representation property.
    # We expose model.metadata as API key "data" via (de)serialization hooks.
    metadata = serializers.JSONField(required=False, default=dict)

    # Write fields (use _id suffix for FK assignment)
    organisation_id = serializers.UUIDField(write_only=True)
    project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    parent_period_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    sport_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

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
            "sport",
            "sport_id",
            "period_type",
            "name",
            "description",
            "start_date",
            "end_date",
            "metadata",
            "created_at",
            "updated_at",
            "created_by",
            "children_count",
            "activities_count",
            "matches_count",
            "children_activities_count",
            "children_matches_count",
            "matches_total_count",
            "members_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_children_count(self, obj):
        return int(getattr(obj, "children_count", 0) or 0)

    def get_activities_count(self, obj):
        return int(getattr(obj, "activities_count", 0) or 0)

    def get_matches_count(self, obj):
        return int(getattr(obj, "matches_count", 0) or 0)

    def get_children_activities_count(self, obj):
        return int(getattr(obj, "children_activities_count", 0) or 0)

    def get_children_matches_count(self, obj):
        return int(getattr(obj, "children_matches_count", 0) or 0)

    def get_matches_total_count(self, obj):
        direct = int(getattr(obj, "matches_count", 0) or 0)
        children = int(getattr(obj, "children_matches_count", 0) or 0)
        return direct + children

    def get_members_count(self, obj):
        return int(getattr(obj, "members_count", 0) or 0)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["data"] = rep.pop("metadata", {})
        return rep

    def to_internal_value(self, data):
        # Backwards-compatible input: accept {data: {...}} and store into metadata
        if hasattr(data, "copy"):
            mutable = data.copy()
        elif isinstance(data, dict):
            mutable = dict(data)
        else:
            mutable = data

        if isinstance(mutable, dict) and "data" in mutable and "metadata" not in mutable:
            mutable["metadata"] = mutable.get("data")

        return super().to_internal_value(mutable)

    def get_organisation(self, obj):
        """Return nested organisation representation"""
        if obj.organisation:
            return {
                "id": str(obj.organisation.id),
                "name": obj.organisation.name,
                "slug": obj.organisation.slug,
            }
        return None

    def get_project(self, obj):
        """Return nested project representation"""
        if obj.project:
            return {"id": str(obj.project.id), "name": obj.project.name, "slug": obj.project.slug}
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

    def get_sport(self, obj):
        """Return nested sport representation (for competition-level sport variant)"""
        if obj.sport:
            # For variants, include category icon as fallback (variants often don't have their own icon)
            category_icon = (
                obj.sport.category.sport_icon
                if obj.sport.is_variant and obj.sport.category
                else None
            )
            return {
                "id": str(obj.sport.id),
                "name": obj.sport.name,
                "slug": obj.sport.slug,
                "sport_icon": obj.sport.sport_icon or category_icon,
                "is_variant": obj.sport.is_variant,
                "parent_sport_id": obj.sport.parent_sport_id,
                "category_name": obj.sport.category.name
                if obj.sport.is_variant and obj.sport.category
                else None,
                "category_icon": category_icon,
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
    organisation = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    period = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()
    opponent_project = serializers.SerializerMethodField()

    # Annotated fields
    participations_count = serializers.IntegerField(read_only=True, default=0)

    # Write fields (use _id suffix for FK assignment)
    project_id = serializers.IntegerField(write_only=True)
    period_id = serializers.UUIDField(write_only=True)
    opponent_project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Activity
        fields = [
            "id",
            "slug",
            "organisation",
            "project",
            "project_id",
            "period",
            "period_id",
            "opponent_project",
            "opponent_project_id",
            "title",
            "activity_type",
            "start_time",
            "end_time",
            "location",
            "description",
            "metadata",
            "created_at",
            "updated_at",
            "created_by",
            "participations_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    # ── Logo URL cache ────────────────────────────────────────
    # Populated lazily per serializer instance. Maps project_id → logo URL.
    _logo_cache: dict[int, str | None] | None = None

    def _get_logo_url_for_project(self, project) -> str | None:
        """Return a presigned logo URL for a project (team → club fallback).

        Uses BrandAsset(asset_type='logo') via BrandProfile. Results are
        cached so repeated calls within one serializer invocation don't
        cause extra queries.
        """
        if project is None:
            return None

        if self._logo_cache is None:
            self._logo_cache = {}

        pid = project.id
        if pid in self._logo_cache:
            return self._logo_cache[pid]

        # Collect candidate project IDs: team first, then parent club
        candidate_ids = [pid]
        if project.parent_project_id:
            candidate_ids.append(project.parent_project_id)

        try:
            from branding.models import BrandAsset

            asset = (
                BrandAsset.objects.filter(
                    profile__project_id__in=candidate_ids,
                    asset_type="logo",
                    is_active=True,
                    profile__is_active=True,
                )
                .select_related("file")
                .order_by("profile__project_id")
                .first()
            )
            if asset and asset.file and asset.file.storage_path:
                from files.utils import get_storage_backend

                backend = get_storage_backend()
                url = backend.get_url(asset.file.storage_path, signed=True)
                self._logo_cache[pid] = url
                return url
        except Exception:
            pass

        self._logo_cache[pid] = None
        return None

    def get_organisation(self, obj):
        """Return nested organisation representation with sport data"""
        # Try to get org from project first, then period
        org = None
        if obj.project:
            org = obj.project.organisation
        elif obj.period:
            org = obj.period.organisation

        if org:
            result = {"id": str(org.id), "name": org.name, "slug": org.slug}
            # Include sport for filtering support
            if org.sport:
                result["sport"] = {
                    "id": str(org.sport.id),
                    "name": org.sport.name,
                    "slug": org.sport.slug,
                    "sport_icon": org.sport.sport_icon,
                }
            return result
        return None

    def get_project(self, obj):
        """Return nested project representation with optional club_name and logo_url."""
        if obj.project:
            data = {"id": str(obj.project.id), "name": obj.project.name, "slug": obj.project.slug}
            if obj.project.parent_project:
                data["club_name"] = obj.project.parent_project.name
            logo_url = self._get_logo_url_for_project(obj.project)
            if logo_url:
                data["logo_url"] = logo_url
            return data
        return None

    def get_opponent_project(self, obj):
        """Return nested opponent project name/id with optional club_name and logo_url."""
        if obj.opponent_project:
            data = {
                "id": str(obj.opponent_project.id),
                "name": obj.opponent_project.name,
                "slug": obj.opponent_project.slug,
            }
            if obj.opponent_project.parent_project:
                data["club_name"] = obj.opponent_project.parent_project.name
            logo_url = self._get_logo_url_for_project(obj.opponent_project)
            if logo_url:
                data["logo_url"] = logo_url
            return data
        return None

    def get_period(self, obj):
        """Return nested period representation. Includes parent_period for season context."""
        if obj.period:
            data = {
                "id": str(obj.period.id),
                "name": obj.period.name,
                "start_date": obj.period.start_date,
                "end_date": obj.period.end_date,
            }
            if obj.period.parent_period:
                data["parent_period"] = {
                    "id": str(obj.period.parent_period.id),
                    "name": obj.period.parent_period.name,
                }
            return data
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


class ActivityDetailSerializer(ActivitySerializer):
    """
    Detailed serializer for Activity model.
    Includes full participation data (lineups) and events.
    """

    participations = ParticipationSerializer(many=True, read_only=True)
    events = ActivityEventSerializer(many=True, read_only=True)

    class Meta(ActivitySerializer.Meta):
        fields = ActivitySerializer.Meta.fields + ["participations", "events"]
