"""
Django REST Framework ViewSets for Settings and Feature Flags.

Provides full CRUD operations and custom resolve actions for hierarchy queries.
"""

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .api import get_flag, get_setting
from .models import FeatureFlag, Setting
from .permissions import ScopeAwarePermission
from .serializers import (
    FeatureFlagResolveSerializer,
    FeatureFlagSerializer,
    SettingResolveSerializer,
    SettingSerializer,
)


class SettingsPagination(PageNumberPagination):
    """Custom pagination class for settings API."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class FeatureFlagViewSet(viewsets.ModelViewSet):
    """
    ViewSet for FeatureFlag model providing full CRUD operations.

    Supports:
    - List, retrieve, create, update, delete operations
    - Filtering by scope_type, organisation_id, project_id
    - Search by key
    - Custom resolve action for hierarchy queries
    """

    queryset = FeatureFlag.objects.all()
    serializer_class = FeatureFlagSerializer
    permission_classes = [IsAuthenticated, ScopeAwarePermission]
    pagination_class = SettingsPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["scope_type", "organisation", "project", "enabled"]
    search_fields = ["key", "description"]

    def perform_create(self, serializer):
        """Set created_by when creating a flag."""
        # Validate hierarchy rules for org admins creating org overrides
        scope_type = serializer.validated_data.get("scope_type")
        if scope_type == "ORGANISATION":
            key = serializer.validated_data.get("key")
            enabled = serializer.validated_data.get("enabled", False)

            # Find the global flag for this key
            global_flag = FeatureFlag.objects.filter(key=key, scope_type="GLOBAL").first()

            # If global flag exists and is disabled, org cannot enable it
            if global_flag and not global_flag.enabled and enabled:
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    {
                        "error": "forbidden",
                        "detail": (
                            "Cannot enable organisation override"
                            " when global flag is disabled. "
                            "Organisation admins can only be"
                            " more restrictive, not more permissive."
                        ),
                        "global_value": global_flag.enabled,
                        "attempted_value": enabled,
                    }
                )

        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None
        )

    def perform_update(self, serializer):
        """Set updated_by when updating a flag."""
        # Validate hierarchy rules for org admins
        instance = self.get_object()
        if instance.scope_type == "ORGANISATION":
            # Check if trying to enable an org override when global is disabled
            new_enabled = serializer.validated_data.get("enabled", instance.enabled)

            # Find the global flag for this key
            global_flag = FeatureFlag.objects.filter(key=instance.key, scope_type="GLOBAL").first()

            # If global flag exists and is disabled, org cannot enable it
            if global_flag and not global_flag.enabled and new_enabled:
                from rest_framework.exceptions import PermissionDenied

                raise PermissionDenied(
                    {
                        "error": "forbidden",
                        "detail": (
                            "Cannot enable organisation override"
                            " when global flag is disabled. "
                            "Organisation admins can only be"
                            " more restrictive, not more permissive."
                        ),
                        "global_value": global_flag.enabled,
                        "attempted_value": new_enabled,
                    }
                )

        serializer.save(
            updated_by=self.request.user if self.request.user.is_authenticated else None
        )

    @action(detail=False, methods=["get"], url_path="resolve/(?P<key>[^/.]+)")
    def resolve(self, request, key=None):
        """
        Resolve a feature flag value using scope hierarchy.

        Query parameters:
        - project_id: Optional project ID for project scope
        - organisation_id: Optional organisation ID for org scope

        Returns the resolved boolean value with metadata about which scope was used.
        """
        project_id = request.query_params.get("project_id")
        organisation_id = request.query_params.get("organisation_id")

        # Convert string IDs to integers if provided
        if project_id:
            try:
                project_id = int(project_id)
            except ValueError:
                return Response(
                    {"error": "project_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST
                )

        if organisation_id:
            try:
                organisation_id = int(organisation_id)
            except ValueError:
                return Response(
                    {"error": "organisation_id must be an integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Use the query API to resolve the flag value
        value = get_flag(key, project_id=project_id, organisation_id=organisation_id, default=None)

        if value is None:
            # Flag not found at any scope
            return Response(
                {"error": f"Feature flag '{key}' not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Determine which scope was actually used by querying the database
        flag = None
        scope_used = "global"
        scope_id = None

        # Check project scope first
        if project_id:
            flag = FeatureFlag.objects.filter(
                key=key, scope_type="PROJECT", project_id=project_id
            ).first()
            if flag:
                scope_used = "project"
                scope_id = str(project_id)

        # Check organisation scope if no project match
        if not flag and organisation_id:
            flag = FeatureFlag.objects.filter(
                key=key, scope_type="ORGANISATION", organisation_id=organisation_id
            ).first()
            if flag:
                scope_used = "organisation"
                scope_id = str(organisation_id)

        # Check global scope if no other match
        if not flag:
            flag = FeatureFlag.objects.filter(
                key=key, scope_type="GLOBAL", organisation=None, project=None
            ).first()
            if flag:
                scope_used = "global"
                scope_id = None

        response_data = {"key": key, "value": value, "scope_used": scope_used, "scope_id": scope_id}

        serializer = FeatureFlagResolveSerializer(response_data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="resolve-all")
    def resolve_all(self, request):
        """
        Resolve all feature flags for a specific scope.

        Query parameters:
        - organisation_id: Optional organisation ID for org scope
        - project_id: Optional project ID for project scope

        Returns list of flags with:
        - key
        - description
        - enabled (effective value)
        - resolution_source ('global', 'override', 'organisation', 'project')
        - global_value
        - org_value (if applicable)
        - project_value (if applicable)
        - global_id
        - org_override_id
        - project_override_id
        """
        organisation_id = request.query_params.get("organisation_id")
        project_id = request.query_params.get("project_id")

        # 1. Get all GLOBAL flags (the baseline)
        global_flags = FeatureFlag.objects.filter(scope_type="GLOBAL")
        global_flags_map = {f.key: f for f in global_flags}

        # 2. Get ORG flags if org_id provided
        org_flags_map = {}
        if organisation_id:
            org_flags = FeatureFlag.objects.filter(
                scope_type="ORGANISATION", organisation_id=organisation_id
            )
            org_flags_map = {f.key: f for f in org_flags}

        # 3. Get PROJECT flags if project_id provided
        project_flags_map = {}
        if project_id:
            project_flags = FeatureFlag.objects.filter(scope_type="PROJECT", project_id=project_id)
            project_flags_map = {f.key: f for f in project_flags}

        # Collect all unique keys from global, org, and project flags
        all_keys = (
            set(global_flags_map.keys()) | set(org_flags_map.keys()) | set(project_flags_map.keys())
        )

        results = []
        for key in all_keys:
            g_flag = global_flags_map.get(key)
            org_flag = org_flags_map.get(key)
            project_flag = project_flags_map.get(key)

            # Initialize values
            global_val = g_flag.enabled if g_flag else None
            global_id = str(g_flag.id) if g_flag else None
            org_val = org_flag.enabled if org_flag else None
            org_override_id = str(org_flag.id) if org_flag else None
            project_val = project_flag.enabled if project_flag else None
            project_override_id = str(project_flag.id) if project_flag else None
            description = (
                (g_flag or org_flag or project_flag).description
                if (g_flag or org_flag or project_flag)
                else ""
            )

            # Determine effective value with hierarchy: GLOBAL (master) > ORG > PROJECT
            # If global is disabled, everything is disabled (master switch)
            if g_flag and g_flag.enabled is False:
                enabled = False
                resolution_source = "global_disabled"
            elif org_flag and org_flag.enabled is False:
                # Org disabled overrides project
                enabled = False
                resolution_source = "org_disabled"
            elif project_flag is not None:
                # Project override is active
                enabled = project_flag.enabled
                resolution_source = "project"
            elif org_flag is not None:
                # Org override is active
                enabled = org_flag.enabled
                resolution_source = "organisation"
            elif g_flag is not None:
                # Global flag only
                enabled = g_flag.enabled
                resolution_source = "global"
            else:
                # Should not happen
                continue

            results.append(
                {
                    "key": key,
                    "name": key.replace("_", " ").title(),
                    "description": description,
                    "enabled": enabled,
                    "resolutionSource": resolution_source,
                    "global_value": global_val,
                    "org_value": org_val,
                    "project_value": project_val,
                    "global_id": global_id,
                    "org_override_id": org_override_id,
                    "project_override_id": project_override_id,
                    "rollout_percentage": 100,
                }
            )

        return Response(results)


class SettingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Setting model providing full CRUD operations.

    Supports:
    - List, retrieve, create, update, delete operations
    - Filtering by scope_type, organisation_id, project_id, value_type
    - Search by key
    - Custom resolve action for hierarchy queries with type coercion
    """

    queryset = Setting.objects.all()
    serializer_class = SettingSerializer
    permission_classes = [IsAuthenticated, ScopeAwarePermission]
    pagination_class = SettingsPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["scope_type", "organisation", "project", "value_type"]
    search_fields = ["key", "description"]

    def perform_create(self, serializer):
        """Set created_by when creating a setting."""
        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None
        )

    def perform_update(self, serializer):
        """Set updated_by when updating a setting."""
        serializer.save(
            updated_by=self.request.user if self.request.user.is_authenticated else None
        )

    @action(detail=False, methods=["get"], url_path="resolve/(?P<key>[^/.]+)")
    def resolve(self, request, key=None):
        """
        Resolve a setting value using scope hierarchy.

        Query parameters:
        - project_id: Optional project ID for project scope
        - organisation_id: Optional organisation ID for org scope

        Returns the resolved value with proper type coercion and metadata.
        """
        project_id = request.query_params.get("project_id")
        organisation_id = request.query_params.get("organisation_id")

        # Convert string IDs to integers if provided
        if project_id:
            try:
                project_id = int(project_id)
            except ValueError:
                return Response(
                    {"error": "project_id must be an integer"}, status=status.HTTP_400_BAD_REQUEST
                )

        if organisation_id:
            try:
                organisation_id = int(organisation_id)
            except ValueError:
                return Response(
                    {"error": "organisation_id must be an integer"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Use the query API to resolve the setting value
        value = get_setting(
            key, project_id=project_id, organisation_id=organisation_id, default=None
        )

        if value is None:
            # Setting not found at any scope
            return Response(
                {"error": f"Setting '{key}' not found"}, status=status.HTTP_404_NOT_FOUND
            )

        # Determine which scope was actually used by querying the database
        setting = None
        scope_used = "global"
        scope_id = None

        # Check project scope first
        if project_id:
            setting = Setting.objects.filter(
                key=key, scope_type="PROJECT", project_id=project_id
            ).first()
            if setting:
                scope_used = "project"
                scope_id = str(project_id)

        # Check organisation scope if no project match
        if not setting and organisation_id:
            setting = Setting.objects.filter(
                key=key, scope_type="ORGANISATION", organisation_id=organisation_id
            ).first()
            if setting:
                scope_used = "organisation"
                scope_id = str(organisation_id)

        # Check global scope if no other match
        if not setting:
            setting = Setting.objects.filter(
                key=key, scope_type="GLOBAL", organisation=None, project=None
            ).first()
            if setting:
                scope_used = "global"
                scope_id = None

        response_data = {"key": key, "value": value, "scope_used": scope_used, "scope_id": scope_id}

        serializer = SettingResolveSerializer(response_data)
        return Response(serializer.data)
