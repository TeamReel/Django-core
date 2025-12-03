"""Custom model managers for query optimization."""

from typing import TYPE_CHECKING

from django.db import models

if TYPE_CHECKING:
    from .routing_rule import RoutingRule
    from .notification_preference import NotificationPreference


class RoutingRuleManager(models.Manager["RoutingRule"]):
    """Custom manager for RoutingRule with optimized query methods."""

    def for_event(
        self,
        event_type: str,
        org_id: int | None = None,
        project_id: int | None = None,
    ) -> models.QuerySet["RoutingRule"]:
        """
        Get matching routing rules for an event with optimized queries.

        Args:
            event_type: Event type pattern (e.g., 'project.updated')
            org_id: Organisation ID (optional)
            project_id: Project ID (optional)

        Returns:
            QuerySet of matching RoutingRules with related objects loaded
        """
        queryset = self.select_related("organisation", "project", "created_by")
        
        # Start with event type match
        queryset = queryset.filter(event_type=event_type, is_enabled=True)
        
        # Apply scope filtering
        if project_id:
            # Project-specific rules
            queryset = queryset.filter(
                models.Q(scope="project", project_id=project_id)
                | models.Q(scope="org", organisation_id=org_id, project__isnull=True)
                | models.Q(scope="global", organisation__isnull=True, project__isnull=True)
            )
        elif org_id:
            # Org-specific rules (no project)
            queryset = queryset.filter(
                models.Q(scope="org", organisation_id=org_id, project__isnull=True)
                | models.Q(scope="global", organisation__isnull=True, project__isnull=True)
            )
        else:
            # Global rules only
            queryset = queryset.filter(
                scope="global",
                organisation__isnull=True,
                project__isnull=True,
            )
        
        # Order by priority (highest first)
        return queryset.order_by("-priority", "id")

    def enabled(self) -> models.QuerySet["RoutingRule"]:
        """Return only enabled routing rules."""
        return self.filter(is_enabled=True)


class NotificationPreferenceManager(models.Manager["NotificationPreference"]):
    """Custom manager for NotificationPreference with bulk query methods."""

    def for_users(
        self,
        user_ids: list[int],
        event_type: str,
        channel: str,
    ) -> dict[int, bool]:
        """
        Bulk lookup preferences for multiple users.

        Args:
            user_ids: List of user IDs to check
            event_type: Event type pattern
            channel: Delivery channel

        Returns:
            Dict mapping user_id -> enabled (True if no preference found)
        """
        if not user_ids:
            return {}
        
        # Fetch preferences for all users
        preferences = self.filter(
            user_id__in=user_ids,
            event_type=event_type,
            channel=channel,
        ).values_list("user_id", "enabled")
        
        # Build result dict (default to True if no preference)
        result = {user_id: True for user_id in user_ids}
        result.update(dict(preferences))
        
        return result
