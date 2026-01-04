import pytest
from django.contrib.auth import get_user_model
from organisations.models import Membership, Organisation
from rest_framework.test import APIClient
from audit.models import AuditEvent

User = get_user_model()


@pytest.mark.django_db
def test_remove_org_member_soft_delete():
    # Create admin user
    admin_user = User.objects.create_superuser(
        email="admin@example.com", password="password123", first_name="Admin", last_name="User"
    )

    # Create target user
    target_user = User.objects.create_user(
        email="target@example.com", password="password123", first_name="Target", last_name="User"
    )

    # Create organisation
    org = Organisation.objects.create(name="Test Org", slug="test-org", creator=admin_user)

    # Add admin as member
    Membership.objects.create(user=admin_user, organisation=org, role="admin")

    # Add target user as member
    membership = Membership.objects.create(user=target_user, organisation=org, role="member")

    client = APIClient()
    client.force_authenticate(user=admin_user)

    # Remove member
    response = client.delete(f"/api/v1/organisations/{org.slug}/members/{membership.id}/")

    assert response.status_code == 204

    # Verify soft delete (is_active=False)
    membership.refresh_from_db()
    assert membership.is_active is False

    # Verify audit log
    assert AuditEvent.objects.filter(
        event_type="organisation.membership.deleted",
        organization=org,
        metadata__user_id=str(target_user.id),
    ).exists()
