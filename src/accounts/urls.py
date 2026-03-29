from accounts import views
from django.urls import path

urlpatterns = [
    path("register/", views.register, name="register"),
    path(
        "verify-email/<int:user_id>/<str:token>/",
        views.verify_email,
        name="verify_email",
    ),
    path("login/", views.login_view, name="login"),
    path("logout/", views.logout_view, name="logout"),
    path(
        "password-reset/",
        views.password_reset_request,
        name="password_reset_request",
    ),
    path(
        "reset-password/<str:uidb64>/<str:token>/",
        views.password_reset_confirm,
        name="password_reset_confirm",
    ),
]
