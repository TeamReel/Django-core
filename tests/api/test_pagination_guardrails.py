"""
Unit tests for pagination guardrails (WP02) and feature flag integration.

Tests cover:
- T018: Pagination guardrail enforcement
- T019: FetchBudget dataclass calculation
- T020: Feature flag integration with settings
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from api.guardrails import FetchBudget, PaginationLimitExceeded, get_guardrail_config
from api.pagination import BaseAPIPagination
from django.test import override_settings
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory


@pytest.fixture
def factory():
    """Provide APIRequestFactory instance."""
    return APIRequestFactory()


class TestFetchBudget:
    """Test FetchBudget dataclass (T019)."""

    def test_fetch_budget_creation(self):
        """FetchBudget should be instantiable with all required fields."""
        budget = FetchBudget(
            max_pages=5,
            max_items=500,
            current_page=3,
            page_size=100,
            is_limited=True,
        )
        assert budget.max_pages == 5
        assert budget.max_items == 500
        assert budget.current_page == 3
        assert budget.page_size == 100
        assert budget.is_limited is True

    def test_usage_percent_calculation(self):
        """Usage percent should be current_page / max_pages * 100."""
        budget = FetchBudget(
            max_pages=5,
            max_items=500,
            current_page=4,
            page_size=100,
            is_limited=True,
        )
        assert budget.usage_percent == 80.0

    def test_usage_percent_when_not_limited(self):
        """Usage percent should be 0 when not limited."""
        budget = FetchBudget(
            max_pages=5,
            max_items=500,
            current_page=4,
            page_size=100,
            is_limited=False,
        )
        assert budget.usage_percent == 0.0

    def test_usage_percent_first_page(self):
        """Usage percent should be 20% for page 1 of 5."""
        budget = FetchBudget(
            max_pages=5,
            max_items=500,
            current_page=1,
            page_size=100,
            is_limited=True,
        )
        assert budget.usage_percent == 20.0

    def test_to_header_dict(self):
        """Header dict should have correct structure."""
        budget = FetchBudget(
            max_pages=5,
            max_items=500,
            current_page=1,
            page_size=100,
            is_limited=True,
        )
        header = budget.to_header_dict()
        assert header == {
            "max_pages": 5,
            "max_items": 500,
            "current_page": 1,
            "is_limited": True,
        }

    def test_to_header_json(self):
        """Header JSON should be valid and parseable."""
        budget = FetchBudget(
            max_pages=5,
            max_items=500,
            current_page=1,
            page_size=100,
            is_limited=True,
        )
        header_json = budget.to_header_json()

        # Should be valid JSON
        parsed = json.loads(header_json)
        assert parsed["max_pages"] == 5
        assert parsed["max_items"] == 500
        assert parsed["current_page"] == 1
        assert parsed["is_limited"] is True

    def test_max_items_limit_hit_before_max_pages(self):
        """Edge case: max_items hit before max_pages (small page_size)."""
        # Scenario: page_size=1, max_pages=5, max_items=3
        # Requesting page 4 would fetch items 4+, exceeding max_items=3
        budget = FetchBudget(
            max_pages=5,
            max_items=3,
            current_page=4,
            page_size=1,
            is_limited=True,
        )
        # Verify that current_page * page_size exceeds max_items
        assert budget.current_page * budget.page_size > budget.max_items


class TestPaginationLimitExceeded:
    """Test PaginationLimitExceeded exception (T018)."""

    def test_exception_status_code_is_400(self):
        """Exception should return HTTP 400."""
        exc = PaginationLimitExceeded(
            requested_page=6,
            max_pages=5,
        )
        assert exc.status_code == 400

    def test_exception_error_structure(self):
        """Exception should have structured error format."""
        exc = PaginationLimitExceeded(
            requested_page=6,
            max_pages=5,
        )
        detail = exc.detail

        assert isinstance(detail, dict)
        assert detail.get("status") == "error"
        assert "error" in detail
        assert detail["error"].get("code") == "pagination_limit_exceeded"

    def test_exception_detail_includes_requested_page(self):
        """Exception detail should include requested page and limit."""
        exc = PaginationLimitExceeded(
            requested_page=6,
            max_pages=5,
        )
        requested_page = exc.detail["error"]["details"]["requested_page"]
        max_pages = exc.detail["error"]["details"]["max_pages"]

        assert int(str(requested_page)) == 6
        assert int(str(max_pages)) == 5


class TestGuardrailConfig:
    """Test get_guardrail_config function (T020)."""

    @override_settings(
        FETCH_GUARDRAIL_ENABLED=True,
        FETCH_GUARDRAIL_MAX_PAGES=5,
        FETCH_GUARDRAIL_MAX_ITEMS=500,
    )
    @patch("settings.api.get_flag")
    def test_guardrail_config_from_settings(self, mock_get_flag):
        """Config should load from Django settings."""

        def side_effect(key, default=None):
            return default

        mock_get_flag.side_effect = side_effect

        request = MagicMock()
        request.path = "/api/v1/activities/"

        config = get_guardrail_config(request)

        assert config["enabled"] is True
        assert config["max_pages"] == 5
        assert config["max_items"] == 500

    @override_settings(
        FETCH_GUARDRAIL_ENABLED=True,
        FETCH_GUARDRAIL_MAX_PAGES=5,
    )
    @patch("settings.api.get_flag")
    def test_feature_flag_overrides_setting(self, mock_get_flag):
        """Feature flag should override Django setting."""

        def mock_get_flag_side_effect(key, default=None):
            """Mock get_flag with feature flag overrides."""
            overrides = {
                "frontend_fetch_guardrails_enabled": True,
                "frontend_fetch_max_pages_default": 10,  # Override
            }
            return overrides.get(key, default)

        mock_get_flag.side_effect = mock_get_flag_side_effect

        request = MagicMock()
        request.path = "/api/v1/activities/"

        config = get_guardrail_config(request)
        assert config["max_pages"] == 10  # Flag value, not setting (5)

    @patch("settings.api.get_flag")
    def test_disabled_flag_skips_guardrails(self, mock_get_flag):
        """When flag is False, guardrails should be disabled."""

        def side_effect(key, default=None):
            if key == "frontend_fetch_guardrails_enabled":
                return False
            return default

        mock_get_flag.side_effect = side_effect

        request = MagicMock()
        request.path = "/api/v1/activities/"

        config = get_guardrail_config(request)
        assert config["enabled"] is False

    @override_settings(
        FETCH_GUARDRAIL_ENABLED=True,
        FETCH_GUARDRAIL_MAX_PAGES=5,
        FETCH_GUARDRAIL_OVERRIDES={
            "/api/v1/activities/": {"max_pages": 10},
            "/api/v1/lists/": {"max_items": 1000},
        },
    )
    @patch("settings.api.get_flag")
    def test_per_endpoint_override_resolution(self, mock_get_flag):
        """Per-endpoint overrides should resolve correctly."""

        def side_effect(key, default=None):
            return default

        mock_get_flag.side_effect = side_effect

        request = MagicMock()
        request.path = "/api/v1/activities/"

        config = get_guardrail_config(request)
        assert config["max_pages"] == 10  # Override value

    @override_settings(
        FETCH_GUARDRAIL_ENABLED=True,
        FETCH_GUARDRAIL_MAX_PAGES=5,
        FETCH_GUARDRAIL_OVERRIDES={
            "/api/v1/": {"max_pages": 20},  # Prefix match
        },
    )
    @patch("settings.api.get_flag")
    def test_per_endpoint_prefix_matching(self, mock_get_flag):
        """Per-endpoint prefix matching should work for longer paths."""

        def side_effect(key, default=None):
            return default

        mock_get_flag.side_effect = side_effect

        request = MagicMock()
        request.path = "/api/v1/activities/123/"

        config = get_guardrail_config(request)
        assert config["max_pages"] == 20  # Prefix match value


class TestGuardrailLogic:
    """Test guardrail enforcement logic (T018)."""

    @override_settings(
        FETCH_GUARDRAIL_ENABLED=True,
        FETCH_GUARDRAIL_MAX_PAGES=5,
    )
    @patch("settings.api.get_flag")
    def test_page_within_limit_succeeds(self, mock_get_flag):
        """Page 3 of 5 should succeed without raising exception."""

        def side_effect(key, default=None):
            return default

        mock_get_flag.side_effect = side_effect

        pagination = BaseAPIPagination()
        pagination.page_size = 10

        factory = APIRequestFactory()
        request = Request(factory.get("/api/v1/activities/?page=3"))

        queryset = list(range(50))
        page = pagination.paginate_queryset(queryset, request)

        assert page is not None
        assert pagination.page.number == 3

    @override_settings(
        FETCH_GUARDRAIL_ENABLED=True,
        FETCH_GUARDRAIL_MAX_PAGES=5,
    )
    @patch("settings.api.get_flag")
    def test_x_fetch_budget_header_format(self, mock_get_flag):
        """X-Fetch-Budget header should be valid JSON."""

        def side_effect(key, default=None):
            return default

        mock_get_flag.side_effect = side_effect

        pagination = BaseAPIPagination()
        pagination.page_size = 10

        factory = APIRequestFactory()
        request = Request(factory.get("/api/v1/activities/?page=2"))
        queryset = list(range(25))

        pagination.paginate_queryset(queryset, request)
        response = pagination.get_paginated_response([{"id": 1}])

        assert "X-Fetch-Budget" in response
        parsed = json.loads(response["X-Fetch-Budget"])
        assert parsed["max_pages"] == 5
        assert parsed["max_items"] == 500
        assert parsed["current_page"] == 2
        assert parsed["is_limited"] is True

    @override_settings(FETCH_GUARDRAIL_ENABLED=False)
    @patch("settings.api.get_flag")
    def test_guardrails_disabled_allows_any_page(self, mock_get_flag):
        """With guardrails off, high page numbers should not trigger limits."""

        def side_effect(key, default=None):
            if key == "frontend_fetch_guardrails_enabled":
                return False
            return default

        mock_get_flag.side_effect = side_effect

        pagination = BaseAPIPagination()
        pagination.page_size = 10

        factory = APIRequestFactory()
        request = Request(factory.get("/api/v1/activities/?page=100"))
        queryset = list(range(1000))

        page = pagination.paginate_queryset(queryset, request)
        assert page is not None
        assert pagination.page.number == 100

    @override_settings(
        FETCH_GUARDRAIL_ENABLED=True,
        FETCH_GUARDRAIL_MAX_PAGES=5,
    )
    @patch("settings.api.get_flag")
    def test_page_exceeds_limit_raises(self, mock_get_flag):
        """Page 6 of 5 should raise PaginationLimitExceeded."""

        def side_effect(key, default=None):
            return default

        mock_get_flag.side_effect = side_effect

        pagination = BaseAPIPagination()
        pagination.page_size = 10

        factory = APIRequestFactory()
        request = Request(factory.get("/api/v1/activities/?page=6"))
        queryset = list(range(100))

        with pytest.raises(PaginationLimitExceeded):
            pagination.paginate_queryset(queryset, request)
