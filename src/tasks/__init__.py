"""Asynchronous task execution and periodic scheduling infrastructure (B15)"""
from .celery import app as celery_app

__all__ = ["celery_app"]
