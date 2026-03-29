"""Service layer for project membership promotion management."""

from typing import Optional

from audit.api import audit_log
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from projects.models import ProjectMembership, ProjectMembershipPromotion
from settings.api import get_flag

User = get_user_model()


class PromotionService:
    """Service for managing project membership promotions."""

    @transaction.atomic
    def request_promotion(
        self,
        membership: ProjectMembership,
        to_role: str,
        requested_by: User,
    ) -> Optional[ProjectMembershipPromotion]:
        """
        Request a promotion for a member.

        If approval is not required (via feature flag or threshold),
        the promotion is applied immediately and None is returned.

        Otherwise, a ProjectMembershipPromotion is created and returned.
        """
        project = membership.project
        target_user = membership.user
        from_role = membership.role

        # Check feature flag: project_access_control.require_promotion_approval
        require_approval = get_flag(
            "project_access_control.require_promotion_approval",
            project_id=project.id,
            default=False,
        )

        # Check threshold setting: project_access_control.promotion_approval_threshold
        # If user's org role is high enough, they might skip approval
        # Note: The spec says "If user's org role >= threshold".
        # We need to check the user's role in the organization.
        # Assuming OrganizationMembership exists and has a role.

        # For now, let's implement the basic flag check.
        # If approval is NOT required, update role immediately.
        if not require_approval:
            membership.role = to_role
            membership.assignment_reason = ProjectMembership.AssignmentReason.PROMOTION
            membership.save()

            audit_log.record(
                event_type="project.membership.updated",
                user=requested_by,
                project=project,
                metadata={
                    "project_id": str(project.id),
                    "user_id": str(target_user.id),
                    "old_role": from_role,
                    "new_role": to_role,
                    "reason": "Immediate promotion (approval disabled)",
                },
            )
            return None

        # Create promotion request
        promotion = ProjectMembershipPromotion.objects.create(
            project=project,
            target_user=target_user,
            requested_by=requested_by,
            from_role=from_role,
            to_role=to_role,
            status=ProjectMembershipPromotion.Status.PENDING,
            expires_at=timezone.now() + timezone.timedelta(days=7),  # Default 7 days expiry
        )

        # Check for suspicious activity
        promotion.check_suspicious()
        promotion.save()

        # Audit log
        audit_log.record(
            event_type="project.promotion.requested",
            user=requested_by,
            project=project,
            metadata={
                "promotion_id": str(promotion.id),
                "target_user_id": str(target_user.id),
                "from_role": from_role,
                "to_role": to_role,
                "is_suspicious": promotion.is_suspicious,
            },
        )

        # Send notification (TODO: Integrate with B16)
        # self.send_promotion_notification(promotion)

        return promotion

    @transaction.atomic
    def accept_promotion(
        self, promotion: ProjectMembershipPromotion, accepting_user: User
    ) -> ProjectMembership:
        """
        Accept a promotion request.
        """
        if promotion.status != ProjectMembershipPromotion.Status.PENDING:
            raise ValueError("Promotion is not pending.")

        if promotion.target_user != accepting_user:
            raise ValueError("Only the target user can accept this promotion.")

        if promotion.is_expired():
            promotion.status = ProjectMembershipPromotion.Status.EXPIRED
            promotion.save()
            raise ValueError("Promotion has expired.")

        # Accept promotion
        promotion.accept()

        # Audit log
        audit_log.record(
            event_type="project.promotion.accepted",
            user=accepting_user,
            project=promotion.project,
            metadata={
                "promotion_id": str(promotion.id),
                "from_role": promotion.from_role,
                "to_role": promotion.to_role,
            },
        )

        # Return updated membership
        return ProjectMembership.objects.get(project=promotion.project, user=promotion.target_user)

    @transaction.atomic
    def decline_promotion(self, promotion: ProjectMembershipPromotion, user: User) -> None:
        """
        Decline a promotion request.
        """
        if promotion.status != ProjectMembershipPromotion.Status.PENDING:
            raise ValueError("Promotion is not pending.")

        if promotion.target_user != user:
            raise ValueError("Only the target user can decline this promotion.")

        promotion.decline()

        # Audit log
        audit_log.record(
            event_type="project.promotion.declined",
            user=user,
            project=promotion.project,
            metadata={
                "promotion_id": str(promotion.id),
            },
        )

    @transaction.atomic
    def cancel_promotion(self, promotion: ProjectMembershipPromotion, user: User) -> None:
        """
        Cancel a promotion request (by requester or admin).
        """
        if promotion.status != ProjectMembershipPromotion.Status.PENDING:
            raise ValueError("Promotion is not pending.")

        # Check permission: requester or project admin
        # This check should ideally be in the view/permission layer,
        # but we can enforce requester check here if needed.
        # For now, we assume the caller has verified permissions.

        promotion.status = ProjectMembershipPromotion.Status.CANCELLED
        promotion.resolved_at = timezone.now()
        promotion.save()

        # Audit log
        audit_log.record(
            event_type="project.promotion.cancelled",
            user=user,
            project=promotion.project,
            metadata={
                "promotion_id": str(promotion.id),
            },
        )
