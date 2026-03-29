"""Management command to listen for cache invalidation messages via Redis pub/sub."""

import signal
import sys

from django.core.management.base import BaseCommand
from settings.cache import CACHE_ENABLED, PUBSUB_CHANNEL, invalidate_cache


class Command(BaseCommand):
    help = "Listen for cache invalidation messages via Redis pub/sub"

    def __init__(self):
        super().__init__()
        self.should_stop = False

    def handle(self, *args, **options):
        if not CACHE_ENABLED:
            self.stdout.write(self.style.WARNING("Cache is disabled. Listener not started."))
            return

        # Set up signal handler for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        self.stdout.write(
            self.style.SUCCESS(f"Starting cache invalidation listener on channel: {PUBSUB_CHANNEL}")
        )

        try:
            from django_redis import get_redis_connection

            redis_client = get_redis_connection("default")
            pubsub = redis_client.pubsub()
            pubsub.subscribe(PUBSUB_CHANNEL)

            self.stdout.write(self.style.SUCCESS("Listener started successfully"))

            # Listen for messages
            for message in pubsub.listen():
                if self.should_stop:
                    break

                if message["type"] == "message":
                    cache_key = message["data"].decode("utf-8")
                    self.stdout.write(self.style.SUCCESS(f"Received invalidation: {cache_key}"))
                    invalidate_cache(cache_key)

            pubsub.unsubscribe()
            self.stdout.write(self.style.SUCCESS("Listener stopped"))

        except ImportError:
            self.stdout.write(
                self.style.ERROR("django-redis not installed. Install it to use pub/sub features.")
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error connecting to Redis: {e}"))

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        self.stdout.write(self.style.WARNING("\\nShutdown signal received..."))
        self.should_stop = True
        sys.exit(0)
