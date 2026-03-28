"""
DRF serializers for Activities & Period Hierarchy API.

Barrel module — re-exports all serializers for backward compatibility.
Import from sub-modules for direct access:
  - serializers_period:        PeriodSerializer
  - serializers_activity:      ActivitySerializer, ActivityDetailSerializer
  - serializers_participation: ParticipationSerializer
  - serializers_event:         ActivityEventSerializer
"""

from .serializers_activity import ActivityDetailSerializer, ActivitySerializer  # noqa: F401
from .serializers_event import ActivityEventSerializer  # noqa: F401
from .serializers_participation import ParticipationSerializer  # noqa: F401
from .serializers_period import PeriodSerializer  # noqa: F401

__all__ = [
    "PeriodSerializer",
    "ActivitySerializer",
    "ActivityDetailSerializer",
    "ParticipationSerializer",
    "ActivityEventSerializer",
]
