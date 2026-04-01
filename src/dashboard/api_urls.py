"""Dashboard API URL routing.

Mounts under /api/v1/dashboard/ via config/urls.py.
"""

from django.urls import path

from . import api_views

app_name = "dashboard"

urlpatterns = [
    path("overview/", api_views.overview, name="overview"),
    path("pipelines/", api_views.pipelines, name="pipelines"),
    path("credits/", api_views.credits, name="credits"),
    path("explorer/", api_views.explorer, name="explorer"),
]
