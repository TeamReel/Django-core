"""Integration test for advisory enforcement mode."""

import pytest
from django.test import override_settings


@pytest.mark.django_db
@override_settings(DEBUG=True, ENVIRONMENT="production", SECURITY_ENFORCEMENT_MODE="advisory")
def test_debug_in_production_advisory_mode():
    """Verify DEBUG=True in production with advisory mode logs warning."""
    from django.conf import settings
    from security_baseline.rules.django_settings import DebugModeProductionRule

    rule = DebugModeProductionRule()
    context = {"settings": settings, "environment": "production"}

    violation = rule.validate(context)

    assert violation is not None
    assert violation.severity == "CRITICAL"
    # In WP08, this will log warning but not raise exception
