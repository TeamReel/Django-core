"""B64 Real-time Updates — Event Schema & Type Registry.

Defines standardized event types and payload schemas for all WebSocket
events published through the channel layer. Each event type has a
structured payload that consumers and frontends can rely on.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

# ── Event Type Constants ────────────────────────────────────────────
# Dotted naming convention: {domain}.{action}


class EventType:
    """Registry of all real-time event types."""

    # Content generation lifecycle
    CONTENT_STATUS_CHANGED = "content.status_changed"
    CONTENT_APPROVED = "content.approved"
    CONTENT_REJECTED = "content.rejected"

    # Video processing lifecycle
    VIDEO_PROGRESS = "video.progress"
    VIDEO_COMPLETED = "video.completed"

    # Generative pipeline lifecycle
    GENERATION_STATUS_CHANGED = "generation.status_changed"

    # Activity feed
    ACTIVITY_CREATED = "activity.created"

    # Approval workflow
    APPROVAL_REQUESTED = "approval.requested"
    APPROVAL_DECIDED = "approval.decided"


# ── Payload Schemas ─────────────────────────────────────────────────


@dataclass(frozen=True)
class RealtimeEvent:
    """Base event envelope for all real-time events.

    Attributes:
        event_type: Dotted event type from EventType registry
        data: Event-specific payload dict
        timestamp: ISO-8601 timestamp of when the event occurred
        actor_id: User ID that triggered the event (nullable for system events)
        event_id: Unique event ID for deduplication
    """

    event_type: str
    data: dict[str, Any]
    timestamp: str
    actor_id: int | None = None
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dict for channel layer transmission."""
        return asdict(self)


@dataclass(frozen=True)
class ContentStatusPayload:
    """Payload for content.status_changed events."""

    content_item_id: int
    old_status: str
    new_status: str
    project_id: int | str
    template_name: str = ""
    progress_percent: int | None = None
    error_message: str | None = None
    thumbnail_url: str | None = None


@dataclass(frozen=True)
class ContentApprovalPayload:
    """Payload for content.approved / content.rejected events."""

    content_item_id: int
    decision: str  # "approved" | "rejected" | "revision_requested"
    reviewer_name: str
    project_id: int | str
    comment: str = ""


@dataclass(frozen=True)
class VideoProgressPayload:
    """Payload for video.progress events."""

    job_id: str
    progress_percent: int
    job_type: str
    project_id: int | str


@dataclass(frozen=True)
class VideoCompletedPayload:
    """Payload for video.completed events."""

    job_id: str
    status: str  # "completed" | "failed"
    job_type: str
    project_id: int | str
    output_file_id: str | None = None
    error_message: str | None = None
    duration_seconds: float | None = None


@dataclass(frozen=True)
class GenerationStatusPayload:
    """Payload for generation.status_changed events."""

    request_id: int
    status: str
    project_id: int | str | None = None
    retry_count: int = 0
    error_message: str | None = None
    error_category: str | None = None


@dataclass(frozen=True)
class ActivityCreatedPayload:
    """Payload for activity.created events."""

    activity_id: str
    action_type: str
    resource_type: str
    resource_id: str
    project_id: int | str
    actor_name: str = ""


@dataclass(frozen=True)
class ApprovalRequestedPayload:
    """Payload for approval.requested events."""

    content_item_id: int
    project_id: int | str
    requester_name: str
    template_name: str = ""


@dataclass(frozen=True)
class ApprovalDecidedPayload:
    """Payload for approval.decided events."""

    content_item_id: int
    project_id: int | str
    decision: str
    reviewer_name: str
    comment: str = ""


# ── Helper: build typed events ──────────────────────────────────────


def build_event(
    event_type: str,
    payload: (
        ContentStatusPayload
        | ContentApprovalPayload
        | VideoProgressPayload
        | VideoCompletedPayload
        | GenerationStatusPayload
        | ActivityCreatedPayload
        | ApprovalRequestedPayload
        | ApprovalDecidedPayload
    ),
    *,
    actor_id: int | None = None,
) -> RealtimeEvent:
    """Create a RealtimeEvent from a typed payload dataclass."""
    return RealtimeEvent(
        event_type=event_type,
        data=asdict(payload),
        timestamp=datetime.now().astimezone().isoformat(),
        actor_id=actor_id,
    )
