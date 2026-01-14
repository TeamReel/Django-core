"""
B30 Activities & Period Hierarchy Models

Provides generic time-based resource planning with:
- Period: Unlimited-depth hierarchy for time-bound cycles
- Activity: Scheduled events within projects and periods
- Participation: Links members to periods (squads) or activities (lineups)
"""

import uuid
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from .managers import PeriodQuerySet

User = get_user_model()


class Period(models.Model):
    """
    Time-bound cycle for organizing activities and resources.
    Supports unlimited-depth hierarchies via self-referential parent_period.

    Examples:
        - Organisation → Season → Month → Week
        - Fiscal Year → Quarter → Month
        - Academic Year → Semester → Period
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organisation = models.ForeignKey(
        "organisations.Organisation", on_delete=models.CASCADE, related_name="periods"
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="periods",
        null=True,
        blank=True,
        help_text="Optional project scope. If null, period is organisation-wide.",
    )
    parent_period = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,  # Prevent deletion if children exist
        related_name="children",
        null=True,
        blank=True,
        help_text="Parent in hierarchy. NULL = root period.",
    )
    name = models.CharField(max_length=200, help_text='Display name (e.g., "Seizoen 2023/2024")')
    description = models.TextField(blank=True, default="")
    start_date = models.DateField(help_text="Period start (date only, no timezone)")
    end_date = models.DateField(help_text="Period end (date only, no timezone)")
    metadata = models.JSONField(
        default=dict, blank=True, help_text="Flexible storage for domain-specific attributes"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_periods"
    )

    objects = PeriodQuerySet.as_manager()  # Custom manager with CTE methods

    class Meta:
        db_table = "activities_period"
        ordering = ["start_date", "name"]
        indexes = [
            models.Index(fields=["organisation", "project"]),
            models.Index(fields=["parent_period"]),
            models.Index(fields=["start_date", "end_date"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_date__gt=models.F("start_date")), name="period_end_after_start"
            ),
            models.UniqueConstraint(
                fields=["organisation", "project", "name", "start_date"],
                name="unique_period_per_org_project",
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.start_date} - {self.end_date})"

    def clean(self):
        """Application-level validation"""
        if self.end_date and self.start_date and self.end_date <= self.start_date:
            raise ValidationError("end_date must be after start_date")

        # Child organisation must match parent organisation
        if self.parent_period and self.organisation_id != self.parent_period.organisation_id:
            raise ValidationError("Child period must belong to same organisation as parent")

    def is_root(self) -> bool:
        """Check if period is root (no parent)"""
        return self.parent_period_id is None

    def get_depth(self) -> int:
        """Return depth in hierarchy (root = 0)"""
        depth = 0
        current = self
        while current.parent_period:
            depth += 1
            current = current.parent_period
        return depth


class Activity(models.Model):
    """
    Scheduled event within a project and period.
    Supports flexible activity_type and JSON outcome data storage.

    Examples:
        - Sports: match, training, team meeting
        - Business: sprint planning, review, retrospective
        - Education: lecture, lab session, exam
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Human-friendly identifier for URLs. Nullable for safe rollout + backfill.
    slug = models.SlugField(max_length=240, unique=True, null=True, blank=True, db_index=True)
    project = models.ForeignKey(
        "projects.Project", on_delete=models.CASCADE, related_name="activities"
    )
    period = models.ForeignKey(Period, on_delete=models.CASCADE, related_name="activities")

    # TeamReel: opponent reference for matches
    opponent_project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="opponent_activities",
        help_text="Opponent team/project (for match activities)",
    )

    title = models.CharField(max_length=200, help_text='Activity title (e.g., "Ajax vs Feyenoord")')
    activity_type = models.CharField(
        max_length=50, help_text="Flexible type field (match, meeting, training, lecture, etc.)"
    )
    start_time = models.DateTimeField(help_text="Activity start (timezone-aware)")
    end_time = models.DateTimeField(help_text="Activity end (timezone-aware)")
    location = models.CharField(max_length=200, blank=True, default="")
    description = models.TextField(blank=True, default="")
    metadata = models.JSONField(
        default=dict, blank=True, help_text="Flexible storage (opponent, score, is_home, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="created_activities"
    )

    class Meta:
        db_table = "activities_activity"
        ordering = ["start_time"]
        verbose_name_plural = "Activities"
        indexes = [
            models.Index(fields=["project", "period", "start_time"]),
            models.Index(fields=["activity_type"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_time__gt=models.F("start_time")), name="activity_end_after_start"
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_time.date()})"

    def _generate_unique_slug(self, base_slug: str | None = None) -> str:
        base = (base_slug or slugify(self.title or "") or "activity").strip("-")

        # Add date to reduce collisions and improve readability.
        if self.start_time:
            base = f"{base}-{self.start_time.date().isoformat()}"

        # Keep room for suffix.
        base = base[:230].strip("-")
        candidate = base
        counter = 2
        while Activity.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
            suffix = f"-{counter}"
            candidate = f"{base[: (240 - len(suffix))].strip('-')}{suffix}"
            counter += 1
        return candidate

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = self._generate_unique_slug()
        super().save(*args, **kwargs)

    def clean(self):
        """Application-level validation"""
        if self.end_time and self.start_time and self.end_time <= self.start_time:
            raise ValidationError("end_time must be after start_time")

        # Period must belong to same organisation as project
        if (
            self.period
            and self.project
            and self.period.organisation_id != self.project.organisation_id
        ):
            raise ValidationError("Period must belong to same organisation as activity project")


class Participation(models.Model):
    """
    Links members to periods or activities with roles.
    Enforces exclusive OR: exactly one of (activity_id, period_id) must be set.

    Period participation examples: squad member, team captain, coordinator
    Activity participation examples: starter, substitute, attendee, organizer
    """

    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("tentative", "Tentative"),
        ("declined", "Declined"),
        ("no_response", "No Response"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name="participations",
        null=True,
        blank=True,
        help_text="Activity participation (mutually exclusive with period)",
    )
    period = models.ForeignKey(
        Period,
        on_delete=models.CASCADE,
        related_name="participations",
        null=True,
        blank=True,
        help_text="Period participation (mutually exclusive with activity)",
    )
    member = models.ForeignKey(
        "organisations.Membership",
        on_delete=models.CASCADE,
        related_name="participations",
        help_text="Organisation membership (not User)",
    )
    role = models.CharField(
        max_length=50,
        help_text="Flexible role field (squad_member, captain, starter, substitute, attendee, etc.)",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="confirmed")
    notes = models.TextField(blank=True, default="")
    data = models.JSONField(
        default=dict, blank=True, help_text="Role-specific metadata (jersey_number, position, etc.)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_participations",
    )

    class Meta:
        db_table = "activities_participation"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["member", "period"]),
            models.Index(fields=["member", "activity"]),
            models.Index(fields=["role", "status"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(activity__isnull=False, period__isnull=True)
                    | models.Q(activity__isnull=True, period__isnull=False)
                ),
                name="participation_activity_xor_period",
            ),
        ]
        unique_together = [
            ("member", "activity"),  # Prevent duplicate activity participation
            ("member", "period"),  # Prevent duplicate period participation
        ]

    def __str__(self):
        if self.activity:
            return f"{self.member} - {self.activity.title} ({self.role})"
        elif self.period:
            return f"{self.member} - {self.period.name} ({self.role})"
        return f"{self.member} - Unknown"

    def clean(self):
        """Application-level validation"""
        # Enforce XOR at application layer (backup for database constraint)
        if (self.activity and self.period) or (not self.activity and not self.period):
            raise ValidationError("Participation must link to exactly one of (activity, period)")

        # Member organisation must match activity/period organisation
        if self.activity and self.member.organisation_id != self.activity.project.organisation_id:
            raise ValidationError("Member must belong to same organisation as activity")
        if self.period and self.member.organisation_id != self.period.organisation_id:
            raise ValidationError("Member must belong to same organisation as period")

    def is_activity_participation(self) -> bool:
        return self.activity_id is not None

    def is_period_participation(self) -> bool:
        return self.period_id is not None


class ActivityEvent(models.Model):
    """Generic event attached to an Activity.

    This is intentionally product-agnostic (B30): an event has a type and optional
    members/projects + flexible JSON data.

    TeamReel examples:
    - goal (member=scorer, related_member=assist)
    - injury (member=injured)
    - substitution (member=player_out, related_member=player_in)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    activity = models.ForeignKey(
        Activity,
        on_delete=models.CASCADE,
        related_name="events",
    )
    event_type = models.CharField(
        max_length=64,
        help_text="Event type (goal, assist, card_yellow, injury, substitution, etc.)",
    )
    minute = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="Match minute (TeamReel). Leave empty for non-timed events.",
    )
    occurred_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Absolute timestamp for the event (optional).",
    )
    member = models.ForeignKey(
        "organisations.Membership",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_events",
        help_text="Primary actor (scorer, injured player, etc).",
    )
    related_member = models.ForeignKey(
        "organisations.Membership",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="related_activity_events",
        help_text="Secondary actor (assist, player_in, etc).",
    )
    team_project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_events",
        help_text="Optional project/team context for the event.",
    )
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Event-specific metadata",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_activity_events",
    )

    class Meta:
        db_table = "activities_activityevent"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["activity", "event_type"], name="activities__activit_55ce00_idx"),
            models.Index(fields=["event_type"], name="activities__event_t_ea0bb9_idx"),
            models.Index(fields=["activity", "minute"], name="activities__activit_878eca_idx"),
        ]

    def __str__(self) -> str:
        suffix = f" @ {self.minute}'" if self.minute is not None else ""
        return f"{self.activity_id} {self.event_type}{suffix}"

    def clean(self):
        super().clean()

        if self.minute is not None and self.minute > 300:
            raise ValidationError("minute seems invalid")

        activity_org_id = getattr(getattr(self.activity, "project", None), "organisation_id", None)
        if activity_org_id:
            if self.member and self.member.organisation_id != activity_org_id:
                raise ValidationError("Member must belong to same organisation as activity")
            if self.related_member and self.related_member.organisation_id != activity_org_id:
                raise ValidationError("Related member must belong to same organisation as activity")
            if self.team_project and self.team_project.organisation_id != activity_org_id:
                raise ValidationError("team_project must belong to same organisation as activity")
