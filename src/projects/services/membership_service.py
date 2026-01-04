from typing import Optional

from django.contrib.auth import get_user_model
from django.db import transaction

from audit.api import audit_log
from notifications.services.notification_service import create_notification
from projects.models import Project, ProjectMembership

User = get_user_model()


class MembershipService:
    """Service for managing project memberships."""

    @transaction.atomic
    def add_member(
        self,
        project: Project,
        user: User,
        role: str,
        actor: Optional[User] = None,
        reason: str = ProjectMembership.AssignmentReason.MANUAL,
    ) -> ProjectMembership:
        """
        Add a user to a project.

        Args:
            project: The project to add the user to.
            user: The user to add.
            role: The role to assign (viewer, editor, admin).
            actor: The user performing the action (for audit).
            reason: The reason for assignment.

        Returns:
            The created ProjectMembership.
        """
        # Check if already a member
        if ProjectMembership.objects.filter(project=project, user=user).exists():
            raise ValueError("User is already a member of this project.")

        membership = ProjectMembership.objects.create(
            project=project,
            user=user,
            role=role,
            assignment_reason=reason,
        )

        # Audit log
        audit_log.record(
            "project.membership.created",
            user=actor,
            project=project,
            metadata={
                "project_id": str(project.id),
                "user_id": str(user.id),
                "role": role,
                "reason": reason,
            },
        )

        # Notification
        create_notification(
            recipient_user_id=str(user.id),
            title=f"Added to {project.name}",
            message=f"You have been added to project '{project.name}' as {role}.",
            level="info",
        )

        return membership

    @transaction.atomic
    def update_role(
        self,
        membership: ProjectMembership,
        new_role: str,
        actor: Optional[User] = None,
    ) -> ProjectMembership:
        """
        Update a member's role.

        Args:
            membership: The membership to update.
            new_role: The new role.
            actor: The user performing the action.

        Returns:
            The updated ProjectMembership.
        """
        old_role = membership.role
        if old_role == new_role:
            return membership

        membership.role = new_role
        membership.save()

        # Audit log
        audit_log.record(
            "project.membership.updated",
            user=actor,
            project=membership.project,
            metadata={
                "project_id": str(membership.project.id),
                "user_id": str(membership.user.id),
                "old_role": old_role,
                "new_role": new_role,
            },
        )

        # Notification
        create_notification(
            recipient_user_id=str(membership.user.id),
            title=f"Role Updated in {membership.project.name}",
            message=f"Your role in project '{membership.project.name}' has been updated to {new_role}.",
            level="info",
        )

        return membership

    @transaction.atomic
    def remove_member(
        self,
        membership: ProjectMembership,
        actor: Optional[User] = None,
    ) -> None:
        """
        Remove a member from a project.

        Args:
            membership: The membership to remove.
            actor: The user performing the action.
        """
        project = membership.project
        user = membership.user

        # Soft delete
        membership.delete()

        # Audit log
        audit_log.record(
            "project.membership.deleted",
            user=actor,
            project=project,
            metadata={
                "project_id": str(project.id),
                "user_id": str(user.id),
            },
        )

        # Notification (optional, maybe they shouldn't be notified if removed?
        # Checklist REM-007 says removed user sees 403, doesn't explicitly mention notification,
        # but IMM-004 mentions notification on add. I'll skip notification on remove for now unless required.)
