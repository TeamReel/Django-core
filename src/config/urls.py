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
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from observability.health import liveness_view, readiness_view
from security_baseline.views import ConstitutionRulesView


def root_view(request):
    return JsonResponse(
        {
            "status": "running",
            "message": (
                "Django Core API is active. Visit /api/docs/ for documentation "
                "or /ui/ for the web interface."
            ),
        }
    )


urlpatterns = [
    path("", root_view, name="root"),
    # B18: Platform Observability Foundation - Health probes
    path("health/live", liveness_view, name="health_live"),
    path("health/ready", readiness_view, name="health_ready"),
    # Railway/Docker health check endpoint
    # Keep this as a lightweight liveness probe so deploys don't fail during
    # migrations or dependency warmup.
    path("health/", liveness_view, name="health_check"),
    # Legacy health check endpoint (pre-B18)
    path("health/legacy/", health_check, name="health_check_legacy"),
    path("admin/", admin.site.urls),
    path("accounts/", include("accounts.urls")),
    path("api/ws/", include("rtc_websockets.urls")),
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
    # B33: Brand Identity Manager API
    path("api/v1/branding/", include("branding.urls")),
    # i18n Preferences API (B12)
    path("api/v1/preferences/", include("i18n_preferences.urls")),
    # B16: Notifications API
    path("api/v1/", include("notifications.urls")),
    # B17: Contextual Notifications API
    path("api/v1/contextual-notifications/", include("contextual_notifications.urls")),
    # B22: File & Media Management
    path("api/v1/", include("files.urls")),
    # B25: Cache Performance Dashboard
    path("api/v1/", include("observability.urls")),
    # B15: Tasks Monitoring API
    path("api/v1/tasks/", include("tasks.urls")),
    # B30: Activities & Period Hierarchy API
    path("api/v1/", include("activities.api.urls")),
    # B34: Generative Pipelines API
    path("api/v1/generative/", include("src.generative.urls")),
    # B36: Video Processing & Composition API
    path("api/v1/video/", include("src.video.urls")),
    # B35: Smart Asset Library API
    path("api/v1/media/", include("medialib.urls")),
    # B37: Workflow Engine & State Machine API
    path("api/v1/workflows/", include("workflows.urls")),
    # B41: User Navigation State API
    path("api/v1/navigation/", include("navigation.urls")),
    # B62: Activity Feed API
    path("api/v1/", include("activity_feed.api.urls")),
    # B46: Soft Delete & Trash API
    path("api/v1/trash/", include("trash.api.urls")),
    # B67: Bulk Content Generation API
    path("api/v1/bulk-generate/", include("src.bulk_generation.urls")),
    # F34-H4: Dashboard Stats API (superuser only)
    path("api/v1/dashboard/", include("dashboard.api_urls")),
    # Security Baseline API
    path("api/security/", include("security_baseline.urls")),
    # Constitution API (B18)
    path("api/constitution/rules/", ConstitutionRulesView.as_view(), name="constitution-rules"),
    # Audit Log API (Legacy removed)
    # path("api/audit/", include("audit.urls")),
    # B18: Observability API (legacy, deprecated)
    path("api/observability/", include("observability.urls")),
    path("", include("django_prometheus.urls")),  # Exposes /metrics endpoint
    # B14: Web UI Baseline - User-facing HTML pages
    path("ui/", include("web_ui.urls")),  # Web UI URLs under /ui/
]

# Media (user uploads)
if getattr(settings, "MEDIA_URL", None) and getattr(settings, "MEDIA_ROOT", None):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
