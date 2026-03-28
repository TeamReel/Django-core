"""Shared fixtures for content_generation tests."""

import factory
import pytest
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory
from organisations.models import Organisation
from projects.models import Project
from rest_framework.test import APIClient

from src.content_generation.models import (
    ApprovalStatus,
    ContentApproval,
    ContentItem,
    ContentStatus,
    ContentTemplate,
    TemplateType,
)

User = get_user_model()


# ── Factories ──────────────────────────────────────────────


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"cg-user{n}@test.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True
    email_verified = True

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        if not create:
            return
        self.set_password(extracted or "Test123!@#")


class OrganisationFactory(DjangoModelFactory):
    class Meta:
        model = Organisation

    name = factory.Sequence(lambda n: f"CG Org {n}")
    slug = factory.Sequence(lambda n: f"cg-org-{n}")
    creator = factory.SubFactory(UserFactory)


class ProjectFactory(DjangoModelFactory):
    class Meta:
        model = Project

    name = factory.Sequence(lambda n: f"CG Project {n}")
    slug = factory.Sequence(lambda n: f"cg-project-{n}")
    creator = factory.SubFactory(UserFactory)
    organisation = factory.SubFactory(OrganisationFactory)


class ContentTemplateFactory(DjangoModelFactory):
    class Meta:
        model = ContentTemplate

    name = factory.Sequence(lambda n: f"Template {n}")
    template_type = TemplateType.PRE_MATCH
    ai_workflow_id = factory.Sequence(lambda n: f"workflow-{n}")
    is_active = True
    organisation = factory.SubFactory(OrganisationFactory)
    created_by = factory.SubFactory(UserFactory)


class ContentItemFactory(DjangoModelFactory):
    class Meta:
        model = ContentItem

    template = factory.SubFactory(ContentTemplateFactory)
    project = factory.SubFactory(ProjectFactory)
    created_by = factory.SubFactory(UserFactory)
    status = ContentStatus.QUEUED
    input_data = factory.LazyFunction(dict)


class ContentApprovalFactory(DjangoModelFactory):
    class Meta:
        model = ContentApproval

    content_item = factory.SubFactory(ContentItemFactory)
    reviewer = factory.SubFactory(UserFactory)
    status = ApprovalStatus.PENDING


# ── Fixtures ───────────────────────────────────────────────


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def superuser(db):
    return UserFactory(is_superuser=True, is_staff=True)


@pytest.fixture
def organisation(db, user):
    return OrganisationFactory(creator=user)


@pytest.fixture
def project(db, organisation, user):
    return ProjectFactory(organisation=organisation, creator=user)


@pytest.fixture
def template(db, organisation, user):
    return ContentTemplateFactory(organisation=organisation, created_by=user)


@pytest.fixture
def content_item(db, template, project, user):
    return ContentItemFactory(template=template, project=project, created_by=user)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def superuser_client(api_client, superuser):
    api_client.force_authenticate(user=superuser)
    return api_client
