import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_legacy_audit_route_removed():
    """
    Verify that the legacy /api/audit/ route has been removed and returns 404.
    """
    client = APIClient()
    response = client.get("/api/audit/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_v1_activity_route_exists():
    """
    Verify that the replacement /api/v1/activity/ route exists (even if 401/403).
    """
    client = APIClient()
    response = client.get("/api/v1/activity/")
    # Should be 401 (unauth) or 200 (if auth mocked), but definitely not 404
    assert response.status_code != 404
