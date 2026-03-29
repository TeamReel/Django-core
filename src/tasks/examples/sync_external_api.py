"""Example task with aggressive retry policy for external APIs."""

import logging
import time

import requests
from celery import shared_task
from requests.exceptions import RequestException, Timeout

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,  # Provides access to self (task instance)
    max_retries=5,  # Retry up to 5 times
    default_retry_delay=60,  # Start with 1 minute delay
    autoretry_for=(RequestException, Timeout),  # Auto-retry these exceptions
    retry_backoff=True,  # Exponential backoff
    retry_backoff_max=600,  # Max 10 minutes between retries
    retry_jitter=True,  # Add randomness to prevent thundering herd
)
def sync_external_api(self, api_url: str, org_id: int) -> dict:
    """
    Sync data from external API with aggressive retry policy.

    This task demonstrates:
    - Custom retry configuration
    - Exponential backoff (60s, 120s, 240s, 480s, 600s)
    - Manual retry trigger for specific exceptions
    - Jitter to prevent thundering herd

    Retry schedule:
    - Attempt 1: Immediate
    - Attempt 2: After 60s ± jitter
    - Attempt 3: After 120s ± jitter
    - Attempt 4: After 240s ± jitter
    - Attempt 5: After 480s ± jitter
    - Attempt 6: After 600s ± jitter (capped)
    - After 6th failure: Task marked as failed

    Usage:
        from tasks.examples.sync_external_api import sync_external_api
        result = sync_external_api.delay(
            api_url='https://api.example.com/sync',
            org_id=123
        )

    Args:
        api_url: External API endpoint to sync from
        org_id: Organisation ID for data filtering

    Returns:
        Dictionary with sync status and record count

    Raises:
        RequestException: If all retries exhausted
    """
    try:
        # Simulate external API call
        response = requests.get(api_url, params={"org_id": org_id}, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Process data (example)
        time.sleep(1)

        return {
            "status": "success",
            "org_id": org_id,
            "records_synced": len(data.get("records", [])),
            "attempt": self.request.retries + 1,
        }

    except (RequestException, Timeout) as exc:
        # Log retry attempt
        logger.warning("Sync failed (attempt %d): %s", self.request.retries + 1, exc)

        # Celery will auto-retry due to autoretry_for
        # But can manually trigger with custom logic:
        if self.request.retries >= self.max_retries:
            # All retries exhausted
            raise

        # Manual retry (optional, autoretry_for handles this)
        # raise self.retry(exc=exc, countdown=self.default_retry_delay)

        # Re-raise to trigger autoretry_for
        raise
