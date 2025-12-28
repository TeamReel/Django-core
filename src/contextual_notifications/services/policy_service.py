"""Policy service for organisation-level notification policies including quiet hours."""

import logging
from datetime import datetime, timedelta
from typing import Optional

import pytz
from django.core.cache import cache
from prometheus_client import Counter, Histogram

from ..models import OrganisationNotificationPolicy

logger = logging.getLogger(__name__)

# Prometheus metrics
policy_checks_total = Counter(
    "contextual_notifications_policy_checks_total",
    "Total number of organisation policy checks performed",
    ["org_id"],
)

policy_check_time_seconds = Histogram(
    "contextual_notifications_policy_check_time_seconds",
    "Time spent checking organisation policies",
    ["org_id"],
)

quiet_hours_detected_total = Counter(
    "contextual_notifications_quiet_hours_detected_total",
    "Total number of times quiet hours was detected",
    ["org_id"],
)

rate_limited_total = Counter(
    "contextual_notifications_rate_limited_total",
    "Total number of notifications rate limited during quiet hours",
    ["org_id"],
)


class PolicyService:
    """
    Service for checking organisation-level notification policies.

    This service handles:
    - Retrieving organisation policies
    - Detecting quiet hours based on timezone
    - Rate limiting during quiet hours using Redis
    """

    @staticmethod
    def get_org_policy(org_id: int) -> Optional[OrganisationNotificationPolicy]:
        """
        Retrieve organisation notification policy.

        Returns None if no policy exists (defaults apply).

        Args:
            org_id: Organisation ID

        Returns:
            OrganisationNotificationPolicy instance or None

        Example:
            >>> policy = PolicyService.get_org_policy(42)
            >>> if policy and policy.quiet_hours_enabled:
            ...     # Check quiet hours
        """
        with policy_check_time_seconds.labels(org_id=org_id).time():
            policy_checks_total.labels(org_id=org_id).inc()

            try:
                policy = OrganisationNotificationPolicy.objects.select_related("organisation").get(
                    organisation_id=org_id
                )

                logger.debug(
                    "Retrieved policy for org",
                    extra={
                        "org_id": org_id,
                        "quiet_hours_enabled": policy.quiet_hours_enabled,
                    },
                )

                return policy
            except OrganisationNotificationPolicy.DoesNotExist:
                logger.debug(
                    "No policy found for org (using defaults)",
                    extra={"org_id": org_id},
                )
                return None

    @staticmethod
    def is_quiet_hours(
        policy: OrganisationNotificationPolicy,
        current_time: Optional[datetime] = None,
    ) -> bool:
        """
        Check if current time falls within organisation's quiet hours.

        Args:
            policy: Organisation notification policy
            current_time: Current datetime (defaults to now if None)

        Returns:
            True if within quiet hours, False otherwise

        Example:
            >>> policy = PolicyService.get_org_policy(42)
            >>> if policy and PolicyService.is_quiet_hours(policy):
            ...     # Apply rate limiting
        """
        if not policy or not policy.quiet_hours_enabled:
            return False

        if not policy.quiet_hours_start or not policy.quiet_hours_end:
            logger.warning(
                "Quiet hours enabled but times not set",
                extra={"org_id": policy.organisation_id},
            )
            return False

        # Get current time in organisation's timezone
        if current_time is None:
            current_time = datetime.now(pytz.UTC)

        try:
            org_tz = pytz.timezone(policy.quiet_hours_timezone)
            local_time = current_time.astimezone(org_tz).time()
        except pytz.UnknownTimeZoneError:
            logger.error(
                "Invalid timezone in policy",
                extra={
                    "org_id": policy.organisation_id,
                    "timezone": policy.quiet_hours_timezone,
                },
            )
            # Fallback to UTC
            local_time = current_time.astimezone(pytz.UTC).time()

        # Check if current time is within quiet hours
        # Handle cases where quiet hours span midnight
        start = policy.quiet_hours_start
        end = policy.quiet_hours_end

        if start < end:
            # Normal case: 22:00 - 08:00 (same day)
            in_quiet_hours = start <= local_time < end
        else:
            # Spans midnight: 22:00 - 08:00 (next day)
            in_quiet_hours = local_time >= start or local_time < end

        if in_quiet_hours:
            quiet_hours_detected_total.labels(org_id=policy.organisation_id).inc()
            logger.info(
                "Quiet hours detected",
                extra={
                    "org_id": policy.organisation_id,
                    "local_time": local_time.isoformat(),
                    "quiet_hours_start": start.isoformat(),
                    "quiet_hours_end": end.isoformat(),
                    "timezone": policy.quiet_hours_timezone,
                },
            )

        return in_quiet_hours

    @staticmethod
    def check_rate_limit(
        policy: OrganisationNotificationPolicy,
        current_time: Optional[datetime] = None,
    ) -> bool:
        """
        Check if rate limit allows notification during quiet hours.

        Uses Redis to track notifications per minute bucket.
        Key format: rate_limit:{org_id}:{minute_bucket}
        TTL: 60 seconds

        Args:
            policy: Organisation notification policy
            current_time: Current datetime (defaults to now if None)

        Returns:
            True if notification allowed (under rate limit), False if rate limited

        Example:
            >>> policy = PolicyService.get_org_policy(42)
            >>> if policy and PolicyService.is_quiet_hours(policy):
            ...     if PolicyService.check_rate_limit(policy):
            ...         # Deliver notification
            ...     else:
            ...         # Queue for later delivery
        """
        if not policy:
            return True

        if current_time is None:
            current_time = datetime.now(pytz.UTC)

        # Get minute bucket (format: YYYY-MM-DD-HH-MM)
        minute_bucket = current_time.strftime("%Y-%m-%d-%H-%M")
        redis_key = f"rate_limit:{policy.organisation_id}:{minute_bucket}"

        try:
            # Use atomic Redis INCR operation to avoid race conditions
            current_count = cache.get(redis_key)

            if current_count is None:
                # First notification in this minute bucket - initialize with 1
                cache.set(redis_key, 1, timeout=60)
                logger.debug(
                    "Rate limit check passed (first in bucket)",
                    extra={
                        "org_id": policy.organisation_id,
                        "current_count": 1,
                        "rate_limit": policy.quiet_hours_rate_limit,
                        "minute_bucket": minute_bucket,
                    },
                )
                return True

            elif current_count >= policy.quiet_hours_rate_limit:
                # Already at or over limit - reject immediately
                rate_limited_total.labels(org_id=policy.organisation_id).inc()
                logger.warning(
                    "Rate limit exceeded during quiet hours",
                    extra={
                        "org_id": policy.organisation_id,
                        "current_count": current_count,
                        "rate_limit": policy.quiet_hours_rate_limit,
                        "minute_bucket": minute_bucket,
                    },
                )
                return False

            else:
                # Increment atomically and check result
                try:
                    new_count = cache.incr(redis_key)

                    if new_count > policy.quiet_hours_rate_limit:
                        # Raced past limit - decrement back but still reject this notification
                        cache.decr(redis_key)
                        rate_limited_total.labels(org_id=policy.organisation_id).inc()
                        logger.warning(
                            "Rate limit exceeded during quiet hours (race detected)",
                            extra={
                                "org_id": policy.organisation_id,
                                "current_count": new_count,
                                "rate_limit": policy.quiet_hours_rate_limit,
                                "minute_bucket": minute_bucket,
                            },
                        )
                        return False

                    logger.debug(
                        "Rate limit check passed",
                        extra={
                            "org_id": policy.organisation_id,
                            "current_count": new_count,
                            "rate_limit": policy.quiet_hours_rate_limit,
                            "minute_bucket": minute_bucket,
                        },
                    )
                    return True

                except ValueError:
                    # Key doesn't exist (deleted between get and incr) - initialize
                    cache.set(redis_key, 1, timeout=60)
                    logger.debug(
                        "Rate limit check passed (key expired, reinitializing)",
                        extra={
                            "org_id": policy.organisation_id,
                            "current_count": 1,
                            "rate_limit": policy.quiet_hours_rate_limit,
                            "minute_bucket": minute_bucket,
                        },
                    )
                    return True

        except Exception as e:
            logger.error(
                "Rate limit check failed (Redis error, allowing notification)",
                extra={
                    "org_id": policy.organisation_id,
                    "error": str(e),
                },
                exc_info=True,
            )
            # Graceful degradation: allow notification if Redis fails
            return True

    @staticmethod
    def should_deliver_now(
        org_id: int,
        current_time: Optional[datetime] = None,
    ) -> bool:
        """
        Check if notification should be delivered immediately or queued.

        Combines policy check, quiet hours detection, and rate limiting.

        Args:
            org_id: Organisation ID
            current_time: Current datetime (defaults to now if None)

        Returns:
            True if should deliver now, False if should queue for later

        Example:
            >>> if PolicyService.should_deliver_now(42):
            ...     # Deliver notification immediately
            ... else:
            ...     # Queue with Celery ETA for after quiet hours
        """
        policy = PolicyService.get_org_policy(org_id)

        # No policy or quiet hours disabled -> deliver now
        if not policy or not policy.quiet_hours_enabled:
            return True

        # Check if in quiet hours
        if not PolicyService.is_quiet_hours(policy, current_time):
            return True

        # In quiet hours -> check rate limit
        return PolicyService.check_rate_limit(policy, current_time)

    @staticmethod
    def calculate_delivery_time(
        policy: OrganisationNotificationPolicy,
        current_time: Optional[datetime] = None,
    ) -> datetime:
        """
        Calculate next delivery time after quiet hours.

        Args:
            policy: Organisation notification policy
            current_time: Current datetime (defaults to now if None)

        Returns:
            Datetime when notification should be delivered (after quiet hours end)

        Example:
            >>> policy = PolicyService.get_org_policy(42)
            >>> if not PolicyService.should_deliver_now(42):
            ...     eta = PolicyService.calculate_delivery_time(policy)
            ...     # Queue with Celery ETA
        """
        if current_time is None:
            current_time = datetime.now(pytz.UTC)

        if not policy or not policy.quiet_hours_enabled:
            return current_time

        try:
            org_tz = pytz.timezone(policy.quiet_hours_timezone)
            local_time = current_time.astimezone(org_tz)
        except pytz.UnknownTimeZoneError:
            logger.error(
                "Invalid timezone in policy (using UTC)",
                extra={
                    "org_id": policy.organisation_id,
                    "timezone": policy.quiet_hours_timezone,
                },
            )
            org_tz = pytz.UTC
            local_time = current_time.astimezone(org_tz)

        # Calculate time until quiet hours end
        end_time = policy.quiet_hours_end

        # Create datetime for end time today
        end_datetime = local_time.replace(
            hour=end_time.hour,
            minute=end_time.minute,
            second=0,
            microsecond=0,
        )

        # If end time is before current time, it's tomorrow
        if end_datetime <= local_time:
            end_datetime = end_datetime + timedelta(days=1)

        # Convert back to UTC
        delivery_time = end_datetime.astimezone(pytz.UTC)

        logger.info(
            "Calculated delivery time after quiet hours",
            extra={
                "org_id": policy.organisation_id,
                "current_time": current_time.isoformat(),
                "delivery_time": delivery_time.isoformat(),
                "quiet_hours_end": end_time.isoformat(),
            },
        )

        return delivery_time
