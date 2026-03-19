"""
B62: Activity Feed — Decorators

Provides ``@log_activity`` for easy feed event logging from ViewSet actions.
"""

from __future__ import annotations

import functools
import logging
from typing import Any, Callable

from django.contrib.contenttypes.models import ContentType

logger = logging.getLogger(__name__)


def log_activity(
    verb: str,
    *,
    target_attr: str = "object",
    extra_data_fn: Callable[..., dict] | None = None,
) -> Callable:
    """
    Decorator for DRF ViewSet methods to log an activity after success.

    Usage::

        class MyViewSet(ModelViewSet):
            @log_activity(verb="content.created")
            def create(self, request, *args, **kwargs):
                return super().create(request, *args, **kwargs)

            @log_activity(
                verb="content.approved",
                target_attr="object",
                extra_data_fn=lambda view, request, response: {"new_status": "approved"},
            )
            def approve(self, request, *args, **kwargs):
                ...

    Args:
        verb: The event verb string (e.g. 'content.created').
        target_attr: ViewSet attribute name for the target object (default: 'object').
        extra_data_fn: Optional callable(view, request, response) returning extra_data dict.
    """

    def decorator(method: Callable) -> Callable:
        @functools.wraps(method)
        def wrapper(view: Any, request: Any, *args: Any, **kwargs: Any) -> Any:
            response = method(view, request, *args, **kwargs)

            # Only log on successful responses (2xx)
            if not hasattr(response, "status_code") or response.status_code >= 300:
                return response

            try:
                _dispatch_activity_log(
                    view=view,
                    request=request,
                    response=response,
                    verb=verb,
                    target_attr=target_attr,
                    extra_data_fn=extra_data_fn,
                )
            except Exception:
                logger.exception("Failed to dispatch activity log for verb=%s", verb)

            return response

        return wrapper

    return decorator


def _dispatch_activity_log(
    *,
    view: Any,
    request: Any,
    response: Any,
    verb: str,
    target_attr: str,
    extra_data_fn: Callable | None,
) -> None:
    """Build kwargs and dispatch the Celery task (or sync fallback)."""
    from activity_feed.tasks import log_event

    user = request.user if request.user.is_authenticated else None

    # Resolve organisation from the target object or view
    organisation = None
    target = getattr(view, target_attr, None)
    if target is None and hasattr(view, "get_object"):
        try:
            target = view.get_object()
        except Exception:
            target = None

    if target is not None:
        organisation = getattr(target, "organisation", None)

    if not organisation:
        logger.warning("Cannot log activity: no organisation found for verb=%s", verb)
        return

    target_ct_id = None
    target_obj_id = None
    if target is not None:
        ct = ContentType.objects.get_for_model(target)
        target_ct_id = ct.pk
        target_obj_id = str(target.pk)

    # Resolve project
    project = getattr(target, "project", None) if target else None
    project_id = str(project.pk) if project else None

    # Extra data
    extra_data = {}
    if extra_data_fn:
        extra_data = extra_data_fn(view, request, response)

    log_event.delay(
        actor_id=str(user.pk) if user else None,
        verb=verb,
        target_content_type_id=target_ct_id,
        target_object_id=target_obj_id,
        organisation_id=str(organisation.pk),
        project_id=project_id,
        extra_data=extra_data,
    )
