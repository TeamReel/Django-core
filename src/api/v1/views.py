from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.reverse import reverse


@extend_schema(
    operation_id="api_root",
    summary="API Discovery Endpoint",
    description=(
        "Returns version information and a map of available v1 API endpoints. "
        "This endpoint is public and does not require authentication."
    ),
    responses={
        200: {
            "description": "API endpoint discovery information",
            "content": {
                "application/json": {
                    "example": {
                        "version": "1.0.0",
                        "endpoints": {
                            "auth": {
                                "token": "http://localhost:8000/api/v1/auth/token/",
                                "refresh": "http://localhost:8000/api/v1/auth/token/refresh/",
                                "verify": "http://localhost:8000/api/v1/auth/token/verify/",
                                "logout": "http://localhost:8000/api/v1/auth/logout/",
                            },
                            "users": "http://localhost:8000/api/v1/users/",
                            "organisations": "http://localhost:8000/api/v1/organisations/",
                            "projects": "http://localhost:8000/api/v1/projects/",
                            "permissions": "http://localhost:8000/api/v1/permissions/",
                        },
                    }
                }
            },
        }
    },
    tags=["API Discovery"],
)
@api_view(["GET"])
@permission_classes([AllowAny])  # API root accessible without authentication
def api_root(request):
    """
    API v1 Root Endpoint - Discovery endpoint for available resources.

    Returns:
        200: {
            "version": "1.0.0",
            "endpoints": {
                "auth": "...",
                "users": "...",
                "organisations": "...",
                "projects": "...",
                "permissions": "..."
            }
        }

    This endpoint helps API clients discover available resources.
    Authentication is not required for discovery.
    """
    return Response(
        {
            "version": "1.0.0",
            "endpoints": {
                # Authentication (WP02)
                "auth": {
                    "token": request.build_absolute_uri(
                        reverse("api_v1:token_obtain_pair", request=request)
                    ),
                    "refresh": request.build_absolute_uri(
                        reverse("api_v1:token_refresh", request=request)
                    ),
                    "verify": request.build_absolute_uri(
                        reverse("api_v1:token_verify", request=request)
                    ),
                    "logout": request.build_absolute_uri(reverse("api_v1:logout", request=request)),
                },
                # Domain APIs (B05, B06, B07, B08)
                "users": request.build_absolute_uri("/api/v1/users/"),
                "organisations": request.build_absolute_uri("/api/v1/organisations/"),
                "projects": request.build_absolute_uri("/api/v1/projects/"),
                "permissions": request.build_absolute_uri("/api/v1/permissions/"),
            },
        }
    )
