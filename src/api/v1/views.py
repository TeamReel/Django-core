from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.reverse import reverse


@api_view(["GET"])
@permission_classes([AllowAny])  # API root accessible without authentication
def api_root(request, format=None):
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
