"""DRF serializers for Projects & Workspaces.

Barrel re-export — keeps ``from projects.api.serializers import X`` working.
Implementation split across:
    serializers_project.py      — Project CRUD + nested helpers
    serializers_membership.py   — Membership, Invitations, Promotions
"""

from .serializers_project import (  # noqa: F401
    OrganisationNestedSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectPublicListSerializer,
    ProjectUpdateSerializer,
    UserNestedSerializer,
)
from .serializers_membership import (  # noqa: F401
    AcceptInvitationSerializer,
    ProjectFunctionalRoleAssignSerializer,
    ProjectInviteSerializer,
    ProjectMembershipPromotionSerializer,
    ProjectMembershipSerializer,
    UserAvatarNestedSerializer,
)
