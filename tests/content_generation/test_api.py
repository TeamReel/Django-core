"""Tests for content_generation API — ViewSet CRUD, permissions, custom actions."""

import pytest
from django.urls import reverse

from src.content_generation.models import ContentStatus, ContentTemplate

from .conftest import ContentItemFactory, ContentTemplateFactory


@pytest.mark.django_db
class TestContentTemplateAPI:
    """ContentTemplateViewSet — CRUD + permission checks."""

    def test_list_requires_auth(self, api_client):
        url = reverse("api_v1:contenttemplate-list")
        resp = api_client.get(url)
        assert resp.status_code == 401

    def test_list_authenticated(self, authenticated_client, template):
        url = reverse("api_v1:contenttemplate-list")
        resp = authenticated_client.get(url)
        assert resp.status_code == 200

    def test_retrieve_template(self, authenticated_client, template):
        url = reverse("api_v1:contenttemplate-detail", args=[template.pk])
        resp = authenticated_client.get(url)
        assert resp.status_code == 200
        assert resp.data["name"] == template.name

    def test_create_requires_permission(self, authenticated_client, organisation):
        """Regular user without manage_templates permission gets 403."""
        url = reverse("api_v1:contenttemplate-list")
        resp = authenticated_client.post(url, {
            "name": "New Template",
            "template_type": "pre_match",
            "ai_workflow_id": "wf-123",
            "organisation": organisation.pk,
        })
        assert resp.status_code == 403

    def test_create_superuser_allowed(self, superuser_client, organisation):
        url = reverse("api_v1:contenttemplate-list")
        resp = superuser_client.post(url, {
            "name": "New Template",
            "template_type": "pre_match",
            "ai_workflow_id": "wf-123",
            "organisation": str(organisation.pk),
        }, format="json")
        assert resp.status_code == 201

    def test_delete_blocked_with_items(self, superuser_client, template, project, user):
        """Cannot delete template that has ContentItems."""
        ContentItemFactory(template=template, project=project, created_by=user)
        url = reverse("api_v1:contenttemplate-detail", args=[template.pk])
        resp = superuser_client.delete(url)
        assert resp.status_code == 400
        assert "content_items_count" in resp.data

    def test_delete_allowed_without_items(self, superuser_client, template):
        url = reverse("api_v1:contenttemplate-detail", args=[template.pk])
        resp = superuser_client.delete(url)
        assert resp.status_code == 204
        assert not ContentTemplate.objects.filter(pk=template.pk).exists()


@pytest.mark.django_db
class TestContentItemAPI:
    """ContentItemViewSet — CRUD, status, retry, approval actions."""

    def test_list_requires_auth(self, api_client):
        url = reverse("api_v1:contentitem-list")
        resp = api_client.get(url)
        assert resp.status_code == 401

    def test_list_authenticated(self, authenticated_client, content_item):
        url = reverse("api_v1:contentitem-list")
        resp = authenticated_client.get(url)
        assert resp.status_code == 200

    def test_get_status(self, authenticated_client, content_item):
        url = reverse("api_v1:contentitem-get-status", args=[content_item.pk])
        resp = authenticated_client.get(url)
        assert resp.status_code == 200
        assert resp.data["status"] == ContentStatus.QUEUED

    def test_retry_requires_generate_permission(self, authenticated_client, content_item):
        """Retry requires generate_content permission — regular user gets 403."""
        content_item.status = ContentStatus.FAILED
        content_item.error_message = "Timeout"
        content_item.save()
        url = reverse("api_v1:contentitem-retry", args=[content_item.pk])
        resp = authenticated_client.post(url)
        assert resp.status_code == 403


@pytest.mark.django_db
class TestContentApprovalAPI:
    """ContentApprovalViewSet — basic CRUD."""

    def test_list_requires_auth(self, api_client):
        url = reverse("api_v1:contentapproval-list")
        resp = api_client.get(url)
        assert resp.status_code == 401

    def test_list_authenticated(self, authenticated_client):
        url = reverse("api_v1:contentapproval-list")
        resp = authenticated_client.get(url)
        assert resp.status_code == 200
