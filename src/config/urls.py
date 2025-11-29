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

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
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
    path("", include("django_prometheus.urls")),  # Exposes /metrics endpoint
]
