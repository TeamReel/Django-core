#!/usr/bin/env python
"""
Verification script for WP07: User Story 4 - Admin User Management

Tests Django Admin configuration and admin API endpoints.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
django.setup()

from accounts.models import User
from django.contrib.auth.models import Group
from django.test import RequestFactory
from rest_framework.test import APIRequestFactory, force_authenticate
from accounts.api.views import (
    admin_user_list,
    admin_user_detail,
    admin_user_activate,
    admin_user_deactivate,
    admin_user_reset_password,
)


def print_test(test_num, description):
    """Print test header."""
    print(f"\n{'=' * 70}")
    print(f"Test {test_num}: {description}")
    print('=' * 70)


def test_admin_user_list():
    """Test admin user list endpoint with pagination."""
    print_test(1, "Admin User List (Pagination & Filters)")

    factory = APIRequestFactory()
    request = factory.get('/api/v1/admin/users')

    # Create admin user
    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        admin_user = User.objects.create_superuser(
            email="admin@test.com",
            password="TestPass123!@#"
        )

    force_authenticate(request, user=admin_user)
    response = admin_user_list(request)

    assert response.status_code == 200
    assert 'results' in response.data
    print("✅ Admin can list users with pagination")

    # Test filter by is_active
    request = factory.get('/api/v1/admin/users?is_active=true')
    force_authenticate(request, user=admin_user)
    response = admin_user_list(request)
    assert response.status_code == 200
    print("✅ Filter by is_active works")


def test_admin_user_detail():
    """Test admin user detail endpoint."""
    print_test(2, "Admin User Detail")

    factory = APIRequestFactory()
    admin_user = User.objects.filter(is_superuser=True).first()
    test_user = User.objects.filter(is_superuser=False).first()

    if not test_user:
        test_user = User.objects.create_user(
            email="detail@test.com",
            password="TestPass123!@#"
        )

    request = factory.get(f'/api/v1/admin/users/{test_user.id}')
    force_authenticate(request, user=admin_user)
    response = admin_user_detail(request, test_user.id)

    assert response.status_code == 200
    assert response.data['email'] == test_user.email
    print("✅ Admin can view user details")


def test_admin_user_activate():
    """Test admin user activation endpoint."""
    print_test(3, "Admin User Activation")

    factory = APIRequestFactory()
    admin_user = User.objects.filter(is_superuser=True).first()

    # Create inactive user
    test_user = User.objects.create_user(
        email=f"activate{User.objects.count()}@test.com",
        password="TestPass123!@#",
        is_active=False
    )

    request = factory.patch(f'/api/v1/admin/users/{test_user.id}/activate')
    force_authenticate(request, user=admin_user)
    response = admin_user_activate(request, test_user.id)

    assert response.status_code == 200
    test_user.refresh_from_db()
    assert test_user.is_active is True
    print("✅ Admin can activate inactive user")


def test_admin_user_deactivate():
    """Test admin user deactivation endpoint."""
    print_test(4, "Admin User Deactivation")

    factory = APIRequestFactory()
    admin_user = User.objects.filter(is_superuser=True).first()

    # Create active user
    test_user = User.objects.create_user(
        email=f"deactivate{User.objects.count()}@test.com",
        password="TestPass123!@#",
        is_active=True
    )

    request = factory.patch(f'/api/v1/admin/users/{test_user.id}/deactivate')
    force_authenticate(request, user=admin_user)
    response = admin_user_deactivate(request, test_user.id)

    assert response.status_code == 200
    test_user.refresh_from_db()
    assert test_user.is_active is False
    print("✅ Admin can deactivate active user")


def test_self_deactivation_protection():
    """Test that users cannot deactivate themselves."""
    print_test(5, "Self-Deactivation Protection")

    factory = APIRequestFactory()
    admin_user = User.objects.filter(is_superuser=True).first()

    request = factory.patch(f'/api/v1/admin/users/{admin_user.id}/deactivate')
    force_authenticate(request, user=admin_user)
    response = admin_user_deactivate(request, admin_user.id)

    assert response.status_code == 400
    assert 'cannot deactivate your own account' in response.data['message'].lower()
    print("✅ Self-deactivation is prevented")


def test_role_hierarchy_protection():
    """Test that admins cannot deactivate superadmins/admins."""
    print_test(6, "Role Hierarchy Protection")

    factory = APIRequestFactory()

    # Create admin (not superuser)
    admin_group, _ = Group.objects.get_or_create(name='admin')
    admin_user = User.objects.create_user(
        email=f"admin{User.objects.count()}@test.com",
        password="TestPass123!@#",
        is_active=True
    )
    admin_user.groups.add(admin_group)
    admin_user.is_staff = True
    admin_user.save()

    # Try to deactivate superuser
    superuser = User.objects.filter(is_superuser=True).first()
    request = factory.patch(f'/api/v1/admin/users/{superuser.id}/deactivate')
    force_authenticate(request, user=admin_user)
    response = admin_user_deactivate(request, superuser.id)

    assert response.status_code == 403
    assert 'do not have permission' in response.data['message'].lower()
    print("✅ Admins cannot deactivate superadmins")


def test_admin_user_reset_password():
    """Test admin-initiated password reset."""
    print_test(7, "Admin-Initiated Password Reset")

    factory = APIRequestFactory()
    admin_user = User.objects.filter(is_superuser=True).first()

    # Create verified user
    test_user = User.objects.create_user(
        email=f"reset{User.objects.count()}@test.com",
        password="TestPass123!@#",
        is_active=True,
        email_verified=True
    )

    request = factory.post(f'/api/v1/admin/users/{test_user.id}/reset-password')
    force_authenticate(request, user=admin_user)
    response = admin_user_reset_password(request, test_user.id)

    assert response.status_code == 200
    assert 'email sent' in response.data['message'].lower()
    print("✅ Admin can send password reset to verified user")


def test_reset_unverified_user():
    """Test that password reset fails for unverified users."""
    print_test(8, "Password Reset for Unverified User")

    factory = APIRequestFactory()
    admin_user = User.objects.filter(is_superuser=True).first()

    # Create unverified user
    test_user = User.objects.create_user(
        email=f"unverified{User.objects.count()}@test.com",
        password="TestPass123!@#",
        is_active=True,
        email_verified=False
    )

    request = factory.post(f'/api/v1/admin/users/{test_user.id}/reset-password')
    force_authenticate(request, user=admin_user)
    response = admin_user_reset_password(request, test_user.id)

    assert response.status_code == 400
    assert 'unverified' in response.data['message'].lower()
    print("✅ Cannot send reset to unverified account")


def test_user_list_serializer():
    """Test UserListSerializer includes role field."""
    print_test(9, "UserListSerializer Role Field")

    from accounts.serializers import UserListSerializer

    superuser = User.objects.filter(is_superuser=True).first()
    serializer = UserListSerializer(superuser)

    assert 'role' in serializer.data
    assert serializer.data['role'] == 'superadmin'
    print("✅ UserListSerializer includes role field")


def test_user_detail_serializer():
    """Test UserDetailSerializer includes groups."""
    print_test(10, "UserDetailSerializer Groups Field")

    from accounts.serializers import UserDetailSerializer

    admin_group, _ = Group.objects.get_or_create(name='admin')
    test_user = User.objects.create_user(
        email=f"groups{User.objects.count()}@test.com",
        password="TestPass123!@#"
    )
    test_user.groups.add(admin_group)

    serializer = UserDetailSerializer(test_user)

    assert 'groups' in serializer.data
    assert len(serializer.data['groups']) > 0
    print("✅ UserDetailSerializer includes groups")


def cleanup():
    """Clean up test data."""
    print("\n\nCleaning up test data...")
    User.objects.filter(email__contains='test.com').delete()
    print("✅ Cleanup complete")


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("WP07 VERIFICATION: Admin User Management")
    print("=" * 70)

    try:
        test_admin_user_list()
        test_admin_user_detail()
        test_admin_user_activate()
        test_admin_user_deactivate()
        test_self_deactivation_protection()
        test_role_hierarchy_protection()
        test_admin_user_reset_password()
        test_reset_unverified_user()
        test_user_list_serializer()
        test_user_detail_serializer()

        print("\n" + "=" * 70)
        print("✅ ALL TESTS PASSED (10/10)")
        print("=" * 70)

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        cleanup()
