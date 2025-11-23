"""
Security Baseline Django Models

This app does NOT use Django ORM models. All security data is runtime-only
(SecurityRule, SecurityRuleViolation, SecurityReport) or file-based (manifests).

This file exists to satisfy Django app structure conventions.
"""

# No database models - security baseline is validation-only, not data-centric
