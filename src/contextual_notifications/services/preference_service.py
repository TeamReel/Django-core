"""Preference service for filtering users based on notification preferences."""

import logging

from prometheus_client import Counter, Histogram

from ..models import NotificationPreference

logger = logging.getLogger(__name__)

# Prometheus metrics
preference_checks_total = Counter(
    "contextual_notifications_preference_checks_total",
    "Total number of preference checks performed",
    ["event_type", "channel"],
)

preference_filtering_time_seconds = Histogram(
    "contextual_notifications_preference_filtering_time_seconds",
    "Time spent filtering user preferences",
    ["event_type", "channel"],
)

users_filtered_out_total = Counter(
    "contextual_notifications_users_filtered_out_total",
    "Total number of users filtered out by preferences",
    ["event_type", "channel"],
)


class PreferenceService:
    """
    Service for filtering target users based on notification preferences.

    This service checks user preferences (opt-outs) and removes users who have
    disabled notifications for specific (event_type, channel) combinations.
    """

    @staticmethod
    def check_preferences(user_ids: list[int], event_type: str, channel: str) -> list[int]:
        """
        Filter user IDs based on notification preferences.

        Users with enabled=False for the given (event_type, channel) are excluded.
        Users without a preference record default to enabled=True (receive notification).

        Args:
            user_ids: List of user IDs to check preferences for
            channel: Delivery channel (in_app, email, push)
            event_type: Event type identifier

        Returns:
            List of user IDs who should receive the notification (filtered list)

        Example:
            >>> user_ids = [1, 2, 3, 4, 5]
            >>> event_type = "project.updated"
            >>> channel = "email"
            >>> # User 2 and 4 have opted out of project.updated emails
            >>> filtered = PreferenceService.check_preferences(user_ids, event_type, channel)
            >>> filtered
            [1, 3, 5]
        """
        if not user_ids:
            return []

        # Increment preference check metric
        preference_checks_total.labels(event_type=event_type, channel=channel).inc()

        # Measure filtering time
        with preference_filtering_time_seconds.labels(
            event_type=event_type, channel=channel
        ).time():
            # Bulk query preferences for all users
            disabled_users = PreferenceService._get_disabled_users(user_ids, event_type, channel)

            # Filter out disabled users
            filtered_user_ids = [user_id for user_id in user_ids if user_id not in disabled_users]

            # Log filtering results
            filtered_count = len(user_ids) - len(filtered_user_ids)
            logger.info(
                "Filtered users by preferences",
                extra={
                    "event_type": event_type,
                    "channel": channel,
                    "total_users": len(user_ids),
                    "filtered_out": filtered_count,
                    "remaining": len(filtered_user_ids),
                },
            )

            # Increment filtered users metric
            users_filtered_out_total.labels(event_type=event_type, channel=channel).inc(
                filtered_count
            )

            return filtered_user_ids

    @staticmethod
    def _get_disabled_users(user_ids: list[int], event_type: str, channel: str) -> set[int]:
        """
        Get set of user IDs who have disabled notifications for (event_type, channel).

        Queries NotificationPreference model in bulk to avoid N+1 queries.

        Args:
            user_ids: List of user IDs to check
            event_type: Event type identifier
            channel: Delivery channel

        Returns:
            Set of user IDs with enabled=False (opted out)
        """
        # Bulk query: get all preferences for these users + event_type + channel
        preferences = NotificationPreference.objects.filter(
            user_id__in=user_ids, event_type=event_type, channel=channel
        ).values_list("user_id", "enabled")

        # Build set of disabled user IDs
        disabled_users: set[int] = set()
        for user_id, enabled in preferences:
            if not enabled:
                disabled_users.add(user_id)
                logger.debug(
                    "User opted out of notification",
                    extra={
                        "user_id": user_id,
                        "event_type": event_type,
                        "channel": channel,
                    },
                )

        return disabled_users

    @staticmethod
    def get_user_preferences(
        user_id: int, event_type: str | None = None
    ) -> dict[str, dict[str, bool]]:
        """
        Get all notification preferences for a user (for UI display).

        Args:
            user_id: User ID to get preferences for
            event_type: Optional event type filter (all event types if None)

        Returns:
            Dictionary mapping event_type -> {channel: enabled}

        Example:
            >>> prefs = PreferenceService.get_user_preferences(user_id=42)
            >>> prefs
            {
                "project.updated": {"in_app": True, "email": False, "push": True},
                "task.assigned": {"in_app": True, "email": True, "push": False}
            }
        """
        # Query preferences
        query = NotificationPreference.objects.filter(user_id=user_id)
        if event_type:
            query = query.filter(event_type=event_type)

        preferences = query.values_list("event_type", "channel", "enabled")

        # Build nested dict
        result: dict[str, dict[str, bool]] = {}
        for evt_type, channel, enabled in preferences:
            if evt_type not in result:
                result[evt_type] = {}
            result[evt_type][channel] = enabled

        return result

    @staticmethod
    def set_user_preference(user_id: int, event_type: str, channel: str, enabled: bool) -> None:
        """
        Set notification preference for user (create or update).

        Args:
            user_id: User ID
            event_type: Event type identifier
            channel: Delivery channel
            enabled: Whether user wants to receive this notification

        Example:
            >>> # User opts out of project.updated emails
            >>> PreferenceService.set_user_preference(
            ...     user_id=42,
            ...     event_type="project.updated",
            ...     channel="email",
            ...     enabled=False
            ... )
        """
        NotificationPreference.objects.update_or_create(
            user_id=user_id,
            event_type=event_type,
            channel=channel,
            defaults={"enabled": enabled},
        )

        logger.info(
            "User preference updated",
            extra={
                "user_id": user_id,
                "event_type": event_type,
                "channel": channel,
                "enabled": enabled,
            },
        )
