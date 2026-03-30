"""Check club permissions for debugging active context."""
import os
import sys
from pathlib import Path

# Setup Django environment first
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_CONFIGURATION", "Production")

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

import django
django.setup()

from accounts.models import User
from organisations.models import Organisation, OrganisationMembership
from projects.models import Project, ProjectMembership

# Find user
user_email = "brian@teamreel.app"
user = User.objects.filter(email=user_email).first()

if not user:
    print(f"User {user_email} not found")
    sys.exit(1)

print(f"User: {user.email} (id={user.id}, superuser={user.is_superuser})")
print()

# Check organisation memberships
print("OrganisationMemberships:")
org_memberships = OrganisationMembership.objects.filter(user=user, is_active=True)
for om in org_memberships:
    print(f"  ✓ {om.organisation.name} (slug={om.organisation.slug}, id={om.organisation.id})")

if not org_memberships:
    print("  (none)")
print()

# Check project memberships
print("ProjectMemberships (first 10):")
project_memberships = ProjectMembership.objects.filter(user=user, is_active=True).select_related('project', 'project__organisation')[:10]
for pm in project_memberships:
    parent = f", parent={pm.project.parent_project.name}" if pm.project.parent_project else ""
    print(f"  ✓ {pm.project.name} (slug={pm.project.slug}, org={pm.project.organisation.name}{parent})")

if not project_memberships:
    print("  (none)")
print()

# Check specific club (Ajax)
ajax = Project.objects.filter(slug="ajax").first()
if ajax:
    print(f"Ajax club: {ajax.name} (id={ajax.id}, org={ajax.organisation.name})")
    has_direct = ProjectMembership.objects.filter(user=user, project=ajax, is_active=True).exists()
    has_child = ProjectMembership.objects.filter(user=user, project__parent_project=ajax, is_active=True).exists()
    has_org = OrganisationMembership.objects.filter(user=user, organisation=ajax.organisation, is_active=True).exists()
    
    print(f"  Direct membership: {has_direct}")
    print(f"  Child team membership: {has_child}")
    print(f"  Organisation membership: {has_org}")
    print(f"  → Should have access: {user.is_superuser or has_direct or has_child or has_org}")
else:
    print("Ajax club not found")
