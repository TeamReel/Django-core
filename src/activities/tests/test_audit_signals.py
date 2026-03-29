import pytest
from activities.models import Activity, Participation, Period
from audit.models import AuditEvent
from django.utils import timezone
from organisations.models import Membership, Organisation
from projects.models import Project


@pytest.mark.django_db
def test_participation_audit_emission(user):
    # Setup context
    org = Organisation.objects.create(name="Test Org", slug="test-org", creator=user)
    membership = Membership.objects.create(
        user=user, organisation=org, role="admin", is_active=True
    )
    project = Project.objects.create(name="Test Project", organisation=org, creator=user)
    period = Period.objects.create(
        organisation=org,
        project=project,
        name="Season 2024",
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timezone.timedelta(days=30),
        created_by=user,
    )

    activity = Activity.objects.create(
        title="Test Match",
        activity_type="match",
        start_time=timezone.now(),
        end_time=timezone.now() + timezone.timedelta(hours=2),
        project=project,
        period=period,
        created_by=user,
    )

    # Test Create Participation
    participation = Participation.objects.create(
        activity=activity, member=membership, role="starter", status="confirmed", created_by=user
    )

    # Verify Create Event
    create_event = AuditEvent.objects.filter(
        event_type="participation.created", metadata__target_id=str(participation.id)
    ).first()

    assert create_event is not None
    assert create_event.user == user
    assert create_event.project == project
    assert create_event.organization == org
    assert create_event.metadata["target_model"] == "Participation"
    assert create_event.metadata["changes"]["role"] == "starter"

    # Test Update Participation
    participation.role = "substitute"
    participation.save()

    # Verify Update Event
    update_event = (
        AuditEvent.objects.filter(
            event_type="participation.updated", metadata__target_id=str(participation.id)
        )
        .order_by("-created_at")
        .first()
    )

    assert update_event is not None
    assert update_event.metadata["changes"]["role"]["old"] == "starter"
    assert update_event.metadata["changes"]["role"]["new"] == "substitute"

    # Test Delete Participation
    participation_id = participation.id
    participation._deleted_by = user  # Simulate view behavior
    participation.delete()

    # Verify Delete Event
    final_event = AuditEvent.objects.filter(
        event_type="participation.deleted", metadata__target_id=str(participation_id)
    ).first()

    assert final_event is not None
    assert final_event.metadata["changes"]["role"] == "substitute"
