"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from common.health import health_check
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("health/tasks/", include("tasks.urls")),  # B15: Task health check
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
    # B13 WP06: OpenAPI Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    # B13: API Foundation & Standards - v1 API (consolidated)
    path(
        "api/v1/", include("api.v1.urls")
    ),  # All v1 APIs: auth, users, orgs, projects, permissions
    # Legacy non-versioned URLs removed (WP05) - all APIs now under /api/v1/
    # Transactions API
    path("api/v1/", include("transactions.api.urls")),
    # Settings & Feature Flags API
    path("api/v1/settings/", include("settings.urls")),
    # i18n Preferences API (B12)
    path("api/v1/preferences/", include("i18n_preferences.urls")),
    # B16: Notifications API
    path("api/v1/", include("notifications.urls")),
    # B17: Contextual Notifications API
    path("api/v1/contextual-notifications/", include("contextual_notifications.urls")),
    path("", include("django_prometheus.urls")),  # Exposes /metrics endpoint
    # B14: Web UI Baseline - User-facing HTML pages
    path("ui/", include("web_ui.urls")),  # Web UI URLs under /ui/
]
