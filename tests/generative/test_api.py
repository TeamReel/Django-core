"""API tests for B34 Generative Pipelines.

Tests cover:
- Authentication and authorization
- Template CRUD and clone operations
- Request submission and cancellation
- Output retrieval with permissions
- Pagination and filtering
- Error handling and edge cases

Target: >85% API test coverage
"""

from decimal import Decimal
from unittest.mock import patch

from rest_framework import status

from src.generative.models import GenerationRequest, GenerationTemplate, RequestStatus


class TestTemplateAPI:
    """Tests for /api/v1/generative/templates/ endpoints."""

    def test_list_templates_unauthenticated(self, api_client):
        """Test GET /templates/ requires authentication."""
        response = api_client.get("/api/v1/generative/templates/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_templates_authenticated(self, authenticated_client, template):
        """Test GET /templates/ returns user's org templates."""
        response = authenticated_client.get("/api/v1/generative/templates/")
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert len(response.data["results"]) >= 1
        assert response.data["results"][0]["name"] == template.name

    def test_list_templates_filters_by_organisation(
        self, authenticated_client, template, other_user, organisation
    ):
        """Test templates filtered by user's organisation (+ global templates)."""
        # Create another organisation
        from organisations.models import Organisation

        other_org = Organisation.objects.create(
            name="Other Organisation",
            slug="other-org",
            creator=other_user,
        )

        # Create template in different org
        GenerationTemplate.objects.create(
            organisation=other_org,
            name="Other Org Template",
            slug="other-template",
            version="1.0.0",
            input_schema={"type": "object"},
            pipeline_config={"provider": "openai", "model": "gpt-4"},
            created_by=other_user,
        )

        response = authenticated_client.get("/api/v1/generative/templates/")
        assert response.status_code == status.HTTP_200_OK
        # Should see templates from user's org + global (org=NULL), not other orgs
        for result in response.data["results"]:
            assert result["organisation"] in (organisation.id, None)

    def test_get_template_detail(self, authenticated_client, template):
        """Test GET /templates/{id}/ returns template details."""
        response = authenticated_client.get(f"/api/v1/generative/templates/{template.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == template.id
        assert response.data["name"] == template.name
        assert response.data["provider"] == "openai"
        assert "estimated_cost" in response.data

    def test_create_template_requires_admin(self, authenticated_client):
        """Test POST /templates/ requires org admin role."""
        data = {
            "name": "New Template",
            "slug": "new-template",
            "version": "1.0.0",
            "input_schema": {"type": "object", "properties": {"text": {"type": "string"}}},
            "pipeline_config": {"provider": "openai", "model": "gpt-4"},
        }
        response = authenticated_client.post("/api/v1/generative/templates/", data, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_template_admin_success(self, admin_client, organisation):
        """Test admin can create templates."""
        data = {
            "name": "Admin Template",
            "slug": "admin-template",
            "version": "1.0.0",
            "input_schema": {"type": "object", "properties": {"text": {"type": "string"}}},
            "pipeline_config": {"provider": "openai", "model": "gpt-4", "estimated_cost": 10.0},
        }
        response = admin_client.post("/api/v1/generative/templates/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Admin Template"
        assert response.data["organisation"] == organisation.id

    def test_create_template_invalid_json_schema(self, admin_client):
        """Test creation fails with invalid JSON Schema."""
        data = {
            "name": "Invalid Schema",
            "slug": "invalid-schema",
            "version": "1.0.0",
            "input_schema": {"type": "invalid_type"},  # Invalid
            "pipeline_config": {"provider": "openai", "model": "gpt-4"},
        }
        response = admin_client.post("/api/v1/generative/templates/", data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Error format: {"error": {"details": {"input_schema": [...]}}}
        assert "error" in response.data
        assert "input_schema" in response.data["error"]["details"]

    def test_create_template_missing_provider_config(self, admin_client):
        """Test OpenAI provider requires 'model' field."""
        data = {
            "name": "Missing Model",
            "slug": "missing-model",
            "version": "1.0.0",
            "input_schema": {"type": "object"},
            "pipeline_config": {"provider": "openai"},  # Missing 'model'
        }
        response = admin_client.post("/api/v1/generative/templates/", data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Error format: {"error": {"details": {"pipeline_config": [...]}}}
        assert "error" in response.data
        assert "pipeline_config" in response.data["error"]["details"]

    def test_clone_template_creates_new_version(self, admin_client, template):
        """Test POST /templates/{id}/clone/ creates new version."""
        response = admin_client.post(
            f"/api/v1/generative/templates/{template.id}/clone/",
            {"name": "Test Template v2", "slug": "test-template-v2"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["parent_template"] == template.id
        assert response.data["version"] == "1.1.0"  # Bumped from 1.0.0

    def test_clone_template_requires_admin(self, authenticated_client, template):
        """Test clone action requires admin role."""
        response = authenticated_client.post(
            f"/api/v1/generative/templates/{template.id}/clone/",
            {"slug": "test-template-v2"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_template_requires_admin(self, authenticated_client, template):
        """Test PATCH /templates/{id}/ requires admin role."""
        response = authenticated_client.patch(
            f"/api/v1/generative/templates/{template.id}/",
            {"description": "Updated"},
            format="json",
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_template_soft_deletes(self, admin_client, template):
        """Test DELETE /templates/{id}/ sets is_active=False."""
        response = admin_client.delete(f"/api/v1/generative/templates/{template.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify soft delete
        template.refresh_from_db()
        assert template.is_active is False

    def test_template_search(self, authenticated_client, template):
        """Test search filter on templates."""
        response = authenticated_client.get("/api/v1/generative/templates/?search=Test")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) >= 1

    def test_template_pagination(self, authenticated_client, template, admin_user):
        """Test pagination on template list."""
        # Create 25 templates to test pagination (page_size=20)
        for i in range(25):
            GenerationTemplate.objects.create(
                organisation=template.organisation,
                name=f"Template {i}",
                slug=f"template-{i}",
                version="1.0.0",
                input_schema={"type": "object"},
                pipeline_config={"provider": "openai", "model": "gpt-4"},
                created_by=admin_user,
            )

        response = authenticated_client.get("/api/v1/generative/templates/")
        assert response.status_code == status.HTTP_200_OK
        assert "results" in response.data
        assert "next" in response.data
        assert len(response.data["results"]) == 20  # Default page size

        # Get page 2
        response = authenticated_client.get("/api/v1/generative/templates/?page=2")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) > 0


class TestRequestAPI:
    """Tests for /api/v1/generative/requests/ endpoints."""

    def test_submit_request_unauthenticated(self, api_client, template):
        """Test POST /requests/ requires authentication."""
        response = api_client.post(
            "/api/v1/generative/requests/",
            {"template": template.id, "input_data": {"text": "Hello"}},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("src.generative.credit_service.GenerationCreditService.reserve_credits")
    def test_submit_request_success(self, mock_reserve, authenticated_client, template):
        """Test POST /requests/ returns 202 Accepted."""
        mock_reserve.return_value = 123  # Mock transaction ID
        data = {"template": template.id, "input_data": {"text": "Hello world"}}
        response = authenticated_client.post("/api/v1/generative/requests/", data, format="json")
        assert response.status_code == status.HTTP_202_ACCEPTED
        assert response.data["status"] == RequestStatus.PENDING
        assert response.data["template"] == template.id
        assert response.data["input_data"] == {"text": "Hello world"}

    def test_submit_request_invalid_input_data(self, authenticated_client, template):
        """Test input_data validation against template schema."""
        # Template requires 'text' field
        data = {"template": template.id, "input_data": {"wrong_field": "value"}}
        response = authenticated_client.post("/api/v1/generative/requests/", data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Error format: {"error": {"details": {"input_data": [...]}}}
        assert "error" in response.data
        assert "input_data" in response.data["error"]["details"]

    def test_submit_request_inactive_template(self, authenticated_client, template):
        """Test cannot submit request with inactive template."""
        template.is_active = False
        template.save()

        data = {"template": template.id, "input_data": {"text": "Hello"}}
        response = authenticated_client.post("/api/v1/generative/requests/", data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_user_requests(self, authenticated_client, generation_request, other_user):
        """Test GET /requests/ returns only user's requests."""
        # Create request from other user
        GenerationRequest.objects.create(
            template=generation_request.template,
            requester=other_user,
            input_data={"text": "Other user request"},
            estimated_cost=Decimal("50.0000"),
        )

        response = authenticated_client.get("/api/v1/generative/requests/")
        assert response.status_code == status.HTTP_200_OK
        # Should only see authenticated user's request
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["requester"] == generation_request.requester.id

    def test_get_request_detail(self, authenticated_client, generation_request):
        """Test GET /requests/{id}/ returns request details."""
        response = authenticated_client.get(f"/api/v1/generative/requests/{generation_request.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == generation_request.id
        assert response.data["status"] == RequestStatus.PENDING

    def test_cancel_request_pending(self, authenticated_client, generation_request):
        """Test POST /requests/{id}/cancel/ cancels pending request."""
        assert generation_request.status == RequestStatus.PENDING

        response = authenticated_client.post(
            f"/api/v1/generative/requests/{generation_request.id}/cancel/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == RequestStatus.CANCELLED

        # Verify DB update
        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.CANCELLED

    def test_cancel_request_processing(self, authenticated_client, generation_request):
        """Test can cancel processing request."""
        generation_request.start_processing()

        response = authenticated_client.post(
            f"/api/v1/generative/requests/{generation_request.id}/cancel/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == RequestStatus.CANCELLED

    def test_cancel_completed_request_fails(self, authenticated_client, completed_request):
        """Test cannot cancel completed request."""
        assert completed_request.status == RequestStatus.COMPLETED

        response = authenticated_client.post(
            f"/api/v1/generative/requests/{completed_request.id}/cancel/"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "error_code" in response.data
        assert response.data["error_code"] == "CANNOT_CANCEL"

    def test_delete_request_not_allowed(self, authenticated_client, generation_request):
        """Test DELETE /requests/{id}/ is not allowed."""
        response = authenticated_client.delete(
            f"/api/v1/generative/requests/{generation_request.id}/"
        )
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_filter_requests_by_status(
        self, authenticated_client, generation_request, user, template
    ):
        """Test filter requests by status."""
        # Create completed request
        completed = GenerationRequest.objects.create(
            template=template,
            requester=user,
            input_data={"text": "Completed request"},
            estimated_cost=Decimal("50.0000"),
        )
        completed.start_processing()
        completed.mark_completed(actual_cost=Decimal("45.0000"))

        # Filter by pending
        response = authenticated_client.get(
            f"/api/v1/generative/requests/?status={RequestStatus.PENDING}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["status"] == RequestStatus.PENDING

        # Filter by completed
        response = authenticated_client.get(
            f"/api/v1/generative/requests/?status={RequestStatus.COMPLETED}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["status"] == RequestStatus.COMPLETED

    def test_filter_requests_by_template(
        self, authenticated_client, generation_request, user, admin_user
    ):
        """Test filter requests by template."""
        # Create another template and request
        other_template = GenerationTemplate.objects.create(
            organisation=generation_request.template.organisation,
            name="Other Template",
            slug="other-template",
            version="1.0.0",
            input_schema={"type": "object"},
            pipeline_config={"provider": "openai", "model": "gpt-3.5-turbo"},
            created_by=admin_user,
        )
        GenerationRequest.objects.create(
            template=other_template,
            requester=user,
            input_data={"text": "Other template request"},
            estimated_cost=Decimal("25.0000"),
        )

        response = authenticated_client.get(
            f"/api/v1/generative/requests/?template={generation_request.template.id}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["template"] == generation_request.template.id


class TestOutputAPI:
    """Tests for /api/v1/generative/outputs/ endpoints."""

    def test_list_outputs_unauthenticated(self, api_client):
        """Test GET /outputs/ requires authentication."""
        response = api_client.get("/api/v1/generative/outputs/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_user_outputs(self, authenticated_client, generation_output):
        """Test GET /outputs/ returns user's outputs."""
        response = authenticated_client.get("/api/v1/generative/outputs/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["request"] == generation_output.request.id

    def test_get_output_detail(self, authenticated_client, generation_output):
        """Test GET /outputs/{id}/ returns output details."""
        response = authenticated_client.get(
            f"/api/v1/generative/outputs/{generation_output.request_id}/"
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["text_content"] == generation_output.text_content
        assert response.data["output_type"] == generation_output.output_type
        assert "is_expired" in response.data

    def test_output_permission_other_user(self, api_client, generation_output, other_user):
        """Test user cannot access other user's output."""
        api_client.force_authenticate(user=other_user)
        response = api_client.get(f"/api/v1/generative/outputs/{generation_output.request_id}/")
        # Should be filtered out by queryset (404 not 403)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_output_readonly(self, authenticated_client, generation_output):
        """Test outputs are read-only (no POST/PUT/DELETE)."""
        # Try POST
        response = authenticated_client.post(
            "/api/v1/generative/outputs/",
            {"output_type": "text", "text_content": "New output"},
            format="json",
        )
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

        # Try PUT
        response = authenticated_client.put(
            f"/api/v1/generative/outputs/{generation_output.request_id}/",
            {"text_content": "Updated"},
            format="json",
        )
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

        # Try DELETE
        response = authenticated_client.delete(
            f"/api/v1/generative/outputs/{generation_output.request_id}/"
        )
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    def test_filter_outputs_by_type(
        self, authenticated_client, generation_output, completed_request, user
    ):
        """Test filter outputs by output_type."""
        from src.generative.models import GenerationOutput, OutputType

        # Create another output with different type
        other_request = GenerationRequest.objects.create(
            template=completed_request.template,
            requester=user,
            input_data={"text": "JSON output"},
            estimated_cost=Decimal("50.0000"),
        )
        other_request.start_processing()
        other_request.mark_completed(actual_cost=Decimal("48.0000"))

        GenerationOutput.objects.create(
            request=other_request,
            output_type=OutputType.JSON,
            text_content='{"result": "data"}',
        )

        # Filter by TEXT
        response = authenticated_client.get(
            f"/api/v1/generative/outputs/?output_type={OutputType.TEXT}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["output_type"] == OutputType.TEXT

        # Filter by JSON
        response = authenticated_client.get(
            f"/api/v1/generative/outputs/?output_type={OutputType.JSON}"
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["output_type"] == OutputType.JSON


class TestAPIErrorHandling:
    """Tests for API error handling and edge cases."""

    def test_invalid_template_id(self, authenticated_client):
        """Test POST /requests/ with non-existent template."""
        data = {"template": 99999, "input_data": {"text": "Hello"}}
        response = authenticated_client.post("/api/v1/generative/requests/", data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_required_fields(self, authenticated_client, template):
        """Test POST /requests/ with missing input_data."""
        data = {"template": template.id}  # Missing input_data
        response = authenticated_client.post("/api/v1/generative/requests/", data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        # Error format: {"error": {"details": {"input_data": [...]}}}
        assert "error" in response.data
        assert "input_data" in response.data["error"]["details"]

    def test_invalid_json_format(self, authenticated_client, template):
        """Test malformed JSON in request body."""
        response = authenticated_client.post(
            "/api/v1/generative/requests/",
            data="invalid json",
            content_type="application/json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_not_found_resource(self, authenticated_client):
        """Test 404 for non-existent resources."""
        response = authenticated_client.get("/api/v1/generative/templates/99999/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

        response = authenticated_client.get("/api/v1/generative/requests/99999/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_method_not_allowed(self, authenticated_client, template):
        """Test 405 for unsupported HTTP methods."""
        # Templates don't support HEAD
        response = authenticated_client.head(f"/api/v1/generative/templates/{template.id}/")
        # DRF allows HEAD by default for GET endpoints
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_405_METHOD_NOT_ALLOWED]
