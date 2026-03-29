"""Credits API views."""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CreditsBalance, ProjectCreditsBalance, UserCreditsBalance
from .serializers import (
    CreditsBalanceSerializer,
    ProjectCreditsBalanceSerializer,
    UserCreditsBalanceSerializer,
)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_organisation_credits(request):
    """
    Get credits balance for the current organisation context.

    Returns:
        200: Credits balance object
        403: User not authorized for this organisation
        404: No credits configured for this organisation
        400: No organisation context provided
    """
    # Get organisation from query param (set by frontend context)
    org_id = request.query_params.get("organisation_id")

    if not org_id:
        return Response(
            {"error": "organisation_id parameter required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Security check: Ensure user has access to this organisation
    if not request.user.is_superuser:
        from organisations.models import Membership

        has_access = Membership.objects.filter(
            user=request.user, organisation_id=org_id, is_active=True
        ).exists()

        if not has_access:
            return Response(
                {"error": "You do not have permission to view credits for this organisation"},
                status=status.HTTP_403_FORBIDDEN,
            )

    try:
        balance = CreditsBalance.objects.get(organisation_id=org_id)
        serializer = CreditsBalanceSerializer(balance)
        return Response(serializer.data)
    except CreditsBalance.DoesNotExist:
        return Response(
            {"error": "No credits configured for this organisation"},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_project_credits(request, project_id: int):
    """Get credits balance for a specific project/team."""
    from projects.models import Project

    try:
        project = Project.objects.select_related("organisation").get(id=project_id)
    except Project.DoesNotExist:
        return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

    # Security check: Ensure user has access to this organisation (project inherits org access)
    if not request.user.is_superuser:
        from organisations.models import Membership

        has_access = Membership.objects.filter(
            user=request.user, organisation=project.organisation, is_active=True
        ).exists()
        if not has_access:
            return Response(
                {"error": "You do not have permission to view credits for this project"},
                status=status.HTTP_403_FORBIDDEN,
            )

    try:
        balance = ProjectCreditsBalance.objects.get(project=project)
        serializer = ProjectCreditsBalanceSerializer(balance)
        return Response(serializer.data)
    except ProjectCreditsBalance.DoesNotExist:
        return Response(
            {"error": "No credits configured for this project"},
            status=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_my_user_credits(request):
    """Get personal (user-scoped) credits balance for the authenticated user."""
    org_id = request.query_params.get("organisation_id")

    if not org_id:
        return Response(
            {"error": "organisation_id parameter required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Security check: Ensure user has access to this organisation
    if not request.user.is_superuser:
        from organisations.models import Membership

        has_access = Membership.objects.filter(
            user=request.user, organisation_id=org_id, is_active=True
        ).exists()

        if not has_access:
            return Response(
                {
                    "error": (
                        "You do not have permission to view"
                        " personal credits for this organisation"
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    try:
        balance = UserCreditsBalance.objects.get(organisation_id=org_id, user=request.user)
        serializer = UserCreditsBalanceSerializer(balance)
        return Response(serializer.data)
    except UserCreditsBalance.DoesNotExist:
        return Response(
            {"error": "No personal credits configured for this organisation"},
            status=status.HTTP_404_NOT_FOUND,
        )
