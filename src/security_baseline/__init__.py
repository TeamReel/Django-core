"""
Security Baseline Django App

Provides comprehensive security enforcement for Django Core-App through:
- Runtime security validation (Django settings, sessions, CSRF, headers, passwords)
- Integration with Constitutional Enforcement Engine (Module 002)
- Strict and advisory enforcement modes
"""

__version__ = "0.1.0"
default_app_config = "security_baseline.apps.SecurityBaselineConfig"
