"""Test app views."""

from django.http import HttpResponse


def index(request):
    """Index view."""
    return HttpResponse("Hello, world!")
