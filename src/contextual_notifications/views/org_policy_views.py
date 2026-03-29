"""DRF API view for organisation notification policies."""

from typing import Any, cast

from django.apps import apps
from django.core.exceptions import PermissionDenied
from organisations.models import Organisation
from permissions.audit import evaluate_permission
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..serializers.routing_serializers import OrganisationNotificationPolicySerializer


class OrganisationNotificationPolicyByOrganisationView(APIView):
    """Retrieve the organisation's notification policy (one-to-one)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, org_id):
        org = Organisation.objects.filter(id=org_id, is_active=True).first()
        if not org:
            return Response({"detail": "Organisation not found"}, status=404)

        allowed = evaluate_permission(
            user=request.user,
            permission="org.manage_settings",
            context={
                "scope": "ORGANIZATION",
                "organization_id": str(org.id),
            },
        )
        if not allowed:
            raise PermissionDenied(
                "You do not have access to notification policies for this organisation"
            )

        OrganisationNotificationPolicy = cast(
            Any,
            apps.get_model("contextual_notifications", "OrganisationNotificationPolicy"),
        )
        policy = OrganisationNotificationPolicy.objects.filter(organisation=org).first()
        if not policy:
            return Response({"detail": "No explicit notification policy found"}, status=404)

        return Response(OrganisationNotificationPolicySerializer(policy).data)
