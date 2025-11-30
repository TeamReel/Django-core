"""Account profile views for web_ui app."""

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


@login_required
def account_profile(request: HttpRequest) -> HttpResponse:
    """
    Show user account profile page.

    Stub view: Displays basic user info without editing functionality.
    """
    user = request.user

    context = {
        "page_title": "Account Profile",
        "user": user,
    }
    return render(request, "web_ui/account/profile.html", context)
