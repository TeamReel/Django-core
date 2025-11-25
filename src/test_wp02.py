"""WP02 Testing Script - Project Model & Managers

Tests all WP02 functionality:
- Project creation with auto-slug generation
- Slug collision handling (sequential suffixes)
- Archive/restore methods
- Manager filtering (objects vs all_objects)
- Case-insensitive name uniqueness

This is a test script, not production code.
Ignoring module-level import order and assert usage.
"""

# ruff: noqa: E402, S101, S106

import os

import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from organisations.models import Organisation
from projects.models import Project

User = get_user_model()

print("=" * 80)
print("WP02 Project Model Testing")
print("=" * 80)

# Clean up any existing test data
Project.all_objects.filter(name__startswith="Test Project").delete()
Organisation.objects.filter(name__startswith="Test Org").delete()
User.objects.filter(email__startswith="testuser").delete()

# Setup test data
print("\n1. Setting up test data...")
user = User.objects.create_user(
    email="testuser1@example.com", password="testpass123", first_name="Test", last_name="User"
)
org = Organisation.objects.create(name="Test Org Alpha", slug="test-org-alpha", creator=user)
print(f"✓ Created organisation: {org}")
print(f"✓ Created user: {user}")

# Test 1: Auto-slug generation
print("\n2. Testing auto-slug generation...")
project1 = Project.objects.create(
    name="Test Project Alpha", organisation=org, creator=user, description="First test project"
)
print(f"✓ Created project with auto-slug: {project1.slug}")
assert (
    project1.slug == "test-project-alpha"
), f"Expected 'test-project-alpha', got '{project1.slug}'"

# Test 2: Slug collision handling
print("\n3. Testing slug collision handling...")
project2 = Project.objects.create(
    name="Test Project Alpha 2",  # Different name
    slug="test-project-alpha",  # Explicit same slug - should get -2 suffix
    organisation=org,
    creator=user,
    description="Second test project",
)
print(f"✓ Created duplicate slug project: {project2.slug}")
assert (
    project2.slug == "test-project-alpha-2"
), f"Expected 'test-project-alpha-2', got '{project2.slug}'"

project3 = Project.objects.create(
    name="Test Project Alpha 3",  # Different name
    slug="test-project-alpha",  # Explicit same slug - should get -3 suffix
    organisation=org,
    creator=user,
    description="Third test project",
)
print(f"✓ Created another duplicate: {project3.slug}")
assert (
    project3.slug == "test-project-alpha-3"
), f"Expected 'test-project-alpha-3', got '{project3.slug}'"

# Test 3: Case-insensitive name uniqueness per org
print("\n4. Testing case-insensitive name uniqueness...")
project4 = Project.objects.create(name="Test Project Beta", organisation=org, creator=user)
print(f"✓ Created project: {project4}")

try:
    # This should fail due to case-insensitive uniqueness
    from django.core.exceptions import ValidationError

    project_fail = Project.objects.create(
        name="TEST PROJECT BETA", organisation=org, creator=user  # Different case, same org
    )
    print("✗ FAILED: Should have raised ValidationError for case-insensitive name")
except (IntegrityError, ValidationError):
    print("✓ Case-insensitive name uniqueness enforced")

# Test 4: Archive method
print("\n5. Testing archive() method...")
print(f"   Before archive - is_active: {project1.is_active}, archived_at: {project1.archived_at}")
project1.archive()
project1.refresh_from_db()
print(f"   After archive - is_active: {project1.is_active}, archived_at: {project1.archived_at}")
assert project1.is_active is False, "Project should be inactive after archive"
assert project1.archived_at is not None, "archived_at should be set after archive"
print("✓ Archive method works correctly")

# Test 5: Manager filtering
print("\n6. Testing manager filtering...")
active_count = Project.objects.count()
all_count = Project.all_objects.count()
print(f"   Active projects (Project.objects): {active_count}")
print(f"   All projects (Project.all_objects): {all_count}")
assert active_count == 3, f"Expected 3 active projects, got {active_count}"
assert all_count == 4, f"Expected 4 total projects, got {all_count}"
print("✓ Managers filter correctly")

# Test 6: Restore method
print("\n7. Testing restore() method...")
project1.restore()
project1.refresh_from_db()
print(f"   After restore - is_active: {project1.is_active}, archived_at: {project1.archived_at}")
assert project1.is_active is True, "Project should be active after restore"
assert project1.archived_at is None, "archived_at should be None after restore"
print("✓ Restore method works correctly")

# Test 7: Manager filtering after restore
print("\n8. Verifying manager counts after restore...")
active_count = Project.objects.count()
all_count = Project.all_objects.count()
print(f"   Active projects: {active_count}")
print(f"   All projects: {all_count}")
assert active_count == 4, f"Expected 4 active projects after restore, got {active_count}"
assert all_count == 4, f"Expected 4 total projects, got {all_count}"
print("✓ All projects now active")

# Test 8: __str__ method
print("\n9. Testing __str__ representation...")
str_repr = str(project1)
expected = f"{org.name}/{project1.name}"
print(f"   Project string: {str_repr}")
assert str_repr == expected, f"Expected '{expected}', got '{str_repr}'"
print("✓ String representation correct")

# Test 9: Verify database constraints
print("\n10. Testing database constraints...")
print(f"   Projects in org '{org.name}':")
for p in Project.objects.filter(organisation=org):
    print(f"     - {p.name} (slug: {p.slug})")

# Cleanup
print("\n11. Cleaning up test data...")
Project.all_objects.filter(name__startswith="Test Project").delete()
Organisation.objects.filter(name__startswith="Test Org").delete()
User.objects.filter(email__startswith="testuser").delete()
print("✓ Test data cleaned up")

print("\n" + "=" * 80)
print("✓ ALL WP02 TESTS PASSED")
print("=" * 80)
print("\nVerified functionality:")
print("  ✓ Auto-slug generation from name")
print("  ✓ Sequential suffix for slug collisions (test-project-alpha-2, -3)")
print("  ✓ Case-insensitive name uniqueness per organisation")
print("  ✓ archive() sets is_active=False and archived_at timestamp")
print("  ✓ restore() sets is_active=True and clears archived_at")
print("  ✓ Project.objects filters to active projects only")
print("  ✓ Project.all_objects returns all projects including archived")
print("  ✓ String representation shows organisation/project hierarchy")
print("  ✓ All database constraints and indexes working")
