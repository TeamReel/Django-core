"""
Activity serializers for Activities API.
"""

from activities.models import Activity, Period
from rest_framework import serializers

from .serializers_event import ActivityEventSerializer
from .serializers_participation import ParticipationSerializer


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


class ActivityDetailSerializer(ActivitySerializer):
    """
    Detailed serializer for Activity model.
    Includes full participation data (lineups) and events.
    """

    participations = ParticipationSerializer(many=True, read_only=True)
    events = ActivityEventSerializer(many=True, read_only=True)

    class Meta(ActivitySerializer.Meta):
        fields = ActivitySerializer.Meta.fields + ["participations", "events"]
