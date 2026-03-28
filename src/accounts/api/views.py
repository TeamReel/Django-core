from audit.api import audit_log
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from permissions.evaluator import check_permission
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from accounts.permissions import IsAdmin
from accounts.serializers import (
    ChangeRoleSerializer,
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegistrationSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)
from accounts.tokens import email_verification_token


@api_view(["POST"])
@permission_classes([AllowAny])
def register_api(request):
    serializer = RegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Send verification email
        token = email_verification_token.make_token(user)
        # Build absolute URI - handle both HTTP and reverse proxy scenarios
        verification_path = f"/accounts/verify-email/{user.id}/{token}/"
        if request.build_absolute_uri:
            verification_url = request.build_absolute_uri(verification_path)
        else:
            # Fallback for testing
            verification_url = f"http://localhost:8000{verification_path}"

        context = {"user": user, "verification_url": verification_url}
        html_message = render_to_string("accounts/email/verification.html", context)
        plain_message = strip_tags(html_message)
        send_mail(
            subject="Verify your email address",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
        )
        user.email_verification_sent_at = timezone.now()
        user.save()

        return Response(
            {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email_verified": user.email_verified,
                "is_active": user.is_active,
                "message": (
                    "Registration successful. Please check your email " "to verify your account."
                ),
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_email_api(request, user_id, token):
    try:
        user = User.objects.get(id=user_id)
    except ObjectDoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if user.email_verified:
        return Response(
            {
                "error": "already_verified",
                "message": "This email address has already been verified.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if email_verification_token.check_token(user, token):
        user.email_verified = True
        user.is_active = True
        user.save()
        return Response({"message": "Email verified successfully. You can now sign in."})

    return Response(
        {
            "error": "invalid_token",
            "message": "The verification link is invalid or has expired.",
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def login_api(request):
    """API endpoint for user login."""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = authenticate(
            request=request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user:
            if not user.email_verified:
                return Response(
                    {
                        "error": "email_not_verified",
                        "message": ("Please verify your email address before signing in."),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not user.is_active:
                return Response(
                    {
                        "error": "account_inactive",
                        "message": "Your account has been deactivated.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            auth_login(request, user)
            try:
                request.session["last_activity"] = timezone.now().timestamp()
            except Exception as e:
                print(f"Session error: {e}")

            # Audit log: Successful login
            audit_log.record("auth.login", user=user, request=request)

            # Use UserListSerializer to include organisations and consistent fields
            user_data = UserListSerializer(user).data
            user_data["message"] = "Login successful."

            return Response(user_data)

        # Audit log: Failed login
        # Try to find user to attach to audit log (for org-scoped visibility)
        email = serializer.validated_data.get("email")
        failed_user = User.objects.filter(email=email).first()
        if failed_user:
            if not failed_user.email_verified:
                return Response(
                    {
                        "error": "email_not_verified",
                        "message": ("Please verify your email address before signing in."),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not failed_user.is_active:
                return Response(
                    {
                        "error": "account_inactive",
                        "message": "Your account has been deactivated.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        audit_log.record(
            "auth.login_failed",
            user=failed_user,
            metadata={"username": serializer.validated_data.get("email")},
            request=request,
        )

        return Response(
            {
                "error": "invalid_credentials",
                "message": "Invalid email or password.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        # JWT Blacklisting
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                import logging

                logging.getLogger(__name__).debug(
                    "Failed to blacklist refresh token during logout",
                    exc_info=True,
                )

        if request.user.is_authenticated:
            audit_log.record("auth.logout", user=request.user, request=request)

        auth_logout(request)

        response = Response(status=status.HTTP_204_NO_CONTENT)
        response.delete_cookie(settings.SESSION_COOKIE_NAME)
        return response


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
def logout_api(request):
    """API endpoint for user logout."""
    if request.user.is_authenticated:
        audit_log.record("auth.logout", user=request.user, request=request)

    auth_logout(request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def auth_me(request):
    """
    Get current authenticated user profile.

    Returns:
        200 OK: User profile (id, email, first_name, last_name, role, email_verified, is_active)
        401 Unauthorized: Session expired or not authenticated
    """
    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def auth_default_context(request):
    """Return a deterministic default TeamReel navigation context for the current user.

    This is designed for the frontend sidebar (Panel A) to avoid guessing vanity URL
    segments from the current route or localStorage.

    Selection rules (80/20):
    - Organisation: inferred from team membership if available, else club membership,
      else organisation membership.
    - Club/Team: derived from the first team the user is a member of; club is the
      parent project of that team.
    - Season: current root period for that team (today within start/end); fallback to
      most recent.
    - Competition/Match: choose the next upcoming match; competition is that match's
      period (child under season). Fallback to most recent match.

    Returns 200 with nullable fields; 401 with B13 envelope when unauthenticated.
    """

    import re
    import unicodedata

    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from django.db.models import Exists, OuterRef

    from accounts.models import UserActiveContext
    from organisations.models import Membership as OrganisationMembership
    from projects.models import ProjectMembership
    from activities.models import Activity, Period

    user = request.user
    now = timezone.now()
    today = timezone.localdate()

    def project_payload(project):
        if not project:
            return None
        parent = project.parent_project
        return {
            "id": project.id,
            "slug": project.slug,
            "name": project.name,
            "parent": (
                {
                    "id": parent.id,
                    "slug": parent.slug,
                    "name": parent.name,
                }
                if parent
                else None
            ),
        }

    def organisation_payload(org):
        if not org:
            return None
        return {"id": str(org.id), "slug": org.slug, "name": org.name}

    def _frontend_slugify(value: str) -> str:
        """Match demo/src/utils/periodPath.ts slugify() for consistent URLs."""

        input_value = str(value or "").strip().lower()
        if not input_value:
            return ""

        normalized = unicodedata.normalize("NFKD", input_value)
        without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")

        cleaned = re.sub(r"[^a-z0-9]+", "-", without_marks)
        cleaned = re.sub(r"^-+|-+$", "", cleaned)
        cleaned = re.sub(r"--+", "-", cleaned)
        return cleaned

    def period_key(period):
        if not period:
            return ""
        return _frontend_slugify(period.name or "") or str(period.id)

    def period_payload(period):
        if not period:
            return None
        return {
            "id": str(period.id),
            "key": period_key(period),
            "name": period.name,
            "start_date": period.start_date,
            "end_date": period.end_date,
        }

    def match_payload(activity):
        if not activity:
            return None
        key = (activity.slug or "").strip() or str(activity.id)
        return {
            "id": str(activity.id),
            "key": key,
            "slug": activity.slug,
            "title": activity.title,
            "start_time": activity.start_time,
        }

    source = {
        "organisation": None,
        "club": None,
        "team": None,
        "season": None,
        "competition": None,
        "match": None,
    }

    organisation = None
    club = None
    team = None

    # Lower levels may be filled by active context or computed later.
    season = None
    competition = None
    match = None

    # 0) If the user explicitly chose an active context, prefer it.
    # We still compute missing lower levels deterministically.
    active_ctx = (
        UserActiveContext.objects.select_related(
            "organisation",
            "club",
            "team",
            "season",
            "competition",
            "match",
            "match__period",
            "match__project",
            "team__parent_project",
            "club__organisation",
        )
        .filter(user=user)
        .first()
    )

    if active_ctx:
        if active_ctx.match_id and active_ctx.match:
            match = active_ctx.match
            competition = getattr(match, "period", None)
            season = getattr(competition, "parent_period", None) if competition else None
            team = getattr(match, "project", None)
            club = getattr(team, "parent_project", None) if team else None
            organisation = getattr(team, "organisation", None) or getattr(
                club, "organisation", None
            )
            source.update(
                {
                    "match": "active_context",
                    "competition": "derived_from_active_match" if competition else None,
                    "season": "derived_from_active_match" if season else None,
                    "team": "derived_from_active_match" if team else None,
                    "club": "derived_from_active_match" if club else None,
                    "organisation": "derived_from_active_match" if organisation else None,
                }
            )

        elif active_ctx.competition_id and active_ctx.competition:
            competition = active_ctx.competition
            season = getattr(competition, "parent_period", None)
            team = getattr(competition, "project", None)
            club = getattr(team, "parent_project", None) if team else None
            organisation = getattr(team, "organisation", None) or getattr(
                club, "organisation", None
            )
            source.update(
                {
                    "competition": "active_context",
                    "season": "derived_from_active_competition" if season else None,
                    "team": "derived_from_active_competition" if team else None,
                    "club": "derived_from_active_competition" if club else None,
                    "organisation": "derived_from_active_competition" if organisation else None,
                }
            )

        elif active_ctx.season_id and active_ctx.season:
            season = active_ctx.season
            team = getattr(season, "project", None)
            club = getattr(team, "parent_project", None) if team else None
            organisation = (
                getattr(season, "organisation", None)
                or getattr(team, "organisation", None)
                or getattr(club, "organisation", None)
            )
            source.update(
                {
                    "season": "active_context",
                    "team": "derived_from_active_season" if team else None,
                    "club": "derived_from_active_season" if club else None,
                    "organisation": "derived_from_active_season" if organisation else None,
                }
            )

        elif active_ctx.team_id and active_ctx.team:
            team = active_ctx.team
            club = getattr(team, "parent_project", None)
            organisation = getattr(team, "organisation", None) or getattr(
                club, "organisation", None
            )
            source.update(
                {
                    "team": "active_context",
                    "club": "derived_from_active_team" if club else None,
                    "organisation": "derived_from_active_team" if organisation else None,
                }
            )

        elif active_ctx.club_id and active_ctx.club:
            club = active_ctx.club
            organisation = getattr(club, "organisation", None)
            source.update(
                {
                    "club": "active_context",
                    "organisation": "derived_from_active_club" if organisation else None,
                }
            )

        elif active_ctx.organisation_id and active_ctx.organisation:
            organisation = active_ctx.organisation
            source.update({"organisation": "active_context"})

    # 1) Prefer: team membership (child project)
    # Primary criterion: pick a team that actually has matches (so the returned
    # season/competition/match are always meaningful for navigation).
    team_memberships_qs = (
        ProjectMembership.objects.active()
        .select_related("project__organisation", "project__parent_project")
        .filter(
            user=user,
            project__is_active=True,
            project__parent_project__isnull=False,
        )
    )
    team_memberships_with_matches = team_memberships_qs.annotate(
        has_matches=Exists(
            Activity.objects.filter(
                project_id=OuterRef("project_id"),
                activity_type="match",
            )
        )
    ).filter(has_matches=True)

    team_membership = (
        team_memberships_with_matches.order_by(
            "project__organisation__slug",
            "project__parent_project__slug",
            "project__slug",
            "created_at",
        ).first()
        or team_memberships_qs.order_by(
            "project__organisation__slug",
            "project__parent_project__slug",
            "project__slug",
            "created_at",
        ).first()
    )
    if team_membership:
        team = team_membership.project
        club = team.parent_project
        organisation = team.organisation
        source["team"] = "project_membership"
        source["club"] = "derived_from_team"
        source["organisation"] = "derived_from_team"

    # 2) Fallback: club membership (root project)
    if not organisation:
        club_membership = (
            ProjectMembership.objects.active()
            .select_related("project__organisation")
            .filter(
                user=user,
                project__is_active=True,
                project__parent_project__isnull=True,
            )
            .order_by("project__organisation__slug", "project__slug", "created_at")
            .first()
        )
        if club_membership:
            club = club_membership.project
            organisation = club.organisation
            source["club"] = "project_membership"
            source["organisation"] = "derived_from_club"

            # If possible, also pick a team within this club the user is a member of.
            team_membership = (
                ProjectMembership.objects.active()
                .select_related("project__organisation", "project__parent_project")
                .filter(
                    user=user,
                    project__is_active=True,
                    project__parent_project_id=club.id,
                )
                .order_by("project__slug", "created_at")
                .first()
            )
            if team_membership:
                team = team_membership.project
                source["team"] = "project_membership"

    # 3) Fallback: organisation membership
    if not organisation:
        org_membership = (
            OrganisationMembership.objects.filter(
                user=user, is_active=True, organisation__is_active=True
            )
            .select_related("organisation")
            .order_by("organisation__slug", "joined_at")
            .first()
        )
        if org_membership:
            organisation = org_membership.organisation
            source["organisation"] = "organisation_membership"

    # 4) Resolve season/competition/match
    # These may have been set by active context above; if not, compute lower levels.

    if organisation and team:
        match_qs = Activity.objects.filter(
            project=team,
            activity_type="match",
        ).select_related("period")

        # Prefer season scoped on the membership (TeamReel-specific), but only if
        # that season actually contains matches.
        membership_season = None
        if getattr(team_membership, "period_id", None):
            scoped_period = team_membership.period
            if (
                scoped_period
                and scoped_period.organisation_id == organisation.id
                and scoped_period.project_id == team.id
                and scoped_period.parent_period_id is None
            ):
                membership_season = scoped_period

        if (
            season
            and getattr(season, "parent_period_id", None) is None
            and season.project_id == team.id
        ):
            # Season explicitly selected (active context). Prefer next match within it.
            source["season"] = source["season"] or "active_context"
            match = (
                match_qs.filter(period__parent_period=season)
                .filter(start_time__gte=now)
                .order_by("start_time")
                .first()
            )
            if match:
                source["match"] = source["match"] or "next_upcoming"
            else:
                match = (
                    match_qs.filter(period__parent_period=season)
                    .filter(start_time__lt=now)
                    .order_by("-start_time")
                    .first()
                )
                if match:
                    source["match"] = source["match"] or "most_recent_past"

            if match and match.period_id:
                competition = match.period
                source["competition"] = source["competition"] or "from_match"

        elif (
            competition
            and getattr(competition, "parent_period_id", None)
            and getattr(competition, "project_id", None) == team.id
        ):
            # Competition explicitly selected (active context). Prefer next match within it.
            source["competition"] = source["competition"] or "active_context"
            match = (
                match_qs.filter(period=competition)
                .filter(start_time__gte=now)
                .order_by("start_time")
                .first()
            )
            if match:
                source["match"] = source["match"] or "next_upcoming"
            else:
                match = (
                    match_qs.filter(period=competition)
                    .filter(start_time__lt=now)
                    .order_by("-start_time")
                    .first()
                )
                if match:
                    source["match"] = source["match"] or "most_recent_past"

            season = getattr(competition, "parent_period", None)
            if season:
                source["season"] = source["season"] or "from_competition"

        elif (
            membership_season and match_qs.filter(period__parent_period=membership_season).exists()
        ):
            season = membership_season
            source["season"] = "membership_period"
            match = (
                match_qs.filter(period__parent_period=season)
                .filter(start_time__gte=now)
                .order_by("start_time")
                .first()
            )
            if match:
                source["match"] = "next_upcoming"
            else:
                match = (
                    match_qs.filter(period__parent_period=season)
                    .filter(start_time__lt=now)
                    .order_by("-start_time")
                    .first()
                )
                if match:
                    source["match"] = "most_recent_past"

            if match and match.period_id:
                competition = match.period
                source["competition"] = "from_match"
        else:
            # Primary criterion: pick a match first (across seasons), then derive
            # competition + season from that match.
            match = match_qs.filter(start_time__gte=now).order_by("start_time").first()
            if match:
                source["match"] = "next_upcoming"
            else:
                match = match_qs.filter(start_time__lt=now).order_by("-start_time").first()
                if match:
                    source["match"] = "most_recent_past"

            if match and match.period_id:
                competition = match.period
                source["competition"] = "from_match"
                if getattr(competition, "parent_period_id", None):
                    season = competition.parent_period
                    source["season"] = "from_match"

        # If we still don't have a season (no matches), fall back deterministically.
        if not season:
            season_qs = Period.objects.filter(
                organisation=organisation,
                project=team,
                parent_period__isnull=True,
            )
            season = (
                season_qs.filter(start_date__lte=today, end_date__gte=today)
                .order_by("-start_date", "name")
                .first()
            )
            if season:
                source["season"] = source["season"] or "current_by_date"
            else:
                season = season_qs.order_by("-end_date", "-start_date", "name").first()
                if season:
                    source["season"] = source["season"] or "most_recent"

        if season and not competition:
            competition = (
                Period.objects.filter(
                    organisation=organisation,
                    project=team,
                    parent_period=season,
                )
                .order_by("start_date", "name")
                .first()
            )
            if competition:
                source["competition"] = "first_child_period"

    return Response(
        {
            "computed_at": now.isoformat(),
            "organisation": organisation_payload(organisation),
            "club": project_payload(club),
            "team": project_payload(team),
            "season": period_payload(season),
            "competition": period_payload(competition),
            "match": match_payload(match),
            "source": source,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET", "PATCH"])
def auth_active_context(request):
    """Get or update the authenticated user's active TeamReel context."""

    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    import re
    import unicodedata

    from django.db import transaction
    from organisations.models import Membership as OrganisationMembership
    from projects.models import Project, ProjectMembership
    from activities.models import Activity, Period
    from accounts.models import UserActiveContext

    user = request.user

    def _frontend_slugify(value: str) -> str:
        input_value = str(value or "").strip().lower()
        if not input_value:
            return ""

        normalized = unicodedata.normalize("NFKD", input_value)
        without_marks = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")

        cleaned = re.sub(r"[^a-z0-9]+", "-", without_marks)
        cleaned = re.sub(r"^-+|-+$", "", cleaned)
        cleaned = re.sub(r"--+", "-", cleaned)
        return cleaned

    def period_key(period: Period | None) -> str:
        if not period:
            return ""
        return _frontend_slugify(period.name or "") or str(period.id)

    def organisation_payload(org):
        if not org:
            return None
        return {"id": str(org.id), "slug": org.slug, "name": org.name}

    def project_payload(project):
        if not project:
            return None
        return {"id": str(project.id), "slug": project.slug, "name": project.name}

    def period_payload(period):
        if not period:
            return None
        return {
            "id": str(period.id),
            "key": period_key(period),
            "name": period.name,
            "start_date": period.start_date,
            "end_date": period.end_date,
        }

    def match_payload(activity):
        if not activity:
            return None
        key = (activity.slug or "").strip() or str(activity.id)
        return {
            "id": str(activity.id),
            "key": key,
            "slug": activity.slug,
            "title": activity.title,
            "start_time": activity.start_time,
        }

    def user_label(u) -> str:
        if not u:
            return ""
        name = str(getattr(u, "name", "") or "").strip()
        if name:
            return name
        first = str(getattr(u, "first_name", "") or "").strip()
        last = str(getattr(u, "last_name", "") or "").strip()
        full = f"{first} {last}".strip()
        if full:
            return full
        return str(getattr(u, "email", "") or "").strip()

    def membership_payload(m: ProjectMembership | None):
        if not m:
            return None
        return {
            "id": str(m.id),
            "role": str(getattr(m, "role", "") or ""),
            "user": {
                "id": str(getattr(getattr(m, "user", None), "id", "") or ""),
                "name": user_label(getattr(m, "user", None)),
                "email": str(getattr(getattr(m, "user", None), "email", "") or ""),
            },
            "project": project_payload(getattr(m, "project", None)),
            "period": period_payload(getattr(m, "period", None)),
        }

    def user_has_org(org) -> bool:
        if not org:
            return False
        # Superusers have access to everything
        if user.is_superuser:
            return True
        # Check direct organisation membership
        if OrganisationMembership.objects.filter(
            user=user, organisation=org, is_active=True
        ).exists():
            return True
        # Check indirect membership via projects
        has_project_membership = (
            ProjectMembership.objects.active().filter(user=user, project__organisation=org).exists()
        )
        if not has_project_membership:
            # Debug log
            import logging

            logger = logging.getLogger(__name__)
            logger.info(
                f"User {user.id} ({user.email}) has no access to org {org.id} ({org.name}). "
                f"Checking project memberships..."
            )
            # Show which projects the user has access to
            user_projects = list(
                ProjectMembership.objects.active()
                .filter(user=user)
                .values_list("project__id", "project__name", "project__organisation__id")
            )
            logger.info(f"User's projects: {user_projects}")
        return has_project_membership

    def user_has_project(project: Project) -> bool:
        if not project:
            return False
        # Superusers have access to everything
        if user.is_superuser:
            return True
        # Direct project membership
        if ProjectMembership.objects.active().filter(user=user, project=project).exists():
            return True
        # Organisation membership (federation admins)
        if (
            project.organisation
            and OrganisationMembership.objects.filter(
                user=user, organisation=project.organisation, is_active=True
            ).exists()
        ):
            return True
        return False

    def resolve_current_user_membership(team: Project | None, season: Period | None):
        if not team:
            return None

        qs = (
            ProjectMembership.objects.active()
            .select_related(
                "user",
                "project",
                "project__parent_project",
                "project__organisation",
                "period",
            )
            .filter(project=team, user=user)
        )

        if season:
            exact = qs.filter(period=season).first()
            if exact:
                return exact

        return qs.first()

    def ensure_current_user_membership(team: Project | None, season: Period | None):
        """Create/sync the current user's membership for this team+season.

        TeamReel rule: selecting an active season implies an active membership.
        We only do this when the user already has access to the project.
        """
        if not team or not season:
            return None

        if not user_has_project(team):
            return None

        membership = (
            ProjectMembership.objects.active()
            .select_related("user", "project", "period")
            .filter(project=team, user=user)
            .first()
        )
        if membership:
            if getattr(membership, "period_id", None) != getattr(season, "id", None):
                membership.period = season
                membership.save(update_fields=["period", "updated_at"])
            return membership

        # This endpoint is called by multiple frontend components on page load.
        # Avoid 500s if two requests attempt to create the membership concurrently.
        from django.db import IntegrityError

        try:
            return ProjectMembership.objects.create(
                project=team,
                user=user,
                period=season,
                role=ProjectMembership.Role.VIEWER,
                assignment_reason=ProjectMembership.AssignmentReason.ORG_DEFAULT,
            )
        except IntegrityError:
            existing = (
                ProjectMembership.objects.active()
                .select_related("user", "project", "period")
                .filter(project=team, user=user)
                .first()
            )
            if not existing:
                return None

            if getattr(existing, "period_id", None) != getattr(season, "id", None):
                existing.period = season
                existing.save(update_fields=["period", "updated_at"])
            return existing

    def sync_membership_for_context(ctx: UserActiveContext | None) -> ProjectMembership | None:
        """Enforce TeamReel rule: active membership follows active team/season for *this* user."""
        if not ctx:
            return None
        team = getattr(ctx, "team", None)
        season = getattr(ctx, "season", None)
        membership = resolve_current_user_membership(team, season)
        if membership:
            return membership

        # If the user can access the project but has no membership row yet, create one.
        # This supports federation/org admins who are browsing a team/season but still
        # need a stable "Member" detail context.
        return ensure_current_user_membership(team, season)

    def resolve_membership_from_context(ctx: UserActiveContext | None):
        if not ctx:
            return None

        # If a season is active, membership must follow team+season (current user).
        # We do not allow a stored membership from another season to "win".
        team = getattr(ctx, "team", None)
        season = getattr(ctx, "season", None)
        if season or team:
            # For active seasons, enforce the invariant by ensuring a membership exists.
            # (This is a small, intentional side-effect on GET to keep frontend navigation deterministic.)
            if team and season:
                ensured = ensure_current_user_membership(team, season)
                if ensured and user_has_project(getattr(ensured, "project", None)):
                    return ensured

            derived = resolve_current_user_membership(team, season)
            if derived and user_has_project(getattr(derived, "project", None)):
                return derived

        stored = getattr(ctx, "membership", None)
        if stored:
            project = getattr(stored, "project", None)
            if project and user_has_project(project):
                return stored
            return None

        return None

    if request.method == "GET":
        # We may need to enforce invariants (create/sync membership) even on reads.
        with transaction.atomic():
            ctx = (
                UserActiveContext.objects.select_for_update(of=("self",))
                .select_related(
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "match__period",
                    "match__project",
                    "team__parent_project",
                    "membership",
                    "membership__user",
                    "membership__project",
                    "membership__period",
                    "membership__project__parent_project",
                    "membership__project__organisation",
                )
                .filter(user=user)
                .first()
            )

            membership = resolve_membership_from_context(ctx)

            if (
                ctx
                and membership
                and getattr(ctx, "membership_id", None) != getattr(membership, "id", None)
            ):
                ctx.membership = membership
                ctx.save(update_fields=["membership", "updated_at"])

        return Response(
            {
                "updated_at": ctx.updated_at.isoformat() if ctx else None,
                "organisation": organisation_payload(
                    getattr(ctx, "organisation", None) if ctx else None
                ),
                "club": project_payload(getattr(ctx, "club", None) if ctx else None),
                "team": project_payload(getattr(ctx, "team", None) if ctx else None),
                "season": period_payload(getattr(ctx, "season", None) if ctx else None),
                "competition": period_payload(getattr(ctx, "competition", None) if ctx else None),
                "match": match_payload(getattr(ctx, "match", None) if ctx else None),
                "membership": membership_payload(membership),
            },
            status=status.HTTP_200_OK,
        )

    kind = str(request.data.get("kind") or "").strip().lower()
    raw_id = request.data.get("id")
    identifier = str(raw_id or "").strip()

    valid_kinds = {
        "organisation",
        "club",
        "team",
        "season",
        "competition",
        "match",
        "membership",
        "clear",
    }
    if kind not in valid_kinds:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Invalid kind",
                    "details": {
                        "kind": [
                            "Must be one of organisation, club, team, season, competition, match, membership, clear"
                        ]
                    },
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if kind != "clear" and not identifier:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Missing id",
                    "details": {"id": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        ctx, _ = UserActiveContext.objects.select_for_update(of=("self",)).get_or_create(user=user)

        if kind == "clear":
            ctx.organisation = None
            ctx.club = None
            ctx.team = None
            ctx.season = None
            ctx.competition = None
            ctx.match = None
            ctx.membership = None
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind == "organisation":
            from django.core.exceptions import ValidationError
            from organisations.models import Organisation

            org = Organisation.objects.filter(slug=identifier).first()
            if not org:
                try:
                    org = Organisation.objects.filter(id=identifier).first()
                except (ValidationError, ValueError, TypeError):
                    org = None

            if not org or not user_has_org(org):
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You do not have access to this organisation.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            ctx.organisation = org
            ctx.club = None
            ctx.team = None
            ctx.season = None
            ctx.competition = None
            ctx.match = None
            ctx.membership = None
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind in {"club", "team"}:
            project = (
                Project.objects.filter(slug=identifier).first()
                or Project.objects.filter(id=identifier).first()
            )
            if not project:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Project not found",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            if kind == "team":
                if not user_has_project(project):
                    return Response(
                        {
                            "status": "error",
                            "error": {
                                "code": "permission_denied",
                                "message": "You do not have access to this team.",
                                "details": {},
                            },
                            "meta": {"timestamp": timezone.now().isoformat()},
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                ctx.organisation = project.organisation
                ctx.team = project
                ctx.club = project.parent_project
            else:
                # Club: check direct club access, OR any team under it, OR org membership
                has_direct_access = user_has_project(project)
                has_team_access = (
                    ProjectMembership.objects.active()
                    .filter(user=user, project__parent_project=project)
                    .exists()
                )
                if not (has_direct_access or has_team_access):
                    return Response(
                        {
                            "status": "error",
                            "error": {
                                "code": "permission_denied",
                                "message": "You do not have access to this club.",
                                "details": {},
                            },
                            "meta": {"timestamp": timezone.now().isoformat()},
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                ctx.organisation = project.organisation
                ctx.club = project
                ctx.team = None

            ctx.season = None
            ctx.competition = None
            ctx.match = None
            ctx.membership = sync_membership_for_context(ctx)
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind == "membership":
            membership = (
                ProjectMembership.objects.active()
                .select_related(
                    "user",
                    "project",
                    "project__parent_project",
                    "project__organisation",
                    "period",
                    "period__parent_period",
                )
                .filter(id=identifier)
                .first()
            )
            if not membership:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Membership not found",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            membership_project = getattr(membership, "project", None)
            if not membership_project or not user_has_project(membership_project):
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You do not have access to this membership.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Active context membership is always *your* membership.
            if str(getattr(membership, "user_id", "")) != str(user.id):
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You can only set your own membership as active context.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            ctx.team = membership_project
            ctx.club = getattr(membership_project, "parent_project", None)
            ctx.organisation = getattr(membership_project, "organisation", None) or getattr(
                ctx.club, "organisation", None
            )

            member_period = getattr(membership, "period", None)
            if member_period is None:
                ctx.season = None
            elif getattr(member_period, "parent_period_id", None) is None:
                ctx.season = member_period
            else:
                ctx.season = getattr(member_period, "parent_period", None)

            ctx.competition = None
            ctx.match = None
            ctx.membership = sync_membership_for_context(ctx)
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind in {"season", "competition"}:
            period = Period.objects.filter(id=identifier).first()
            if not period:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Period not found",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Require membership to the team/project OR club OR organisation this period belongs to.
            project = getattr(period, "project", None)
            org = getattr(period, "organisation", None)
            if not project or not org:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Period project or organisation not found.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check access: direct team membership, club membership, or org membership
            has_access = user_has_project(project)
            if not has_access and project.parent_project:
                # Period belongs to team, check if user has club access
                has_access = user_has_project(project.parent_project)

            if not has_access:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You do not have access to this period.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            ctx.organisation = org
            ctx.team = project
            ctx.club = getattr(project, "parent_project", None)

            if kind == "season":
                ctx.season = period
                ctx.competition = None
            else:
                ctx.competition = period
                ctx.season = getattr(period, "parent_period", None)

            ctx.match = None
            ctx.membership = sync_membership_for_context(ctx)
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

        elif kind == "match":
            activity = (
                Activity.objects.filter(id=identifier).select_related("period", "project").first()
            )
            if not activity:
                return Response(
                    {
                        "status": "error",
                        "error": {"code": "not_found", "message": "Match not found", "details": {}},
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            project = getattr(activity, "project", None)
            if not project:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "not_found",
                            "message": "Match project not found.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Check access: direct team membership, club membership, or org membership
            has_access = user_has_project(project)
            if not has_access and project.parent_project:
                # Match belongs to team, check if user has club access
                has_access = user_has_project(project.parent_project)

            if not has_access:
                return Response(
                    {
                        "status": "error",
                        "error": {
                            "code": "permission_denied",
                            "message": "You do not have access to this match.",
                            "details": {},
                        },
                        "meta": {"timestamp": timezone.now().isoformat()},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            ctx.organisation = project.organisation
            ctx.team = project
            ctx.club = getattr(project, "parent_project", None)
            ctx.match = activity
            ctx.competition = getattr(activity, "period", None)
            ctx.season = (
                getattr(ctx.competition, "parent_period", None) if ctx.competition else None
            )
            ctx.membership = sync_membership_for_context(ctx)
            ctx.save(
                update_fields=[
                    "organisation",
                    "club",
                    "team",
                    "season",
                    "competition",
                    "match",
                    "membership",
                    "updated_at",
                ]
            )

    ctx = (
        UserActiveContext.objects.select_related(
            "organisation",
            "club",
            "team",
            "season",
            "competition",
            "match",
            "membership",
            "membership__user",
            "membership__project",
            "membership__period",
            "membership__project__parent_project",
            "membership__project__organisation",
        )
        .filter(user=user)
        .first()
    )

    membership = resolve_membership_from_context(ctx)

    return Response(
        {
            "updated_at": ctx.updated_at.isoformat() if ctx else None,
            "organisation": organisation_payload(
                getattr(ctx, "organisation", None) if ctx else None
            ),
            "club": project_payload(getattr(ctx, "club", None) if ctx else None),
            "team": project_payload(getattr(ctx, "team", None) if ctx else None),
            "season": period_payload(getattr(ctx, "season", None) if ctx else None),
            "competition": period_payload(getattr(ctx, "competition", None) if ctx else None),
            "match": match_payload(getattr(ctx, "match", None) if ctx else None),
            "membership": membership_payload(membership),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["PATCH"])
def update_profile(request):
    """
    Update authenticated user's profile.

    Request Body:
        {
            "first_name": str (optional),
            "last_name": str (optional),
            "email": str (optional),
            "two_factor_enabled": bool (optional),
            "current_password": str (required for verification)
        }

    Returns:
        200 OK: Updated user profile
        400 Bad Request: Validation errors (B13 envelope)
        401 Unauthorized: Session expired
    """
    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    data = request.data

    # Validate current_password (required for security)
    current_password = data.get("current_password")
    if not current_password:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Current password is required",
                    "details": {"current_password": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(current_password):
        # Generic error to prevent password guessing
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "authentication_failed",
                    "message": "Unable to verify credentials.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Update fields if provided
    errors = {}
    has_update_fields = False

    first_name = data.get("first_name")
    if first_name is not None:
        has_update_fields = True
        if not first_name.strip():
            errors["first_name"] = ["First name cannot be empty"]
        elif len(first_name) > 150:
            errors["first_name"] = ["First name must be 150 characters or fewer"]
        else:
            user.first_name = first_name.strip()

    last_name = data.get("last_name")
    if last_name is not None:
        has_update_fields = True
        if not last_name.strip():
            errors["last_name"] = ["Last name cannot be empty"]
        elif len(last_name) > 150:
            errors["last_name"] = ["Last name must be 150 characters or fewer"]
        else:
            user.last_name = last_name.strip()

    email = data.get("email")
    if email is not None:
        has_update_fields = True
        email_value = str(email).strip().lower()
        if not email_value:
            errors["email"] = ["Email cannot be empty"]
        elif len(email_value) > 254:
            errors["email"] = ["Email must be 254 characters or fewer"]
        else:
            # Enforce uniqueness
            if User.objects.filter(email__iexact=email_value).exclude(pk=user.pk).exists():
                errors["email"] = ["A user with that email already exists"]
            else:
                user.email = email_value

    two_factor_enabled = data.get("two_factor_enabled")
    if two_factor_enabled is not None:
        has_update_fields = True
        user.two_factor_enabled = bool(two_factor_enabled)

    # Check if at least one field was provided
    if not has_update_fields:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "At least one field must be provided to update.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if errors:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": errors,
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Save updates
    user.save()

    # Return updated profile (same format as /auth/me)
    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
def change_password(request):
    """Change the authenticated user's password.

    Request Body:
        {
            "current_password": str (required),
            "new_password": str (required),
            "new_password_confirm": str (required)
        }
    """
    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    data = request.data or {}

    current_password = data.get("current_password")
    new_password = data.get("new_password")
    new_password_confirm = data.get("new_password_confirm")

    errors: dict[str, list[str]] = {}

    if not current_password:
        errors["current_password"] = ["This field is required"]
    if not new_password:
        errors["new_password"] = ["This field is required"]
    if not new_password_confirm:
        errors["new_password_confirm"] = ["This field is required"]

    if errors:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": errors,
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.check_password(current_password):
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "authentication_failed",
                    "message": "Unable to verify credentials.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if str(new_password) != str(new_password_confirm):
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"new_password": ["Passwords do not match."]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    from django.contrib.auth.password_validation import validate_password
    from django.contrib.auth import update_session_auth_hash

    try:
        validate_password(str(new_password), user=user)
    except Exception as exc:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"new_password": [str(exc)]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(str(new_password))
    user.save(update_fields=["password"])
    update_session_auth_hash(request, user)
    audit_log.record("auth.password_changed", user=user, request=request)

    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
def update_avatar(request):
    """Upload/update the authenticated user's avatar image."""

    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    file_obj = (request.FILES or {}).get("avatar")
    if not file_obj:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"avatar": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = getattr(file_obj, "content_type", "") or ""
    if not content_type.startswith("image/"):
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"avatar": ["Avatar must be an image"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Some clients/browsers may provide a path-like name (e.g. C:\fakepath\avatar.png).
    # Sanitise to a safe basename to prevent storage/path errors.
    try:
        import os

        original_name = str(getattr(file_obj, "name", "") or "").strip()
        safe_name = os.path.basename(original_name.replace("\\", "/"))
        safe_name = safe_name or "avatar"
        file_obj.name = safe_name
    except Exception:
        # If sanitisation fails, continue with storage's default handling.
        pass

    # Save avatar with defensive error handling (storage backends can raise).
    # Upload to S3 via the files storage backend instead of relying on
    # Django's default FileSystemStorage (which fails on ephemeral Railway FS).
    try:
        import uuid

        from files.utils import get_storage_backend

        backend = get_storage_backend()
        avatar_uuid = uuid.uuid4()
        storage_path = f"avatars/{user.id}/{avatar_uuid}/{file_obj.name}"
        saved_path = backend.save(storage_path, file_obj)

        user.avatar.name = saved_path
        user.save(update_fields=["avatar"])
        audit_log.record("auth.avatar_updated", user=user, request=request)

        # Sync avatar path to active project membership metadata
        from accounts.utils import sync_avatar_to_memberships

        sync_avatar_to_memberships(user)
    except Exception:
        import logging

        logging.getLogger(__name__).exception(
            "Avatar upload failed", extra={"user_id": getattr(user, "id", None)}
        )
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "server_error",
                    "message": "Failed to save avatar. Please try again.",
                    "details": {"correlation_id": getattr(request, "correlation_id", None)},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    serializer = UserListSerializer(user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
def set_avatar_from_path(request):
    """Set the authenticated user's avatar from an existing S3 path.

    This is useful when migrating existing images (e.g., player photos from SoccerWiki)
    to be used as user avatars without re-uploading.

    Request body:
        {
            "path": "players/12345.png"  # Relative path in S3 bucket
        }
    """
    if not request.user.is_authenticated:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "not_authenticated",
                    "message": "Authentication credentials were not provided.",
                    "details": {},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user = request.user
    path = (request.data or {}).get("path", "").strip()

    if not path:
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"path": ["This field is required"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate path doesn't contain directory traversal
    if ".." in path or path.startswith("/"):
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "validation_error",
                    "message": "Validation failed",
                    "details": {"path": ["Invalid path"]},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Set the avatar path directly (this will be resolved to S3 URL by get_avatar_url)
    try:
        # The ImageField.name stores the relative path
        user.avatar.name = path
        user.save(update_fields=["avatar"])
        audit_log.record(
            "auth.avatar_path_set", user=user, request=request, metadata={"path": path}
        )

        # Sync avatar path to active project membership metadata
        from accounts.utils import sync_avatar_to_memberships

        sync_avatar_to_memberships(user)
    except Exception:
        import logging

        logging.getLogger(__name__).exception(
            "Avatar path set failed", extra={"user_id": getattr(user, "id", None)}
        )
        return Response(
            {
                "status": "error",
                "error": {
                    "code": "server_error",
                    "message": "Failed to set avatar path. Please try again.",
                    "details": {"correlation_id": getattr(request, "correlation_id", None)},
                },
                "meta": {"timestamp": timezone.now().isoformat()},
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    serializer = UserListSerializer(user)
    return Response(
        {
            "status": "success",
            "data": serializer.data,
            "meta": {"timestamp": timezone.now().isoformat()},
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_update_avatar(request, user_id):
    """Upload/update a user's avatar image (admin only).

    Accepts multipart/form-data with an 'avatar' file field.
    Requires the requestor to be a global admin or to have profile.edit_team
    permission on a project where the target user has a membership.
    """
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission check: global admin or profile.edit_team scoped admin
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()
    is_self = user_id == request.user.id

    if not is_global_admin and not is_self:
        from permissions.models import RoleAssignment, ScopeChoices
        from projects.models import Project, ProjectMembership

        org_scope_ids = set(
            RoleAssignment.objects.filter(
                user=request.user,
                scope=ScopeChoices.ORGANIZATION,
                role__permissions__permission="profile.edit_team",
            ).values_list("target_organization_id", flat=True)
        )
        project_scope_ids = set(
            RoleAssignment.objects.filter(
                user=request.user,
                scope=ScopeChoices.PROJECT,
                role__permissions__permission="profile.edit_team",
            ).values_list("target_project_id", flat=True)
        )

        allowed_project_ids: set[str] = set()
        if org_scope_ids:
            allowed_project_ids.update(
                Project.all_objects.filter(organisation_id__in=org_scope_ids).values_list(
                    "id", flat=True
                )
            )
        if project_scope_ids:
            allowed_project_ids.update(
                Project.all_objects.filter(id__in=project_scope_ids).values_list("id", flat=True)
            )
            allowed_project_ids.update(
                Project.all_objects.filter(parent_project_id__in=project_scope_ids).values_list(
                    "id", flat=True
                )
            )

        has_access = False
        if allowed_project_ids:
            has_access = ProjectMembership.objects.filter(
                user=target_user,
                project_id__in=allowed_project_ids,
                deleted_at__isnull=True,
            ).exists()

        if not has_access:
            # Fallback: org admin via legacy membership
            from organisations.models import Membership

            requestor_org_ids = set(
                Membership.objects.filter(
                    user=request.user, role="admin", is_active=True
                ).values_list("organisation_id", flat=True)
            )
            target_org_ids = set(
                target_user.organisation_memberships.values_list("organisation_id", flat=True)
            )
            if not requestor_org_ids.intersection(target_org_ids):
                return Response(
                    {"detail": "You do not have permission to update this user's avatar."},
                    status=status.HTTP_403_FORBIDDEN,
                )

    file_obj = (request.FILES or {}).get("avatar")
    if not file_obj:
        return Response(
            {"error": "validation_error", "message": "avatar file is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = getattr(file_obj, "content_type", "") or ""
    if not content_type.startswith("image/"):
        return Response(
            {"error": "validation_error", "message": "Avatar must be an image."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    import logging
    import os
    import uuid

    logger = logging.getLogger(__name__)

    original_name = str(getattr(file_obj, "name", "") or "").strip()
    safe_name = os.path.basename(original_name.replace("\\", "/")) or "avatar"
    file_obj.name = safe_name

    # Upload to S3 via the files storage backend instead of relying on
    # Django's default FileSystemStorage (which fails on ephemeral Railway FS).
    try:
        from files.utils import get_storage_backend

        backend = get_storage_backend()
        avatar_uuid = uuid.uuid4()
        storage_path = f"avatars/{target_user.id}/{avatar_uuid}/{safe_name}"
        saved_path = backend.save(storage_path, file_obj)
        logger.info(
            "Avatar uploaded to storage backend: %s -> %s",
            storage_path,
            saved_path,
        )

        # Set path directly on the ImageField (bypasses local disk write)
        target_user.avatar.name = saved_path
        target_user.save(update_fields=["avatar"])
    except Exception as exc:
        import traceback

        logger.exception(
            "Admin avatar upload failed",
            extra={"user_id": user_id, "admin_id": request.user.id},
        )
        return Response(
            {
                "error": "server_error",
                "message": "Failed to save avatar.",
                "debug": {
                    "exception": f"{type(exc).__name__}: {exc}",
                    "traceback": traceback.format_exc(),
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # Sync avatar path to active project membership metadata
    from accounts.utils import sync_avatar_to_memberships

    sync_avatar_to_memberships(target_user)

    try:
        audit_log.record(
            "auth.avatar_updated",
            user=request.user,
            request=request,
            metadata={"target_user_id": str(target_user.id)},
        )
    except Exception:
        pass  # Non-critical — avatar was saved successfully

    from accounts.utils import get_avatar_url

    return Response(
        {
            "status": "success",
            "data": {"avatar_url": get_avatar_url(target_user.avatar)},
            "meta": {"timestamp": timezone.now().isoformat()},
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_request_api(request):
    """API endpoint for password reset request with no email enumeration."""
    serializer = PasswordResetRequestSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data["email"]
        try:
            user = User.objects.get(email=email, email_verified=True, is_active=True)
            # Generate reset token and send email
            token = default_token_generator.make_token(user)
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            # Build absolute URI for password reset
            reset_path = f"/accounts/reset-password/{uidb64}/{token}/"
            if request.build_absolute_uri:
                reset_url = request.build_absolute_uri(reset_path)
            else:
                reset_url = f"http://localhost:8000{reset_path}"

            context = {"user": user, "reset_url": reset_url}
            html_message = render_to_string("accounts/email/password_reset.html", context)
            plain_message = strip_tags(html_message)
            send_mail(
                subject="Reset your password",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
            )
        except User.DoesNotExist:
            # No enumeration - don't reveal if email exists
            pass

        # Always return the same message
        return Response(
            {
                "message": (
                    "If an account with that email exists, a password reset link "
                    "has been sent. Please check your inbox."
                )
            }
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([AllowAny])
def password_reset_confirm_api(request):
    """API endpoint for password reset confirmation with token validation."""
    serializer = PasswordResetConfirmSerializer(data=request.data)
    if serializer.is_valid():
        try:
            uid = force_str(urlsafe_base64_decode(serializer.validated_data["uidb64"]))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {
                    "error": "invalid_token",
                    "message": "The password reset link is invalid or has expired.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if default_token_generator.check_token(user, serializer.validated_data["token"]):
            # Set new password
            user.set_password(serializer.validated_data["new_password"])
            user.save()

            # Audit log: Password changed
            audit_log.record("auth.password_changed", user=user, request=request)

            # Invalidate all existing sessions for this user
            from django.contrib.sessions.models import Session

            for session in Session.objects.all():
                session_data = session.get_decoded()
                if session_data.get("_auth_user_id") == str(user.id):
                    session.delete()

            return Response(
                {
                    "message": (
                        "Password reset successful. You can now sign in " "with your new password."
                    )
                }
            )

        return Response(
            {
                "error": "invalid_token",
                "message": "The password reset link is invalid or has expired.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Admin User Management API Endpoints


class UserPagination(PageNumberPagination):
    """Pagination class for user list."""

    page_size = 50


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_user_list(request):
    """List all users with pagination and filters (admin only), or create a new user."""

    org_check = None

    # Permission Check
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()

    if not is_global_admin:
        organisation_id = request.query_params.get("organisation_id")
        project_id = request.query_params.get("project_id")

        # TeamReel Option A:
        # - Allow project-scoped listing for Club/Team Admin via `profile.edit_team`
        #   on that project.
        # - Allow org-scoped listing for Land Admin via `profile.edit_team` on that
        #   organisation.
        # Keep legacy org permissions for older flows.
        if project_id and request.method == "GET":
            import uuid

            from projects.models import Project

            proj_check = None
            try:
                uuid.UUID(project_id)
                proj_check = Project.all_objects.filter(id=project_id).first()
            except ValueError:
                proj_check = Project.all_objects.filter(slug__iexact=project_id).first()

            if not proj_check:
                return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

            has_perm = check_permission(
                request.user.id,
                "profile.edit_team",
                resource_id=proj_check.id,
                resource_type="project",
            )
            if not has_perm:
                return Response(
                    {"detail": "You do not have permission to view users for this project."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        elif organisation_id:
            # Resolve Org
            import uuid

            from organisations.models import Organisation

            org_check = None
            try:
                uuid.UUID(organisation_id)
                org_check = Organisation.objects.filter(id=organisation_id).first()
            except ValueError:
                org_check = Organisation.objects.filter(slug__iexact=organisation_id).first()

            if not org_check:
                return Response(
                    {"detail": "Organization not found."}, status=status.HTTP_404_NOT_FOUND
                )

            # Check Permission
            required_perm = "org.view_members"
            if request.method == "POST":
                required_perm = "org.invite_users"

            # TeamReel: Land Admin uses `profile.edit_team` at org scope.
            has_perm = check_permission(
                request.user.id,
                required_perm,
                resource_id=org_check.id,
                resource_type="organisation",
            ) or check_permission(
                request.user.id,
                "profile.edit_team",
                resource_id=org_check.id,
                resource_type="organisation",
            )

            if not has_perm:
                # Fallback: Check Membership (Legacy/Simple)
                from organisations.models import Membership

                # For GET (viewing), any active member is allowed
                if request.method == "GET":
                    if Membership.objects.filter(
                        user=request.user,
                        organisation=org_check,
                        is_active=True,
                    ).exists():
                        has_perm = True
                # For POST (creating), only admins are allowed
                elif Membership.objects.filter(
                    user=request.user,
                    organisation=org_check,
                    role="admin",
                    is_active=True,
                ).exists():
                    has_perm = True

            if not has_perm:
                return Response(
                    {
                        "detail": (
                            f"You do not have permission to {required_perm} "
                            "in this organization."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif request.method == "POST":
            # Creating a user requires an organization context for non-global admins
            return Response(
                {"detail": "Organization ID required to create users."},
                status=status.HTTP_403_FORBIDDEN,
            )
        else:
            # Regular users cannot list all users in the system without an organization context
            return Response(
                {"detail": "You do not have permission to view all users."},
                status=status.HTTP_403_FORBIDDEN,
            )

    if request.method == "POST":
        serializer = RegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()

            # Audit log: user created (best-effort; never blocks)
            try:
                audit_log.record(
                    "resource.created",
                    user=request.user,
                    organization=org_check,
                    metadata={
                        "resource_type": "user",
                        "resource_id": str(user.id),
                        "created_user_email": user.email,
                    },
                    request=request,
                )
            except Exception:
                pass

            # If created by an Org Admin, automatically add the user to the organization
            if not is_global_admin and org_check:
                from organisations.models import Membership

                # Default role for new members created by Org Admin
                Membership.objects.create(user=user, organisation=org_check, role="member")

                # Audit log: organisation member added
                try:
                    audit_log.record(
                        "organisation.membership.created",
                        user=request.user,
                        organization=org_check,
                        metadata={
                            "user_id": str(user.id),
                            "role": "member",
                            "email": user.email,
                        },
                        request=request,
                    )
                except Exception:
                    pass

            # Return the created user using the list serializer format for consistency
            response_serializer = UserListSerializer(user)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    queryset = (
        User.objects.select_related()
        .prefetch_related(
            "groups",
            "organisation_memberships__organisation",
            "project_memberships__project__organisation",
            "project_memberships__project__parent_project",
            "project_memberships__period__parent_period",
            "role_assignments__target_organization",
            "role_assignments__target_project__organisation",
            "role_assignments__role",
        )
        .order_by("-date_joined")
    )

    # Apply filters
    # Full-text search across name and email fields
    search = request.query_params.get("search", "").strip()
    if search:
        from django.db.models import Q

        search_q = Q()
        for term in search.split():
            search_q &= (
                Q(first_name__icontains=term)
                | Q(last_name__icontains=term)
                | Q(email__icontains=term)
            )
        queryset = queryset.filter(search_q)

    is_active = request.query_params.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active.lower() == "true")

    email_verified = request.query_params.get("email_verified")
    if email_verified is not None:
        queryset = queryset.filter(email_verified=email_verified.lower() == "true")

    role = request.query_params.get("role")
    if role:
        if role == "superadmin":
            queryset = queryset.filter(is_superuser=True)
        elif role == "admin":
            queryset = queryset.filter(groups__name="admin")
        elif role == "user":
            queryset = queryset.filter(groups__name="user", is_superuser=False)

    # Filter by computed demo role label (e.g. "Team Admin", "Club Admin", "Team Member")
    # This is intentionally in-Python (not DB-annotated) to keep logic aligned with serializer.
    role_label = request.query_params.get("role_label")

    # Filter by organisation (if provided)
    organisation_id = request.query_params.get("organisation_id")
    if organisation_id:
        from django.db.models import Q
        from organisations.models import Organisation
        from permissions.models import RoleAssignment

        org = None
        # Check if it's a UUID or a slug
        try:
            import uuid

            uuid.UUID(organisation_id)
            # It's a UUID
            org = Organisation.objects.filter(id=organisation_id).first()
        except ValueError:
            # It's likely a slug
            org = Organisation.objects.filter(slug__iexact=organisation_id).first()

        if org:
            # Security Check: If not global admin, ensure user has access to this org
            if not is_global_admin:
                # Check if user is member or has role assignment in this org
                has_access = (
                    request.user.organisation_memberships.filter(organisation=org).exists()
                    or RoleAssignment.objects.filter(
                        user=request.user, target_organization=org
                    ).exists()
                )
                if not has_access:
                    return Response(
                        {
                            "detail": (
                                "You do not have permission to view users in this organization."
                            )
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

                # If user has TeamReel Land Admin permissions, allow org-wide listing.
                # Otherwise keep legacy privacy rules (non-admin org members see self only).
                has_teamreel_org_perm = check_permission(
                    request.user.id,
                    "profile.edit_team",
                    resource_id=org.id,
                    resource_type="organisation",
                )

                if not has_teamreel_org_perm:
                    # PLAYER PRIVACY: Non-admin org members can ONLY see their own user record
                    from organisations.models import Membership

                    user_membership = Membership.objects.filter(
                        user=request.user, organisation=org, is_active=True
                    ).first()

                    is_org_admin = user_membership and user_membership.role == "admin"
                    if not is_org_admin:
                        queryset = User.objects.filter(id=request.user.id)
                        paginator = UserPagination()
                        page = paginator.paginate_queryset(queryset, request)
                        if page is not None:
                            serializer = UserListSerializer(page, many=True)
                            return paginator.get_paginated_response(serializer.data)
                        serializer = UserListSerializer(queryset, many=True)
                        return Response(serializer.data)

            # TeamReel Option A:
            # Include users visible via projects in this organisation (project memberships), plus
            # legacy org memberships and role assignments.

            include_unassigned = (
                request.query_params.get("include_unassigned", "false").lower() == "true"
            )

            filters = (
                Q(
                    project_memberships__project__organisation=org,
                    project_memberships__deleted_at__isnull=True,
                )
                | Q(organisation_memberships__organisation=org)
                | Q(role_assignments__target_organization=org)
                | Q(role_assignments__target_project__organisation=org)
            )

            if include_unassigned:
                filters |= Q(organisation_memberships__isnull=True)

            queryset = queryset.filter(filters).distinct()
        else:
            # Return empty if org not found
            return Response({"count": 0, "next": None, "previous": None, "results": []})
    elif not is_global_admin:
        # Filter by all allowed organizations for the current user
        from django.db.models import Q
        from permissions.models import RoleAssignment, ScopeChoices

        # 1. Direct membership
        user_org_ids = set(
            request.user.organisation_memberships.values_list("organisation_id", flat=True)
        )

        # 2. Role Assignments on Organisations
        assigned_org_ids = set(
            RoleAssignment.objects.filter(
                user=request.user, scope=ScopeChoices.ORGANIZATION
            ).values_list("target_organization_id", flat=True)
        )

        allowed_org_ids = user_org_ids | assigned_org_ids

        # Also include unassigned users if explicitly requested
        # (e.g. for Org Admins looking for new users)
        include_unassigned = (
            request.query_params.get("include_unassigned", "false").lower() == "true"
        )

        filters = (
            Q(organisation_memberships__organisation_id__in=allowed_org_ids)
            | Q(role_assignments__target_organization_id__in=allowed_org_ids)
            | Q(role_assignments__target_project__organisation_id__in=allowed_org_ids)
        )

        if include_unassigned:
            filters |= Q(organisation_memberships__isnull=True)

        queryset = queryset.filter(filters).distinct()

    # Filter by project (if provided)
    project_id = request.query_params.get("project_id")
    if project_id:
        import logging

        from projects.models import Project

        logger = logging.getLogger(__name__)

        proj = None
        try:
            import uuid as uuid_module

            uuid_module.UUID(project_id)
            proj = Project.objects.filter(id=project_id).first()
        except ValueError:
            proj = Project.objects.filter(slug__iexact=project_id).first()

        if proj:
            # Non-global admins must have TeamReel permission to manage/view users for this project.
            if not is_global_admin:
                has_perm = check_permission(
                    request.user.id,
                    "profile.edit_team",
                    resource_id=proj.id,
                    resource_type="project",
                )
                if not has_perm:
                    return Response(
                        {"detail": "You do not have permission to view users for this project."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

            # Find all projects to check:
            # 1. The project itself
            # 2. All child projects (if it's a parent/club)
            project_ids = [proj.id]
            child_project_ids = list(
                Project.objects.filter(parent_project=proj).values_list("id", flat=True)
            )
            project_ids.extend(child_project_ids)
            logger.info(
                (
                    "[admin_user_list] Filtering by project: %s (ID: %s), "
                    "child projects: %s, total project_ids: %s"
                ),
                proj.name,
                proj.id,
                len(child_project_ids),
                len(project_ids),
            )

            # Count before filter
            count_before = queryset.count()
            logger.info(f"[admin_user_list] Users BEFORE project filter: {count_before}")

            # Filter by ProjectMembership (new B26 system - active memberships only)
            queryset = queryset.filter(
                project_memberships__project_id__in=project_ids,
                project_memberships__deleted_at__isnull=True,
            ).distinct()

            # Count after filter
            count_after = queryset.count()
            logger.info(f"[admin_user_list] Users AFTER project filter: {count_after}")
        else:
            return Response({"count": 0, "next": None, "previous": None, "results": []})

    # Paginate
    if role_label:
        # Prefetch relations needed to compute roles without N+1 queries.
        queryset = queryset.prefetch_related(
            "organisation_memberships__organisation",
            "project_memberships__project__organisation",
            "project_memberships__project__parent_project",
            "role_assignments__role",
            "role_assignments__target_organization",
            "role_assignments__target_project__organisation",
        )

        wanted = str(role_label).strip().lower()

        def compute_role_label(u):
            # 0. Superuser is always Superadmin
            if getattr(u, "is_superuser", False):
                return "Superadmin"

            # 1. RBAC RoleAssignment (primary)
            try:
                assignments = list(getattr(u, "role_assignments", []).all())
                if assignments:
                    role_priority = {
                        "Land Admin": 1,
                        "Club Admin": 2,
                        "Team Admin": 3,
                        "Team Staff": 4,
                        "Team Member": 5,
                        "Supporter": 6,
                        "Viewer": 7,
                    }

                    best = None
                    best_rank = 999
                    for ra in assignments:
                        name = getattr(getattr(ra, "role", None), "name", None)
                        if not name:
                            continue
                        rank = role_priority.get(name, 999)
                        if rank < best_rank:
                            best = name
                            best_rank = rank
                    if best:
                        return best
            except Exception:
                import logging

                logging.getLogger(__name__).debug(
                    "Failed to compute RBAC role label from role_assignments",
                    exc_info=True,
                )

            # 2. Organisation membership admin (legacy)
            try:
                memberships = list(getattr(u, "organisation_memberships", []).all())
                if any(
                    getattr(m, "role", None) == "admin" and getattr(m, "is_active", False)
                    for m in memberships
                ):
                    return "Land Admin"
            except Exception:
                import logging

                logging.getLogger(__name__).debug(
                    "Failed to compute legacy org membership role label",
                    exc_info=True,
                )

            # 3. Project memberships (fallback)
            try:
                project_memberships = list(getattr(u, "project_memberships", []).all())

                # Determine highest role across memberships
                highest = None

                for pm in project_memberships:
                    proj = getattr(pm, "project", None)
                    if not proj:
                        continue

                    pm_role = getattr(pm, "role", None)
                    is_team = bool(getattr(proj, "parent_project", None))

                    if pm_role == "admin" and not is_team:
                        return "Club Admin"
                    if pm_role == "admin" and is_team:
                        if highest not in ["Club Admin"]:
                            highest = "Team Admin"
                    elif pm_role in ["staff", "editor"] and highest not in [
                        "Club Admin",
                        "Team Admin",
                    ]:
                        highest = "Team Staff"
                    elif pm_role == "player" and not highest:
                        highest = "Team Member"
                    elif pm_role == "viewer" and not highest:
                        highest = "Viewer"

                return highest or "User"
            except Exception:
                return "User"

        queryset_list = list(queryset)
        queryset = [u for u in queryset_list if compute_role_label(u).strip().lower() == wanted]

    paginator = UserPagination()
    page = paginator.paginate_queryset(queryset, request)
    serializer = UserListSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def admin_user_detail(request, user_id):
    """Get, update, or delete user details (admin only)."""
    try:
        user = User.objects.prefetch_related("groups").get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission Check
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()
    is_self = user_id == request.user.id

    # SELF-ACCESS: Users can always view and edit their own profile
    if is_self:
        # Allow GET for self
        if request.method == "GET":
            serializer = UserDetailSerializer(user)
            return Response(serializer.data)

        # Allow PATCH/PUT for self with safe fields only
        if request.method in ["PUT", "PATCH"]:
            # Whitelist of fields users can update for themselves
            safe_fields = {"first_name", "last_name", "email"}

            # Check if any forbidden fields are being modified
            forbidden_fields = set(request.data.keys()) - safe_fields
            if forbidden_fields:
                return Response(
                    {
                        "error": "forbidden_fields",
                        "message": f"You cannot modify these fields: {', '.join(forbidden_fields)}",
                        "allowed_fields": list(safe_fields),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Allow self-update for safe fields
            serializer = UserUpdateSerializer(
                user, data=request.data, partial=True, context={"user": user}
            )
            if serializer.is_valid():
                serializer.save()
                return Response(UserDetailSerializer(user).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Prevent self-deletion
        if request.method == "DELETE":
            return Response(
                {"error": "permission_denied", "message": "You cannot delete yourself."},
                status=status.HTTP_403_FORBIDDEN,
            )

    if not is_global_admin:
        # TeamReel Option A:
        # Permit access if requestor can manage profiles (`profile.edit_team`) for a project/org
        # where the target user has an active ProjectMembership.
        from permissions.models import RoleAssignment, ScopeChoices
        from projects.models import Project, ProjectMembership

        org_scope_ids = set(
            RoleAssignment.objects.filter(
                user=request.user,
                scope=ScopeChoices.ORGANIZATION,
                role__permissions__permission="profile.edit_team",
            ).values_list("target_organization_id", flat=True)
        )
        project_scope_ids = set(
            RoleAssignment.objects.filter(
                user=request.user,
                scope=ScopeChoices.PROJECT,
                role__permissions__permission="profile.edit_team",
            ).values_list("target_project_id", flat=True)
        )

        allowed_project_ids: set[str] = set()
        if org_scope_ids:
            allowed_project_ids.update(
                Project.all_objects.filter(organisation_id__in=org_scope_ids).values_list(
                    "id", flat=True
                )
            )
        if project_scope_ids:
            allowed_project_ids.update(
                Project.all_objects.filter(id__in=project_scope_ids).values_list("id", flat=True)
            )
            allowed_project_ids.update(
                Project.all_objects.filter(parent_project_id__in=project_scope_ids).values_list(
                    "id", flat=True
                )
            )

        has_teamreel_access = False
        if allowed_project_ids:
            has_teamreel_access = ProjectMembership.objects.filter(
                user=user,
                project_id__in=allowed_project_ids,
                deleted_at__isnull=True,
            ).exists()

        if has_teamreel_access:
            # Non-global admins may only edit safe profile fields via this endpoint.
            if request.method in ["PUT", "PATCH"]:
                safe_fields = {"first_name", "last_name", "email"}
                forbidden_fields = set(request.data.keys()) - safe_fields
                if forbidden_fields:
                    return Response(
                        {
                            "error": "forbidden_fields",
                            "message": (
                                "You cannot modify these fields: "
                                f"{', '.join(sorted(forbidden_fields))}"
                            ),
                            "allowed_fields": sorted(safe_fields),
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )

            # Do not allow non-global deletes through this endpoint.
            if request.method == "DELETE":
                return Response(
                    {"detail": "You do not have permission to delete users."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        else:
            # Legacy behaviour: org admins can manage users in shared organisations.
            from organisations.models import Membership

            requestor_memberships = Membership.objects.filter(user=request.user, is_active=True)
            is_admin_anywhere = requestor_memberships.filter(role="admin").exists()
            if not is_admin_anywhere:
                return Response(
                    {"error": "not_found", "message": "User not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        # For non-global admins, we need to check if they have permission to manage THIS user.
        # This is tricky because the user might belong to multiple organizations.
        # We'll check if the requestor has 'org.view_members' (for GET) or
        # 'org.remove_users' (for DELETE)
        # on ANY organization that the target user is also a member of.

        from permissions.models import RoleAssignment

        # Get organizations where the requestor has admin rights
        # This is a simplified check. Ideally we should check specific permissions per org.
        # But for now, let's find common organizations.

        # 1. Via RoleAssignment (RBAC)
        requestor_org_ids = set(
            RoleAssignment.objects.filter(
                user=request.user, role__permissions__permission="org.view_members"
            ).values_list("target_organization_id", flat=True)
        )

        # 2. Via Membership (Legacy/Simple)
        from organisations.models import Membership

        membership_org_ids = set(
            Membership.objects.filter(user=request.user, role="admin", is_active=True).values_list(
                "organisation_id", flat=True
            )
        )
        requestor_org_ids.update(membership_org_ids)

        target_user_org_ids = set(
            user.organisation_memberships.values_list("organisation_id", flat=True)
        )

        common_orgs = requestor_org_ids.intersection(target_user_org_ids)

        # If no common orgs, check if the user has a role assignment in an org the requestor manages
        if not common_orgs:
            target_user_role_org_ids = set(
                user.role_assignments.values_list("target_organization_id", flat=True)
            )
            common_orgs = requestor_org_ids.intersection(target_user_role_org_ids)

        # Check if target user is unassigned
        # We align this with admin_user_list which considers users with no memberships as unassigned
        # even if they might have role assignments (e.g. project roles)
        is_unassigned = not target_user_org_ids

        if not common_orgs and not is_unassigned:
            return Response(
                {"detail": "You do not have permission to manage this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # For DELETE, check specifically for org.remove_users on at least one common org
        if request.method == "DELETE":
            if is_unassigned:
                return Response(
                    {"detail": "You cannot delete unassigned users."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            has_delete_perm = False
            for org_id in common_orgs:
                # Check RBAC
                if check_permission(
                    request.user.id,
                    "org.remove_users",
                    resource_id=org_id,
                    resource_type="organisation",
                ):
                    has_delete_perm = True
                    break

                # Check Membership Admin (Legacy/Simple)
                # Admins have full permissions
                if Membership.objects.filter(
                    user=request.user,
                    organisation_id=org_id,
                    role="admin",
                    is_active=True,
                ).exists():
                    has_delete_perm = True
                    break

            if not has_delete_perm:
                return Response(
                    {
                        "detail": (
                            "You do not have permission to delete users in the shared "
                            "organization(s)."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

    if request.method == "GET":
        serializer = UserDetailSerializer(user)
        return Response(serializer.data)

    if request.method == "DELETE":
        # Prevent deleting yourself
        if request.user.id == user.id:
            return Response(
                {"error": "permission_denied", "message": "You cannot delete yourself."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not is_global_admin:
            # For Org Admins, we don't actually delete the user account (which is global).
            # We only remove them from the organization(s) that the admin manages.
            # However, the frontend calls this endpoint expecting a "delete".
            # If the user is ONLY in this organization, maybe we can delete them?
            # For now, let's stick to the safe approach: Remove membership from common orgs.

            from organisations.models import Membership

            # Get organizations where the requestor has remove_users permission
            # AND the user is a member

            # Re-calculate common orgs to be safe (or reuse from above if scope allows)
            requestor_org_ids = set(
                RoleAssignment.objects.filter(
                    user=request.user, role__permissions__permission="org.remove_users"
                ).values_list("target_organization_id", flat=True)
            )
            target_user_org_ids = set(
                user.organisation_memberships.values_list("organisation_id", flat=True)
            )
            common_orgs = requestor_org_ids.intersection(target_user_org_ids)

            if not common_orgs:
                return Response(
                    {"detail": "No common organizations found to remove user from."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            memberships_to_remove = list(
                Membership.objects.filter(
                    user=user, organisation_id__in=common_orgs
                ).select_related("organisation")
            )
            deleted_count, _ = Membership.objects.filter(
                id__in=[m.id for m in memberships_to_remove]
            ).delete()

            # Audit log: membership removed (best-effort)
            for membership in memberships_to_remove:
                try:
                    audit_log.record(
                        "organisation.membership.deleted",
                        user=request.user,
                        organization=membership.organisation,
                        metadata={
                            "user_id": str(user.id),
                            "role": membership.role,
                            "email": user.email,
                        },
                        request=request,
                    )
                except Exception:
                    pass

            return Response(
                {"message": f"User removed from {deleted_count} organization(s)."},
                status=status.HTTP_204_NO_CONTENT,
            )

        # Audit log: user deleted (best-effort). Also emit membership removals scoped
        # to orgs so org admins can see the action in org-scoped audit views.
        try:
            audit_log.record(
                "resource.deleted",
                user=request.user,
                metadata={
                    "resource_type": "user",
                    "resource_id": str(user.id),
                    "email": user.email,
                },
                request=request,
            )
        except Exception:
            pass

        try:
            from organisations.models import Membership

            memberships_to_remove = list(
                Membership.objects.filter(user=user).select_related("organisation")
            )
            for membership in memberships_to_remove:
                try:
                    audit_log.record(
                        "organisation.membership.deleted",
                        user=request.user,
                        organization=membership.organisation,
                        metadata={
                            "user_id": str(user.id),
                            "role": membership.role,
                            "email": user.email,
                        },
                        request=request,
                    )
                except Exception:
                    pass
        except Exception:
            pass

        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Handle PUT/PATCH
    serializer = UserUpdateSerializer(user, data=request.data, partial=True, context={"user": user})
    if serializer.is_valid():
        serializer.save()
        # Return full details after update
        return Response(UserDetailSerializer(user).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_user_activate(request, user_id):
    """Activate a user (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission Check
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()

    org_for_audit = None

    if not is_global_admin:
        # Check if requestor manages any org the user is in
        from permissions.models import RoleAssignment

        requestor_org_ids = set(
            RoleAssignment.objects.filter(
                user=request.user, role__permissions__permission="org.manage_settings"
            ).values_list("target_organization_id", flat=True)
        )
        target_user_org_ids = set(
            user.organisation_memberships.values_list("organisation_id", flat=True)
        )
        common_orgs = requestor_org_ids.intersection(target_user_org_ids)

        if not common_orgs:
            return Response(
                {"detail": "You do not have permission to manage this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Include an org for audit scoping so the event shows up in org-scoped audit views.
        try:
            from organisations.models import Organisation

            org_for_audit = Organisation.objects.filter(id=sorted(common_orgs)[0]).first()
        except Exception:
            org_for_audit = None

    if user.is_active:
        return Response(
            {"error": "bad_request", "message": "User is already active."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.is_active = True
    user.save()

    try:
        audit_log.record(
            "user.activated",
            user=request.user,
            organization=org_for_audit,
            metadata={
                "target_user_id": str(user.id),
                "target_user_email": user.email,
            },
            request=request,
        )
    except Exception:
        pass

    serializer = UserDetailSerializer(user)
    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def admin_user_deactivate(request, user_id):
    """Deactivate a user with protection checks (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Permission Check
    is_global_admin = request.user.is_superuser or request.user.groups.filter(name="admin").exists()

    org_for_audit = None

    if not is_global_admin:
        # Check if requestor manages any org the user is in
        from permissions.models import RoleAssignment

        requestor_org_ids = set(
            RoleAssignment.objects.filter(
                user=request.user, role__permissions__permission="org.manage_settings"
            ).values_list("target_organization_id", flat=True)
        )
        target_user_org_ids = set(
            user.organisation_memberships.values_list("organisation_id", flat=True)
        )
        common_orgs = requestor_org_ids.intersection(target_user_org_ids)

        if not common_orgs:
            return Response(
                {"detail": "You do not have permission to manage this user."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            from organisations.models import Organisation

            org_for_audit = Organisation.objects.filter(id=sorted(common_orgs)[0]).first()
        except Exception:
            org_for_audit = None

    # Prevent self-deactivation
    if user.id == request.user.id:
        return Response(
            {"error": "bad_request", "message": "You cannot deactivate your own account."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Admins can't deactivate superadmins or other admins
    if not request.user.is_superuser:
        if user.is_superuser or user.is_admin:
            return Response(
                {
                    "error": "permission_denied",
                    "message": "You do not have permission to deactivate this user.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    if not user.is_active:
        return Response(
            {"error": "bad_request", "message": "User is already inactive."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.is_active = False
    user.save()

    try:
        audit_log.record(
            "user.deactivated",
            user=request.user,
            organization=org_for_audit,
            metadata={
                "target_user_id": str(user.id),
                "target_user_email": user.email,
            },
            request=request,
        )
    except Exception:
        pass

    serializer = UserDetailSerializer(user)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAdmin])
def admin_user_reset_password(request, user_id):
    """Send password reset email to a user (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Prevent non-superusers from resetting superusers
    if user.is_superuser and not request.user.is_superuser:
        return Response(
            {
                "error": "permission_denied",
                "message": "You cannot reset password for a superadmin account.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    if not user.is_active:
        return Response(
            {
                "error": "bad_request",
                "message": "Cannot send password reset to inactive account.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user.email_verified:
        return Response(
            {
                "error": "bad_request",
                "message": "Cannot send password reset to unverified account.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Generate reset token and send email (same logic as user-initiated reset)
    token = default_token_generator.make_token(user)
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    reset_path = f"/accounts/reset-password/{uidb64}/{token}/"
    if request.build_absolute_uri:
        reset_url = request.build_absolute_uri(reset_path)
    else:
        reset_url = f"http://localhost:8000{reset_path}"

    context = {"user": user, "reset_url": reset_url}
    html_message = render_to_string("accounts/email/password_reset.html", context)
    plain_message = strip_tags(html_message)
    send_mail(
        subject="Reset your password",
        message=plain_message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        html_message=html_message,
    )

    try:
        audit_log.record(
            "user.password_reset_requested",
            user=request.user,
            metadata={
                "target_user_id": str(user.id),
                "target_user_email": user.email,
            },
            request=request,
        )
    except Exception:
        pass

    return Response({"message": f"Password reset email sent to {user.email}."})


@api_view(["PATCH"])
@permission_classes([IsAdmin])
def admin_change_role(request, user_id):
    """Change a user's role (admin only)."""
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {"error": "not_found", "message": "User not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Prevent self-role-change
    if user.id == request.user.id:
        return Response(
            {"error": "bad_request", "message": "You cannot change your own role."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Prevent non-superusers from modifying superusers
    if user.is_superuser and not request.user.is_superuser:
        return Response(
            {
                "error": "permission_denied",
                "message": "You cannot modify a superadmin account.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = ChangeRoleSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    new_role = serializer.validated_data["role"]
    old_role = (
        "superadmin"
        if user.is_superuser
        else ("admin" if getattr(user, "is_admin", False) or user.is_staff else "user")
    )

    # Permission check: admins can only assign 'user' role
    if not request.user.is_superuser and new_role in ["superadmin", "admin"]:
        return Response(
            {
                "error": "permission_denied",
                "message": "You do not have permission to assign this role.",
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    # Remove from all groups
    user.groups.clear()

    # Assign new role
    if new_role == "superadmin":
        user.is_superuser = True
        user.is_staff = True
    elif new_role == "admin":
        user.is_superuser = False
        from django.contrib.auth.models import Group

        admin_group = Group.objects.get(name="admin")
        user.groups.add(admin_group)
        user.is_staff = True
    else:  # user
        user.is_superuser = False
        user.is_staff = False
        from django.contrib.auth.models import Group

        user_group = Group.objects.get(name="user")
        user.groups.add(user_group)

    user.save()

    try:
        audit_log.record(
            "user.role_changed",
            user=request.user,
            metadata={
                "target_user_id": str(user.id),
                "target_user_email": user.email,
                "old_role": old_role,
                "new_role": new_role,
            },
            request=request,
        )
    except Exception:
        pass

    serializer = UserDetailSerializer(user)
    return Response(serializer.data)
