"""Tests for B34 Generative Pipelines operational tooling.

WP07 T063: Tooling Tests

Tests management commands, admin actions, and health checks to achieve >80% coverage.

Coverage targets:
- Management commands: update_template_costs, retry_failed_requests, usage_report
- Admin actions: activate/deactivate templates, cancel/retry requests
- Health check endpoint

Test categories:
- Command execution and output
- Admin bulk actions
- Edge cases and error handling
"""

import pytest
from decimal import Decimal
from io import StringIO
from unittest.mock import MagicMock, patch

from django.contrib.admin.sites import AdminSite
from django.contrib.messages.storage.fallback import FallbackStorage
from django.core.management import call_command
from django.test import RequestFactory
from django.utils import timezone

from src.generative.admin import GenerationRequestAdmin, GenerationTemplateAdmin
from src.generative.models import GenerationRequest, GenerationTemplate, RequestStatus


pytestmark = pytest.mark.django_db


# ==============================================================================
# Management Command Tests
# ==============================================================================


class TestUpdateTemplateCostsCommand:
    """Test update_template_costs management command."""

    def test_update_costs_with_sufficient_samples(self, template, organisation, user):
        """Test cost update when sample size >= 10."""
        # Create 10 completed requests with actual costs
        for i in range(10):
            GenerationRequest.objects.create(
                template=template,
                requester=user,
                status=RequestStatus.COMPLETED,
                input_data={"prompt": f"test {i}"},
                actual_cost=Decimal("0.05") + (Decimal("0.01") * i),
                completed_at=timezone.now(),
            )

        # Run command
        out = StringIO()
        call_command("update_template_costs", stdout=out)

        output = out.getvalue()
        assert "UPDATED" in output
        assert template.name in output

        # Verify cost was updated
        template.refresh_from_db()
        assert "estimated_cost" in template.pipeline_config
        assert template.pipeline_config["cost_sample_size"] == 10

    def test_skip_with_insufficient_samples(self, template, organisation, user):
        """Test command skips templates with < 10 samples."""
        # Create only 5 completed requests
        for i in range(5):
            GenerationRequest.objects.create(
                template=template,
                requester=user,
                status=RequestStatus.COMPLETED,
                input_data={"prompt": f"test {i}"},
                actual_cost=Decimal("0.05"),
                completed_at=timezone.now(),
            )

        # Run command
        out = StringIO()
        call_command("update_template_costs", stdout=out)

        output = out.getvalue()
        assert "SKIP" in output
        assert "5/10 samples" in output

    def test_dry_run_mode(self, template, organisation, user):
        """Test --dry-run flag doesn't modify database."""
        # Create completed requests
        for i in range(15):
            GenerationRequest.objects.create(
                template=template,
                requester=user,
                status=RequestStatus.COMPLETED,
                input_data={"prompt": f"test {i}"},
                actual_cost=Decimal("0.10"),
                completed_at=timezone.now(),
            )

        original_config = template.pipeline_config.copy()

        # Run with dry-run
        out = StringIO()
        call_command("update_template_costs", "--dry-run", stdout=out)

        output = out.getvalue()
        assert "WOULD UPDATE" in output
        assert "DRY RUN" in output

        # Verify no changes
        template.refresh_from_db()
        assert template.pipeline_config == original_config


class TestRetryFailedRequestsCommand:
    """Test retry_failed_requests management command."""

    def test_retry_creates_new_requests(self, template, user):
        """Test command creates new requests for failed ones."""
        # Create 3 failed requests
        for i in range(3):
            GenerationRequest.objects.create(
                template=template,
                requester=user,
                status=RequestStatus.FAILED,
                input_data={"prompt": f"test {i}"},
                error_message="Temporary error",
                retry_count=2,
            )

        initial_count = GenerationRequest.objects.count()

        # Run command
        out = StringIO()
        call_command("retry_failed_requests", stdout=out)

        output = out.getvalue()
        assert "Created 3 new request(s)" in output

        # Verify new requests created
        assert GenerationRequest.objects.count() == initial_count + 3

    def test_respects_max_retries(self, template, user):
        """Test command skips requests that exceeded max retries."""
        # Create failed request with high retry count
        GenerationRequest.objects.create(
            template=template,
            requester=user,
            status=RequestStatus.FAILED,
            input_data={"prompt": "test"},
            retry_count=10,
        )

        # Run command with max-retries=5
        out = StringIO()
        call_command("retry_failed_requests", "--max-retries=5", stdout=out)

        output = out.getvalue()
        assert "No failed requests found" in output

    @patch("src.generative.tasks.process_generation_request.delay")
    def test_execute_flag_queues_tasks(self, mock_task, template, user):
        """Test --execute flag queues Celery tasks."""
        GenerationRequest.objects.create(
            template=template,
            requester=user,
            status=RequestStatus.FAILED,
            input_data={"prompt": "test"},
        )

        # Run with --execute
        out = StringIO()
        call_command("retry_failed_requests", "--execute", stdout=out)

        output = out.getvalue()
        assert "and queued" in output
        assert mock_task.called


class TestUsageReportCommand:
    """Test usage_report management command."""

    def test_report_with_data(self, template, user):
        """Test report generation with actual requests."""
        # Create various request statuses
        GenerationRequest.objects.create(
            template=template,
            requester=user,
            status=RequestStatus.COMPLETED,
            input_data={"prompt": "test1"},
            actual_cost=Decimal("0.50"),
        )
        GenerationRequest.objects.create(
            template=template,
            requester=user,
            status=RequestStatus.FAILED,
            input_data={"prompt": "test2"},
        )

        # Run command
        out = StringIO()
        call_command("usage_report", "--days=7", stdout=out)

        output = out.getvalue()
        assert "USAGE REPORT" in output
        assert "Total Requests: 2" in output
        assert "Completed:" in output and "1" in output
        assert "Failed:" in output and "1" in output

    def test_report_json_format(self, template, user):
        """Test JSON format output."""
        GenerationRequest.objects.create(
            template=template,
            requester=user,
            status=RequestStatus.COMPLETED,
            input_data={"prompt": "test"},
            actual_cost=Decimal("0.25"),
        )

        # Run with JSON format
        out = StringIO()
        call_command("usage_report", "--format=json", stdout=out)

        output = out.getvalue()
        import json

        data = json.loads(output)
        assert data["total_requests"] == 1
        assert data["status_breakdown"]["completed"] == 1
        assert "costs" in data


# ==============================================================================
# Django Admin Tests
# ==============================================================================


class TestGenerationTemplateAdmin:
    """Test GenerationTemplate admin actions."""

    def setup_method(self):
        """Setup admin and request factory."""
        self.site = AdminSite()
        self.admin = GenerationTemplateAdmin(GenerationTemplate, self.site)
        self.factory = RequestFactory()

    def test_activate_templates_action(self, template):
        """Test bulk activate action."""
        template.is_active = False
        template.save()

        # Create mock request with message framework
        request = self.factory.get("/admin/")
        request.user = MagicMock()
        request.session = {}
        request._messages = FallbackStorage(request)

        # Run action
        queryset = GenerationTemplate.objects.filter(id=template.id)
        self.admin.activate_templates(request, queryset)

        # Verify activation
        template.refresh_from_db()
        assert template.is_active is True

    def test_deactivate_templates_action(self, template):
        """Test bulk deactivate action."""
        assert template.is_active is True

        # Create mock request with message framework
        request = self.factory.get("/admin/")
        request.user = MagicMock()
        request.session = {}
        request._messages = FallbackStorage(request)

        # Run action
        queryset = GenerationTemplate.objects.filter(id=template.id)
        self.admin.deactivate_templates(request, queryset)

        # Verify deactivation
        template.refresh_from_db()
        assert template.is_active is False


class TestGenerationRequestAdmin:
    """Test GenerationRequest admin actions."""

    def setup_method(self):
        """Setup admin and request factory."""
        self.site = AdminSite()
        self.admin = GenerationRequestAdmin(GenerationRequest, self.site)
        self.factory = RequestFactory()

    def test_cancel_requests_action(self, generation_request):
        """Test bulk cancel action."""
        generation_request.status = RequestStatus.PENDING
        generation_request.save()

        # Create mock request with message framework
        request = self.factory.get("/admin/")
        request.user = MagicMock()
        request.session = {}
        request._messages = FallbackStorage(request)

        # Run action
        queryset = GenerationRequest.objects.filter(id=generation_request.id)
        self.admin.cancel_requests(request, queryset)

        # Verify cancellation
        generation_request.refresh_from_db()
        assert generation_request.status == RequestStatus.CANCELLED

    def test_retry_failed_requests_action(self, generation_request):
        """Test bulk retry action creates new requests."""
        generation_request.status = RequestStatus.FAILED
        generation_request.save()

        initial_count = GenerationRequest.objects.count()

        # Create mock request with message framework
        request = self.factory.get("/admin/")
        request.user = MagicMock()
        request.session = {}
        request._messages = FallbackStorage(request)

        # Run action
        queryset = GenerationRequest.objects.filter(id=generation_request.id)
        self.admin.retry_failed_requests(request, queryset)

        # Verify new request created
        assert GenerationRequest.objects.count() == initial_count + 1

    def test_status_colored_display(self, generation_request):
        """Test status display with HTML coloring."""
        generation_request.status = RequestStatus.COMPLETED
        generation_request.save()

        html = self.admin.status_colored(generation_request)
        assert "#28a745" in html  # Green color for completed
        assert "COMPLETED" in html.upper()


# ==============================================================================
# Health Check Tests
# ==============================================================================


@pytest.mark.django_db
class TestHealthCheckEndpoint:
    """Test health check endpoint."""

    def test_health_check_success(self, api_client):
        """Test health check returns 200 when services healthy."""
        response = api_client.get("/api/v1/generative/health/")

        assert response.status_code == 200
        assert response.data["status"] in ["healthy", "degraded"]
        assert response.data["database"] == "ok"

    @patch("src.generative.views.connection.cursor")
    def test_health_check_database_failure(self, mock_cursor, api_client):
        """Test health check returns 503 when database fails."""
        mock_cursor.side_effect = Exception("Database error")

        response = api_client.get("/api/v1/generative/health/")

        assert response.status_code == 503
        assert response.data["status"] == "unhealthy"
        assert "error" in response.data

    def test_health_check_no_authentication_required(self, client):
        """Test health check accessible without authentication."""
        response = client.get("/api/v1/generative/health/")

        # Should succeed even without auth
        assert response.status_code in [200, 503]
