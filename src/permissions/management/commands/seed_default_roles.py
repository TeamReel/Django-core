"""Management command to seed default roles and permissions.

This command creates the base permissions and default roles required by the system.
It is idempotent and safe to run multiple times.

Usage:
    python manage.py seed_default_roles
    python manage.py seed_default_roles --force  # Re-create roles even if they exist
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from permissions.models import Permission, Role, ScopeChoices


class Command(BaseCommand):
    """Seed default roles and permissions for the system."""

    help = "Creates default permissions and roles for the access control system"

    def add_arguments(self, parser):
        """Add command arguments."""
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force re-creation of roles even if they already exist",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        """Execute the command."""
        force = options.get("force", False)

        self.stdout.write(self.style.NOTICE("Seeding default permissions and roles..."))

        # Create permissions first
        self.seed_permissions()

        # Then create roles with permissions assigned
        self.seed_roles(force=force)

        self.stdout.write(self.style.SUCCESS("Default permissions and roles seeded successfully!"))

    def seed_permissions(self):
        """Create the 19 base permissions required by the system.

        Sensitive permissions (is_sensitive=True) trigger audit logging for security-critical
        operations like user removal, role assignments, and deletions.
        """
        self.stdout.write(self.style.NOTICE("\nCreating base permissions..."))

        # Define permissions: (permission_string, resource_type, description, is_sensitive)
        permissions = [
            # Organisation permissions (8) - Added 2 for WP04
            (
                "org.invite_users",
                "org",
                "Invite new users to the organisation",
                True,
            ),
            (
                "org.remove_users",
                "org",
                "Remove users from the organisation",
                True,
            ),
            (
                "org.manage_settings",
                "org",
                "Manage organisation settings and configuration",
                False,
            ),
            (
                "org.view_members",
                "org",
                "View organisation members list",
                False,
            ),
            (
                "org.assign_roles",
                "org",
                "Assign roles to organisation members",
                True,
            ),
            (
                "org.delete",
                "org",
                "Delete the organisation",
                True,
            ),
            (
                "organization.view_balance",
                "organization",
                "View organisation transaction balance",
                False,
            ),
            (
                "organization.view_routing_logs",
                "organization",
                "View notification routing decision logs for organisation",
                False,
            ),
            # Project permissions (7)
            (
                "projects.create",
                "project",
                "Create new projects",
                False,
            ),
            (
                "projects.view",
                "project",
                "View project details and content",
                False,
            ),
            (
                "projects.update",
                "project",
                "Update project details and content",
                False,
            ),
            (
                "projects.delete",
                "project",
                "Delete projects",
                True,
            ),
            (
                "projects.archive",
                "project",
                "Archive/unarchive projects",
                False,
            ),
            (
                "projects.assign_roles",
                "project",
                "Assign roles to project members",
                True,
            ),
            (
                "project.view_balance",
                "project",
                "View project transaction balance",
                False,
            ),
            # Notification permissions (1)
            (
                "notifications.view",
                "generic",
                "View notifications for accessible resources",
                False,
            ),
            # Settings permissions (2) - Added for WP05
            (
                "settings.view",
                "generic",
                "View settings and feature flags",
                False,
            ),
            (
                "settings.edit",
                "generic",
                "Create, update, and delete settings and feature flags",
                False,
            ),
            # Permission management permissions (5)
            (
                "permissions.create_role",
                "generic",
                "Create new custom roles",
                True,
            ),
            (
                "permissions.modify_role",
                "generic",
                "Modify existing role definitions",
                True,
            ),
            (
                "permissions.delete_role",
                "generic",
                "Delete custom roles",
                True,
            ),
            (
                "permissions.assign_role",
                "generic",
                "Assign roles to users",
                True,
            ),
            (
                "permissions.view_roles",
                "generic",
                "View role definitions and assignments",
                False,
            ),
        ]

        created_count = 0
        for perm_str, resource_type, description, is_sensitive in permissions:
            permission, created = Permission.objects.get_or_create(
                permission=perm_str,
                defaults={
                    "resource_type": resource_type,
                    "description": description,
                    "is_sensitive": is_sensitive,
                },
            )
            if created:
                sensitive_marker = "[S]" if is_sensitive else "[ ]"
                self.stdout.write(f"  {sensitive_marker} Created permission: {perm_str}")
                created_count += 1
            else:
                self.stdout.write(
                    self.style.WARNING(f"  [=] Permission already exists: {perm_str}")
                )

        total_perms = Permission.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"\nCreated {created_count} new base permissions "
                f"(Total: {total_perms} including wildcard)"
            )
        )

    def seed_roles(self, force=False):
        """Create the 7 default roles with their permission assignments."""
        self.stdout.write(self.style.NOTICE("\nCreating default roles..."))

        # T021: Global Admin - wildcard permission for superuser
        global_admin, created = Role.objects.get_or_create(
            name="Global Admin",
            defaults={
                "description": "System-wide administrator with all permissions",
                "scope": ScopeChoices.GLOBAL,
            },
        )
        if created or force:
            wildcard_perm, _ = Permission.objects.get_or_create(
                permission="*",
                defaults={
                    "resource_type": "generic",
                    "description": "Wildcard permission - grants all access",
                    "is_sensitive": True,
                },
            )
            global_admin.permissions.set([wildcard_perm])
            status = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(f"  OK {status} role: Global Admin (wildcard permission)")
            )
        else:
            self.stdout.write(self.style.WARNING("  [=] Role already exists: Global Admin"))

        # T022: Organization Admin - full org + project permissions
        org_admin, created = Role.objects.get_or_create(
            name="Organization Admin",
            defaults={
                "description": "Full control over organisation and all projects within it",
                "scope": ScopeChoices.ORGANIZATION,
            },
        )
        if created or force:
            # Include all org + project permissions plus settings.edit
            org_perms = Permission.objects.filter(
                resource_type__in=["org", "project"]
            ) | Permission.objects.filter(permission__in=["settings.view", "settings.edit"])
            org_admin.permissions.set(org_perms)
            status = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"  OK {status} role: Organization Admin ({org_perms.count()} permissions)"
                )
            )
        else:
            self.stdout.write(self.style.WARNING("  [=] Role already exists: Organization Admin"))

        # T023: Organization Member - view org, create/view/update projects, view/edit settings
        org_member, created = Role.objects.get_or_create(
            name="Organization Member",
            defaults={
                "description": "Standard organisation member who can work with projects",
                "scope": ScopeChoices.ORGANIZATION,
            },
        )
        if created or force:
            member_perms = Permission.objects.filter(
                permission__in=[
                    "org.view_members",
                    "projects.create",
                    "projects.view",
                    "projects.update",
                    "settings.view",
                    "settings.edit",
                ]
            )
            org_member.permissions.set(member_perms)
            status = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"  OK {status} role: Organization Member ({member_perms.count()} permissions)"
                )
            )
        else:
            self.stdout.write(self.style.WARNING("  [=] Role already exists: Organization Member"))

        # T024: Organization Viewer - read-only org access
        org_viewer, created = Role.objects.get_or_create(
            name="Organization Viewer",
            defaults={
                "description": "Read-only access to organisation and projects",
                "scope": ScopeChoices.ORGANIZATION,
            },
        )
        if created or force:
            viewer_perms = Permission.objects.filter(
                permission__in=["org.view_members", "projects.view", "settings.view"]
            )
            org_viewer.permissions.set(viewer_perms)
            status = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"  OK {status} role: Organization Viewer ({viewer_perms.count()} permissions)"
                )
            )
        else:
            self.stdout.write(self.style.WARNING("  [=] Role already exists: Organization Viewer"))

        # T025: Project Admin - full project control
        project_admin, created = Role.objects.get_or_create(
            name="Project Admin",
            defaults={
                "description": "Full control over a specific project",
                "scope": ScopeChoices.PROJECT,
            },
        )
        if created or force:
            project_perms = Permission.objects.filter(resource_type="project")
            project_admin.permissions.set(project_perms)
            status = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"  OK {status} role: Project Admin ({project_perms.count()} permissions)"
                )
            )
        else:
            self.stdout.write(self.style.WARNING("  [=] Role already exists: Project Admin"))

        # T026: Project Member - view + update projects
        project_member, created = Role.objects.get_or_create(
            name="Project Member",
            defaults={
                "description": "Standard project member who can view and edit",
                "scope": ScopeChoices.PROJECT,
            },
        )
        if created or force:
            member_perms = Permission.objects.filter(
                permission__in=["projects.view", "projects.update"]
            )
            project_member.permissions.set(member_perms)
            status = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"  OK {status} role: Project Member ({member_perms.count()} permissions)"
                )
            )
        else:
            self.stdout.write(self.style.WARNING("  [=] Role already exists: Project Member"))

        # T027: Project Viewer - read-only project access
        project_viewer, created = Role.objects.get_or_create(
            name="Project Viewer",
            defaults={
                "description": "Read-only access to a specific project",
                "scope": ScopeChoices.PROJECT,
            },
        )
        if created or force:
            viewer_perms = Permission.objects.filter(permission="projects.view")
            project_viewer.permissions.set(viewer_perms)
            status = "Created" if created else "Updated"
            self.stdout.write(
                self.style.SUCCESS(
                    f"  OK {status} role: Project Viewer ({viewer_perms.count()} permission)"
                )
            )
        else:
            self.stdout.write(self.style.WARNING("  [=] Role already exists: Project Viewer"))

        self.stdout.write(self.style.SUCCESS("\nAll default roles configured"))
