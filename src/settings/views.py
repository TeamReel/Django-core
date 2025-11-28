"""
Django REST Framework ViewSets for Settings and Feature Flags.

Provides full CRUD operations and custom resolve actions for hierarchy queries.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.http import Http404

from .models import FeatureFlag, Setting
from .serializers import (
    FeatureFlagSerializer,
    SettingSerializer,
    FeatureFlagResolveSerializer,
    SettingResolveSerializer,
)
from .api import get_flag, get_setting


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
    pagination_class = SettingsPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["scope_type", "organisation", "project", "enabled"]
    search_fields = ["key", "description"]

    def perform_create(self, serializer):
        """Set created_by when creating a flag."""
        serializer.save(
            created_by=self.request.user if self.request.user.is_authenticated else None
        )

    def perform_update(self, serializer):
        """Set updated_by when updating a flag."""
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
