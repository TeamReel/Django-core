"""Celery tasks for contextual notifications."""

from .routing_tasks import route_event_task

__all__ = [
    "route_event_task",
]
