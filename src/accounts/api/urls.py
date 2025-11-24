from django.urls import path

from accounts.api import views

urlpatterns = [
    path("auth/register", views.register_api, name="api_register"),
    path(
        "auth/verify-email/<int:user_id>/<str:token>",
        views.verify_email_api,
        name="api_verify_email",
    ),
    path("auth/login", views.login_api, name="api_login"),
    path("auth/logout", views.logout_api, name="api_logout"),
    path(
        "auth/password-reset",
        views.password_reset_request_api,
        name="api_password_reset_request",
    ),
    path(
        "auth/password-reset-confirm",
        views.password_reset_confirm_api,
        name="api_password_reset_confirm",
    ),
]
