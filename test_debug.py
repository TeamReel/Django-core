import pytest
from activities.models import Participation
from datetime import date
from rest_framework import status

@pytest.mark.django_db
def test_update_debug(authenticated_client, member, period):
    participation = Participation.objects.create(
        member=member, period=period, role="squad_member", status="tentative"
    )
    response = authenticated_client.patch(
        f"/api/v1/participations/{participation.id}/", {"status": "confirmed"}, format="json"
    )
    print(f"Status: {response.status_code}")
    print(f"Data: {response.data}")
    assert response.status_code == status.HTTP_200_OK
