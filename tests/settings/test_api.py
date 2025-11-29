"""
Comprehensive test suite for WP03: Python Query API & Cache Layer

Tests cover all requirements from review feedback:
- 9 scope combinations (3 scopes × 3 precedence levels)
- Cache integration and performance
- Graceful degradation when Redis unavailable
- Pub/sub invalidation
"""

from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from organisations.models import Organisation
from projects.models import Project

from settings.api import get_flag, get_setting, set_flag, set_setting
from settings.cache import (
    generate_cache_key,
    get_cached_value,
    publish_invalidation,
)
from settings.models import FeatureFlag, ScopeType, Setting, SettingType

User = get_user_model()


class SettingsAPITestCase(TestCase):
    """Base test case with common fixtures."""

    def setUp(self):
        """Set up test fixtures."""
        self.user = User.objects.create_user(email="test@example.com", password="testpass123")

        self.org = Organisation.objects.create(
            name="Test Org", slug="test-org", creator=self.user  # Add required creator field
        )

        self.project = Project.objects.create(
            organisation=self.org, creator=self.user, name="Test Project", slug="test-project"
        )


class TestScopeHierarchyResolution(SettingsAPITestCase):
    """Test all 9 scope combinations for hierarchy resolution."""

    def test_global_scope_only(self):
        """Test 1: Global flag/setting with no project or org specified."""
        # Create global flag and setting
        flag = FeatureFlag.objects.create(
            key="global_flag", enabled=True, scope_type=ScopeType.GLOBAL
        )
        setting = Setting.objects.create(
            key="global_setting",
            value="global_value",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            default_value="default_global",
        )

        # Test global access
        self.assertTrue(get_flag("global_flag"))
        self.assertEqual(get_setting("global_setting"), "global_value")

    def test_organisation_scope_only(self):
        """Test 2: Org flag/setting accessed at org level."""
        flag = FeatureFlag.objects.create(
            key="org_flag", enabled=True, scope_type=ScopeType.ORGANISATION, organisation=self.org
        )
        setting = Setting.objects.create(
            key="org_setting",
            value="org_value",
            value_type=SettingType.STRING,
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
            default_value="default_org",
        )

        # Test org-level access
        self.assertTrue(get_flag("org_flag", organisation_id=self.org.id))
        self.assertEqual(get_setting("org_setting", organisation_id=self.org.id), "org_value")

    def test_project_scope_only(self):
        """Test 3: Project flag/setting accessed at project level."""
        flag = FeatureFlag.objects.create(
            key="project_flag",
            enabled=True,
            scope_type=ScopeType.PROJECT,
            organisation=self.org,
            project=self.project,
        )
        setting = Setting.objects.create(
            key="project_setting",
            value="project_value",
            value_type=SettingType.STRING,
            scope_type=ScopeType.PROJECT,
            organisation=self.org,
            project=self.project,
            default_value="default_project",
        )

        # Test project-level access
        self.assertTrue(get_flag("project_flag", project_id=self.project.id))
        self.assertEqual(
            get_setting("project_setting", project_id=self.project.id), "project_value"
        )

    def test_project_overrides_organisation(self):
        """Test 4: Project scope overrides organisation scope."""
        # Create both org and project level flags/settings
        FeatureFlag.objects.create(
            key="override_flag",
            enabled=False,  # Org level: False
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
        )
        FeatureFlag.objects.create(
            key="override_flag",
            enabled=True,  # Project level: True (should override)
            scope_type=ScopeType.PROJECT,
            organisation=self.org,
            project=self.project,
        )

        Setting.objects.create(
            key="override_setting",
            value="org_value",
            value_type=SettingType.STRING,
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
            default_value="default_override",
        )
        Setting.objects.create(
            key="override_setting",
            value="project_value",  # Should override
            value_type=SettingType.STRING,
            scope_type=ScopeType.PROJECT,
            organisation=self.org,
            project=self.project,
            default_value="default_override",
        )

        # Project scope should win
        self.assertTrue(get_flag("override_flag", project_id=self.project.id))
        self.assertEqual(
            get_setting("override_setting", project_id=self.project.id), "project_value"
        )

    def test_organisation_overrides_global(self):
        """Test 5: Organisation scope overrides global scope."""
        FeatureFlag.objects.create(
            key="org_override_flag",
            enabled=False,  # Global level: False
            scope_type=ScopeType.GLOBAL,
        )
        FeatureFlag.objects.create(
            key="org_override_flag",
            enabled=True,  # Org level: True (should override)
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
        )

        Setting.objects.create(
            key="org_override_setting",
            value="global_value",
            value_type=SettingType.STRING,
            scope_type=ScopeType.GLOBAL,
            default_value="default_org_override",
        )
        Setting.objects.create(
            key="org_override_setting",
            value="org_value",  # Should override
            value_type=SettingType.STRING,
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
            default_value="default_org_override",
        )

        # Org scope should win
        self.assertTrue(get_flag("org_override_flag", organisation_id=self.org.id))
        self.assertEqual(
            get_setting("org_override_setting", organisation_id=self.org.id), "org_value"
        )

    def test_project_overrides_global(self):
        """Test 6: Project scope overrides global scope directly."""
        FeatureFlag.objects.create(
            key="project_global_flag",
            enabled=False,  # Global level: False
            scope_type=ScopeType.GLOBAL,
        )
        FeatureFlag.objects.create(
            key="project_global_flag",
            enabled=True,  # Project level: True (should override)
            scope_type=ScopeType.PROJECT,
            organisation=self.org,
            project=self.project,
        )

        # Project scope should win over global
        self.assertTrue(get_flag("project_global_flag", project_id=self.project.id))

    def test_full_hierarchy_precedence(self):
        """Test 7: Full hierarchy - project → org → global."""
        # Create all three levels
        FeatureFlag.objects.create(
            key="full_hierarchy_flag", enabled=False, scope_type=ScopeType.GLOBAL  # Global: False
        )
        FeatureFlag.objects.create(
            key="full_hierarchy_flag",
            enabled=False,  # Org: False
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
        )
        FeatureFlag.objects.create(
            key="full_hierarchy_flag",
            enabled=True,  # Project: True (highest priority)
            scope_type=ScopeType.PROJECT,
            organisation=self.org,
            project=self.project,
        )

        # Project should win
        self.assertTrue(get_flag("full_hierarchy_flag", project_id=self.project.id))

    def test_fallback_to_org_when_no_project(self):
        """Test 8: Falls back to org when project scope doesn't exist."""
        FeatureFlag.objects.create(
            key="fallback_flag", enabled=False, scope_type=ScopeType.GLOBAL  # Global: False
        )
        FeatureFlag.objects.create(
            key="fallback_flag",
            enabled=True,  # Org: True (should be used)
            scope_type=ScopeType.ORGANISATION,
            organisation=self.org,
        )
        # No project-level flag created

        # Should fall back to org level
        self.assertTrue(get_flag("fallback_flag", project_id=self.project.id))

    def test_fallback_to_global_when_no_org_or_project(self):
        """Test 9: Falls back to global when no org or project scope exists."""
        FeatureFlag.objects.create(
            key="global_fallback_flag",
            enabled=True,  # Global: True (only option)
            scope_type=ScopeType.GLOBAL,
        )
        # No org or project-level flags created

        # Should fall back to global
        self.assertTrue(get_flag("global_fallback_flag", project_id=self.project.id))


class TestCacheIntegration(SettingsAPITestCase):
    """Test cache integration and performance."""

    def setUp(self):
        super().setUp()
        # Clear cache before each test
        cache.clear()

    def test_cache_hit_on_second_call(self):
        """Test that second call hits cache instead of database."""
        flag = FeatureFlag.objects.create(
            key="cached_flag", enabled=True, scope_type=ScopeType.GLOBAL
        )

        # First call should query database and cache result
        result1 = get_flag("cached_flag")
        self.assertTrue(result1)

        # Check that value is cached
        cache_key = generate_cache_key("flag", "cached_flag", "global", None)
        cached_value = get_cached_value(cache_key)
        self.assertTrue(cached_value)

        # Delete the database record to prove second call uses cache
        flag.delete()

        # Second call should still return True from cache
        result2 = get_flag("cached_flag")
        self.assertTrue(result2)

    def test_cache_miss_returns_default(self):
        """Test cache miss with no database record returns default."""
        # No flag created
        result = get_flag("nonexistent_flag", default=False)
        self.assertFalse(result)

    def test_cache_invalidation_on_set(self):
        """Test that cache is invalidated when setting values."""
        # Create initial flag
        set_flag("test_flag", True, user=self.user)

        # Verify it's cached
        result1 = get_flag("test_flag")
        self.assertTrue(result1)

        cache_key = generate_cache_key("flag", "test_flag", "global", None)
        self.assertTrue(get_cached_value(cache_key))

        # Update the flag
        set_flag("test_flag", False, user=self.user)

        # Cache should be invalidated
        self.assertIsNone(get_cached_value(cache_key))

        # New value should be correct
        result2 = get_flag("test_flag")
        self.assertFalse(result2)

    def test_setting_type_coercion_with_cache(self):
        """Test that cached settings maintain proper type coercion."""
        # Test integer setting
        set_setting("int_setting", 42, value_type="INTEGER", user=self.user)
        result = get_setting("int_setting")
        self.assertEqual(result, 42)
        self.assertIsInstance(result, int)

        # Test from cache (second call)
        result2 = get_setting("int_setting")
        self.assertEqual(result2, 42)
        self.assertIsInstance(result2, int)

        # Test boolean setting
        set_setting("bool_setting", True, value_type="BOOLEAN", user=self.user)
        result = get_setting("bool_setting")
        self.assertTrue(result)
        self.assertIsInstance(result, bool)

        # Test JSON setting
        json_data = {"key": "value", "number": 123}
        set_setting("json_setting", json_data, value_type="JSON", user=self.user)
        result = get_setting("json_setting")
        self.assertEqual(result, json_data)
        self.assertIsInstance(result, dict)


class TestGracefulDegradation(SettingsAPITestCase):
    """Test graceful degradation when Redis is unavailable."""

    @patch("settings.cache.cache")
    def test_database_fallback_when_cache_fails(self, mock_cache):
        """Test fallback to database when cache operations fail."""
        # Make cache operations raise exceptions
        mock_cache.get.side_effect = Exception("Redis unavailable")
        mock_cache.set.side_effect = Exception("Redis unavailable")

        # Create a flag in the database
        FeatureFlag.objects.create(key="fallback_flag", enabled=True, scope_type=ScopeType.GLOBAL)

        # Should still work by querying database
        result = get_flag("fallback_flag")
        self.assertTrue(result)

    @override_settings(SETTINGS_CACHE_ENABLED=False)
    def test_cache_disabled_setting(self):
        """Test that system works when caching is disabled."""
        FeatureFlag.objects.create(key="no_cache_flag", enabled=True, scope_type=ScopeType.GLOBAL)

        result = get_flag("no_cache_flag")
        self.assertTrue(result)


class TestPubSubInvalidation(SettingsAPITestCase):
    """Test Redis pub/sub invalidation."""

    @patch("django_redis.get_redis_connection")
    def test_publish_invalidation_message(self, mock_get_redis):
        """Test that invalidation messages are published."""
        mock_redis = MagicMock()
        mock_get_redis.return_value = mock_redis

        # Set a flag (should publish invalidation)
        set_flag("pubsub_flag", True, user=self.user)

        # Verify publish was called
        mock_redis.publish.assert_called()

        # Check the message format
        call_args = mock_redis.publish.call_args
        channel = call_args[0][0]
        cache_key = call_args[0][1]

        self.assertIn("settings:invalidate", channel)
        self.assertIn("flag", cache_key)
        self.assertIn("pubsub_flag", cache_key)

    @patch("django_redis.get_redis_connection")
    def test_graceful_degradation_pubsub_failure(self, mock_get_redis):
        """Test graceful degradation when pub/sub fails."""
        mock_get_redis.side_effect = Exception("Redis unavailable")

        # Should not raise exception
        result = publish_invalidation("test_key")
        self.assertFalse(result)  # Should return False on failure


class TestCachePerformance(SettingsAPITestCase):
    """Test cache performance requirements."""

    def setUp(self):
        super().setUp()
        cache.clear()

        # Create test data
        self.flag = FeatureFlag.objects.create(
            key="perf_flag", enabled=True, scope_type=ScopeType.GLOBAL
        )

    def test_cache_hit_ratio(self):
        """Test that cache hit ratio meets >90% requirement."""
        cache_hits = 0
        total_calls = 100

        # First call to populate cache
        get_flag("perf_flag")

        # Make many calls - should hit cache
        for i in range(total_calls):
            result = get_flag("perf_flag")
            self.assertTrue(result)

            # Check if value is in cache (indicates cache hit)
            cache_key = generate_cache_key("flag", "perf_flag", "global", None)
            if get_cached_value(cache_key) is not None:
                cache_hits += 1

        hit_ratio = cache_hits / total_calls
        self.assertGreater(
            hit_ratio, 0.90, f"Cache hit ratio {hit_ratio:.2%} is below 90% requirement"
        )

    def test_response_time_requirements(self):
        """Test response time requirements (<5ms p95 for cached queries)."""
        import time

        # First call to populate cache
        get_flag("perf_flag")

        # Measure response times for cached calls
        response_times = []
        for _ in range(100):
            start_time = time.perf_counter()
            get_flag("perf_flag")
            end_time = time.perf_counter()
            response_times.append((end_time - start_time) * 1000)  # Convert to milliseconds

        # Calculate p95
        response_times.sort()
        p95_index = int(0.95 * len(response_times))
        p95_time = response_times[p95_index]

        # P95 should be under 5ms for cached queries
        self.assertLess(
            p95_time, 5.0, f"P95 response time {p95_time:.2f}ms exceeds 5ms requirement"
        )


class TestEdgeCases(SettingsAPITestCase):
    """Test edge cases and error conditions."""

    def test_invalid_project_id_graceful_handling(self):
        """Test graceful handling of invalid project IDs."""
        invalid_project_id = 99999  # Project ID that doesn't exist

        # Should not raise exception
        result = get_flag("test_flag", project_id=invalid_project_id, default=False)
        self.assertFalse(result)

    def test_mixed_scope_types_in_hierarchy(self):
        """Test hierarchy resolution with mixed scope types."""
        # Create flags at different scopes
        FeatureFlag.objects.create(key="mixed_flag", enabled=False, scope_type=ScopeType.GLOBAL)

        FeatureFlag.objects.create(
            key="mixed_flag",
            enabled=True,
            scope_type=ScopeType.PROJECT,
            organisation=self.org,
            project=self.project,
        )

        # Should skip missing org level and get project level
        result = get_flag("mixed_flag", project_id=self.project.id)
        self.assertTrue(result)

    def test_cache_key_generation_consistency(self):
        """Test that cache keys are generated consistently."""
        key1 = generate_cache_key("flag", "test_key", "global", None)
        key2 = generate_cache_key("flag", "test_key", "global", None)
        self.assertEqual(key1, key2)

        # Different parameters should generate different keys
        key3 = generate_cache_key("setting", "test_key", "global", None)
        key4 = generate_cache_key("flag", "test_key", "organisation", self.org.id)

        self.assertNotEqual(key1, key3)
        self.assertNotEqual(key1, key4)
