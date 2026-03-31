"""Tests for the custom admin site dashboard."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()


@pytest.mark.django_db
class TestAdminDashboard:
    """Tests for the TeamReelAdminSite index page."""

    def test_superuser_sees_platform_stats(self):
        user = User.objects.create_superuser(
            email="super@test.com", password="test123",
            first_name="Super", last_name="User",
        )
        client = Client()
        client.force_login(user)

        response = client.get("/admin/")
        assert response.status_code == 200
        assert "platform_stats" in response.context

    def test_non_superuser_no_stats(self):
        user = User.objects.create_user(
            email="staff@test.com", password="test123",
            first_name="Staff", last_name="User",
            is_staff=True,
        )
        client = Client()
        client.force_login(user)

        response = client.get("/admin/", follow=True)
        assert response.status_code == 200
        # Staff users that aren't superusers shouldn't see stats
        context_keys = set()
        for ctx in response.context or []:
            if hasattr(ctx, "keys"):
                context_keys.update(ctx.keys())
        assert "platform_stats" not in context_keys

    def test_admin_site_headers(self):
        from django.contrib import admin

        assert admin.site.site_header == "TeamReel Admin"
        assert admin.site.site_title == "TeamReel"
        assert admin.site.index_title == "Dashboard"
