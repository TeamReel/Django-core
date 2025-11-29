from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication


class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that enforces active user requirement.

    Extends simplejwt's JWTAuthentication to check user.is_active status.
    Returns 403 Forbidden if token is valid but user account is inactive.

    Usage:
        Configure in REST_FRAMEWORK settings:
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "api.authentication.CustomJWTAuthentication",
            ...
        ]
    """

    def get_user(self, validated_token):
        """
        Attempts to find and return a user using the given validated token.
        Raises PermissionDenied if user is inactive (FR-005a).
        """
        user = super().get_user(validated_token)

        if not user.is_active:
            raise PermissionDenied(
                {
                    "code": "user_inactive",
                    "message": "Account is inactive or deactivated",
                }
            )

        return user
