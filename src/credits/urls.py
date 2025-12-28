"""Credits URL configuration."""

from django.urls import path

from . import views

urlpatterns = [
    path("", views.get_organisation_credits, name="credits-balance"),
]
