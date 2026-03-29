"""
Test cases for Period, Activity, and Participation models.
Target coverage: ≥90% for models.py
"""

from datetime import date, datetime, timezone

import pytest
from activities.models import Activity, Participation, Period
from django.db import IntegrityError


@pytest.mark.django_db
class TestPeriodModel:
    """Test Period model constraints, validation, and behavior."""

    def test_create_root_period(self, organisation):
        """Root period can be created without parent."""
        period = Period.objects.create(
            name="Season 2023/2024",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        assert period.parent_period is None
        assert period.name == "Season 2023/2024"

    def test_create_child_period(self, organisation):
        """Child period requires valid parent."""
        parent = Period.objects.create(
            name="Season 2023/2024",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        child = Period.objects.create(
            name="Fall 2023",
            start_date=date(2023, 9, 1),
            end_date=date(2023, 12, 31),
            parent_period=parent,
            organisation=organisation,
        )
        assert child.parent_period == parent

    def test_end_date_before_start_date_raises_error(self, organisation):
        """CHECK constraint enforces end_date > start_date."""
        with pytest.raises(IntegrityError):
            Period.objects.create(
                name="Invalid Period",
                start_date=date(2024, 6, 30),
                end_date=date(2023, 9, 1),
                organisation=organisation,
            )

    def test_str_representation(self, organisation):
        """String representation shows name and date range."""
        period = Period.objects.create(
            name="Season 2023/2024",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        result = str(period)
        assert "Season 2023/2024" in result
        assert "2023-09-01" in result
        assert "2024-06-30" in result

    def test_children_count(self, organisation):
        """Period tracks number of direct children."""
        parent = Period.objects.create(
            name="Season",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        for i in range(3):
            Period.objects.create(
                name=f"Month {i}",
                start_date=date(2023, 9 + i, 1),
                end_date=date(2023, 9 + i, 28),
                parent_period=parent,
                organisation=organisation,
            )
        assert parent.children.count() == 3


@pytest.mark.django_db
class TestActivityModel:
    """Test Activity model constraints, validation, and behavior."""

    def test_create_activity_with_period(self, organisation, project):
        """Activity can be created with period and project."""
        period = Period.objects.create(
            name="December 2023",
            start_date=date(2023, 12, 1),
            end_date=date(2023, 12, 31),
            organisation=organisation,
        )
        activity = Activity.objects.create(
            title="Match vs Feyenoord",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
            activity_type="match",
            location="Stadium",
        )
        assert activity.period == period
        assert activity.project == project
        assert activity.activity_type == "match"

    def test_end_time_before_start_time_raises_error(self, project, period):
        """CHECK constraint enforces end_time > start_time."""
        with pytest.raises(IntegrityError):
            Activity.objects.create(
                title="Invalid Activity",
                start_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
                end_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
                project=project,
                period=period,
            )

    def test_outcome_data_jsonfield(self, project, period):
        """data JSONField stores structured outcome data."""
        activity = Activity.objects.create(
            title="Test Match",
            activity_type="match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
            metadata={
                "score_home": 3,
                "score_away": 1,
                "goals": [{"player": "John", "minute": 23}],
            },
        )
        assert activity.metadata["score_home"] == 3
        assert activity.metadata["goals"][0]["player"] == "John"

    def test_str_representation(self, project, period):
        """String representation shows title and datetime."""
        activity = Activity.objects.create(
            title="Match vs Feyenoord",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        result = str(activity)
        assert "Match vs Feyenoord" in result
        assert "2023-12-15" in result


@pytest.mark.django_db
class TestParticipationModel:
    """Test Participation model constraints, validation, and XOR behavior."""

    def test_create_period_participation(self, member, organisation):
        """Participation can link member to period."""
        period = Period.objects.create(
            name="Season",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        participation = Participation.objects.create(
            member=member,
            period=period,
            role="squad_member",
            status="confirmed",
            data={"jersey_number": 10, "position": "striker"},
        )
        assert participation.period == period
        assert participation.activity is None
        assert participation.data["jersey_number"] == 10

    def test_create_activity_participation(self, member, project, period):
        """Participation can link member to activity."""
        activity = Activity.objects.create(
            title="Match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        participation = Participation.objects.create(
            member=member, activity=activity, role="starter", status="confirmed"
        )
        assert participation.activity == activity
        assert participation.period is None

    def test_both_period_and_activity_raises_error(self, member, project, organisation):
        """CHECK constraint enforces XOR: activity_id XOR period_id."""
        period = Period.objects.create(
            name="Season",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        activity = Activity.objects.create(
            title="Match",
            start_time=datetime(2023, 12, 15, 14, 30, tzinfo=timezone.utc),
            end_time=datetime(2023, 12, 15, 16, 30, tzinfo=timezone.utc),
            project=project,
            period=period,
        )
        with pytest.raises(IntegrityError):
            Participation.objects.create(
                member=member, period=period, activity=activity, role="invalid"
            )

    def test_neither_period_nor_activity_raises_error(self, member):
        """CHECK constraint enforces XOR: at least one must be set."""
        with pytest.raises(IntegrityError):
            Participation.objects.create(member=member, role="invalid")

    def test_str_representation(self, member, organisation):
        """String representation shows member, role, and target."""
        period = Period.objects.create(
            name="Season",
            start_date=date(2023, 9, 1),
            end_date=date(2024, 6, 30),
            organisation=organisation,
        )
        participation = Participation.objects.create(
            member=member, period=period, role="squad_member"
        )
        result = str(participation)
        assert "squad_member" in result
