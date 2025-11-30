"""Simple example tasks with no audit trail."""

import time

from celery import shared_task


@shared_task
def hello_world(name: str) -> str:
    """
    Simple task demonstrating basic async execution.

    Usage:
        from tasks.examples.hello_world import hello_world
        result = hello_world.delay('Alice')
        # Returns task ID immediately

        # Check status later
        result.status  # 'PENDING', 'SUCCESS', etc.
        result.result  # 'Hello, Alice!'

    Args:
        name: Name to greet

    Returns:
        Greeting message
    """
    # Simulate some work
    time.sleep(1)
    return f"Hello, {name}!"


@shared_task
def add_numbers(a: int, b: int) -> int:
    """
    Simple math task for testing.

    Usage:
        from tasks.examples.hello_world import add_numbers
        result = add_numbers.delay(5, 3)
        result.get()  # Returns 8

    Args:
        a: First number
        b: Second number

    Returns:
        Sum of a and b
    """
    return a + b
