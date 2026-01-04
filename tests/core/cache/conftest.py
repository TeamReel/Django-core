"""Pytest configuration for core cache tests."""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _disable_database_access(django_db_blocker, request):
    """
    Disable database access for all cache tests.

    These are unit tests that mock Django's cache framework and don't need
    database access. Tests can opt-in with @pytest.mark.django_db if needed.
    """
    # Only block if test doesn't explicitly request db access
    if "django_db" not in request.keywords:
        with django_db_blocker.block():
            yield
    else:
        yield
