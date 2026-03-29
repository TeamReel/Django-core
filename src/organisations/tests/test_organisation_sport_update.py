import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from organisations.models import Membership, Organisation
from rest_framework import status
from sport_configuration.models import Sport

User = get_user_model()


@pytest.mark.django_db
def test_org_patch_accepts_integer_sport_id():
    user = User.objects.create_user(
        email="admin@example.com",
        password="TestPass123!",
        is_active=True,
        email_verified=True,
    )

    org = Organisation.objects.create(name="DFB", slug="dfb", creator=user)
    Membership.objects.create(user=user, organisation=org, role="admin")

    football, _ = Sport.objects.update_or_create(
        slug="football-test",
        defaults={"name": "Football (Test)", "sport_icon": "⚽", "parent_sport": None},
    )

    client = Client()
    client.force_login(user)

    response = client.patch(
        f"/api/v1/organisations/{org.slug}/",
        data={"sport_id": football.id},
        content_type="application/json",
    )

    assert response.status_code == status.HTTP_200_OK
    org.refresh_from_db()
    assert org.sport_id == football.id
