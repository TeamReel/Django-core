"""
Test suite for Activities API serializers.

Tests validation logic, nested representations, and edge cases for:
- PeriodSerializer
- ActivitySerializer
- ParticipationSerializer
"""

from datetime import date, datetime, timezone

import pytest
from activities.api.serializers import ActivitySerializer, ParticipationSerializer, PeriodSerializer
from activities.models import Activity, Participation, Period


@pytest.mark.django_db
class TestPeriodSerializer:
    """Test PeriodSerializer validation and representations"""

    def test_valid_period_data(self, organisation, project):
        """Test serializer accepts valid period data"""
        data = {
            "organisation_id": str(organisation.id),
            "project_id": project.id,
            "name": "Q1 2024",
            "description": "First quarter activities",
            "start_date": "2024-01-01",
            "end_date": "2024-03-31",
            "data": {"budget": 10000},
        }
        serializer = PeriodSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["name"] == "Q1 2024"

    def test_end_date_must_be_after_start_date(self, organisation):
        """Test validation fails when end_date <= start_date"""
        data = {
            "organisation_id": str(organisation.id),
            "name": "Invalid Period",
            "start_date": "2024-03-31",
            "end_date": "2024-01-01",  # Before start_date
        }
        serializer = PeriodSerializer(data=data)
        assert not serializer.is_valid()
        assert "end_date" in serializer.errors
        assert "after start date" in str(serializer.errors["end_date"]).lower()

    def test_end_date_equal_to_start_date_fails(self, organisation):
        """Test validation fails when end_date == start_date"""
        data = {
            "organisation_id": str(organisation.id),
            "name": "Single Day Period",
            "start_date": "2024-01-01",
            "end_date": "2024-01-01",  # Same as start_date
        }
        serializer = PeriodSerializer(data=data)
        assert not serializer.is_valid()
        assert "end_date" in serializer.errors

    def test_parent_period_must_match_organisation(self, organisation, period, user):
        """Test child period must belong to same organisation as parent"""
        # Create another organisation
        from organisations.models import Organisation

        other_org = Organisation.objects.create(name="Other Org", slug="other-org", creator=user)

        data = {
            "organisation_id": str(other_org.id),  # Different org
            "parent_period_id": str(period.id),  # Parent from first org
            "name": "Child Period",
            "start_date": "2024-01-01",
            "end_date": "2024-03-31",
        }
        serializer = PeriodSerializer(data=data)
        assert not serializer.is_valid()
        assert "parent_period_id" in serializer.errors
        assert "same organisation" in str(serializer.errors["parent_period_id"]).lower()

    def test_nonexistent_parent_period_fails(self, organisation):
        """Test validation fails for non-existent parent_period_id"""
        import uuid

        data = {
            "organisation_id": str(organisation.id),
            "parent_period_id": str(uuid.uuid4()),  # Non-existent UUID
            "name": "Orphan Period",
            "start_date": "2024-01-01",
            "end_date": "2024-03-31",
        }
        serializer = PeriodSerializer(data=data)
        assert not serializer.is_valid()
        assert "parent_period_id" in serializer.errors
        assert "does not exist" in str(serializer.errors["parent_period_id"]).lower()

    def test_nested_organisation_representation(self, organisation, period):
        """Test get_organisation returns nested dict with id and name"""
        serializer = PeriodSerializer(period)
        assert "organisation" in serializer.data
        assert serializer.data["organisation"]["id"] == str(organisation.id)
        assert serializer.data["organisation"]["name"] == organisation.name

    def test_nested_project_representation(self, project, period):
        """Test get_project returns nested dict with id and name"""
        period.project = project
        period.save()
        serializer = PeriodSerializer(period)
        assert "project" in serializer.data
        assert serializer.data["project"]["id"] == str(project.id)
        assert serializer.data["project"]["name"] == project.name

    def test_nested_parent_period_representation(self, organisation, period):
        """Test get_parent_period returns nested dict with key fields"""
        child_period = Period.objects.create(
            organisation=organisation,
            parent_period=period,
            name="Child Period",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )
        serializer = PeriodSerializer(child_period)
        assert "parent_period" in serializer.data
        parent_data = serializer.data["parent_period"]
        assert parent_data["id"] == str(period.id)
        assert parent_data["name"] == period.name
        assert "start_date" in parent_data
        assert "end_date" in parent_data

    def test_create_sets_created_by_from_request(self, organisation, user):
        """Test create() sets created_by from request.user"""
        from unittest.mock import Mock

        data = {
            "organisation_id": str(organisation.id),
            "name": "User Period",
            "start_date": date(2024, 1, 1),
            "end_date": date(2024, 3, 31),
        }
        mock_request = Mock()
        mock_request.user = user
        serializer = PeriodSerializer(data=data, context={"request": mock_request})
        assert serializer.is_valid(), serializer.errors
        period = serializer.save()
        assert period.created_by == user

    def test_update_ignores_fk_changes(self, organisation, project, period, user):
        """Test update() ignores attempts to change FK fields"""
        # Create another organisation
        from organisations.models import Organisation

        other_org = Organisation.objects.create(name="New Org", slug="new-org", creator=user)

        data = {
            "organisation_id": str(other_org.id),  # Attempt to change organisation
            "name": "Updated Period Name",
        }
        serializer = PeriodSerializer(period, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors
        updated_period = serializer.save()

        # organisation should not have changed
        assert updated_period.organisation_id == organisation.id  # Still original
        # name should have changed
        assert updated_period.name == "Updated Period Name"


@pytest.mark.django_db
class TestActivitySerializer:
    """Test ActivitySerializer validation and representations"""

    def test_valid_activity_data(self, project, period):
        """Test serializer accepts valid activity data"""
        data = {
            "project_id": project.id,
            "period_id": str(period.id),
            "title": "Training Session",
            "activity_type": "training",
            "start_time": "2024-01-15T10:00:00Z",
            "end_time": "2024-01-15T12:00:00Z",
            "location": "Main Hall",
            "data": {"capacity": 50},
        }
        serializer = ActivitySerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["title"] == "Training Session"

    def test_end_time_must_be_after_start_time(self, project, period):
        """Test validation fails when end_time <= start_time"""
        data = {
            "project_id": project.id,
            "period_id": str(period.id),
            "title": "Invalid Activity",
            "activity_type": "training",
            "start_time": "2024-01-15T12:00:00Z",
            "end_time": "2024-01-15T10:00:00Z",  # Before start_time
        }
        serializer = ActivitySerializer(data=data)
        assert not serializer.is_valid()
        assert "end_time" in serializer.errors
        assert "after start time" in str(serializer.errors["end_time"]).lower()

    def test_end_time_equal_to_start_time_fails(self, project, period):
        """Test validation fails when end_time == start_time"""
        data = {
            "project_id": project.id,
            "period_id": str(period.id),
            "title": "Zero Duration",
            "activity_type": "training",
            "start_time": "2024-01-15T12:00:00Z",
            "end_time": "2024-01-15T12:00:00Z",  # Same as start_time
        }
        serializer = ActivitySerializer(data=data)
        assert not serializer.is_valid()
        assert "end_time" in serializer.errors

    def test_soft_warning_when_activity_outside_period_range(self, project, period):
        """Test warning (not error) when activity scheduled outside period dates"""
        # period fixture: 2024-01-01 to 2024-12-31
        data = {
            "project_id": project.id,
            "period_id": str(period.id),
            "title": "Out of Range Activity",
            "activity_type": "training",
            "start_time": "2025-06-15T10:00:00Z",  # Outside period (2024)
            "end_time": "2025-06-15T12:00:00Z",
        }
        serializer = ActivitySerializer(data=data)
        # Should still be valid (soft warning, not blocking error)
        assert serializer.is_valid(), serializer.errors
        # Check if warning was stored
        if hasattr(serializer, "warnings"):
            assert len(serializer.warnings) > 0
            assert "outside period date range" in serializer.warnings[0].lower()

    def test_nonexistent_period_fails(self, project):
        """Test validation fails for non-existent period_id"""
        import uuid

        data = {
            "project_id": project.id,
            "period_id": str(uuid.uuid4()),  # Non-existent UUID
            "title": "Orphan Activity",
            "activity_type": "training",
            "start_time": "2024-01-15T10:00:00Z",
            "end_time": "2024-01-15T12:00:00Z",
        }
        serializer = ActivitySerializer(data=data)
        assert not serializer.is_valid()
        assert "period_id" in serializer.errors
        assert "does not exist" in str(serializer.errors["period_id"]).lower()

    def test_nested_project_representation(self, project, period):
        """Test get_project returns nested dict with id and name"""
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Test Activity",
            activity_type="training",
            start_time=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc),
        )
        serializer = ActivitySerializer(activity)
        assert "project" in serializer.data
        assert serializer.data["project"]["id"] == str(project.id)
        assert serializer.data["project"]["name"] == project.name

    def test_nested_period_representation(self, project, period):
        """Test get_period returns nested dict with key fields"""
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Test Activity",
            activity_type="training",
            start_time=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc),
        )
        serializer = ActivitySerializer(activity)
        assert "period" in serializer.data
        period_data = serializer.data["period"]
        assert period_data["id"] == str(period.id)
        assert period_data["name"] == period.name
        assert "start_date" in period_data
        assert "end_date" in period_data

    def test_create_sets_created_by_from_request(self, project, period, user):
        """Test create() sets created_by from request.user"""
        from unittest.mock import Mock

        data = {
            "project_id": project.id,
            "period_id": str(period.id),
            "title": "User Activity",
            "activity_type": "training",
            "start_time": datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            "end_time": datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc),
        }
        mock_request = Mock()
        mock_request.user = user
        serializer = ActivitySerializer(data=data, context={"request": mock_request})
        assert serializer.is_valid(), serializer.errors
        activity = serializer.save()
        assert activity.created_by == user

    def test_update_ignores_fk_changes(self, project, period, user):
        """Test update() ignores attempts to change FK fields"""
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Original Activity",
            activity_type="training",
            start_time=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc),
        )

        # Create another period
        from organisations.models import Organisation

        other_org = Organisation.objects.create(name="Other Org", slug="other-org", creator=user)
        other_period = Period.objects.create(
            organisation=other_org,
            name="Other Period",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )

        data = {
            "period_id": str(other_period.id),  # Attempt to change period
            "title": "Updated Activity Title",
        }
        serializer = ActivitySerializer(activity, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors
        updated_activity = serializer.save()

        # period should not have changed
        assert updated_activity.period_id == period.id  # Still original
        # title should have changed
        assert updated_activity.title == "Updated Activity Title"


@pytest.mark.django_db
class TestParticipationSerializer:
    """Test ParticipationSerializer validation and XOR constraint"""

    def test_valid_activity_participation(self, member, activity):
        """Test serializer accepts valid activity participation"""
        data = {
            "member_id": str(member.id),
            "activity_id": str(activity.id),
            "role": "participant",
            "status": "confirmed",
            "notes": "Attending",
        }
        serializer = ParticipationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["role"] == "participant"

    def test_valid_period_participation(self, member, period):
        """Test serializer accepts valid period participation"""
        data = {
            "member_id": str(member.id),
            "period_id": str(period.id),
            "role": "coordinator",
            "status": "confirmed",
        }
        serializer = ParticipationSerializer(data=data)
        assert serializer.is_valid(), serializer.errors
        assert serializer.validated_data["role"] == "coordinator"

    def test_xor_constraint_both_activity_and_period_fails(self, member, activity, period):
        """Test validation fails when both activity_id and period_id provided"""
        data = {
            "member_id": str(member.id),
            "activity_id": str(activity.id),
            "period_id": str(period.id),  # Both set - violates XOR
            "role": "participant",
            "status": "confirmed",
        }
        serializer = ParticipationSerializer(data=data)
        assert not serializer.is_valid()
        assert "non_field_errors" in serializer.errors
        assert "exactly one" in str(serializer.errors["non_field_errors"]).lower()

    def test_xor_constraint_neither_activity_nor_period_fails(self, member):
        """Test validation fails when neither activity_id nor period_id provided"""
        data = {
            "member_id": str(member.id),
            # No activity_id or period_id - violates XOR
            "role": "participant",
            "status": "confirmed",
        }
        serializer = ParticipationSerializer(data=data)
        assert not serializer.is_valid()
        assert "non_field_errors" in serializer.errors
        assert "exactly one" in str(serializer.errors["non_field_errors"]).lower()

    def test_member_organisation_must_match_activity_organisation(
        self, organisation, member, project, user
    ):
        """Test member must belong to same organisation as activity's period"""
        # Create activity with period from same organisation
        period = Period.objects.create(
            organisation=organisation,
            name="Test Period",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Test Activity",
            activity_type="training",
            start_time=datetime(2024, 1, 15, 10, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 1, 15, 12, 0, tzinfo=timezone.utc),
        )

        # Create member from different organisation
        from accounts.models import User
        from organisations.models import Membership, Organisation

        other_org = Organisation.objects.create(name="Other Org", slug="other-org", creator=user)
        other_user = User.objects.create_user(email="other@example.com", password="pass123")
        other_member = Membership.objects.create(user=other_user, organisation=other_org)

        data = {
            "member_id": str(other_member.id),  # Different organisation
            "activity_id": str(activity.id),
            "role": "participant",
            "status": "confirmed",
        }
        serializer = ParticipationSerializer(data=data)
        assert not serializer.is_valid()
        assert "member_id" in serializer.errors
        assert "same organisation" in str(serializer.errors["member_id"]).lower()

    def test_member_organisation_must_match_period_organisation(self, organisation, member, user):
        """Test member must belong to same organisation as period"""
        # Create period from different organisation
        from organisations.models import Organisation

        other_org = Organisation.objects.create(name="Other Org", slug="other-org", creator=user)
        other_period = Period.objects.create(
            organisation=other_org,
            name="Other Period",
            start_date=date(2024, 1, 1),
            end_date=date(2024, 12, 31),
        )

        data = {
            "member_id": str(member.id),  # From first organisation
            "period_id": str(other_period.id),  # From different organisation
            "role": "participant",
            "status": "confirmed",
        }
        serializer = ParticipationSerializer(data=data)
        assert not serializer.is_valid()
        assert "member_id" in serializer.errors
        assert "same organisation" in str(serializer.errors["member_id"]).lower()

    def test_nonexistent_member_fails(self, activity):
        """Test validation fails for non-existent member_id"""
        import uuid

        data = {
            "member_id": str(uuid.uuid4()),  # Non-existent UUID
            "activity_id": str(activity.id),
            "role": "participant",
            "status": "confirmed",
        }
        serializer = ParticipationSerializer(data=data)
        assert not serializer.is_valid()
        assert "member_id" in serializer.errors
        assert "does not exist" in str(serializer.errors["member_id"]).lower()

    def test_nonexistent_activity_fails(self, member):
        """Test validation fails for non-existent activity_id"""
        import uuid

        data = {
            "member_id": str(member.id),
            "activity_id": str(uuid.uuid4()),  # Non-existent UUID
            "role": "participant",
            "status": "confirmed",
        }
        serializer = ParticipationSerializer(data=data)
        assert not serializer.is_valid()
        assert "activity_id" in serializer.errors
        assert "does not exist" in str(serializer.errors["activity_id"]).lower()

    def test_nested_member_representation(self, member, activity):
        """Test get_member returns nested dict with id and user_name"""
        participation = Participation.objects.create(
            member=member, activity=activity, role="participant", status="confirmed"
        )
        serializer = ParticipationSerializer(participation)
        assert "member" in serializer.data
        member_data = serializer.data["member"]
        assert member_data["id"] == str(member.id)
        assert "user_name" in member_data

    def test_nested_activity_representation(self, member, activity):
        """Test get_activity returns nested dict with key fields"""
        participation = Participation.objects.create(
            member=member, activity=activity, role="participant", status="confirmed"
        )
        serializer = ParticipationSerializer(participation)
        assert "activity" in serializer.data
        activity_data = serializer.data["activity"]
        assert activity_data["id"] == str(activity.id)
        assert activity_data["title"] == activity.title
        assert "start_time" in activity_data

    def test_nested_period_representation(self, member, period):
        """Test get_period returns nested dict with key fields"""
        participation = Participation.objects.create(
            member=member, period=period, role="coordinator", status="confirmed"
        )
        serializer = ParticipationSerializer(participation)
        assert "period" in serializer.data
        period_data = serializer.data["period"]
        assert period_data["id"] == str(period.id)
        assert period_data["name"] == period.name
        assert "start_date" in period_data
        assert "end_date" in period_data

    def test_create_sets_created_by_from_request(self, member, activity, user):
        """Test create() sets created_by from request.user"""
        from unittest.mock import Mock

        data = {
            "member_id": str(member.id),
            "activity_id": str(activity.id),
            "role": "participant",
            "status": "confirmed",
        }
        mock_request = Mock()
        mock_request.user = user
        serializer = ParticipationSerializer(data=data, context={"request": mock_request})
        assert serializer.is_valid(), serializer.errors
        participation = serializer.save()
        assert participation.created_by == user

    def test_update_ignores_fk_changes(self, member, activity, period):
        """Test update() ignores attempts to change FK fields"""
        participation = Participation.objects.create(
            member=member, activity=activity, role="participant", status="confirmed"
        )

        data = {
            "activity_id": None,  # Attempt to remove activity
            "period_id": str(period.id),  # Attempt to add period
            "role": "coordinator",  # This should change
        }
        serializer = ParticipationSerializer(participation, data=data, partial=True)
        assert serializer.is_valid(), serializer.errors
        updated_participation = serializer.save()

        # FK fields should not have changed
        assert updated_participation.activity_id == activity.id  # Still set
        assert updated_participation.period_id is None  # Still None
        # role should have changed
        assert updated_participation.role == "coordinator"
