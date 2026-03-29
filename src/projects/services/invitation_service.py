"""Service layer for project invitation management."""

from typing import Optional

from audit.api import audit_log
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from projects.models import Project, ProjectInvite, ProjectMembership

User = get_user_model()


class InvitationService:
    """Service for managing project invitations."""

    @transaction.atomic
    def create_invitation(
        self,
        project: Project,
        email: str,
        role: str,
        invited_by: User,
        expiry_days: int = 7,
    ) -> ProjectInvite:
        """
        Create and send a project invitation.

        Args:
            project: The project to invite to.
            email: Email address of the invitee.
            role: Role to assign upon acceptance.
            invited_by: User creating the invitation.
            expiry_days: Days until invitation expires (default 7).

        Returns:
            The created ProjectInvite.

        Raises:
            ValueError: If email is already a member or has pending invite.
        """
        # Check if user with this email is already a member
        try:
            user = User.objects.get(email=email)
            if ProjectMembership.objects.filter(
                project=project, user=user, deleted_at__isnull=True
            ).exists():
                raise ValueError("User is already a member of this project.")
        except User.DoesNotExist:
            pass  # External user - this is fine

        # Check for existing pending invitation
        existing = ProjectInvite.objects.filter(
            project=project, email=email, status=ProjectInvite.Status.PENDING
        ).first()

        if existing:
            if not existing.is_expired():
                raise ValueError("A pending invitation already exists for this email.")
            # Expired invitation exists - mark as expired and create new
            existing.status = ProjectInvite.Status.EXPIRED
            existing.save()

        # Create invitation
        expires_at = timezone.now() + timezone.timedelta(days=expiry_days)
        invitation = ProjectInvite.objects.create(
            project=project,
            email=email,
            role=role,
            invited_by=invited_by,
            expires_at=expires_at,
        )

        # Audit log
        audit_log.record(
            event_type="project.invitation.created",
            user=invited_by,
            project=project,
            metadata={
                "invitation_id": str(invitation.id),
                "email": email,
                "role": role,
                "expires_at": expires_at.isoformat(),
            },
        )

        # Send invitation email
        invitation.send_invitation_email()

        return invitation

    @transaction.atomic
    def accept_invitation(
        self, token: str, accepting_user: Optional[User] = None
    ) -> ProjectMembership:
        """
        Accept a project invitation and create membership.

        Args:
            token: The invitation token.
            accepting_user: The authenticated user (for email validation).

        Returns:
            The created ProjectMembership.

        Raises:
            ValueError: If invitation is invalid, expired, or email mismatch.
        """
        try:
            invitation = ProjectInvite.objects.get(token=token)
        except ProjectInvite.DoesNotExist:
            raise ValueError("Invalid invitation token.") from None

        if invitation.status != ProjectInvite.Status.PENDING:
            raise ValueError(f"Invitation is {invitation.status}.")

        if invitation.is_expired():
            invitation.status = ProjectInvite.Status.EXPIRED
            invitation.save()
            raise ValueError("Invitation has expired.")

        # If user is logged in, validate email match
        if accepting_user:
            if accepting_user.email.lower() != invitation.email.lower():
                raise ValueError(
                    "The logged-in user email does not match the invitation email. "
                    "Please log in with the correct account or create a new account."
                )
            user = accepting_user
        else:
            # Look up or create user
            user, created = User.objects.get_or_create(
                email=invitation.email,
                defaults={"is_active": True},
            )

        # Check if already a member (race condition protection)
        existing = ProjectMembership.objects.filter(
            project=invitation.project, user=user, deleted_at__isnull=True
        ).first()

        if existing:
            # Mark invitation as accepted anyway
            invitation.status = ProjectInvite.Status.ACCEPTED
            invitation.accepted_at = timezone.now()
            invitation.save()
            return existing

        # Create membership
        membership = ProjectMembership.objects.create(
            project=invitation.project,
            user=user,
            role=invitation.role,
            assignment_reason=ProjectMembership.AssignmentReason.INVITATION,
        )

        # Update invitation status
        invitation.status = ProjectInvite.Status.ACCEPTED
        invitation.accepted_at = timezone.now()
        invitation.save()

        # Audit log
        audit_log.record(
            event_type="project.invitation.accepted",
            user=user,
            project=invitation.project,
            metadata={
                "invitation_id": str(invitation.id),
                "membership_id": str(membership.id),
                "role": invitation.role,
            },
        )

        return membership

    @transaction.atomic
    def cancel_invitation(self, invitation: ProjectInvite, actor: User) -> None:
        """
        Cancel a pending invitation.

        Args:
            invitation: The invitation to cancel.
            actor: User performing the cancellation.

        Raises:
            ValueError: If invitation is not pending.
        """
        if invitation.status != ProjectInvite.Status.PENDING:
            raise ValueError(f"Cannot cancel invitation with status {invitation.status}.")

        invitation.status = ProjectInvite.Status.CANCELLED
        invitation.save()

        # Audit log
        audit_log.record(
            event_type="project.invitation.cancelled",
            user=actor,
            project=invitation.project,
            metadata={
                "invitation_id": str(invitation.id),
                "email": invitation.email,
            },
        )

    @transaction.atomic
    def resend_invitation(self, invitation: ProjectInvite, actor: User) -> ProjectInvite:
        """
        Resend an invitation (extends expiry and sends new email).

        Args:
            invitation: The invitation to resend.
            actor: User performing the resend.

        Returns:
            The updated invitation.

        Raises:
            ValueError: If invitation is not pending.
        """
        if invitation.status != ProjectInvite.Status.PENDING:
            raise ValueError(f"Cannot resend invitation with status {invitation.status}.")

        # Extend expiry by 7 days beyond the later of (current expiry, now)
        base = invitation.expires_at
        now = timezone.now()
        if base is None or base < now:
            base = now

        invitation.expires_at = base + timezone.timedelta(days=7)
        invitation.save()

        # Send email again
        invitation.send_invitation_email()

        # Audit log
        audit_log.record(
            event_type="project.invitation.resent",
            user=actor,
            project=invitation.project,
            metadata={
                "invitation_id": str(invitation.id),
                "email": invitation.email,
                "new_expires_at": invitation.expires_at.isoformat(),
            },
        )

        return invitation
