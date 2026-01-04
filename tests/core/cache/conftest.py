"""Pytest configuration for core cache tests."""

from __future__ import annotations

import pytest


@pytest.fixture(scope="session", autouse=True)
def django_db_setup():
    """Override pytest-django database setup to prevent database creation."""
    pass


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """Prevent pytest-django from requiring db marker."""
    pass
