"""
B62: Activity Feed Signal Handlers

Automatically logs events to the activity feed when key models change.
Handlers are connected via apps.py ready().

Listens to:
- Activity (match/training created)
- Participation (member confirmed/added)
- Period (season started)
"""

from __future__ import annotations

import logging

from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def _log_event_async(
    *,
    actor_id: str | None,
    verb: str,
    target: object | None = None,
    organisation_id: str,
    project_id: str | None = None,
    extra_data: dict | None = None,
) -> None:
    """
    Helper to dispatch an activity log event via Celery.

    Falls back to synchronous creation if Celery is unavailable.
    """
    from activity_feed.tasks import log_event

    target_ct_id = None
    target_obj_id = None
    if target is not None:
        ct = ContentType.objects.get_for_model(target)
        target_ct_id = ct.pk
        target_obj_id = str(target.pk)

    try:
        log_event.delay(
            actor_id=actor_id,
            verb=verb,
            target_content_type_id=target_ct_id,
            target_object_id=target_obj_id,
            organisation_id=organisation_id,
            project_id=project_id,
            extra_data=extra_data or {},
        )
    except Exception:
        # Celery broker unavailable — create synchronously as fallback
        logger.warning("Celery unavailable, logging activity synchronously for verb=%s", verb)
        from activity_feed.models import ActivityLog

        ActivityLog.objects.create(
            actor_id=actor_id or None,
            verb=verb,
            target_content_type_id=target_ct_id,
            target_object_id=target_obj_id or None,
            organisation_id=organisation_id,
            project_id=project_id or None,
            extra_data=extra_data or {},
        )


# ── Activity signals ─────────────────────────────────────────────────


@receiver(post_save, sender="activities.Activity")
def activity_post_save(sender, instance, created, **kwargs):
    """Log 'match.created' when a new Activity is created."""
    if not created:
        return

    org = getattr(instance, "project", None)
    if org is not None:
        org = getattr(org, "organisation", None)
    if org is None:
        return

    actor = getattr(instance, "created_by", None)

    _log_event_async(
        actor_id=str(actor.pk) if actor else None,
        verb="match.created",
        target=instance,
        organisation_id=str(org.pk),
        project_id=str(instance.project_id) if instance.project_id else None,
        extra_data={
            "title": instance.title,
            "activity_type": instance.activity_type,
            "start_time": str(instance.start_time) if instance.start_time else None,
        },
    )


# ── Participation signals ────────────────────────────────────────────


@receiver(post_save, sender="activities.Participation")
def participation_post_save(sender, instance, created, **kwargs):
    """Log 'member.added' or 'member.confirmed' for participation changes."""
    if created:
        verb = "member.added"
    elif instance.status == "confirmed":
        verb = "member.confirmed"
    else:
        return

    # Resolve organisation from activity or period
    org = None
    project = None
    if instance.activity:
        project = instance.activity.project
        org = project.organisation if project else None
    elif instance.period:
        org = instance.period.organisation

    if org is None:
        return

    actor = getattr(instance, "created_by", None)
    member = instance.member

    _log_event_async(
        actor_id=str(actor.pk) if actor else None,
        verb=verb,
        target=instance,
        organisation_id=str(org.pk),
        project_id=str(project.pk) if project else None,
        extra_data={
            "member_id": str(member.pk) if member else None,
            "role": instance.role,
            "status": instance.status,
        },
    )


# ── Period signals ───────────────────────────────────────────────────


@receiver(post_save, sender="activities.Period")
def period_post_save(sender, instance, created, **kwargs):
    """Log 'season.started' when a new Period is created."""
    if not created:
        return

    actor = getattr(instance, "created_by", None)

    _log_event_async(
        actor_id=str(actor.pk) if actor else None,
        verb="season.started",
        target=instance,
        organisation_id=str(instance.organisation_id),
        project_id=str(instance.project_id) if instance.project_id else None,
        extra_data={
            "name": instance.name,
            "start_date": str(instance.start_date),
            "end_date": str(instance.end_date),
        },
    )
