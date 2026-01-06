"""
Diagnose project membership inconsistencies.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from projects.models import Project, ProjectMembership
from permissions.models import RoleAssignment, ScopeChoices
from organisations.models import Membership
from accounts.models import User

# Pick a test project
project = Project.objects.filter(slug__icontains="lyon").first()

if not project:
    print("❌ No Olympique Lyon project found")
    exit(1)

print(f"\n🔍 Analyzing Project: {project.name} ({project.slug})")
print(f"   Organisation: {project.organisation.name}")
print("=" * 80)

# Check ProjectMembership (old model)
pm_count = ProjectMembership.objects.filter(project=project).count()
print(f"\n📊 ProjectMembership records: {pm_count}")
if pm_count > 0:
    print("   ⚠️  ProjectMembership is DEPRECATED - should use RoleAssignments")
    for pm in ProjectMembership.objects.filter(project=project)[:5]:
        print(f"   - {pm.user.email}: {pm.role}")

# Check RoleAssignments (new model)
ra_count = RoleAssignment.objects.filter(target_project=project, scope=ScopeChoices.PROJECT).count()
print(f"\n📊 RoleAssignment (PROJECT scope): {ra_count}")
if ra_count > 0:
    for ra in RoleAssignment.objects.filter(target_project=project, scope=ScopeChoices.PROJECT)[:5]:
        print(f"   - {ra.user.email}: {ra.role.slug}")

# Check Org Memberships (inherit access)
org_members = Membership.objects.filter(organisation=project.organisation, is_active=True).count()
print(f"\n📊 Organisation Members (inherit access): {org_members}")

# Check for duplicate role entries
print("\n🔎 Checking for duplicate role strings...")
users_with_roles = User.objects.filter(role_assignments__target_project=project).distinct()

for user in users_with_roles[:5]:
    # Get all role sources
    roles = []

    # Project-level roles
    proj_roles = RoleAssignment.objects.filter(
        user=user, target_project=project, scope=ScopeChoices.PROJECT
    )
    roles.extend([f"Project: {ra.role.slug}" for ra in proj_roles])

    # Org-level roles
    org_roles = RoleAssignment.objects.filter(
        user=user, target_organisation=project.organisation, scope=ScopeChoices.ORGANISATION
    )
    roles.extend([f"Org: {ra.role.slug}" for ra in org_roles])

    # Legacy ProjectMembership
    old_pm = ProjectMembership.objects.filter(user=user, project=project)
    roles.extend([f"Legacy: {pm.role}" for pm in old_pm])

    # Org Membership
    org_mem = Membership.objects.filter(user=user, organisation=project.organisation).first()
    if org_mem:
        roles.append(f"OrgMember: {org_mem.role}")

    print(f"\n   {user.email}:")
    for role in roles:
        print(f"     - {role}")

print("\n" + "=" * 80)
print("\n💡 RECOMMENDATIONS:")
print("   1. If ProjectMembership > 0: Run migration to convert to RoleAssignments")
print("   2. Clean up duplicate role entries")
print("   3. Ensure frontend only reads from RoleAssignments")
