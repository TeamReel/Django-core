"""
Unit tests for CacheHeadersMixin (WP03).

Tests cover:
- T021: Cache headers mixin functionality
  - ETag generation
  - If-None-Match 304 response
  - Last-Modified header (RFC 7231 format)
"""

import hashlib
from datetime import datetime, timezone

from api.mixins import CacheHeadersMixin
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory


class MockQuerySet:
    """Mock QuerySet for testing."""

    def __init__(self, exists=True, latest_modified=None):
        self._exists = exists
        self.latest_modified = latest_modified

    def exists(self):
        return self._exists

    def aggregate(self, **kwargs):
        if not self._exists:
            return {"max_updated": None}
        return {"max_updated": self.latest_modified}


class BaseListView:
    """Base class providing list implementation for mixin tests."""

    def list(self, request, *args, **kwargs):
        return Response({"data": [1, 2, 3]}, status=200)


class TestCacheHeadersMixin:
    """Test CacheHeadersMixin (T021)."""

    def test_generate_etag_hash(self):
        """ETag should be MD5 hash of max(updated_at)."""
        mixin = CacheHeadersMixin()
        latest = datetime(2026, 2, 3, 12, 0, 0, tzinfo=timezone.utc)
        queryset = MockQuerySet(exists=True, latest_modified=latest)

        expected = hashlib.md5(latest.isoformat().encode(), usedforsecurity=False).hexdigest()
        etag = mixin._generate_etag(queryset)

        assert etag == expected

    def test_generate_etag_none_for_empty_queryset(self):
        """ETag should be None when queryset is empty."""
        mixin = CacheHeadersMixin()
        queryset = MockQuerySet(exists=False, latest_modified=None)

        etag = mixin._generate_etag(queryset)
        assert etag is None

    def test_list_if_none_match_returns_304(self):
        """If-None-Match matching ETag should return 304 Not Modified."""

        class TestViewSet(CacheHeadersMixin, BaseListView):
            def get_queryset(self):
                latest = datetime(2026, 2, 3, 12, 0, 0, tzinfo=timezone.utc)
                return MockQuerySet(exists=True, latest_modified=latest)

            def filter_queryset(self, queryset):
                return queryset

        factory = APIRequestFactory()
        viewset = TestViewSet()

        latest = viewset.get_queryset().latest_modified
        etag = hashlib.md5(latest.isoformat().encode(), usedforsecurity=False).hexdigest()

        request = factory.get("/", HTTP_IF_NONE_MATCH=f'"{etag}"')
        response = viewset.list(request)

        assert response.status_code == 304
        assert response["ETag"] == f'"{etag}"'
        assert "Last-Modified" in response

    def test_list_if_none_match_mismatch_returns_200(self):
        """If-None-Match mismatch should return normal 200 response."""

        class TestViewSet(CacheHeadersMixin, BaseListView):
            def get_queryset(self):
                latest = datetime(2026, 2, 3, 12, 0, 0, tzinfo=timezone.utc)
                return MockQuerySet(exists=True, latest_modified=latest)

            def filter_queryset(self, queryset):
                return queryset

        factory = APIRequestFactory()
        viewset = TestViewSet()

        request = factory.get("/", HTTP_IF_NONE_MATCH='"wrong-etag"')
        response = viewset.list(request)

        assert response.status_code == 200

    def test_add_list_cache_headers(self):
        """_add_list_cache_headers should add ETag and Last-Modified."""

        class TestViewSet(CacheHeadersMixin, BaseListView):
            def get_queryset(self):
                latest = datetime(2026, 2, 3, 12, 0, 0, tzinfo=timezone.utc)
                return MockQuerySet(exists=True, latest_modified=latest)

            def filter_queryset(self, queryset):
                return queryset

        viewset = TestViewSet()
        response = Response({"data": [1, 2, 3]})

        viewset._add_list_cache_headers(None, response)

        assert "ETag" in response
        assert response["ETag"].startswith('"')
        assert response["ETag"].endswith('"')
        assert "Last-Modified" in response

    def test_add_detail_cache_headers(self):
        """_add_detail_cache_headers should add Last-Modified and ETag."""

        class Obj:
            updated_at = datetime(2026, 2, 3, 12, 0, 0, tzinfo=timezone.utc)

        class TestViewSet(CacheHeadersMixin):
            def get_object(self):
                return Obj()

        viewset = TestViewSet()
        response = Response({"id": 1})

        viewset._add_detail_cache_headers(None, response)

        assert "Last-Modified" in response
        assert "ETag" in response
        assert response["ETag"].startswith('"')
        assert response["ETag"].endswith('"')

    def test_format_http_date_rfc7231(self):
        """_format_http_date should use RFC 7231 format."""
        dt = datetime(2026, 2, 3, 12, 0, 0, tzinfo=timezone.utc)
        formatted = CacheHeadersMixin._format_http_date(dt)

        assert formatted == "Tue, 03 Feb 2026 12:00:00 GMT"
