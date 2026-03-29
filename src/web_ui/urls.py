"""URL configuration for Web UI Baseline."""

from django.urls import path
from web_ui import views

app_name = "web_ui"

urlpatterns = [
    # Home
    path("", views.home, name="ui_home"),
    # Organisations
    path("organisations/", views.organisations_list, name="ui_organisations_list"),
    path(
        "organisations/<uuid:pk>/",
        views.organisations_detail,
        name="ui_organisations_detail",
    ),
    # Projects
    path("projects/", views.projects_list, name="ui_projects_list"),
    path("projects/<int:pk>/", views.projects_detail, name="ui_projects_detail"),
    # Account
    path("account/profile/", views.account_profile, name="ui_account_profile"),
    # Search
    path("search/", views.search_page, name="ui_search"),
    # Demo
    path("demo/websockets/", views.websocket_demo, name="ui_websocket_demo"),
]
