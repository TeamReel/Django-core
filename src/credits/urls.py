"""Credits URL configuration."""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.get_organisation_credits, name="credits-balance"),
    path("me/", views.get_my_user_credits, name="user-credits-balance"),
    path("projects/<int:project_id>/", views.get_project_credits, name="project-credits-balance"),
]
