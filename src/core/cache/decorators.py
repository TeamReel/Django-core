"""Cache decorators for easy function result caching.

This module provides decorators for caching function results with tag-based
invalidation support.
"""

from __future__ import annotations

import functools
import hashlib
import inspect
import logging
from typing import Any, Callable, TypeVar

from .services import CacheService

T = TypeVar("T")

logger = logging.getLogger(__name__)


def _generate_cache_key(
    func: Callable,
    args: tuple,
    kwargs: dict,
    key_pattern: str | None = None,
) -> str:
    """
    Generate a cache key for a function call.

    Supports two modes:
    1. Explicit pattern: If key_pattern provided, format it with function args
    2. Auto-hash: Hash the function name, args, and kwargs

    Args:
        func: The function being cached
        args: Positional arguments
        kwargs: Keyword arguments
        key_pattern: Optional format string (e.g., "user:{user_id}")

    Returns:
        Cache key string
    """
    # Handle method calls - skip 'self' argument
    if args and hasattr(args[0], "__dict__"):
        # Check if first arg looks like a class instance
        sig = inspect.signature(func)
        params = list(sig.parameters.keys())
        if params and params[0] == "self":
            args = args[1:]  # Skip self

    if key_pattern:
        # Explicit pattern mode: format with args and kwargs
        try:
            # Build format context from both args and kwargs
            sig = inspect.signature(func)
            bound_args = sig.bind_partial(*args, **kwargs)
            bound_args.apply_defaults()
            format_context = dict(bound_args.arguments)
            return key_pattern.format(**format_context)
        except (KeyError, IndexError, ValueError) as e:
            logger.warning(
                "Failed to format key_pattern, falling back to auto-hash",
                extra={
                    "func": func.__name__,
                    "key_pattern": key_pattern,
                    "error": str(e),
                },
            )
            # Fall through to auto-hash

    # Auto-hash mode: hash everything
    key_parts = [
        func.__module__,
        func.__qualname__,
        str(args),
        str(sorted(kwargs.items())),
    ]
    key_string = "|".join(key_parts)
    key_hash = hashlib.sha256(key_string.encode()).hexdigest()[:16]
    return f"cache:auto:{func.__name__}:{key_hash}"


def cache_result(
    key_pattern: str | None = None,
    ttl: int | None = None,
    tags: list[str] | None = None,
    cache_alias: str = "default",
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to cache function results with optional tagging.

    Supports two key generation modes:
    1. Explicit pattern: Provide key_pattern as format string
    2. Auto-hash: Leave key_pattern as None to auto-generate from args

    Example:
        # Explicit pattern
        @cache_result(key_pattern="user:{user_id}:profile", ttl=300, tags=["user:{user_id}"])
        def get_user_profile(user_id):
            return User.objects.get(id=user_id)

        # Auto-hash
        @cache_result(ttl=60)
        def expensive_calculation(x, y):
            return x ** y

    Args:
        key_pattern: Optional format string for cache key
        ttl: Time to live in seconds (None = default cache timeout)
        tags: List of tags to associate with this cache entry
        cache_alias: Django cache alias to use

    Returns:
        Decorated function that caches results
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:  # noqa: ANN401
            # Initialize cache service
            cache_service = CacheService(cache_alias=cache_alias)

            # Generate cache key
            cache_key = _generate_cache_key(func, args, kwargs, key_pattern)

            # Try to get from cache
            cached_value = cache_service.get(cache_key)
            if cached_value is not None:
                logger.debug(
                    "Cache hit",
                    extra={
                        "func": func.__qualname__,
                        "key": cache_key,
                    },
                )
                return cached_value

            # Cache miss - execute function
            logger.debug(
                "Cache miss, executing function",
                extra={
                    "func": func.__qualname__,
                    "key": cache_key,
                },
            )
            result = func(*args, **kwargs)

            # Store in cache
            cache_service.set(cache_key, result, ttl)

            # Add tags if specified
            if tags:
                # Format tags with function args if they contain placeholders
                formatted_tags = []
                sig = inspect.signature(func)
                bound_args = sig.bind_partial(*args, **kwargs)
                bound_args.apply_defaults()
                format_context = dict(bound_args.arguments)

                for tag in tags:
                    try:
                        formatted_tag = tag.format(**format_context)
                        formatted_tags.append(formatted_tag)
                    except (KeyError, ValueError):
                        # Tag doesn't need formatting or format failed
                        formatted_tags.append(tag)

                cache_service.add_tags(cache_key, formatted_tags)

            return result

        return wrapper

    return decorator


def cache_invalidate(
    tags: list[str],
    cache_alias: str = "default",
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to invalidate cache tags after function execution.

    Useful for invalidating caches when data is modified.

    Example:
        @cache_invalidate(tags=["user:{user_id}"])
        def update_user_profile(user_id, **data):
            user = User.objects.get(id=user_id)
            for key, value in data.items():
                setattr(user, key, value)
            user.save()

    Args:
        tags: List of tags to invalidate
        cache_alias: Django cache alias to use

    Returns:
        Decorated function that invalidates tags after execution
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:  # noqa: ANN401
            # Execute the function first
            result = func(*args, **kwargs)

            # Then invalidate tags
            cache_service = CacheService(cache_alias=cache_alias)

            # Format tags with function args if they contain placeholders
            formatted_tags = []
            sig = inspect.signature(func)
            bound_args = sig.bind_partial(*args, **kwargs)
            bound_args.apply_defaults()
            format_context = dict(bound_args.arguments)

            for tag in tags:
                try:
                    formatted_tag = tag.format(**format_context)
                    formatted_tags.append(formatted_tag)
                except (KeyError, ValueError):
                    # Tag doesn't need formatting or format failed
                    formatted_tags.append(tag)

            invalidated_count = cache_service.invalidate_tags(formatted_tags)
            logger.info(
                "Cache invalidated via decorator",
                extra={
                    "func": func.__qualname__,
                    "tags": formatted_tags,
                    "keys_invalidated": invalidated_count,
                },
            )

            return result

        return wrapper

    return decorator
