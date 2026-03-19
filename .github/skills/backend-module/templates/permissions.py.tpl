"""Permission classes for B{NUMBER}: {MODULE_TITLE}."""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class {MODEL_NAME}Permission(BasePermission):
    """
    {MODEL_NAME} permissions:
    - Read: any authenticated user in the organisation
    - Write: staff or users with appropriate role via B08 RBAC
    - Object edit/delete: owner or staff
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_staff or self._has_write_role(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        # Owner can always edit their own objects
        if hasattr(obj, "created_by") and obj.created_by == request.user:
            return True
        return request.user.is_staff

    @staticmethod
    def _has_write_role(user) -> bool:
        """Check B08 RBAC if available, fallback to is_staff."""
        try:
            from rbac.utils import check_permission

            return check_permission(user, "{APP_NAME}.write")
        except ImportError:
            return user.is_staff
