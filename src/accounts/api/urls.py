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
    # Admin user management endpoints
    path("admin/users", views.admin_user_list, name="api_admin_user_list"),
    path(
        "admin/users/<int:user_id>",
        views.admin_user_detail,
        name="api_admin_user_detail",
    ),
    path(
        "admin/users/<int:user_id>/activate",
        views.admin_user_activate,
        name="api_admin_user_activate",
    ),
    path(
        "admin/users/<int:user_id>/deactivate",
        views.admin_user_deactivate,
        name="api_admin_user_deactivate",
    ),
    path(
        "admin/users/<int:user_id>/reset-password",
        views.admin_user_reset_password,
        name="api_admin_user_reset_password",
    ),
    path(
        "admin/users/<int:user_id>/role",
        views.admin_change_role,
        name="api_admin_change_role",
    ),
]
