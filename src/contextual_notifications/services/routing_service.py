"""Routing service for evaluating routing rules and determining target users."""

import logging
from typing import Any

from django.db.models import Q
from prometheus_client import Counter, Histogram

from ..models import RoutingRule

logger = logging.getLogger(__name__)

# Prometheus metrics
routing_evaluations_total = Counter(
    "contextual_notifications_routing_evaluations_total",
    "Total number of routing evaluations",
    ["event_type"],
)

routing_time_seconds = Histogram(
    "contextual_notifications_routing_time_seconds",
    "Time spent evaluating routing rules",
    ["event_type"],
)

routing_rules_matched_total = Counter(
    "contextual_notifications_routing_rules_matched_total",
    "Total number of routing rules matched",
    ["event_type", "scope"],
)

target_users_resolved_total = Counter(
    "contextual_notifications_target_users_resolved_total",
    "Total number of target users resolved",
    ["event_type"],
)


class RoutingService:
    """
    Service for evaluating routing rules to determine notification recipients.

    Given an event dictionary, this service:
    1. Queries matching RoutingRule entries based on event_type and context
    2. Evaluates rules by scope (project → org → global) with priority ordering
    3. Resolves target users from B08 RoleAssignment based on target_role
    4. Returns list of (user_id, channel) tuples for notification delivery
    """

    @staticmethod
    def route_event(event_dict: dict[str, Any]) -> list[tuple[int, str]]:
        """
        Evaluate routing rules and determine target users for event.

        Args:
            event_dict: Event dictionary with type, context, and payload

        Returns:
            List of (user_id, channel) tuples for notification delivery

        Example:
            >>> event_dict = {
            ...     "type": "project.updated",
            ...     "context": {"org_id": 42, "project_id": 123},
            ...     "payload": {"title": "...", "body": "..."}
            ... }
            >>> targets = RoutingService.route_event(event_dict)
            >>> # [(7, "in_app"), (7, "email"), (8, "in_app"), ...]
        """
        event_type = event_dict.get("type", "")
        context = event_dict.get("context", {})
        org_id = context.get("org_id")
        project_id = context.get("project_id")

        # Increment routing evaluation metric
        routing_evaluations_total.labels(event_type=event_type).inc()

        # Measure routing time
        with routing_time_seconds.labels(event_type=event_type).time():
            # Query matching routing rules
            rules = RoutingService._query_matching_rules(event_type, org_id, project_id)

            # Log matched rules
            logger.info(
                "Matched routing rules",
                extra={
                    "event_type": event_type,
                    "org_id": org_id,
                    "project_id": project_id,
                    "rules_matched": len(rules),
                },
            )

            # Resolve target users from rules
            targets = RoutingService._resolve_target_users(rules, org_id, project_id)

            # Log resolved targets
            logger.info(
                "Resolved target users",
                extra={
                    "event_type": event_type,
                    "org_id": org_id,
                    "project_id": project_id,
                    "target_count": len(targets),
                },
            )

            # Increment target users metric
            target_users_resolved_total.labels(event_type=event_type).inc(len(targets))

            return targets

    @staticmethod
    def _query_matching_rules(
        event_type: str, org_id: int | None, project_id: int | None
    ) -> list[RoutingRule]:
        """
        Query RoutingRule model for matching rules.

        Rules are matched by event_type and scope (project/org/global).
        Returns rules ordered by priority (highest first).

        Args:
            event_type: Event type identifier
            org_id: Organisation ID from event context
            project_id: Project ID from event context

        Returns:
            List of matching RoutingRule instances (ordered by priority)
        """
        # Start with base query: event type match + enabled
        queryset = RoutingRule.objects.filter(event_type=event_type, is_enabled=True)

        # Apply scope filtering
        scope_filters = Q()

        # Global rules (always apply)
        scope_filters |= Q(scope=RoutingRule.SCOPE_GLOBAL)

        # Org rules (if org_id provided)
        if org_id:
            scope_filters |= Q(scope=RoutingRule.SCOPE_ORG, organisation_id=org_id)
            routing_rules_matched_total.labels(event_type=event_type, scope="org").inc()

        # Project rules (if project_id provided)
        if project_id:
            scope_filters |= Q(scope=RoutingRule.SCOPE_PROJECT, project_id=project_id)
            routing_rules_matched_total.labels(event_type=event_type, scope="project").inc()

        queryset = queryset.filter(scope_filters)

        # Optimize with select_related to avoid N+1 queries
        queryset = queryset.select_related("organisation", "project", "created_by")

        # Order by priority (highest first), then by id for consistency
        queryset = queryset.order_by("-priority", "id")

        # Execute query and return list
        rules = list(queryset)

        # Increment global rules metric
        routing_rules_matched_total.labels(event_type=event_type, scope="global").inc()

        return rules

    @staticmethod
    def _resolve_target_users(
        rules: list[RoutingRule], org_id: int | None, project_id: int | None
    ) -> list[tuple[int, str]]:
        """
        Resolve target users from routing rules via B08 RoleAssignment.

        For each rule with target_role, query RoleAssignment to find users
        with that role at the appropriate scope (global/org/project).

        Args:
            rules: List of matching RoutingRule instances
            org_id: Organisation ID for scoping
            project_id: Project ID for scoping

        Returns:
            List of (user_id, channel) tuples (deduplicated)
        """
        from permissions.models import Role, RoleAssignment, ScopeChoices

        targets: set[tuple[int, str]] = set()

        for rule in rules:
            # Skip rules without target_role (future: direct user targeting)
            if not rule.target_role:
                logger.debug(
                    "Skipping rule without target_role",
                    extra={"rule_id": rule.id, "event_type": rule.event_type},
                )
                continue

            # Query Role by name (target_role is role name)
            try:
                role = Role.objects.get(name=rule.target_role)
                logger.info(f"DEBUG: Found role {role.name} (id={role.id}) for rule {rule.id}")
            except Role.DoesNotExist:
                all_roles = list(Role.objects.values_list("name", flat=True))
                logger.warning(
                    "Target role not found",
                    extra={
                        "rule_id": rule.id,
                        "target_role": rule.target_role,
                        "event_type": rule.event_type,
                        "available_roles": all_roles,
                    },
                )
                continue

            # Query RoleAssignment for users with this role at appropriate scope
            role_assignments = RoleAssignment.objects.filter(role=role)
            logger.info(f"DEBUG: Initial assignments count: {role_assignments.count()}")

            # Apply scope filtering based on rule scope
            if rule.scope == RoutingRule.SCOPE_PROJECT and project_id:
                # Project scope: users assigned to this specific project
                role_assignments = role_assignments.filter(
                    scope=ScopeChoices.PROJECT, target_project_id=project_id
                )
                logger.info(f"DEBUG: Filtered by PROJECT scope. Count: {role_assignments.count()}")
            elif rule.scope == RoutingRule.SCOPE_ORG and org_id:
                # Org scope: users assigned to this organisation
                role_assignments = role_assignments.filter(
                    scope=ScopeChoices.ORGANIZATION, target_organization_id=org_id
                )
                logger.info(f"DEBUG: Filtered by ORG scope. Count: {role_assignments.count()}")
            elif rule.scope == RoutingRule.SCOPE_GLOBAL:
                # Global scope: users assigned globally
                role_assignments = role_assignments.filter(scope=ScopeChoices.GLOBAL)
                logger.info(f"DEBUG: Filtered by GLOBAL scope. Count: {role_assignments.count()}")
            else:
                # Invalid scope or missing context
                logger.warning(
                    "Cannot resolve users for rule scope",
                    extra={
                        "rule_id": rule.id,
                        "rule_scope": rule.scope,
                        "org_id": org_id,
                        "project_id": project_id,
                    },
                )
                continue

            # Optimize with select_related for user lookup
            role_assignments = role_assignments.select_related("user")

            # Extract user IDs and pair with channel
            for assignment in role_assignments:
                logger.info(
                    f"DEBUG: Processing assignment for"
                    f" user {assignment.user_id}."
                    f" Active: {assignment.user.is_active}"
                )
                if assignment.user and assignment.user.is_active:
                    targets.add((assignment.user.id, rule.channel))
                    logger.info(
                        f"DEBUG: Added target {assignment.user.id} for channel {rule.channel}"
                    )

            logger.debug(
                "Resolved users for rule",
                extra={
                    "rule_id": rule.id,
                    "target_role": rule.target_role,
                    "channel": rule.channel,
                    "users_found": role_assignments.count(),
                },
            )

        # Convert set to sorted list for consistency
        return sorted(targets)
