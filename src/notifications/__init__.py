"""Notifications Django app - handles multi-channel notification delivery."""

from . import metrics  # noqa: F401 - Import to register Prometheus metrics

default_app_config = "notifications.apps.NotificationsConfig"
