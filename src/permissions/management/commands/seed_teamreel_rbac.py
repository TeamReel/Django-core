"""
Seed TeamReel-specific Permissions and Roles.

Based on teamreel-data-strategy.md Permission & Visibility Architecture.
Creates hierarchical RBAC structure for Land/Club/Team Admin and Member roles.
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from permissions.models import Permission, Role, RoleAssignment, ScopeChoices
from projects.models import ProjectMembership


class Command(BaseCommand):
    help = "Seed TeamReel permissions and roles (hierarchical RBAC)"

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write("TEAMREEL PERMISSIONS & ROLES SEEDING")
        self.stdout.write("=" * 70)

        with transaction.atomic():
            # Step 1: Create Permissions
            permissions = self.create_permissions()

            # Step 2: Create Roles
            roles = self.create_roles(permissions)

            # Step 3: Assign Roles to existing users
            assignments = self.assign_roles(roles)

        # Summary
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("TEAMREEL RBAC SUMMARY")
        self.stdout.write("=" * 70)
        self.stdout.write(f"Permissions Created:  {len(permissions)}")
        self.stdout.write(f"Roles Created:        {len(roles)}")
        self.stdout.write(f"Role Assignments:     {assignments}")
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("\nTeamReel RBAC seeded successfully!"))

    def create_permissions(self):
        """Create TeamReel-specific permissions."""
        self.stdout.write("\n[1/3] Creating Permissions...")

        permissions_data = [
            # Organisation-level permissions
            {
                "permission": "org.view_all",
                "resource_type": "organisation",
                "description": "View all organisations (for cross-club visibility)",
                "is_sensitive": False,
            },
            {
                "permission": "org.manage_settings",
                "resource_type": "organisation",
                "description": "Manage organisation settings and metadata",
                "is_sensitive": True,
            },
            {
                "permission": "org.manage_credits",
                "resource_type": "organisation",
                "description": "Manage credit allocation for organisation",
                "is_sensitive": True,
            },
            # Project-level permissions (Club/Team)
            {
                "permission": "project.view_all",
                "resource_type": "project",
                "description": "View all projects/clubs (for opponent selection)",
                "is_sensitive": False,
            },
            {
                "permission": "project.edit_own",
                "resource_type": "project",
                "description": "Edit own project/team settings",
                "is_sensitive": False,
            },
            {
                "permission": "project.edit_children",
                "resource_type": "project",
                "description": "Edit child projects (club can edit teams)",
                "is_sensitive": False,
            },
            {
                "permission": "project.manage_credits",
                "resource_type": "project",
                "description": "Manage credit transactions for project/team",
                "is_sensitive": True,
            },
            # Match/Activity permissions
            {
                "permission": "match.create",
                "resource_type": "match",
                "description": "Create new matches for team",
                "is_sensitive": False,
            },
            {
                "permission": "match.edit_own_team",
                "resource_type": "match",
                "description": "Edit matches where user's team is involved",
                "is_sensitive": False,
            },
            {
                "permission": "match.delete",
                "resource_type": "match",
                "description": "Delete matches",
                "is_sensitive": True,
            },
            {
                "permission": "match.view_all",
                "resource_type": "match",
                "description": "View all matches (read-only)",
                "is_sensitive": False,
            },
            # Content permissions
            {
                "permission": "content.create",
                "resource_type": "content",
                "description": "Create content (line-ups, posts, media)",
                "is_sensitive": False,
            },
            {
                "permission": "content.edit_own",
                "resource_type": "content",
                "description": "Edit own created content only",
                "is_sensitive": False,
            },
            {
                "permission": "content.edit_all_team",
                "resource_type": "content",
                "description": "Edit all content for team (not restricted to own)",
                "is_sensitive": False,
            },
            {
                "permission": "content.approve",
                "resource_type": "content",
                "description": "Approve content before publication",
                "is_sensitive": False,
            },
            # Profile permissions
            {
                "permission": "profile.edit_own",
                "resource_type": "profile",
                "description": "Edit own user profile (name, photo, birthdate)",
                "is_sensitive": False,
            },
            {
                "permission": "profile.edit_team",
                "resource_type": "profile",
                "description": "Edit profiles of team members",
                "is_sensitive": True,
            },
            # Lineup permissions
            {
                "permission": "lineup.create",
                "resource_type": "lineup",
                "description": "Create match lineups and formations",
                "is_sensitive": False,
            },
            {
                "permission": "lineup.edit",
                "resource_type": "lineup",
                "description": "Edit existing lineups",
                "is_sensitive": False,
            },
            # Feature Flag permissions (Hierarchical Enforcement)
            {
                "permission": "featureflag.view",
                "resource_type": "featureflag",
                "description": "View feature flags configuration and inheritance chain",
                "is_sensitive": False,
            },
            {
                "permission": "featureflag.override_team",
                "resource_type": "featureflag",
                "description": (
                    "Override feature flags at team level (only if not blocked by club/org)"
                ),
                "is_sensitive": True,
            },
            {
                "permission": "featureflag.override_club",
                "resource_type": "featureflag",
                "description": "Override feature flags at club level (blocks all teams below)",
                "is_sensitive": True,
            },
            {
                "permission": "featureflag.override_org",
                "resource_type": "featureflag",
                "description": "Override feature flags at org level (blocks all clubs/teams below)",
                "is_sensitive": True,
            },
        ]

        created_permissions = {}
        for perm_data in permissions_data:
            perm, created = Permission.objects.get_or_create(
                permission=perm_data["permission"],
                defaults={
                    "resource_type": perm_data["resource_type"],
                    "description": perm_data["description"],
                    "is_sensitive": perm_data["is_sensitive"],
                },
            )
            created_permissions[perm.permission] = perm
            if created:
                self.stdout.write(f"  + {perm.permission}")

        self.stdout.write(f"  Total: {len(created_permissions)} permissions")
        return created_permissions

    def create_roles(self, permissions):
        """Create TeamReel hierarchical roles."""
        self.stdout.write("\n[2/3] Creating Roles...")

        roles_data = [
            # === ORGANISATION SCOPE ===
            {
                "name": "Land Admin",
                "scope": ScopeChoices.ORGANIZATION,
                "description": "Federation director with full access to all clubs/teams",
                "permissions": [
                    "org.view_all",
                    "org.manage_settings",
                    "org.manage_credits",
                    "project.view_all",
                    "project.edit_own",
                    "project.edit_children",
                    "project.manage_credits",
                    "match.create",
                    "match.edit_own_team",
                    "match.delete",
                    "match.view_all",
                    "content.create",
                    "content.edit_own",
                    "content.edit_all_team",
                    "content.approve",
                    "profile.edit_own",
                    "profile.edit_team",
                    "lineup.create",
                    "lineup.edit",
                    "featureflag.view",
                    "featureflag.override_team",
                    "featureflag.override_club",
                    "featureflag.override_org",
                ],
            },
            # === PROJECT SCOPE (Club Level) ===
            {
                "name": "Club Admin",
                "scope": ScopeChoices.PROJECT,
                "description": "Club director with full access to club and all teams",
                "permissions": [
                    "org.view_all",  # Can see other clubs (for opponent selection)
                    "project.view_all",
                    "project.edit_own",
                    "project.edit_children",
                    "project.manage_credits",
                    "match.create",
                    "match.edit_own_team",
                    "match.delete",
                    "match.view_all",
                    "content.create",
                    "content.edit_own",
                    "content.edit_all_team",
                    "content.approve",
                    "profile.edit_own",
                    "profile.edit_team",
                    "lineup.create",
                    "lineup.edit",
                    "featureflag.view",
                    "featureflag.override_team",
                    "featureflag.override_club",
                ],
            },
            # === PROJECT SCOPE (Team Level) ===
            {
                "name": "Team Admin",
                "scope": ScopeChoices.PROJECT,
                "description": "Head coach with full access to team content and matches",
                "permissions": [
                    "org.view_all",  # KEY: Can see other clubs/federations (read-only)
                    "project.view_all",  # KEY: Can see other teams (read-only)
                    "project.edit_own",
                    "project.manage_credits",
                    "match.create",
                    "match.edit_own_team",
                    "match.view_all",
                    "content.create",
                    "content.edit_own",
                    "content.edit_all_team",  # KEY: Can edit ALL team content
                    "content.approve",
                    "profile.edit_own",
                    "profile.edit_team",
                    "lineup.create",
                    "lineup.edit",
                    "featureflag.view",
                    "featureflag.override_team",
                ],
            },
            {
                "name": "Team Member",
                "scope": ScopeChoices.PROJECT,
                "description": "Player/staff with limited access (own profile + read team content)",
                "permissions": [
                    "org.view_all",  # Can see other clubs (read-only, for context)
                    "project.view_all",  # Read-only view of other teams
                    "match.view_all",  # Read-only view of matches
                    "content.create",  # Can create content (line-ups, posts)
                    "content.edit_own",  # Can ONLY edit own created content
                    "profile.edit_own",  # Can ONLY edit own profile
                    "featureflag.view",  # Can view feature flags (read-only)
                ],
            },
            {
                "name": "Supporter",
                "scope": ScopeChoices.PROJECT,
                "description": "External viewer (fan/sponsor) with read-only access",
                "permissions": [
                    "match.view_all",  # Read-only
                    # NO content.create, NO profile.edit, NO match.edit
                ],
            },
        ]

        created_roles = {}
        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                name=role_data["name"],
                scope=role_data["scope"],
                defaults={"description": role_data["description"]},
            )

            # Assign permissions
            for perm_name in role_data["permissions"]:
                if perm_name in permissions:
                    role.permissions.add(permissions[perm_name])

            created_roles[role_data["name"]] = role
            if created:
                self.stdout.write(
                    f"  + {role.name} ({role.scope}): {len(role_data['permissions'])} permissions"
                )

        self.stdout.write(f"  Total: {len(created_roles)} roles")
        return created_roles

    def assign_roles(self, roles):
        """Assign roles to existing RBAC users based on their memberships."""
        self.stdout.write("\n[3/3] Assigning Roles to Users...")

        assignments_created = 0

        # 1. Land Admins (Organisation Memberships with role='admin')
        from organisations.models import Membership as OrgMembership

        org_admins = OrgMembership.objects.filter(role="admin", is_active=True)
        for membership in org_admins:
            assignment, created = RoleAssignment.objects.get_or_create(
                user=membership.user,
                role=roles["Land Admin"],
                scope=ScopeChoices.ORGANIZATION,
                target_organization=membership.organisation,
                defaults={"assigned_by": None},
            )
            if created:
                assignments_created += 1
                self.stdout.write(
                    f"  + Land Admin: {membership.user.email} @ {membership.organisation.name}"
                )

        # 2. Club Admins (ProjectMemberships on root projects with role='admin')
        club_admins = ProjectMembership.objects.filter(
            role="admin", project__parent_project__isnull=True
        ).select_related("user", "project")

        for membership in club_admins:
            assignment, created = RoleAssignment.objects.get_or_create(
                user=membership.user,
                role=roles["Club Admin"],
                scope=ScopeChoices.PROJECT,
                target_project=membership.project,
                defaults={"assigned_by": None},
            )
            if created:
                assignments_created += 1

        self.stdout.write(f"  + Club Admins: {club_admins.count()} assigned")

        # 3. Team Admins (ProjectMemberships on child projects with role='admin')
        team_admins = ProjectMembership.objects.filter(
            role="admin", project__parent_project__isnull=False
        ).select_related("user", "project")

        for membership in team_admins:
            assignment, created = RoleAssignment.objects.get_or_create(
                user=membership.user,
                role=roles["Team Admin"],
                scope=ScopeChoices.PROJECT,
                target_project=membership.project,
                defaults={"assigned_by": None},
            )
            if created:
                assignments_created += 1

        self.stdout.write(f"  + Team Admins: {team_admins.count()} assigned")

        # 4. Team Members (ProjectMemberships with role='viewer' on TEAM level)
        # These are Keepers, Players, Assistants, Verzorgers with functional roles
        team_members = ProjectMembership.objects.filter(
            role="viewer", project__parent_project__isnull=False  # Teams (have parent clubs)
        ).select_related("user", "project")

        for membership in team_members:
            assignment, created = RoleAssignment.objects.get_or_create(
                user=membership.user,
                role=roles["Team Member"],
                scope=ScopeChoices.PROJECT,
                target_project=membership.project,
                defaults={"assigned_by": None},
            )
            if created:
                assignments_created += 1

        self.stdout.write(f"  + Team Members: {team_members.count()} assigned")

        # 5. Supporters (ProjectMemberships with role='viewer' on CLUB level)
        supporters = ProjectMembership.objects.filter(
            role="viewer", project__parent_project__isnull=True  # Clubs (no parent)
        ).select_related("user", "project")

        for membership in supporters:
            assignment, created = RoleAssignment.objects.get_or_create(
                user=membership.user,
                role=roles["Supporter"],
                scope=ScopeChoices.PROJECT,
                target_project=membership.project,
                defaults={"assigned_by": None},
            )
            if created:
                assignments_created += 1

        self.stdout.write(f"  + Supporters: {supporters.count()} assigned")

        return assignments_created
