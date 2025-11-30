"""Views for web_ui app."""

from web_ui.views.account import account_profile
from web_ui.views.home import home
from web_ui.views.organisations import organisations_detail, organisations_list
from web_ui.views.projects import projects_detail, projects_list

__all__ = [
    "home",
    "organisations_list",
    "organisations_detail",
    "projects_list",
    "projects_detail",
    "account_profile",
]
