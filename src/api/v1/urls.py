from api.v1.views import api_root
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

# DRF Router for domain viewsets (WP05)
router = DefaultRouter()
# Domain viewsets will be registered here when implementing domain endpoints
# router.register(r"users", UserViewSet, basename="user")
# router.register(r"organisations", OrganisationViewSet, basename="organisation")
# router.register(r"projects", ProjectViewSet, basename="project")

app_name = "api_v1"

urlpatterns = [
    # API Root (WP05) - GET /api/v1/
    path("", api_root, name="root"),
    # JWT Authentication endpoints (WP02)
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # path("auth/logout/", LogoutView.as_view(), name="logout"),
    # Domain API routes (existing from B05, B06, B07) - consolidated under v1
    path("", include("accounts.api.urls")),  # /api/v1/users/
    path("organisations/", include("organisations.api.urls")),  # /api/v1/organisations/
    path("projects/", include("projects.api.urls")),  # /api/v1/projects/
    path("permissions/", include("permissions.api.urls")),  # /api/v1/permissions/
    path("credits/", include("credits.urls")),  # /api/v1/credits/
    path("search/", include("search.urls")),  # /api/v1/search/
    path("activity/", include("audit.urls")),  # /api/v1/activity/
    path("activities/", include("activities.api.urls")),  # /api/v1/activities/ (B30)
    path("transactions/", include("transactions.api.urls")),  # /api/v1/transactions/
    path("video/", include("src.video.urls")),  # /api/v1/video/
    path(
        "content-generation/", include("src.content_generation.urls")
    ),  # /api/v1/content-generation/ (B31)
    # B32: Sport Configuration & Templates
    path("", include("sport_configuration.urls")),  # /api/v1/sports/
    # B35: Smart Asset Library
    path("media-library/", include("medialib.urls")),
]
