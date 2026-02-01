"""Tests for B34 Generative Pipelines models.

Tests cover:
- GenerationTemplate: Creation, validation, versioning, JSON Schema validation
- GenerationRequest: Creation, status transitions, retry logic, input validation
- GenerationOutput: Creation, content validation, expiration calculation

Target coverage: >90% for models.py
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from src.generative.models import (
    GenerationTemplate,
    GenerationRequest,
    GenerationOutput,
    ProviderChoices,
    RequestStatus,
    ErrorCategory,
    OutputType,
)


# ==============================================================================
# GenerationTemplate Tests
# ==============================================================================


@pytest.mark.django_db
class TestGenerationTemplate:
    """Tests for GenerationTemplate model."""

    def test_create_template(self, organisation, user, valid_input_schema, valid_openai_config):
        """Test basic template creation with valid data."""
        template = GenerationTemplate.objects.create(
            organisation=organisation,
            name="Test Template",
            slug="test-template",
            version="1.0.0",
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )
        assert template.id is not None
        assert template.is_latest is True
        assert template.is_active is True
        assert template.name == "Test Template"
        assert template.version == "1.0.0"

    def test_template_str_representation(self, template):
        """Test template string representation."""
        assert str(template) == "Test Template v1.0.0"

    def test_template_provider_property(self, template, langgraph_template):
        """Test provider property extracts from pipeline_config."""
        assert template.provider == ProviderChoices.OPENAI
        assert langgraph_template.provider == ProviderChoices.LANGGRAPH

    def test_template_estimated_cost_property(self, template):
        """Test estimated_cost property extracts from pipeline_config."""
        assert template.estimated_cost == Decimal("50")

    def test_estimated_cost_default(self, organisation, user, valid_input_schema):
        """Test estimated_cost returns 0 when not in pipeline_config."""
        template = GenerationTemplate.objects.create(
            organisation=organisation,
            name="No Cost",
            slug="no-cost",
            input_schema=valid_input_schema,
            pipeline_config={"provider": "openai", "model": "gpt-4"},
            created_by=user,
        )
        assert template.estimated_cost == Decimal("0")

    def test_invalid_json_schema(self, organisation, user):
        """Test JSON Schema validation fails on invalid schema."""
        template = GenerationTemplate(
            organisation=organisation,
            name="Invalid Schema",
            slug="invalid-schema",
            input_schema={"type": "invalid_type"},  # Invalid JSON Schema
            pipeline_config={"provider": "openai", "model": "gpt-4"},
            created_by=user,
        )
        with pytest.raises(ValidationError) as exc_info:
            template.full_clean()
        assert "Invalid JSON Schema" in str(exc_info.value)

    def test_invalid_version_format(self, organisation, user, valid_input_schema):
        """Test version format validation."""
        template = GenerationTemplate(
            organisation=organisation,
            name="Invalid Version",
            slug="invalid-version",
            version="v1.0",  # Invalid: should be 1.0.0
            input_schema=valid_input_schema,
            pipeline_config={"provider": "openai", "model": "gpt-4"},
            created_by=user,
        )
        with pytest.raises(ValidationError) as exc_info:
            template.full_clean()
        assert "Invalid version format" in str(exc_info.value)

    def test_openai_requires_model(self, organisation, user, valid_input_schema):
        """Test OpenAI provider requires 'model' in pipeline_config."""
        template = GenerationTemplate(
            organisation=organisation,
            name="OpenAI No Model",
            slug="openai-no-model",
            input_schema=valid_input_schema,
            pipeline_config={"provider": "openai"},  # Missing 'model'
            created_by=user,
        )
        with pytest.raises(ValidationError) as exc_info:
            template.full_clean()
        assert "requires 'model'" in str(exc_info.value)

    def test_langgraph_requires_graph_id(self, organisation, user, valid_input_schema):
        """Test LangGraph provider requires 'graph_id' in pipeline_config."""
        template = GenerationTemplate(
            organisation=organisation,
            name="LangGraph No Graph",
            slug="langgraph-no-graph",
            input_schema=valid_input_schema,
            pipeline_config={"provider": "langgraph"},  # Missing 'graph_id'
            created_by=user,
        )
        with pytest.raises(ValidationError) as exc_info:
            template.full_clean()
        assert "requires 'graph_id'" in str(exc_info.value)

    def test_invalid_provider(self, organisation, user, valid_input_schema):
        """Test invalid provider name is rejected."""
        template = GenerationTemplate(
            organisation=organisation,
            name="Invalid Provider",
            slug="invalid-provider",
            input_schema=valid_input_schema,
            pipeline_config={"provider": "anthropic"},  # Not supported
            created_by=user,
        )
        with pytest.raises(ValidationError) as exc_info:
            template.full_clean()
        assert "Invalid provider" in str(exc_info.value)

    def test_negative_retention_days(self, organisation, user, valid_input_schema):
        """Test retention_days must be positive."""
        template = GenerationTemplate(
            organisation=organisation,
            name="Negative Retention",
            slug="negative-retention",
            input_schema=valid_input_schema,
            pipeline_config={"provider": "openai", "model": "gpt-4"},
            retention_days=-1,  # Invalid
            created_by=user,
        )
        # PositiveIntegerField handles negative validation at the DB level
        # but our clean() also validates
        with pytest.raises((ValidationError, Exception)):
            template.full_clean()

    def test_versioning_relationship(
        self, organisation, user, valid_input_schema, valid_openai_config
    ):
        """Test parent-child versioning relationship."""
        v1 = GenerationTemplate.objects.create(
            organisation=organisation,
            name="Versioned Template",
            slug="versioned",
            version="1.0.0",
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )

        v2 = GenerationTemplate.objects.create(
            organisation=organisation,
            name="Versioned Template",
            slug="versioned",
            version="2.0.0",
            parent_template=v1,
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )

        assert v2.parent_template == v1
        assert v1.child_versions.count() == 1
        assert v1.child_versions.first() == v2

    def test_unique_together_org_slug_version(
        self, organisation, user, valid_input_schema, valid_openai_config
    ):
        """Test unique constraint on (organisation, slug, version)."""
        GenerationTemplate.objects.create(
            organisation=organisation,
            name="Unique Test",
            slug="unique-test",
            version="1.0.0",
            input_schema=valid_input_schema,
            pipeline_config=valid_openai_config,
            created_by=user,
        )

        # Same org, slug, version should fail
        with pytest.raises(Exception):  # IntegrityError
            GenerationTemplate.objects.create(
                organisation=organisation,
                name="Unique Test Duplicate",
                slug="unique-test",
                version="1.0.0",
                input_schema=valid_input_schema,
                pipeline_config=valid_openai_config,
                created_by=user,
            )


# ==============================================================================
# GenerationRequest Tests
# ==============================================================================


@pytest.mark.django_db
class TestGenerationRequest:
    """Tests for GenerationRequest model."""

    def test_create_request(self, template, user):
        """Test basic request creation."""
        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            input_data={"text": "Hello world"},
            estimated_cost=Decimal("50.0000"),
        )
        assert request.id is not None
        assert request.status == RequestStatus.PENDING
        assert request.retry_count == 0
        assert request.template_version == template.version

    def test_request_str_representation(self, generation_request):
        """Test request string representation."""
        assert "pending" in str(generation_request).lower()

    def test_template_version_denormalized(self, template, user):
        """Test template_version is denormalized on creation."""
        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            input_data={"text": "Test"},
            estimated_cost=Decimal("10.0000"),
        )
        assert request.template_version == "1.0.0"

        # Update template version (in real scenario, this would be a new template)
        template.version = "2.0.0"
        template.save()

        # Existing request should still have old version
        request.refresh_from_db()
        assert request.template_version == "1.0.0"

    def test_invalid_input_data(self, template, user):
        """Test input_data validation against template schema."""
        request = GenerationRequest(
            template=template,
            requester=user,
            input_data={"wrong_field": 123},  # Missing required 'text'
        )
        with pytest.raises(ValidationError) as exc_info:
            request.full_clean()
        assert "Input validation failed" in str(exc_info.value)

    def test_status_transitions_pending_to_processing(self, generation_request):
        """Test status transition from pending to processing."""
        assert generation_request.status == RequestStatus.PENDING
        assert generation_request.started_at is None

        generation_request.start_processing()

        assert generation_request.status == RequestStatus.PROCESSING
        assert generation_request.started_at is not None

    def test_status_transitions_processing_to_completed(self, generation_request):
        """Test status transition from processing to completed."""
        generation_request.start_processing()

        generation_request.mark_completed(actual_cost=Decimal("45.0000"))

        assert generation_request.status == RequestStatus.COMPLETED
        assert generation_request.actual_cost == Decimal("45.0000")
        assert generation_request.completed_at is not None

    def test_status_transitions_processing_to_failed(self, generation_request):
        """Test status transition from processing to failed."""
        generation_request.start_processing()

        generation_request.mark_failed(
            error_message="API rate limit exceeded",
            error_category=ErrorCategory.TRANSIENT,
        )

        assert generation_request.status == RequestStatus.FAILED
        assert generation_request.error_message == "API rate limit exceeded"
        assert generation_request.error_category == ErrorCategory.TRANSIENT
        assert generation_request.completed_at is not None

    def test_status_transitions_pending_to_cancelled(self, generation_request):
        """Test status transition from pending to cancelled."""
        generation_request.mark_cancelled()

        assert generation_request.status == RequestStatus.CANCELLED
        assert generation_request.completed_at is not None

    def test_invalid_status_transition_completed_to_processing(self, completed_request):
        """Test invalid status transition raises error."""
        with pytest.raises(ValidationError) as exc_info:
            completed_request.start_processing()
        assert "Cannot start processing" in str(exc_info.value)

    def test_invalid_status_transition_failed_to_completed(self, generation_request):
        """Test cannot complete a failed request."""
        generation_request.start_processing()
        generation_request.mark_failed("Error", ErrorCategory.PERMANENT)

        with pytest.raises(ValidationError) as exc_info:
            generation_request.mark_completed(Decimal("50.0000"))
        assert "Cannot complete from status" in str(exc_info.value)

    def test_retry_count_increment(self, generation_request):
        """Test retry count increment and history tracking."""
        generation_request.start_processing()
        generation_request.mark_failed("Rate limit", ErrorCategory.TRANSIENT)

        generation_request.increment_retry()

        assert generation_request.retry_count == 1
        assert generation_request.status == RequestStatus.PENDING
        assert "retry_history" in generation_request.metadata
        assert len(generation_request.metadata["retry_history"]) == 1

    def test_retry_history_accumulates(self, generation_request):
        """Test retry history accumulates across retries."""
        for i in range(3):
            generation_request.start_processing()
            generation_request.mark_failed(f"Error {i}", ErrorCategory.TRANSIENT)
            generation_request.increment_retry()

        assert generation_request.retry_count == 3
        assert len(generation_request.metadata["retry_history"]) == 3

    def test_request_with_project(self, template, user, project):
        """Test request creation with project context."""
        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            project=project,
            input_data={"text": "Project-scoped request"},
            estimated_cost=Decimal("50.0000"),
        )
        assert request.project == project
        assert project.generation_requests.count() == 1


# ==============================================================================
# GenerationOutput Tests
# ==============================================================================


@pytest.mark.django_db
class TestGenerationOutput:
    """Tests for GenerationOutput model."""

    def test_create_output_with_text(self, completed_request):
        """Test output creation with text content."""
        output = GenerationOutput.objects.create(
            request=completed_request,
            output_type=OutputType.TEXT,
            text_content="Generated text content",
        )
        assert output.text_content == "Generated text content"
        assert output.file_id is None

    def test_create_output_with_file(self, completed_request):
        """Test output creation with file reference."""
        output = GenerationOutput.objects.create(
            request=completed_request,
            output_type=OutputType.IMAGE,
            file_id=12345,  # B35 FileStorageRecord ID
            metadata={"resolution": "1920x1080", "format": "PNG"},
        )
        assert output.file_id == 12345
        assert output.text_content == ""

    def test_output_str_representation(self, generation_output):
        """Test output string representation."""
        assert "Output for Request" in str(generation_output)

    def test_output_requires_content(self, completed_request):
        """Test validation: must have file_id OR text_content."""
        output = GenerationOutput(
            request=completed_request,
            output_type=OutputType.TEXT,
            # Missing both file_id and text_content
        )
        with pytest.raises(ValidationError) as exc_info:
            output.full_clean()
        assert "file_id or text_content" in str(exc_info.value)

    def test_image_requires_file(self, completed_request):
        """Test image output type requires file_id."""
        output = GenerationOutput(
            request=completed_request,
            output_type=OutputType.IMAGE,
            text_content="This should be a file",  # Wrong content type
        )
        with pytest.raises(ValidationError) as exc_info:
            output.full_clean()
        assert "requires file_id" in str(exc_info.value)

    def test_text_requires_text_content(self, completed_request):
        """Test text output type requires text_content."""
        output = GenerationOutput(
            request=completed_request,
            output_type=OutputType.TEXT,
            file_id=12345,  # Wrong content type
        )
        with pytest.raises(ValidationError) as exc_info:
            output.full_clean()
        assert "requires text_content" in str(exc_info.value)

    def test_video_requires_file(self, completed_request):
        """Test video output type requires file_id."""
        output = GenerationOutput(
            request=completed_request,
            output_type=OutputType.VIDEO,
            text_content="This should be a file",
        )
        with pytest.raises(ValidationError) as exc_info:
            output.full_clean()
        assert "requires file_id" in str(exc_info.value)

    def test_json_requires_text_content(self, completed_request):
        """Test JSON output type requires text_content."""
        output = GenerationOutput(
            request=completed_request,
            output_type=OutputType.JSON,
            file_id=12345,
        )
        with pytest.raises(ValidationError) as exc_info:
            output.full_clean()
        assert "requires text_content" in str(exc_info.value)

    def test_expires_at_computed(self, template, user):
        """Test expires_at computed from template retention_days."""
        template.retention_days = 30
        template.save()

        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            input_data={"text": "Test"},
            estimated_cost=Decimal("10.0000"),
        )
        request.start_processing()
        request.mark_completed(Decimal("10.0000"))

        output = GenerationOutput.objects.create(
            request=request,
            output_type=OutputType.TEXT,
            text_content="Test output",
        )

        assert output.expires_at is not None
        # Check expires_at is approximately 30 days from created_at
        expected = output.created_at + timedelta(days=30)
        assert abs((output.expires_at - expected).total_seconds()) < 60

    def test_expires_at_null_when_no_retention(self, user, organisation, valid_input_schema):
        """Test expires_at is NULL when template has no retention_days."""
        template = GenerationTemplate.objects.create(
            organisation=organisation,
            name="No Retention",
            slug="no-retention",
            input_schema=valid_input_schema,
            pipeline_config={"provider": "openai", "model": "gpt-4"},
            retention_days=None,  # Forever
            created_by=user,
        )

        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            input_data={"text": "Test"},
            estimated_cost=Decimal("10.0000"),
        )
        request.start_processing()
        request.mark_completed(Decimal("10.0000"))

        output = GenerationOutput.objects.create(
            request=request,
            output_type=OutputType.TEXT,
            text_content="Test output",
        )

        assert output.expires_at is None

    def test_one_to_one_relationship(self, completed_request):
        """Test only one output per request (OneToOne)."""
        GenerationOutput.objects.create(
            request=completed_request,
            output_type=OutputType.TEXT,
            text_content="First output",
        )

        # Second output for same request should fail
        with pytest.raises(Exception):  # IntegrityError
            GenerationOutput.objects.create(
                request=completed_request,
                output_type=OutputType.TEXT,
                text_content="Second output",
            )

    def test_cascade_delete(self, generation_output):
        """Test output is deleted when request is deleted."""
        request = generation_output.request
        request_id = request.id

        request.delete()

        assert not GenerationOutput.objects.filter(request_id=request_id).exists()


# ==============================================================================
# Query Pattern Tests
# ==============================================================================


@pytest.mark.django_db
class TestQueryPatterns:
    """Tests for common query patterns to ensure indexes work."""

    def test_active_latest_templates_query(
        self, organisation, user, valid_input_schema, valid_openai_config
    ):
        """Test query for active latest templates (uses org_active_idx)."""
        # Create multiple templates
        for i in range(3):
            GenerationTemplate.objects.create(
                organisation=organisation,
                name=f"Template {i}",
                slug=f"template-{i}",
                input_schema=valid_input_schema,
                pipeline_config=valid_openai_config,
                created_by=user,
            )

        # Deactivate one
        GenerationTemplate.objects.filter(slug="template-1").update(is_active=False)

        # Query active templates
        active_templates = GenerationTemplate.objects.filter(
            organisation=organisation,
            is_active=True,
            is_latest=True,
        )
        assert active_templates.count() == 2

    def test_user_requests_query(self, template, user):
        """Test query for user's requests (uses user_status_idx)."""
        # Create multiple requests
        for i in range(5):
            GenerationRequest.objects.create(
                template=template,
                requester=user,
                input_data={"text": f"Request {i}"},
                estimated_cost=Decimal("10.0000"),
            )

        # Query user's pending requests
        pending = GenerationRequest.objects.filter(
            requester=user,
            status=RequestStatus.PENDING,
        )
        assert pending.count() == 5

    def test_project_requests_query(self, template, user, project):
        """Test query for project's requests (uses proj_created_idx)."""
        # Create requests with and without project
        GenerationRequest.objects.create(
            template=template,
            requester=user,
            project=project,
            input_data={"text": "With project"},
            estimated_cost=Decimal("10.0000"),
        )
        GenerationRequest.objects.create(
            template=template,
            requester=user,
            input_data={"text": "Without project"},
            estimated_cost=Decimal("10.0000"),
        )

        # Query project requests
        project_requests = GenerationRequest.objects.filter(
            project=project,
        ).order_by("-created_at")
        assert project_requests.count() == 1

    def test_template_usage_query(self, template, user):
        """Test query for template usage stats (uses tpl_status_idx)."""
        # Create requests with different statuses
        request = GenerationRequest.objects.create(
            template=template,
            requester=user,
            input_data={"text": "Test"},
            estimated_cost=Decimal("10.0000"),
        )
        request.start_processing()
        request.mark_completed(Decimal("10.0000"))

        GenerationRequest.objects.create(
            template=template,
            requester=user,
            input_data={"text": "Test 2"},
            estimated_cost=Decimal("10.0000"),
        )

        # Query completed requests for template
        completed = GenerationRequest.objects.filter(
            template=template,
            status=RequestStatus.COMPLETED,
        )
        assert completed.count() == 1
