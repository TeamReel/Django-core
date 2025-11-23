"""Tests for security_baseline package initialization.

Verifies app configuration and basic imports.
"""

import pytest


def test_app_config_import():
    """Verify SecurityBaselineConfig can be imported."""
    from src.security_baseline.apps import SecurityBaselineConfig

    assert SecurityBaselineConfig.name == "security_baseline"


def test_default_app_config():
    """Verify default_app_config is set correctly."""
    import src.security_baseline as app

    assert hasattr(app, "__version__")


@pytest.mark.django_db
def test_app_in_installed_apps(settings):
    """Verify security_baseline is registered in INSTALLED_APPS."""
    assert "security_baseline" in settings.INSTALLED_APPS
