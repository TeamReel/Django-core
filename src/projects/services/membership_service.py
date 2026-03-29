from typing import Optional

from audit.api import audit_log
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from notifications.services.notification_service import create_notification
from organisations.models import Membership as OrganisationMembership
from projects.models import Project, ProjectMembership

User = get_user_model()


class MembershipService:
    """Service for managing project memberships."""

    @staticmethod
    def _recover_asset_metadata(
        project: Project,
        user: User,
        period,
    ) -> Optional[dict]:
        """Find teamreel_assets from the most recent soft-deleted predecessor.

        When a member is removed and re-added, S3 assets still exist under
        the old membership UUID.  This method retrieves the asset metadata
        from the most recent soft-deleted record so it can be carried over
        to the new membership, preserving the link to processed assets.

        Returns the ``teamreel_assets`` dict, or ``None`` if no recoverable
        predecessor exists.
        """
        previous = (
            ProjectMembership.all_objects.filter(
                project=project,
                user=user,
                period=period,
                deleted_at__isnull=False,
                metadata__teamreel_assets__isnull=False,
            )
            .exclude(metadata__teamreel_assets={})
            .order_by("-deleted_at")
            .only("metadata")
            .first()
        )
        if previous is None:
            return None

        return (previous.metadata or {}).get("teamreel_assets") or None

    @transaction.atomic
    def add_member(
        self,
        project: Project,
        user: User,
        role: str,
        period_id: Optional[str] = None,
        metadata: Optional[dict] = None,
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
        period = None
        if period_id:
            from activities.models import Period

            period = Period.objects.get(pk=period_id)

        # Lineups/participations reference Organisation Memberships (not Users).
        # Ensure the user is an active member of the organisation when added to a project.
        org_membership, _ = OrganisationMembership.objects.get_or_create(
            organisation=project.organisation,
            user=user,
            defaults={
                "role": "member",
                "is_active": True,
                "invited_by": actor,
            },
        )
        if not org_membership.is_active:
            org_membership.is_active = True
            org_membership.save(update_fields=["is_active"])

        # Check if already a member for this specific period scope
        if ProjectMembership.objects.filter(
            project=project,
            user=user,
            period=period,
            deleted_at__isnull=True,
        ).exists():
            raise ValueError("User is already a member of this project for this period.")

        # Recover asset metadata from a soft-deleted predecessor, if any.
        effective_metadata = dict(metadata) if metadata else {}
        recovered_assets = self._recover_asset_metadata(project, user, period)
        if recovered_assets and "teamreel_assets" not in effective_metadata:
            effective_metadata["teamreel_assets"] = recovered_assets

        membership = ProjectMembership.objects.create(
            project=project,
            user=user,
            role=role,
            assignment_reason=reason,
            period=period,
            metadata=effective_metadata,
        )

        # TeamReel: If adding a member to a child team, also ensure they're added to the parent club
        # for the same season. This keeps navigation/visibility consistent in the demo.
        parent_project = getattr(project, "parent_project", None)
        if parent_project is not None:
            try:
                exists_on_parent = ProjectMembership.objects.filter(
                    project=parent_project,
                    user=user,
                    period=period,
                    deleted_at__isnull=True,
                ).exists()

                if not exists_on_parent:
                    ProjectMembership.objects.create(
                        project=parent_project,
                        user=user,
                        role=ProjectMembership.Role.VIEWER,
                        assignment_reason=ProjectMembership.AssignmentReason.MANUAL,
                        period=period,
                        metadata={},
                    )

                    audit_log.record(
                        "project.membership.created",
                        user=actor,
                        project=parent_project,
                        metadata={
                            "project_id": str(parent_project.id),
                            "user_id": str(user.id),
                            "role": ProjectMembership.Role.VIEWER,
                            "period_id": str(period.id) if period else None,
                            "reason": "parent_cascade",
                            "source_project_id": str(project.id),
                        },
                    )
            except Exception:
                # Don't fail the main add_member operation if club auto-add fails.
                pass

        # Audit log
        try:
            audit_meta = {
                "project_id": str(project.id),
                "user_id": str(user.id),
                "role": role,
                "period_id": str(period.id) if period else None,
                "reason": reason,
            }
            if recovered_assets:
                audit_meta["assets_recovered"] = True
            audit_log.record(
                "project.membership.created",
                user=actor,
                project=project,
                metadata=audit_meta,
            )
        except Exception:
            # Never fail core membership creation because audit logging is down/misconfigured.
            pass

        # Notification
        try:
            create_notification(
                recipient_user_id=str(user.id),
                title=f"Added to {project.name}",
                message=f"You have been added to project '{project.name}' as {role}.",
                level="info",
            )
        except Exception:
            # Notifications are best-effort.
            pass

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

        # Last Admin Protection
        if membership.role == ProjectMembership.Role.ADMIN:
            active_admins_count = project.memberships.filter(
                role=ProjectMembership.Role.ADMIN, deleted_at__isnull=True
            ).count()

            if active_admins_count <= 1:
                # This is the last admin. Try to find an Org Admin to take over.
                # We look for an active Org Admin who is NOT the user being removed.
                org_admin_membership = (
                    project.organisation.memberships.filter(role="admin", is_active=True)
                    .exclude(user=user)
                    .first()
                )

                if org_admin_membership:
                    # Assign this Org Admin to the project as Admin
                    new_admin = org_admin_membership.user
                    # Check if they are already a member (e.g. viewer/editor)
                    existing_membership = project.memberships.filter(
                        user=new_admin, deleted_at__isnull=True
                    ).first()

                    if existing_membership:
                        # Upgrade them to Admin
                        old_role = existing_membership.role
                        existing_membership.role = ProjectMembership.Role.ADMIN
                        existing_membership.save()

                        audit_log.record(
                            "project.membership.updated",
                            user=actor,
                            project=project,
                            metadata={
                                "reason": "last_admin_protection",
                                "project_id": str(project.id),
                                "user_id": str(new_admin.id),
                                "old_role": old_role,
                                "new_role": ProjectMembership.Role.ADMIN,
                            },
                        )
                    else:
                        # Add them as new Admin
                        ProjectMembership.objects.create(
                            project=project,
                            user=new_admin,
                            role=ProjectMembership.Role.ADMIN,
                            assignment_reason=ProjectMembership.AssignmentReason.ORG_DEFAULT,
                        )

                        audit_log.record(
                            "project.membership.created",
                            user=actor,
                            project=project,
                            metadata={
                                "reason": "last_admin_protection",
                                "project_id": str(project.id),
                                "user_id": str(new_admin.id),
                                "role": ProjectMembership.Role.ADMIN,
                            },
                        )
                else:
                    # No Org Admin available to take over
                    raise ValidationError(
                        "Cannot remove the last admin from the project. "
                        "Please assign another admin first or ensure an Organisation Admin is available."
                    )

        # Soft delete (use the mixin's method to also set deleted_by)
        membership.soft_delete(user=actor)

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
        # but IMM-004 mentions notification on add. I'll skip notification on remove for now unless required.)
