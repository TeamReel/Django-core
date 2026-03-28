import logging
import os
from datetime import datetime

import yaml
from django.conf import settings
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from security_baseline.reports.asvs_coverage import ASVSCoverageCalculator
from security_baseline.rules.registry import _registry

logger = logging.getLogger(__name__)

# Try to import AuditEvent
try:
    from audit.models import AuditEvent
except ImportError:
    AuditEvent = None

# Try to import Organisation models, but handle if they don't exist (e.g. in isolation)
try:
    from organisations.models import Membership, Organisation
except ImportError:
    Organisation = None
    Membership = None


class ConstitutionRulesView(APIView):
    """
    API Endpoint to retrieve constitution rules from the engine configuration.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Path to constitution_engine.yaml
        # BASE_DIR is 'src', so we need to go up one level to project root
        config_path = settings.BASE_DIR.parent / "constitution_engine.yaml"

        rules = []
        categories = {}
        total_violations = 0

        if config_path.exists():
            try:
                with open(config_path, "r") as f:
                    config = yaml.safe_load(f)

                raw_rules = config.get("rules", [])
                for rule in raw_rules:
                    # Infer category from identifier or description
                    identifier = rule.get("identifier", "").lower()
                    description = rule.get("description", "").lower()

                    category = "General"
                    if "security" in identifier or "security" in description:
                        category = "Security"
                    elif (
                        "mypy" in identifier
                        or "ruff" in identifier
                        or "lint" in identifier
                        or "type" in description
                    ):
                        category = "Code Quality"
                    elif "dependency" in identifier or "dependencies" in description:
                        category = "Dependencies"
                    elif "api" in identifier:
                        category = "API"
                    elif "data" in identifier or "privacy" in description:
                        category = "Data Protection"

                    r = {
                        "id": rule.get("identifier", "unknown"),
                        "category": category,
                        "name": rule.get("description", rule.get("identifier", "Unknown Rule")),
                        "active": rule.get("enabled", True),
                        "severity": rule.get("severity", "medium"),
                        "parameters": rule.get("parameters", {}),
                        "violation_count": 0,  # Placeholder: Real violations would come from engine report
                    }
                    rules.append(r)

                    # Update categories count
                    categories[category] = categories.get(category, 0) + 1

            except Exception as e:
                logger.error("Error reading constitution config: %s", e)
                # Return empty list on error
                pass

        return Response(
            {"rules": rules, "categories": categories, "total_violations": total_violations}
        )


class SecurityEventsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org_slug = request.query_params.get("org")
        severity_filter = request.query_params.get("severity")
        status_filter = request.query_params.get("status")  # 'open' or 'resolved'
        user = request.user

        # RBAC Logic
        is_system_admin = user.is_staff or user.is_superuser

        if org_slug:
            if not Organisation:
                # If organisations app is missing, only system admin can see anything
                if not is_system_admin:
                    raise PermissionDenied("Organisation support not available.")
            else:
                org = get_object_or_404(Organisation, slug=org_slug)

                if not is_system_admin:
                    # Check if user is admin of this org
                    is_org_admin = Membership.objects.filter(
                        user=user, organisation=org, role="admin", is_active=True
                    ).exists()

                    if not is_org_admin:
                        raise PermissionDenied(
                            "You do not have security access for this organisation."
                        )
        else:
            # No org specified
            if not is_system_admin:
                # Non-system admins MUST specify an org (or be redirected to one, but API expects explicit)
                # However, for the "All" view, only system admin is allowed.
                # If a user is an org admin but requests root, we could either:
                # 1. Deny
                # 2. Return their orgs (but that's a list endpoint)
                # We will deny access to global view for non-system admins.
                raise PermissionDenied(
                    "Global security view is restricted to system administrators."
                )

        try:
            rules = _registry.get_all_rules()
            violations = []

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

            context = {"settings": settings, "environment": environment}

            for rule in rules:
                if not rule.enabled:
                    continue

                try:
                    # Use validate_with_exemptions instead of check
                    violation, is_exempt, justification = rule.validate_with_exemptions(context)

                    if violation:
                        violations.append(violation)
                except Exception as e:
                    logger.error("Error validating rule %s: %s", rule.rule_id, e)
                    # Continue to next rule instead of crashing
                    continue

            # Calculate ASVS coverage
            calculator = ASVSCoverageCalculator()
            coverage = calculator.calculate_coverage(rules, violations)

            events = []

            # 1. Add Configuration Violations (Static Analysis)
            for v in violations:
                # Apply severity filter to violations too
                if severity_filter and v.severity.lower() != severity_filter.lower():
                    continue

                events.append(
                    {
                        "id": v.rule_id,
                        "event_type": "security_violation",
                        "severity": v.severity.lower(),
                        "resolved": False,
                        "timestamp": datetime.now().isoformat(),
                        "description": v.message,
                    }
                )

            # 2. Add Real Audit Events (Dynamic Analysis)
            if AuditEvent:
                # Filter for security-relevant events
                security_event_types = [
                    "auth.login_failed",
                    "permission.denied",
                    "auth.password_changed",
                    "role.assigned",
                    "role.revoked",
                ]

                audit_qs = AuditEvent.objects.filter(event_type__in=security_event_types)

                if org_slug and Organisation:
                    # Filter by org if specified
                    # Include events directly linked to org OR events linked to users of this org (e.g. login failures)
                    # Note: Membership related_name is 'organisation_memberships'
                    audit_qs = audit_qs.filter(
                        Q(organization__slug=org_slug)
                        | Q(user__organisation_memberships__organisation__slug=org_slug)
                    ).distinct()

                # Apply severity filter if requested
                if severity_filter:
                    # Map severity to event types
                    severity_map = {
                        "critical": [],  # No critical events yet
                        "high": ["auth.login_failed"],
                        "medium": ["permission.denied", "role.assigned", "role.revoked"],
                        "low": ["auth.password_changed"],
                    }

                    allowed_types = severity_map.get(severity_filter.lower(), [])
                    if allowed_types:
                        audit_qs = audit_qs.filter(event_type__in=allowed_types)
                    else:
                        # If filtering by unknown severity or empty list, return nothing
                        audit_qs = audit_qs.none()

                # Apply ordering and slicing AFTER all filters
                audit_qs = audit_qs.order_by("-created_at")[:20]

                for audit_event in audit_qs:
                    # Map severity
                    severity = "medium"
                    if audit_event.event_type == "auth.login_failed":
                        severity = "high"
                    elif audit_event.event_type == "permission.denied":
                        severity = "medium"
                    elif audit_event.event_type == "auth.password_changed":
                        severity = "low"

                    # Format description
                    description = f"{audit_event.event_type}"
                    if audit_event.user:
                        description += f" by {audit_event.user.email}"

                    # Add metadata details if available
                    if audit_event.event_type == "auth.login_failed":
                        username = audit_event.metadata.get("username", "unknown")
                        ip = audit_event.metadata.get("ip", "unknown")
                        description = f"Failed login attempt for {username} from {ip}"
                    elif audit_event.event_type == "permission.denied":
                        perm = audit_event.metadata.get("permission", "unknown")
                        description = f"Permission denied: {perm}"

                    events.append(
                        {
                            "id": str(audit_event.id),
                            "event_type": audit_event.event_type,
                            "severity": severity,
                            "resolved": True,  # Audit logs are historical records, effectively "resolved" or "acknowledged"
                            "timestamp": audit_event.created_at.isoformat(),
                            "description": description,
                        }
                    )

            # Map coverage to scorecard
            level1_coverage = coverage.get("level_1_coverage_percent", 0)

            asvs_scorecard = {
                "level1": level1_coverage,
                "level2": level1_coverage,  # Placeholder
                "level3": level1_coverage,  # Placeholder
            }

            # Filter by status if requested
            if status_filter:
                if status_filter.lower() == "open":
                    events = [e for e in events if not e["resolved"]]
                elif status_filter.lower() == "resolved":
                    events = [e for e in events if e["resolved"]]

            # Calculate stats
            total_events = len(events)
            resolved_count = sum(1 for e in events if e["resolved"])

            return Response(
                {
                    "events": events,
                    "asvs_scorecard": asvs_scorecard,
                    "total_events": total_events,
                    "resolved_events": resolved_count,
                }
            )
        except Exception as e:
            import traceback

            traceback.print_exc()
            return Response(
                {
                    "error": str(e),
                    "detail": "An error occurred while generating the security report.",
                },
                status=500,
            )
