"""DRF viewsets for notification routing rules."""

from django.core.exceptions import PermissionDenied
from permissions.audit import evaluate_permission
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response

from ..models import RoutingRule
from ..serializers.routing_serializers import RoutingRuleSerializer


class RoutingRuleViewSet(viewsets.ModelViewSet):
    """CRUD for RoutingRule.

    These rules define which notifications can be sent (routing policy), distinct
    from per-user notification preferences.

    Access model:
    - Global rules: superusers only
    - Org/project-scoped rules: org admins (org.manage_settings)

    Filtering:
    - Prefer `?org_id=<uuid>` to scope list results.
    """

    serializer_class = RoutingRuleSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete"]

    def _require_org_manage_settings(self, request: Request, org_id: str) -> None:
        allowed = bool(request.user and request.user.is_authenticated and request.user.is_superuser)
        if not allowed:
            allowed = evaluate_permission(
                user=request.user,
                permission="org.manage_settings",
                context={
                    "scope": "ORGANIZATION",
                    "organization_id": str(org_id),
                },
            )
        if not allowed:
            raise PermissionDenied("You do not have access to notification routing rules")

    def get_queryset(self):
        user = self.request.user

        qs = RoutingRule.objects.select_related("organisation", "project").all()

        # Superusers can see everything, optionally filtered.
        if user.is_superuser:
            org_id = self.request.query_params.get("org_id") or self.request.query_params.get(
                "organisation"
            )
            if org_id:
                return qs.filter(organisation_id=org_id)
            return qs

        # Non-superusers must provide org context; fail closed.
        org_id = self.request.query_params.get("org_id") or self.request.query_params.get(
            "organisation"
        )
        if not org_id:
            return qs.none()

        # Require org admin permission for that org
        self._require_org_manage_settings(self.request, org_id)
        return qs.filter(organisation_id=org_id)

    def list(self, request: Request, *args, **kwargs) -> Response:
        # For non-superusers, require org_id to avoid accidental cross-org exposure.
        if not request.user.is_superuser:
            org_id = request.query_params.get("org_id") or request.query_params.get("organisation")
            if not org_id:
                return Response(
                    {"detail": "org_id query param is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        return super().list(request, *args, **kwargs)

    def perform_create(self, serializer):
        instance: RoutingRule = serializer.save(created_by=self.request.user)

        # Enforce permissions for global/org/project scopes
        if instance.scope == RoutingRule.SCOPE_GLOBAL:
            if not self.request.user.is_superuser:
                raise PermissionDenied("Only superusers can manage global routing rules")
            return

        if not instance.organisation_id:
            raise PermissionDenied("Organisation-scoped routing rules require an organisation")

        self._require_org_manage_settings(self.request, str(instance.organisation_id))

    def perform_update(self, serializer):
        instance: RoutingRule = serializer.instance

        # Global rules: superuser only
        if instance.scope == RoutingRule.SCOPE_GLOBAL:
            if not self.request.user.is_superuser:
                raise PermissionDenied("Only superusers can manage global routing rules")
            serializer.save()
            return

        if not instance.organisation_id:
            raise PermissionDenied("Organisation-scoped routing rules require an organisation")

        self._require_org_manage_settings(self.request, str(instance.organisation_id))
        serializer.save()

    def perform_destroy(self, instance: RoutingRule):
        if instance.scope == RoutingRule.SCOPE_GLOBAL and not self.request.user.is_superuser:
            raise PermissionDenied("Only superusers can manage global routing rules")

        if instance.organisation_id:
            self._require_org_manage_settings(self.request, str(instance.organisation_id))

        instance.delete()
