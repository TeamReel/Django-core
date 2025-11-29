"""API views for i18n preference management."""

from rest_framework import views, status, generics
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from settings.models import Setting, ScopeType
from organisations.models import Organisation
from .serializers import PreferenceSerializer, EffectivePreferenceSerializer
from .services import PreferenceResolutionService
from .permissions import IsOrganisationAdmin


class UserPreferenceView(views.APIView):
    """View and update current user's i18n preferences."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current user's stored preferences (or empty if not set)."""
        try:
            setting = Setting.objects.get(
                key="i18n.preferences",
                scope_type=ScopeType.USER,
                user=request.user,
            )
            data = setting.value  # JSON dict
        except Setting.DoesNotExist:
            data = {"language": None, "locale": None, "timezone": None}

        serializer = PreferenceSerializer(data)
        return Response(serializer.data)

    def patch(self, request):
        """Update current user's preferences (partial updates supported)."""
        serializer = PreferenceSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Fetch or create setting
        setting, created = Setting.objects.get_or_create(
            key="i18n.preferences",
            scope_type=ScopeType.USER,
            user=request.user,
            defaults={"value": {}, "value_type": "JSON", "default_value": {}},
        )

        # Merge with existing values (partial update)
        updated_value = {**setting.value, **serializer.validated_data}

        # Remove None values (user explicitly unsetting a preference)
        updated_value = {k: v for k, v in updated_value.items() if v is not None}

        setting.value = updated_value
        setting.save()

        return Response(PreferenceSerializer(updated_value).data)


class EffectivePreferenceView(views.APIView):
    """Query resolved effective preferences with source attribution."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get effective preferences after precedence resolution."""
        prefs = PreferenceResolutionService.get_effective_preferences(
            user=request.user, organisation=getattr(request.user, "organisation", None)
        )

        serializer = EffectivePreferenceSerializer(prefs)
        return Response(serializer.data)


class OrganisationPreferenceView(views.APIView):
    """View and update organisation i18n defaults (admin only)."""

    permission_classes = [IsAuthenticated, IsOrganisationAdmin]

    def get(self, request, org_id):
        """Get organisation's default preferences."""
        org = generics.get_object_or_404(Organisation, id=org_id)
        self.check_object_permissions(request, org)

        try:
            setting = Setting.objects.get(
                key="i18n.preferences",
                scope_type=ScopeType.ORGANISATION,
                organisation=org,
            )
            data = setting.value
        except Setting.DoesNotExist:
            data = {"language": None, "locale": None, "timezone": None}

        serializer = PreferenceSerializer(data)
        return Response(serializer.data)

    def patch(self, request, org_id):
        """Update organisation's default preferences (admin only)."""
        org = generics.get_object_or_404(Organisation, id=org_id)
        self.check_object_permissions(request, org)

        serializer = PreferenceSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Fetch or create setting
        setting, created = Setting.objects.get_or_create(
            key="i18n.preferences",
            scope_type=ScopeType.ORGANISATION,
            organisation=org,
            defaults={"value": {}, "value_type": "JSON", "default_value": {}},
        )

        # Merge with existing values
        updated_value = {**setting.value, **serializer.validated_data}
        updated_value = {k: v for k, v in updated_value.items() if v is not None}

        setting.value = updated_value
        setting.save()

        return Response(PreferenceSerializer(updated_value).data)
