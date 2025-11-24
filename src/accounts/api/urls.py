from django.urls import path

from accounts.api import views

urlpatterns = [
    path("auth/register", views.register_api, name="api_register"),
    path(
        "auth/verify-email/<int:user_id>/<str:token>",
        views.verify_email_api,
        name="api_verify_email",
    ),
]
