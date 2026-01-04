"""Performance benchmarks for permission resolution and caching."""

import pytest
import time
from django.core.cache import cache
from projects.models import ProjectMembership, Project
from organisations.models import Membership as OrganisationMembership, Organisation
from projects.services.permission_resolution import PermissionResolutionService
from accounts.models import User


@pytest.mark.django_db
class TestPermissionCachingPerformance:
    """Benchmark tests for permission resolution performance."""

    @pytest.fixture(autouse=True)
    def clear_cache(self):
        """Clear cache before and after each test."""
        cache.clear()
        yield
        cache.clear()

    @pytest.fixture
    def org(self, user):
        """Create test organization with creator."""
        return Organisation.objects.create(name="Test League", slug="test-league", creator=user)

    @pytest.fixture
    def project(self, org, user):
        """Create test project."""
        return Project.objects.create(
            name="Test Project",
            slug="test-project",
            organisation=org,
            creator=user,
            is_private=False,
        )

    @pytest.fixture
    def user(self):
        """Create test user."""
        return User.objects.create_user(email="test@example.com", password="testpass123")

    def test_cold_permission_resolution_latency(self, project, user):
        """Test cold (uncached) permission resolution - target <50ms."""
        # Create explicit membership for predictable results
        ProjectMembership.objects.create(project=project, user=user, role="viewer")

        resolver = PermissionResolutionService()

        # Measure cold resolution time
        cache.clear()
        start_time = time.time()
        result = resolver.get_project_role(str(user.id), str(project.id))
        elapsed = time.time() - start_time

        # Verify result is correct
        assert result["effective_role"] == "viewer"
        assert result["source"] == "explicit_membership"

        # Validate performance target: <50ms
        assert elapsed < 0.05, f"Cold resolution {elapsed*1000:.1f}ms exceeds 50ms target"

    def test_warm_permission_resolution_latency(self, project, user):
        """Test warm (cached) permission resolution - target <5ms."""
        # Create explicit membership
        ProjectMembership.objects.create(project=project, user=user, role="editor")

        resolver = PermissionResolutionService()

        # Prime the cache
        resolver.get_project_role(str(user.id), str(project.id))

        # Measure cached resolution time (average of 10 calls)
        times = []
        for _ in range(10):
            start_time = time.time()
            result = resolver.get_project_role(str(user.id), str(project.id))
            elapsed = time.time() - start_time
            times.append(elapsed)

        avg_time = sum(times) / len(times)

        # Verify result
        assert result["effective_role"] == "editor"
        assert result["source"] == "explicit_membership"

        # Validate performance target: <5ms average
        assert avg_time < 0.005, f"Cached resolution {avg_time*1000:.1f}ms exceeds 5ms target"

    def test_cache_hit_rate(self, project, user):
        """Verify cache hit rate >80% after 100 checks."""
        # Create explicit membership
        ProjectMembership.objects.create(project=project, user=user, role="admin")

        resolver = PermissionResolutionService()

        # Track cache hits and misses manually
        cache_hits = 0
        cache_misses = 0

        # Perform 100 permission checks
        for i in range(100):
            # Check if item is in cache before resolution
            cache_key = f"permissions:user:{user.id}:project:{project.id}"
            if cache.get(cache_key) is not None:
                cache_hits += 1
            else:
                cache_misses += 1

            # Resolve permission (this will cache it if not cached)
            result = resolver.get_project_role(str(user.id), str(project.id))
            assert result["effective_role"] == "admin"

        # Calculate hit rate
        total_checks = cache_hits + cache_misses
        hit_rate = (cache_hits / total_checks) * 100 if total_checks > 0 else 0

        # Validate cache hit rate >80%
        assert (
            hit_rate >= 80.0
        ), f"Cache hit rate {hit_rate:.1f}% is below 80% target (hits={cache_hits}, misses={cache_misses})"

    def test_cache_invalidation_correctness(self, project, user):
        """Verify cache invalidates correctly on membership changes."""
        membership = ProjectMembership.objects.create(project=project, user=user, role="viewer")
        resolver = PermissionResolutionService()

        # First call - should cache viewer role
        result1 = resolver.get_project_role(str(user.id), str(project.id))
        assert result1["effective_role"] == "viewer"

        # Change role (triggers cache invalidation via signal)
        membership.role = "admin"
        membership.save()

        # Second call - should get fresh data (admin role)
        result2 = resolver.get_project_role(str(user.id), str(project.id))
        assert result2["effective_role"] == "admin"
        assert result2["source"] == "explicit_membership"

    def test_implicit_org_access_performance(self, project, user, org):
        """Test implicit org access resolution performance."""
        # Create org membership (no explicit project membership)
        OrganisationMembership.objects.create(organisation=org, user=user, role="member")

        resolver = PermissionResolutionService()

        # Measure implicit resolution time
        cache.clear()
        start_time = time.time()
        result = resolver.get_project_role(str(user.id), str(project.id))
        elapsed = time.time() - start_time

        # Verify result
        assert result["effective_role"] == "viewer"
        assert result["source"] == "implicit_org_access"

        # Should still be <50ms
        assert elapsed < 0.05, f"Implicit access {elapsed*1000:.1f}ms exceeds 50ms target"

    def test_no_n_plus_one_queries(self, django_assert_num_queries, project, user):
        """Verify no N+1 queries in permission resolution."""
        # Create explicit membership
        ProjectMembership.objects.create(project=project, user=user, role="editor")

        resolver = PermissionResolutionService()

        # Clear cache to force database query
        cache.clear()

        # First resolution should use select_related to avoid N+1
        # Expected queries:
        # 1. SELECT ProjectMembership with select_related('project')
        # Cache save is not a query
        with django_assert_num_queries(1):
            result = resolver.get_project_role(str(user.id), str(project.id))
            assert result["effective_role"] == "editor"

        # Cached resolution should have 0 queries
        with django_assert_num_queries(0):
            result2 = resolver.get_project_role(str(user.id), str(project.id))
            assert result2["effective_role"] == "editor"
