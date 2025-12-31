# Test settings for settings app - uses dummy cache backend
from .base import *

# Use in-memory cache backend for testing cache functionality
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-cache",
    }
}

# Use in-memory database for faster tests
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}


# Enable migrations for test database setup
# This ensures all required tables are created properly
MIGRATION_MODULES = {
    "tests": None,  # Disable migrations for tests app to allow on-the-fly table creation
}

# Disable logging during tests
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "null": {
            "class": "logging.NullHandler",
        },
    },
    "root": {
        "handlers": ["null"],
    },
}

# Webhook settings for testing
WEBHOOK_SECRET_KEY = "test-secret-key"

# Disable rate limiting/throttling in tests (Cluster A fix)
# Tests run multiple auth requests rapidly which would trigger rate limits
REST_FRAMEWORK["DEFAULT_THROTTLE_CLASSES"] = []
REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {}
