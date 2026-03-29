"""
Enforcement strategy helpers for security baseline integration.
Implements strict and advisory enforcement logic for WP08.
"""

import logging

logger = logging.getLogger("security_baseline.enforcement")


class EnforcementMode:
    STRICT = "strict"
    ADVISORY = "advisory"
    MIXED = "mixed"  # WP13: Block on CRITICAL only, warn on HIGH/MEDIUM


def enforce_security(results, mode):
    """
    Enforce security baseline according to enforcement mode (WP13 enhanced).

    - STRICT: Block startup on CRITICAL/HIGH/MEDIUM violations
    - MIXED: Block startup on CRITICAL only, log HIGH/MEDIUM violations
    - ADVISORY: Log violations, allow startup

    Returns True if startup should continue, False if it should block.
    """
    violations = [
        r
        for r in results
        if getattr(r, "is_failure", False) and getattr(r, "rule_identifier", "").startswith("SEC")
    ]

    critical = [v for v in violations if getattr(v, "severity", "").upper() == "CRITICAL"]
    high = [v for v in violations if getattr(v, "severity", "").upper() == "HIGH"]
    medium = [v for v in violations if getattr(v, "severity", "").upper() == "MEDIUM"]

    if mode == EnforcementMode.STRICT:
        critical_or_high = critical + high + medium
        if critical_or_high:
            logger.error(
                "Security Baseline enforcement failed:"
                " %d CRITICAL/HIGH/MEDIUM violations.",
                len(critical_or_high),
            )
            for v in critical_or_high:
                logger.error(f"- [{v.severity}] {v.rule_identifier}: {v.message}")
            return False
        return True

    elif mode == EnforcementMode.MIXED:
        # WP13: Block only on CRITICAL, warn on HIGH/MEDIUM
        if critical:
            logger.error(
                f"Security Baseline enforcement failed: {len(critical)} CRITICAL violations."
            )
            for v in critical:
                logger.error(f"- [{v.severity}] {v.rule_identifier}: {v.message}")
            return False

        # Log HIGH/MEDIUM but don't block
        if high or medium:
            logger.warning(
                "Security Baseline advisory violations:"
                " %d HIGH, %d MEDIUM found.",
                len(high),
                len(medium),
            )
            for v in high + medium:
                logger.warning(f"- [{v.severity}] {v.rule_identifier}: {v.message}")

        return True

    elif mode == EnforcementMode.ADVISORY:
        if violations:
            logger.warning(f"Security Baseline advisory violations: {len(violations)} found.")
            for v in violations:
                logger.warning(f"- [{v.severity}] {v.rule_identifier}: {v.message}")
        return True

    # Default: block if unknown mode
    logger.error(f"Unknown enforcement mode: {mode}. Defaulting to strict.")
    return enforce_security(results, EnforcementMode.STRICT)
