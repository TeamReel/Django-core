"""Home view for web_ui app."""

from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


def home(request: HttpRequest) -> HttpResponse:
    """
    Home page view.

    Shows welcome message and navigation links.
    No authentication required.
    """
    context = {
        "page_title": "Home",
    }
    return render(request, "web_ui/home.html", context)
