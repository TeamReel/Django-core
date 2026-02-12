"""View for resolving Django ContentType IDs by model name.

Exposes a lightweight endpoint so the frontend can resolve
content_type names (e.g. 'activity', 'projectmembership') to integer PKs
without hardcoding them.
"""
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class ContentTypeLookupView(APIView):
    """
    GET /api/v1/workflows/content-types/?models=activity,projectmembership,videojob

    Returns a mapping of model_name → content_type_id for the requested models.
    Only returns content types that exist in the database.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        models_param = request.query_params.get("models", "")
        if not models_param:
            return Response(
                {"error": "Provide ?models= with comma-separated model names"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        model_names = [m.strip().lower() for m in models_param.split(",") if m.strip()]

        content_types = ContentType.objects.filter(model__in=model_names)

        mapping: dict[str, int] = {}
        for ct in content_types:
            mapping[ct.model] = ct.pk

        return Response({"data": mapping})
