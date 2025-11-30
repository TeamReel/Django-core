"""Test tasks for verifying Celery setup."""
from celery import shared_task


@shared_task
def add(x, y):
    """Simple test task that adds two numbers."""
    return x + y
