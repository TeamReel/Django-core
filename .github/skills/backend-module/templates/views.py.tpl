"""ViewSets for B{NUMBER}: {MODULE_TITLE}."""

from rest_framework import viewsets

from api.pagination import BaseAPIPagination
from ..models import {MODEL_NAME}
from .permissions import {MODEL_NAME}Permission
from .serializers import (
    {MODEL_NAME}DetailSerializer,
    {MODEL_NAME}ListSerializer,
    {MODEL_NAME}WriteSerializer,
)


class {MODEL_NAME}ViewSet(viewsets.ModelViewSet):
    """
    API endpoint for {MODEL_NAME}.

    list:    GET  /api/v1/{URL_PREFIX}/
    create:  POST /api/v1/{URL_PREFIX}/
    read:    GET  /api/v1/{URL_PREFIX}/{{id}}/
    update:  PATCH /api/v1/{URL_PREFIX}/{{id}}/
    delete:  DELETE /api/v1/{URL_PREFIX}/{{id}}/
    """

    permission_classes = [{MODEL_NAME}Permission]
    pagination_class = BaseAPIPagination

    def get_queryset(self):
        """Org-scoped queryset — users only see their organisation's data."""
        return (
            {MODEL_NAME}.objects.filter(
                organisation=self.request.user.organisation,
                is_active=True,
            )
            .select_related("organisation", "created_by")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "list":
            return {MODEL_NAME}ListSerializer
        if self.action in ("create", "update", "partial_update"):
            return {MODEL_NAME}WriteSerializer
        return {MODEL_NAME}DetailSerializer

    def perform_destroy(self, instance):
        """Soft delete — set is_active=False instead of hard delete."""
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
