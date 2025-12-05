from typing import Any

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.tokens import RefreshToken


class BaseAPIViewSet(ModelViewSet):
    """
    Base viewset for all API endpoints.

    Provides:
    - Default authentication (JWT + Session)
    - Permission integration with B08
    - Performance optimization hooks (select_related, prefetch_related)
    - Consistent error handling (via global exception handler)

    Usage:
        class UserViewSet(BaseAPIViewSet):
            queryset = User.objects.all()
            serializer_class = UserSerializer
            permission_classes = [IsAuthenticated, CanViewUser]

            def get_queryset_optimizations(self):
                return {
                    "select_related": ["organisation"],
                    "prefetch_related": ["projects"],
                }
    """

    # Default to requiring authentication
    permission_classes = [IsAuthenticated]

    def get_queryset(self) -> Any:
        """
        Override to apply performance optimizations.
        Subclasses should implement get_queryset_optimizations().
        """
        queryset = super().get_queryset()

        # Apply optimizations if defined
        optimizations = self.get_queryset_optimizations()
        if select_related := optimizations.get("select_related"):
            queryset = queryset.select_related(*select_related)
        if prefetch_related := optimizations.get("prefetch_related"):
            queryset = queryset.prefetch_related(*prefetch_related)

        return queryset

    def get_queryset_optimizations(self) -> dict[str, list[str]]:
        """
        Return dict with 'select_related' and 'prefetch_related' lists.
        Override in subclasses to prevent N+1 queries.
        """
        return {}


class LogoutView(APIView):
    """
    JWT logout endpoint that blacklists refresh tokens.

    Requires authentication via JWT or Session.
    Expects {"refresh": "<refresh_token>"} in request body.

    Returns:
        200: {"status": "success", "data": null}
        400: {"status": "error", "error": {"code": "invalid_token"}}
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="auth_logout",
        summary="Logout and blacklist refresh token",
        description=(
            "Blacklists the provided JWT refresh token to prevent future use. "
            "The access token will remain valid until it expires (15 minutes)."
        ),
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "refresh": {
                        "type": "string",
                        "description": "JWT refresh token to blacklist",
                    }
                },
                "required": ["refresh"],
            }
        },
        responses={
            200: {
                "description": "Token successfully blacklisted",
                "content": {"application/json": {"example": {"status": "success", "data": None}}},
            },
            400: {
                "description": "Invalid or missing token",
                "content": {
                    "application/json": {
                        "example": {
                            "status": "error",
                            "error": {
                                "code": "invalid_token",
                                "message": "Invalid or expired refresh token",
                            },
                        }
                    }
                },
            },
        },
        tags=["Authentication"],
    )
    def post(self, request) -> Response:
        """
        Blacklist the provided refresh token to prevent future use.
        """
        try:
            refresh_token = request.data.get("refresh")
            if not refresh_token:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "missing_token",
                            "message": "Refresh token required",
                        },
                    },
                    status=400,
                )

            token = RefreshToken(refresh_token)
            token.blacklist()  # Adds to token_blacklist_blacklistedtoken table

            return Response({"status": "success", "data": None})
        except Exception:
            return Response(
                {
                    "status": "error",
                    "error": {
                        "code": "invalid_token",
                        "message": "Invalid or expired refresh token",
                    },
                },
                status=400,
            )
