"""Tests for correlation ID middleware."""

import uuid

import pytest
from django.http import HttpResponse
from django.test import RequestFactory
from observability.logging import get_correlation_id
from observability.middleware import CorrelationIDMiddleware


class TestCorrelationIDMiddleware:
    """Test correlation ID extraction and generation."""

    def setup_method(self):
        """Set up test fixtures."""
        self.factory = RequestFactory()
        self.middleware = CorrelationIDMiddleware(lambda request: HttpResponse())

    def test_extract_correlation_id_from_header(self):
        """Test extraction of X-Correlation-ID header."""
        correlation_id = "existing-correlation-123"
        request = self.factory.get("/", HTTP_X_CORRELATION_ID=correlation_id)

        self.middleware.process_request(request)

        assert request.correlation_id == correlation_id
        assert get_correlation_id() == correlation_id

    def test_generate_correlation_id_when_missing(self):
        """Test UUID generation when header is missing."""
        request = self.factory.get("/")

        self.middleware.process_request(request)

        assert hasattr(request, "correlation_id")
        assert request.correlation_id is not None

        # Verify it's a valid UUID
        try:
            uuid.UUID(request.correlation_id)
        except ValueError:
            pytest.fail("Generated correlation ID is not a valid UUID")

        assert get_correlation_id() == request.correlation_id

    def test_correlation_id_propagates_to_contextvar(self):
        """Test that correlation ID is stored in contextvar."""
        correlation_id = "propagate-test-456"
        request = self.factory.get("/", HTTP_X_CORRELATION_ID=correlation_id)

        self.middleware.process_request(request)

        # Verify contextvar was set
        from observability.logging import correlation_id_var

        assert correlation_id_var.get() == correlation_id

    def test_multiple_requests_isolated(self):
        """Test that different requests get different correlation IDs."""
        request1 = self.factory.get("/")
        request2 = self.factory.get("/")

        self.middleware.process_request(request1)
        correlation_id_1 = request1.correlation_id

        self.middleware.process_request(request2)
        correlation_id_2 = request2.correlation_id

        assert correlation_id_1 != correlation_id_2

    def test_header_case_insensitive(self):
        """Test that header extraction is case-insensitive (Django handles this)."""
        # Django converts all headers to HTTP_* format with underscores
        correlation_id = "case-test-789"
        request = self.factory.get("/", HTTP_X_CORRELATION_ID=correlation_id)

        self.middleware.process_request(request)

        assert request.correlation_id == correlation_id

    def test_empty_header_generates_new_id(self):
        """Test that empty header triggers UUID generation."""
        request = self.factory.get("/", HTTP_X_CORRELATION_ID="")

        self.middleware.process_request(request)

        # Empty string should trigger UUID generation
        assert request.correlation_id != ""
        assert len(request.correlation_id) > 0
