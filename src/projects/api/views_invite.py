"""DRF views for Project Invitations and Promotions."""

from django.db.models import Q
from projects.models import (
    Project,
    ProjectInvite,
    ProjectMembership,
    ProjectMembershipPromotion,
)
from projects.services.invitation_service import InvitationService
from projects.services.promotion_service import PromotionService
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from .serializers import (
    AcceptInvitationSerializer,
    ProjectInviteSerializer,
    ProjectMembershipPromotionSerializer,
    ProjectMembershipSerializer,
)


class ProjectInviteThrottle(UserRateThrottle):
    """Rate limiting for project invitations: 20/hour"""

    rate = "20/hour"


class InvitationAcceptThrottle(AnonRateThrottle):
    """Rate limiting for invitation acceptance: 60/hour"""

    rate = "60/hour"


class ProjectInviteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing project invitations.

    Routes:
    - GET /api/projects/{project_pk}/invitations/ - List invitations
    - POST /api/projects/{project_pk}/invitations/ - Create invitation
    - DELETE /api/projects/{project_pk}/invitations/{pk}/ - Cancel invitation
    - POST /api/projects/{project_pk}/invitations/{pk}/resend/ - Resend invitation
    - GET /api/invitations/{token}/ - Get invitation details (public)
    - POST /api/invitations/{token}/accept/ - Accept invitation (public)

    Rate Limiting:
    - Create invitation: 20 requests/hour per user
    - Accept invitation: 60 requests/hour (anonymous)

    Permissions:
    - List/Create/Cancel/Resend: Project admin only
    - Get by token/Accept: Public (no authentication required)
    """

    serializer_class = ProjectInviteSerializer
    permission_classes = [IsAuthenticated]

    def get_throttles(self):
        """Apply rate limiting for invitation creation."""
        if self.action == "create":
            return [ProjectInviteThrottle()]
        elif self.action in ["get_by_token", "accept"]:
            return [InvitationAcceptThrottle()]
        return []

    def get_queryset(self):
        """Return invitations for the specific project."""
        project_pk = self.kwargs.get("project_pk")
        if not project_pk:
            return ProjectInvite.objects.none()

        return ProjectInvite.objects.filter(project_id=project_pk).select_related(
            "project", "invited_by"
        )

    def get_permissions(self):
        """Public access for token-based operations."""
        if self.action in ["get_by_token", "accept"]:
            return [AllowAny()]
        return [IsAuthenticated()]

    def check_project_admin_permission(self, project):
        """Check if user is a project admin."""
        user = self.request.user

        if user.is_superuser or user.is_staff:
            return True

        # TeamReel: Use RBAC permission checks (Option A)
        from permissions.evaluator import check_permission

        # Legacy: explicit project admin membership
        if ProjectMembership.objects.filter(
            project=project,
            user=user,
            role=ProjectMembership.Role.ADMIN,
            deleted_at__isnull=True,
        ).exists():
            return True

        if check_permission(
            user.id,
            "profile.edit_team",
            resource_type="project",
            resource_id=project.id,
        ):
            return True

        if project.parent_project_id and check_permission(
            user.id,
            "project.edit_children",
            resource_type="project",
            resource_id=project.parent_project_id,
        ):
            return True

        raise PermissionDenied("Only project admins can manage invitations for this project.")

    def list(self, request, project_pk=None):
        """List pending invitations for a project."""
        project = Project.objects.get(pk=project_pk)
        self.check_project_admin_permission(project)

        queryset = self.get_queryset().filter(status=ProjectInvite.Status.PENDING)
        serializer = self.get_serializer(queryset, many=True)
        return Response({"data": serializer.data})

    def create(self, request, project_pk=None):
        """Create and send a project invitation."""
        project = Project.objects.get(pk=project_pk)
        self.check_project_admin_permission(project)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = InvitationService()
        try:
            invitation = service.create_invitation(
                project=project,
                email=serializer.validated_data["email"],
                role=serializer.validated_data["role"],
                invited_by=request.user,
            )
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        response_serializer = self.get_serializer(invitation)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, pk=None, project_pk=None):
        """Cancel a pending invitation."""
        invitation = self.get_object()
        self.check_project_admin_permission(invitation.project)

        service = InvitationService()
        try:
            service.cancel_invitation(invitation, request.user)
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def resend(self, request, pk=None, project_pk=None):
        """Resend an invitation email."""
        invitation = self.get_object()
        self.check_project_admin_permission(invitation.project)

        service = InvitationService()
        try:
            invitation = service.resend_invitation(invitation, request.user)
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        serializer = self.get_serializer(invitation)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path=r"token/(?P<token>[^/.]+)")
    def get_by_token(self, request, token=None, project_pk=None):
        """Get invitation details by token (public endpoint)."""
        try:
            invitation = ProjectInvite.objects.select_related("project").get(token=token)
        except ProjectInvite.DoesNotExist:
            return Response(
                {"detail": "Invalid invitation token."}, status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(invitation)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path=r"token/(?P<token>[^/.]+)/accept")
    def accept(self, request, token=None, project_pk=None):
        """Accept an invitation (public endpoint)."""
        serializer = AcceptInvitationSerializer(data={"token": token})
        serializer.is_valid(raise_exception=True)

        service = InvitationService()
        accepting_user = request.user if request.user.is_authenticated else None

        try:
            membership = service.accept_invitation(token, accepting_user)
        except ValueError as e:
            raise ValidationError({"detail": str(e)}) from e

        # Return membership details
        membership_serializer = ProjectMembershipSerializer(membership)
        return Response(membership_serializer.data, status=status.HTTP_200_OK)


class ProjectMembershipPromotionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing project membership promotions.

    Provides list and retrieve for promotions.
    Actions for accept, decline, cancel.
    """

    serializer_class = ProjectMembershipPromotionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return promotions based on user context.
        - Project Admins: See all promotions for the project.
        - Users: See promotions where they are the target.
        """
        user = self.request.user
        project_pk = self.kwargs.get("project_pk")

        if project_pk:
            # Nested under project
            queryset = ProjectMembershipPromotion.objects.filter(project_id=project_pk)

            # Check if user is project admin
            # TeamReel: allow if they can manage team profiles/members
            from permissions.evaluator import check_permission

            is_admin = check_permission(
                user.id,
                "profile.edit_team",
                resource_type="project",
                resource_id=project_pk,
            )

            if is_admin:
                return queryset
            else:
                # Only show promotions for this user (target or requester)
                return queryset.filter(Q(target_user=user) | Q(requested_by=user))
        else:
            # Not nested (e.g. /promotions/)
            # Show promotions where user is target or requester
            return ProjectMembershipPromotion.objects.filter(
                Q(target_user=user) | Q(requested_by=user)
            )

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None, project_pk=None):
        """Accept a promotion."""
        promotion = self.get_object()

        if promotion.target_user != request.user:
            return Response(
                {"detail": "You can only accept your own promotions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = PromotionService()
        try:
            service.accept_promotion(promotion, request.user)
            return Response({"detail": "Promotion accepted."}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None, project_pk=None):
        """Decline a promotion."""
        promotion = self.get_object()

        if promotion.target_user != request.user:
            return Response(
                {"detail": "You can only decline your own promotions."},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = PromotionService()
        try:
            service.decline_promotion(promotion, request.user)
            return Response({"detail": "Promotion declined."}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["delete"])
    def cancel(self, request, pk=None, project_pk=None):
        """Cancel a promotion (requester or admin)."""
        promotion = self.get_object()

        # Check permission: requester or admin
        is_requester = promotion.requested_by == request.user
        from permissions.evaluator import check_permission

        is_admin = check_permission(
            request.user.id,
            "profile.edit_team",
            resource_type="project",
            resource_id=promotion.project_id,
        )

        if not (is_requester or is_admin):
            return Response(
                {"detail": "You do not have permission to cancel this promotion."},
                status=status.HTTP_403_FORBIDDEN,
            )

        service = PromotionService()
        try:
            service.cancel_promotion(promotion, request.user)
            return Response({"detail": "Promotion cancelled."}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
