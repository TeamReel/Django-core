from django.urls import path
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from api.views import LogoutView

app_name = "api_v1"

urlpatterns = [
    # JWT Authentication endpoints (WP02)
    path("auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
]
