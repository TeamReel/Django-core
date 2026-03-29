"""Tests for resolver registry."""
from unittest.mock import Mock

import pytest
from search.hierarchy.registry import get_resolver, get_resolver_class


@pytest.fixture
def mock_instance():
    """Create mock model instance."""
    instance = Mock()
    instance._meta.app_label = "testapp"
    instance._meta.model_name = "testmodel"
    instance.pk = 123
    return instance


@pytest.fixture
def mock_request():
    """Create mock request."""
    from django.test import RequestFactory

    factory = RequestFactory()
    request = factory.get("/")
    request.user = None
    return request


@pytest.mark.django_db
class TestResolverRegistry:
    """Tests for resolver registry."""

    def test_get_resolver_class_found(self, settings):
        """Test loading resolver from settings."""
        settings.SEARCH_HIERARCHY_RESOLVERS = {
            "testapp.TestModel": "search.tests.test_hierarchy_base.DummyResolver"
        }

        resolver_class = get_resolver_class("testapp.TestModel")
        assert resolver_class is not None
        assert resolver_class.__name__ == "DummyResolver"

    def test_get_resolver_class_not_found(self, settings):
        """Test missing resolver returns None."""
        settings.SEARCH_HIERARCHY_RESOLVERS = {}

        resolver_class = get_resolver_class("testapp.TestModel")
        assert resolver_class is None

    def test_get_resolver_class_invalid_path(self, settings):
        """Test invalid import path returns None and logs error."""
        settings.SEARCH_HIERARCHY_RESOLVERS = {"testapp.TestModel": "nonexistent.module.Class"}

        resolver_class = get_resolver_class("testapp.TestModel")
        assert resolver_class is None  # Fail-safe

    def test_get_resolver_initialized(self, mock_instance, mock_request, settings, mocker):
        """Test get_resolver returns initialized instance."""
        settings.SEARCH_HIERARCHY_RESOLVERS = {
            "testapp.testmodel": "search.tests.test_hierarchy_base.DummyResolver"
        }

        # Mock ContentType.objects.get_for_model
        mock_ct = Mock()
        mock_ct.app_label = "testapp"
        mock_ct.model = "testmodel"
        mocker.patch(
            "django.contrib.contenttypes.models.ContentType.objects.get_for_model",
            return_value=mock_ct,
        )

        resolver = get_resolver(mock_instance, mock_request)
        assert resolver is not None
        assert resolver.request == mock_request

    def test_get_resolver_no_resolver_configured(
        self, mock_instance, mock_request, settings, mocker
    ):
        """Test get_resolver returns None when no resolver configured."""
        settings.SEARCH_HIERARCHY_RESOLVERS = {}

        # Mock ContentType.objects.get_for_model
        mock_ct = Mock()
        mock_ct.app_label = "testapp"
        mock_ct.model = "testmodel"
        mocker.patch(
            "django.contrib.contenttypes.models.ContentType.objects.get_for_model",
            return_value=mock_ct,
        )

        resolver = get_resolver(mock_instance, mock_request)
        assert resolver is None
