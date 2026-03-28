"""Tests for content_generation models — constraints, validation, state transitions."""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError

from src.content_generation.models import (
    ApprovalStatus,
    ContentApproval,
    ContentItem,
    ContentStatus,
    ContentTemplate,
    TemplateType,
)

from .conftest import (
    ContentApprovalFactory,
    ContentItemFactory,
    ContentTemplateFactory,
    OrganisationFactory,
    UserFactory,
)


@pytest.mark.django_db
class TestContentTemplate:
    """ContentTemplate model constraints and behavior."""

    def test_create_template(self, template):
        assert template.pk is not None
        assert template.is_active is True
        assert template.template_type == TemplateType.PRE_MATCH
        assert str(template) == f"{template.name} ({template.template_type})"

    def test_unique_name_per_org(self, organisation, user):
        ContentTemplateFactory(
            organisation=organisation, name="Lineup", created_by=user
        )
        with pytest.raises(IntegrityError):
            ContentTemplateFactory(
                organisation=organisation, name="Lineup", created_by=user
            )

    def test_same_name_different_orgs(self, user):
        org1 = OrganisationFactory()
        org2 = OrganisationFactory()
        t1 = ContentTemplateFactory(organisation=org1, name="Lineup", created_by=user)
        t2 = ContentTemplateFactory(organisation=org2, name="Lineup", created_by=user)
        assert t1.pk != t2.pk

    def test_global_template_null_org(self, user):
        t = ContentTemplateFactory(organisation=None, created_by=user)
        assert t.organisation is None
        assert t.pk is not None

    def test_credits_required_default(self, template):
        assert template.credits_required == 1

    def test_ordering_newest_first(self, organisation, user):
        t1 = ContentTemplateFactory(organisation=organisation, created_by=user)
        t2 = ContentTemplateFactory(organisation=organisation, created_by=user)
        qs = ContentTemplate.objects.filter(organisation=organisation)
        assert list(qs)[:2] == [t2, t1]


@pytest.mark.django_db
class TestContentItem:
    """ContentItem model constraints, validation, and soft-delete."""

    def test_create_item(self, content_item):
        assert content_item.pk is not None
        assert content_item.status == ContentStatus.QUEUED
        assert content_item.is_in_progress is True

    def test_status_queued_is_in_progress(self, content_item):
        content_item.status = ContentStatus.QUEUED
        assert content_item.is_in_progress is True

    def test_status_generating_is_in_progress(self, content_item):
        content_item.status = ContentStatus.GENERATING
        assert content_item.is_in_progress is True

    def test_status_completed_not_in_progress(self, content_item):
        content_item.status = ContentStatus.COMPLETED
        assert content_item.is_in_progress is False

    def test_clean_completed_requires_output_file(self, content_item):
        content_item.status = ContentStatus.COMPLETED
        content_item.output_file = None
        with pytest.raises(ValidationError, match="output_file"):
            content_item.clean()

    def test_clean_failed_requires_error_message(self, content_item):
        content_item.status = ContentStatus.FAILED
        content_item.error_message = ""
        with pytest.raises(ValidationError, match="error_message"):
            content_item.clean()

    def test_clean_failed_with_message_ok(self, content_item):
        content_item.status = ContentStatus.FAILED
        content_item.error_message = "Timeout"
        content_item.clean()  # should not raise

    def test_soft_delete(self, content_item):
        content_item.soft_delete()
        assert ContentItem.objects.filter(pk=content_item.pk).count() == 0
        assert ContentItem.all_objects.filter(pk=content_item.pk).count() == 1

    def test_for_project_manager(self, content_item, project):
        qs = ContentItem.objects.for_project(project.id)
        assert content_item in qs

    def test_get_organisation(self, content_item, organisation):
        assert content_item.get_organisation() == organisation

    def test_get_trash_metadata(self, content_item):
        meta = content_item.get_trash_metadata()
        assert "object_repr" in meta
        assert content_item.template.name in meta["object_repr"]


@pytest.mark.django_db
class TestContentApproval:
    """ContentApproval model constraints and validation."""

    def test_create_approval(self, content_item, user):
        approval = ContentApprovalFactory(
            content_item=content_item, reviewer=user, status=ApprovalStatus.APPROVED
        )
        assert approval.pk is not None
        assert approval.reviewed_at is not None
        assert str(approval).startswith("Approval for Content")

    def test_rejected_requires_feedback(self, content_item, user):
        approval = ContentApprovalFactory.build(
            content_item=content_item,
            reviewer=user,
            status=ApprovalStatus.REJECTED,
            feedback_text="",
        )
        with pytest.raises(ValidationError, match="feedback_text"):
            approval.clean()

    def test_revision_requested_requires_feedback(self, content_item, user):
        approval = ContentApprovalFactory.build(
            content_item=content_item,
            reviewer=user,
            status=ApprovalStatus.REVISION_REQUESTED,
            feedback_text=None,
        )
        with pytest.raises(ValidationError, match="feedback_text"):
            approval.clean()

    def test_approved_no_feedback_required(self, content_item, user):
        approval = ContentApprovalFactory.build(
            content_item=content_item,
            reviewer=user,
            status=ApprovalStatus.APPROVED,
            feedback_text="",
        )
        approval.clean()  # should not raise
