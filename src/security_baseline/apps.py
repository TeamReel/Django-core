"""
Security Baseline App Configuration

Handles Django app initialization and security rule registration.
"""

import importlib
import logging
import os
import pkgutil
from pathlib import Path

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class SecurityBaselineConfig(AppConfig):
    """
    Configuration for the Security Baseline Django app.

    Responsibilities:
    - Register security rules with Constitutional Engine during ready() hook
    - Load security manifests from .security/manifests/
    - Initialize enforcement mode (strict vs advisory)
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "security_baseline"
    verbose_name = "Security Baseline"

    def ready(self):
        """
        Django app ready hook - executed once at startup.

        Discovers and registers all security rules by importing rule modules.
        Loads security manifest and enforces rules via Constitutional Engine.
        """
        # Import all modules in rules/ directory to trigger @register decorators
        rules_package = "security_baseline.rules"
        rules_path = Path(__file__).parent / "rules"

        for _, module_name, _ in pkgutil.iter_modules([str(rules_path)]):
            if module_name not in ["__init__", "base", "registry"]:
                try:
                    importlib.import_module(f"{rules_package}.{module_name}")
                except ImportError as e:
                    logger.warning("Failed to import %s: %s", module_name, e)

        # --- WP08: Constitutional Engine Integration ---
        try:
            from django.conf import settings

            enforcement_mode = getattr(settings, "SECURITY_ENFORCEMENT_MODE", "strict")
        except Exception:
            enforcement_mode = "strict"

        # Load manifest
        from security_baseline.config.manifest_loader import ManifestLoader, ManifestLoaderError

        try:
            manifest = ManifestLoader().load_manifest()
        except ManifestLoaderError as e:
            logger.error("Security manifest loading failed: %s", e)
            manifest = {}

        # Detect environment
        settings_module = os.getenv("DJANGO_SETTINGS_MODULE", "")
        if "local" in settings_module:
            environment = "local"
        elif "staging" in settings_module:
            environment = "staging"
        elif "production" in settings_module:
            environment = "production"
        elif "test" in settings_module or os.getenv("CI"):
            environment = "ci"
        else:
            environment = "unknown"

        # Get all registered rules
        from security_baseline.reporters.security_reporter import SecurityReporter
        from security_baseline.reports import security_logger
        from security_baseline.rules.registry import _registry

        rules = _registry.get_all_rules()

        # WP13: Load exemptions from manifest
        exemptions = manifest.get("exemptions", [])
        if exemptions:
            _registry.load_exemptions(exemptions, environment)
            logger.info("Loaded %d exemption(s) for %s environment", len(exemptions), environment)

        # Import Constitutional Engine
        try:
            from constitution_engine.core.engine import Engine
            from constitution_engine.core.models import ConfigurationProfile, RepositoryContext
        except ImportError as e:
            logger.error("Constitutional Engine import failed: %s", e)
            if enforcement_mode == "strict":
                raise RuntimeError(
                    "Constitutional Engine unavailable; strict enforcement required."
                )
            else:
                logger.warning("Constitutional Engine unavailable; proceeding in advisory mode.")
                return

        # Prepare engine configuration
        config = ConfigurationProfile(
            enabled_rules=[r.rule_id for r in rules if r.enabled],
            metadata={
                "enforcement_mode": enforcement_mode,
                "manifest": manifest,
            },
        )
        context = RepositoryContext(root_path=Path(__file__).parent.parent)
        engine = Engine(config, context)
        for rule in rules:
            engine.register_rule(rule)

        # Start security validation run with correlation ID
        security_logger.start_validation_run(
            enforcement_mode=enforcement_mode, environment=environment
        )

        # Initialize and start timing for reporter
        reporter = SecurityReporter()
        reporter.start_timing()

        # Register reporter with engine
        engine.register_reporter(reporter)

        # Run engine with enhanced context
        context_dict = {
            "settings": settings,
            "environment": environment,
            "enforcement_mode": enforcement_mode,
            "manifest": manifest,
        }

        results = engine.run_once()

        # Generate comprehensive security report
        security_report = reporter.report(results, context_dict, config)

        # Run enforcement using helper
        from security_baseline.enforcement import enforce_security

        should_continue = enforce_security(results, enforcement_mode)
        if not should_continue:
            # Log enforcement action before raising exception
            violations = [r for r in results if getattr(r, "is_failure", False)]
            critical_high = [
                v for v in violations if getattr(v, "severity", "") in ["CRITICAL", "HIGH"]
            ]

            security_logger.log_enforcement_action(
                action="BLOCK",
                reason=(
                    f"Strict mode blocks startup on "
                    f"{len(critical_high)} CRITICAL/HIGH violations"
                ),
                violation_count=len(violations),
                critical_high_count=len(critical_high),
            )

            raise RuntimeError(
                f"Security enforcement failed: {len(violations)} violations found "
                f"({len(critical_high)} CRITICAL/HIGH). Report ID: {security_report.report_id}"
            )
