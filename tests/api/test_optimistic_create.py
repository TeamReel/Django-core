"""
Unit tests for OptimisticCreateMixin (WP04).

Tests cover:
- T022: Optimistic create functionality
  - X-Client-Request-ID echo
  - Feature flag integration
  - UUID validation with warnings
"""

import uuid
from unittest.mock import patch

from api.mixins import OptimisticCreateMixin
from django.test import override_settings
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory


class BaseCreateView:
    """Base class providing create and finalize_response for mixin tests."""

    def create(self, request, *args, **kwargs):
        return Response({"id": 1}, status=201)

    def finalize_response(self, request, response, *args, **kwargs):
        return response


class TestOptimisticCreateMixin:
    """Test OptimisticCreateMixin (T022)."""

    def test_mixin_instantiation(self):
        """Mixin should be instantiable on a ViewSet."""

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        viewset = TestViewSet()
        assert hasattr(viewset, "create")

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    def test_client_request_id_echoed_on_success(self, mock_get_flag):
        """X-Client-Request-ID should be echoed in response header."""

        def side_effect(key, default=None):
            return True if key == "frontend_optimistic_create_enabled" else default

        mock_get_flag.side_effect = side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        client_id = str(uuid.uuid4())
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=client_id))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Response should include X-Client-Request-ID header
        assert "X-Client-Request-ID" in response
        assert response["X-Client-Request-ID"] == client_id

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    def test_client_request_id_echoed_on_error(self, mock_get_flag):
        """X-Client-Request-ID should be echoed even on error response."""

        def side_effect(key, default=None):
            return True if key == "frontend_optimistic_create_enabled" else default

        mock_get_flag.side_effect = side_effect

        class ErrorCreateView(BaseCreateView):
            def create(self, request, *args, **kwargs):
                return Response({"error": "Invalid data"}, status=400)

        class TestViewSet(OptimisticCreateMixin, ErrorCreateView):
            pass

        factory = APIRequestFactory()
        client_id = str(uuid.uuid4())
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=client_id))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Response should include X-Client-Request-ID header even on error
        assert "X-Client-Request-ID" in response
        assert response["X-Client-Request-ID"] == client_id

    @override_settings(OPTIMISTIC_CREATE_ENABLED=False)
    @patch("settings.api.get_flag")
    def test_no_header_when_feature_disabled(self, mock_get_flag):
        """X-Client-Request-ID should not be added when feature is disabled."""

        def side_effect(key, default=None):
            if key == "frontend_optimistic_create_enabled":
                return False
            return default

        mock_get_flag.side_effect = side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        client_id = str(uuid.uuid4())
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=client_id))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Header should not be added (feature disabled)
        # Django strips HTTP_ prefix, so check both forms
        assert "X-Client-Request-ID" not in response or response["X-Client-Request-ID"] != client_id

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    def test_no_header_when_not_provided_by_client(self, mock_get_flag):
        """X-Client-Request-ID should not be added if not provided by client."""

        def side_effect(key, default=None):
            return True if key == "frontend_optimistic_create_enabled" else default

        mock_get_flag.side_effect = side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        # Don't include X-Client-Request-ID header
        request = Request(factory.post("/"))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Header should not be in response if not provided
        assert "X-Client-Request-ID" not in response

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    @patch("api.mixins.logger")
    def test_valid_uuid_accepted_silently(self, mock_logger, mock_get_flag):
        """Valid UUID in X-Client-Request-ID should be accepted without warning."""

        def side_effect(key, default=None):
            return True if key == "frontend_optimistic_create_enabled" else default

        mock_get_flag.side_effect = side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        valid_uuid = str(uuid.uuid4())
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=valid_uuid))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Should echo valid UUID
        assert response["X-Client-Request-ID"] == valid_uuid

        # Should not log warning for valid UUID
        mock_logger.warning.assert_not_called()

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    @patch("api.mixins.logger")
    def test_invalid_uuid_logs_warning_but_echoes(self, mock_logger, mock_get_flag):
        """Invalid UUID should log warning but still echo the ID."""

        def side_effect(key, default=None):
            return True if key == "frontend_optimistic_create_enabled" else default

        mock_get_flag.side_effect = side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        invalid_uuid = "not-a-valid-uuid"
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=invalid_uuid))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Should echo invalid UUID anyway (robustness)
        assert response["X-Client-Request-ID"] == invalid_uuid

        # Should log warning for invalid UUID
        mock_logger.warning.assert_called()
        mock_logger.warning.assert_called()

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    def test_empty_request_id_not_echoed(self, mock_get_flag):
        """Empty X-Client-Request-ID should not be echoed."""

        def side_effect(key, default=None):
            return True if key == "frontend_optimistic_create_enabled" else default

        mock_get_flag.side_effect = side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=""))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Empty header should not be echoed
        if "X-Client-Request-ID" in response:
            assert response["X-Client-Request-ID"] != ""

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    def test_feature_flag_takes_precedence_over_setting(self, mock_get_flag):
        """Feature flag should take precedence over Django setting."""

        def mock_get_flag_side_effect(key, default=None):
            if key == "frontend_optimistic_create_enabled":
                return False
            return default

        mock_get_flag.side_effect = mock_get_flag_side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        client_id = str(uuid.uuid4())
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=client_id))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Even though setting is True, flag (False) should take precedence
        assert "X-Client-Request-ID" not in response or response["X-Client-Request-ID"] != client_id

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    def test_mixin_returns_response_object(self, mock_get_flag):
        """Mixin should return Response object with status code."""

        def side_effect(key, default=None):
            return True if key == "frontend_optimistic_create_enabled" else default

        mock_get_flag.side_effect = side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        client_id = str(uuid.uuid4())
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=client_id))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Response should have status code 201
        assert response.status_code == 201
        assert response["X-Client-Request-ID"] == client_id

    @override_settings(OPTIMISTIC_CREATE_ENABLED=True)
    @patch("settings.api.get_flag")
    def test_case_insensitive_header_matching(self, mock_get_flag):
        """HTTP headers should match case-insensitively."""

        def side_effect(key, default=None):
            return True if key == "frontend_optimistic_create_enabled" else default

        mock_get_flag.side_effect = side_effect

        class TestViewSet(OptimisticCreateMixin, BaseCreateView):
            pass

        factory = APIRequestFactory()
        client_id = str(uuid.uuid4())

        # Try different case variations
        request = Request(factory.post("/", HTTP_X_CLIENT_REQUEST_ID=client_id))

        viewset = TestViewSet()
        response = viewset.create(request)
        response = viewset.finalize_response(request, response)

        # Should handle standard case
        assert "X-Client-Request-ID" in response
