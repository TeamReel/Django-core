"""Test fixtures for B34 Generative Pipelines tests."""

import pytest
from decimal import Decimal

from accounts.models import User
from organisations.models import Organisation
from projects.models import Project
from src.generative.models import (
    GenerationTemplate,
    GenerationRequest,
    GenerationOutput,
    ProviderChoices,
    OutputType,
)


@pytest.fixture
def organisation(db) -> Organisation:
    """Create a test organisation."""
    user = User.objects.create_user(
        email="creator@example.com",
        password="testpass123",
    )
    return Organisation.objects.create(
        name="Test Organisation",
        slug="test-org",
        creator=user,
    )


@pytest.fixture
def user(db, organisation) -> User:
    """Create a test user with organisation membership."""
    from organisations.models import Membership

    user = User.objects.create_user(
        email="testuser@example.com",
        password="testpass123",
    )

    # Create membership
    Membership.objects.create(
        organisation=organisation,
        user=user,
        role="member",
        is_active=True,
    )

    return user


@pytest.fixture
def project(db, organisation, user) -> Project:
    """Create a test project."""
    return Project.objects.create(
        organisation=organisation,
        name="Test Project",
        slug="test-project",
        creator=user,
    )


@pytest.fixture
def valid_input_schema() -> dict:
    """Return a valid JSON Schema for testing."""
    return {
        "type": "object",
        "properties": {
            "text": {"type": "string"},
            "count": {"type": "integer", "minimum": 1},
        },
        "required": ["text"],
    }


@pytest.fixture
def valid_openai_config() -> dict:
    """Return a valid OpenAI pipeline config."""
    return {
        "provider": ProviderChoices.OPENAI,
        "model": "gpt-4",
        "prompt_template": "Generate content based on: {text}",
        "estimated_cost": 50.0,
    }


@pytest.fixture
def valid_langgraph_config() -> dict:
    """Return a valid LangGraph pipeline config."""
    return {
        "provider": ProviderChoices.LANGGRAPH,
        "graph_id": "simple_completion",
        "llm_provider": "openai",
        "llm_model": "gpt-4",
        "estimated_cost": 100.0,
    }


@pytest.fixture
def template(db, organisation, user, valid_input_schema, valid_openai_config) -> GenerationTemplate:
    """Create a test generation template."""
    return GenerationTemplate.objects.create(
        organisation=organisation,
        name="Test Template",
        slug="test-template",
        version="1.0.0",
        description="A test template for unit tests",
        input_schema=valid_input_schema,
        pipeline_config=valid_openai_config,
        retention_days=30,
        created_by=user,
    )


@pytest.fixture
def langgraph_template(
    db, organisation, user, valid_input_schema, valid_langgraph_config
) -> GenerationTemplate:
    """Create a test LangGraph generation template."""
    return GenerationTemplate.objects.create(
        organisation=organisation,
        name="LangGraph Template",
        slug="langgraph-template",
        version="1.0.0",
        input_schema=valid_input_schema,
        pipeline_config=valid_langgraph_config,
        created_by=user,
    )


@pytest.fixture
def generation_request(db, template, user) -> GenerationRequest:
    """Create a test generation request."""
    return GenerationRequest.objects.create(
        template=template,
        requester=user,
        input_data={"text": "Hello world"},
        estimated_cost=Decimal("50.0000"),
    )


@pytest.fixture
def generation_request_with_project(db, template, user, project) -> GenerationRequest:
    """Create a test generation request with project context."""
    return GenerationRequest.objects.create(
        template=template,
        requester=user,
        project=project,
        input_data={"text": "Hello world"},
        estimated_cost=Decimal("50.0000"),
    )


@pytest.fixture
def completed_request(db, template, user) -> GenerationRequest:
    """Create a completed generation request."""
    request = GenerationRequest.objects.create(
        template=template,
        requester=user,
        input_data={"text": "Hello world"},
        estimated_cost=Decimal("50.0000"),
    )
    request.start_processing()
    request.mark_completed(actual_cost=Decimal("45.5000"))
    return request


@pytest.fixture
def generation_output(db, completed_request) -> GenerationOutput:
    """Create a test generation output."""
    return GenerationOutput.objects.create(
        request=completed_request,
        output_type=OutputType.TEXT,
        text_content="Generated content for the test.",
        metadata={"word_count": 5, "language": "en"},
    )


# API Testing Fixtures


@pytest.fixture
def api_client():
    """Return an unauthenticated DRF API client."""
    from rest_framework.test import APIClient

    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user):
    """Return an authenticated API client for the test user."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def admin_user(db, organisation) -> User:
    """Create an admin user."""
    from organisations.models import Membership

    admin = User.objects.create_user(
        email="admin@example.com",
        password="testpass123",
    )
    Membership.objects.create(organisation=organisation, user=admin, role="admin", is_active=True)
    return admin


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an authenticated API client for admin user."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def other_user(db, organisation) -> User:
    """Create another test user for permission testing."""
    return User.objects.create_user(
        email="other@example.com",
        password="testpass123",
    )
