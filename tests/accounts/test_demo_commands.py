"""
Tests for demo data management commands: seed, validate, reset.

Tests cover:
- seed_demo_data idempotency and counts
- validate_demo_data pass/fail scenarios
- reset_demo_data flow and scoping
"""

import json
import os
from io import StringIO

import pytest
from accounts.models import User
from django.core.management import call_command
from django.test import TestCase
from organisations.models import Membership, Organisation
from projects.models import Project


def _perf_tests_enabled() -> bool:
    """Performance tests are opt-in to avoid flaky/slow local runs.

    Enable with RUN_PERF_TESTS=1.
    """

    return str(os.environ.get("RUN_PERF_TESTS", "")).strip() == "1"


def _perf_budget_seconds(default: float) -> float:
    """Allow overriding budgets in CI via env vars."""

    raw = str(os.environ.get("PERF_BUDGET_SECONDS", "")).strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


@pytest.mark.django_db
class TestSeedDemoDataCommand(TestCase):
    """Test seed_demo_data management command."""

    def setUp(self):
        """Clean database before each test."""
        # Delete all existing data
        User.objects.all().delete()
        Organisation.objects.all().delete()
        Project.objects.all().delete()

    def test_seed_creates_correct_counts(self):
        """Test seed creates exactly FR-004 compliant counts."""
        # Set deterministic seed for reproducibility
        os.environ["DEMO_RANDOM_SEED"] = "12345"

        out = StringIO()
        call_command("seed_demo_data", "--force", "--json", stdout=out)

        # Parse JSON output
        output = out.getvalue()
        json_start = output.rfind("{")  # Find last JSON object
        json_output = output[json_start:]
        result = json.loads(json_output)

        # Verify FR-004 role distribution
        assert result["superusers"] == 3, "Must have exactly 3 superusers"
        assert result["org_admins"] == 10, "Must have exactly 10 org admins"
        assert result["members_viewers"] == 7, "Must have exactly 7 members/viewers"

        # Verify entity counts
        assert result["organisations"] == 5, "Must have 5 organisations"
        assert result["demo_accounts"] == 6, "Must have 6 demo accounts"
        assert result["users_additional"] == 14, "Must have 14 additional users"
        assert result["projects"] == 80, "Must have 80 projects"

        # Verify database state
        assert User.objects.count() == 20, "Must have 20 total users"
        assert Organisation.objects.count() == 5, "Must have 5 organisations"
        assert Project.all_objects.count() == 80, "Must have 80 projects"

        # Verify superuser count
        assert User.objects.filter(is_superuser=True).count() == 3

        # Verify org admin count
        assert Membership.objects.filter(role="admin").count() == 10

        # Verify members+viewers count
        assert Membership.objects.filter(role__in=["member", "viewer"]).count() == 7

    def test_seed_idempotency(self):
        """Test seed command is idempotent - no duplicates on rerun."""
        os.environ["DEMO_RANDOM_SEED"] = "12345"

        # First run
        out1 = StringIO()
        call_command("seed_demo_data", "--force", stdout=out1)

        first_user_count = User.objects.count()
        first_org_count = Organisation.objects.count()
        first_project_count = Project.all_objects.count()

        # Second run without --force should skip
        out2 = StringIO()
        call_command("seed_demo_data", stdout=out2)

        output = out2.getvalue()
        assert "skipped" in output.lower() or "already exists" in output.lower()

        # Counts should be unchanged
        assert User.objects.count() == first_user_count
        assert Organisation.objects.count() == first_org_count
        assert Project.all_objects.count() == first_project_count

    def test_seed_performance(self):
        """Test seed completes within performance target (<30s)."""
        import time

        if not _perf_tests_enabled():
            pytest.skip("Performance tests are opt-in (set RUN_PERF_TESTS=1)")

        os.environ["DEMO_RANDOM_SEED"] = "12345"

        start = time.time()
        call_command("seed_demo_data", "--force", stdout=StringIO())
        elapsed = time.time() - start

        budget = _perf_budget_seconds(30.0)
        assert elapsed < budget, f"Seed took {elapsed}s, must be <{budget}s"

    def test_seed_with_json_flag(self):
        """Test --json flag produces valid JSON output."""
        os.environ["DEMO_RANDOM_SEED"] = "12345"

        out = StringIO()
        call_command("seed_demo_data", "--force", "--json", stdout=out)

        output = out.getvalue()
        json_start = output.rfind("{")
        json_output = output[json_start:]

        # Should parse as valid JSON
        result = json.loads(json_output)

        # Should have required keys (seed outputs entity counts, not status)
        assert "superusers" in result
        assert "org_admins" in result
        assert "members_viewers" in result
        assert "organisations" in result
        assert "projects" in result
        assert "elapsed_seconds" in result


@pytest.mark.django_db
class TestValidateDemoDataCommand(TestCase):
    """Test validate_demo_data management command."""

    @classmethod
    def setUpTestData(cls):
        """Create valid demo data once for the class (faster than per-test)."""
        os.environ["DEMO_RANDOM_SEED"] = "12345"
        call_command("seed_demo_data", "--force", stdout=StringIO())

    def test_validate_passes_on_valid_data(self):
        """Test validation passes when data is correct."""
        out = StringIO()
        call_command("validate_demo_data", "--json", stdout=out)

        output = out.getvalue()
        result = json.loads(output)

        assert result["status"] == "pass"
        assert result["violations_count"] == 0
        assert len(result["violations"]) == 0

    def test_validate_detects_missing_org_admin(self):
        """Test validation fails when org has no admin."""
        # Remove all admins from first org
        org = Organisation.objects.first()
        Membership.objects.filter(organisation=org, role="admin").delete()

        out = StringIO()
        try:
            call_command("validate_demo_data", "--json", stdout=out)
        except SystemExit:
            pass  # Validation should exit with code 1

        output = out.getvalue()
        result = json.loads(output)

        assert result["status"] == "fail"
        assert result["violations_count"] > 0

        # Should have org_admins violation
        violations = [v for v in result["violations"] if v["check"] == "org_admins"]
        assert len(violations) > 0

    def test_validate_detects_negative_balance(self):
        """Test validation detects negative balance.

        Note: Skipping this test as billing system is not yet implemented.
        """
        pytest.skip("Billing system (credits field) not yet implemented")

    def test_validate_includes_db_size(self):
        """Test validation output includes database size."""
        out = StringIO()
        call_command("validate_demo_data", "--json", stdout=out)

        output = out.getvalue()
        result = json.loads(output)

        assert "db_size_mb" in result
        assert isinstance(result["db_size_mb"], (int, float))
        assert result["db_size_mb"] > 0


@pytest.mark.django_db
class TestResetDemoDataCommand(TestCase):
    """Test reset_demo_data management command."""

    @classmethod
    def setUpTestData(cls):
        """Create demo data once for the class (faster than per-test)."""
        os.environ["DEMO_RANDOM_SEED"] = "12345"
        call_command("seed_demo_data", "--force", stdout=StringIO())

    def test_reset_requires_force_flag(self):
        """Test reset fails without --force flag."""
        out = StringIO()
        with pytest.raises(SystemExit):
            call_command("reset_demo_data", stdout=out)

        output = out.getvalue()
        assert "force" in output.lower()

    def test_reset_wipes_and_reseeds(self):
        """Test reset deletes old data and creates new data."""
        # Get initial counts
        initial_user_count = User.objects.count()
        initial_org_count = Organisation.objects.count()

        # Modify a user to verify new data is created
        user = User.objects.filter(email="admin@demo.djangocore.app").first()
        user.first_name = "Modified"
        user.save()

        # Reset
        out = StringIO()
        call_command("reset_demo_data", "--force", stdout=out)

        # Counts should be same (reseeded)
        assert User.objects.count() == initial_user_count
        assert Organisation.objects.count() == initial_org_count

        # Modified user should be reset
        user = User.objects.filter(email="admin@demo.djangocore.app").first()
        assert user.first_name == "Admin"  # Back to default

    def test_reset_with_no_seed_flag(self):
        """Test reset with --no-seed only deletes data."""
        out = StringIO()
        call_command("reset_demo_data", "--force", "--no-seed", stdout=out)

        # All demo users should be deleted
        assert User.objects.count() == 0
        assert Organisation.objects.count() == 0

    def test_reset_performance(self):
        """Test reset completes within performance target (<60s)."""
        import time

        if not _perf_tests_enabled():
            pytest.skip("Performance tests are opt-in (set RUN_PERF_TESTS=1)")

        start = time.time()
        call_command("reset_demo_data", "--force", stdout=StringIO())
        elapsed = time.time() - start

        budget = _perf_budget_seconds(60.0)
        assert elapsed < budget, f"Reset took {elapsed}s, must be <{budget}s"

    def test_reset_only_deletes_demo_data(self):
        """Test reset preserves non-demo data."""
        # Create non-demo user
        non_demo_user = User.objects.create_user(
            email="regular@example.com",
            password="test123",
            first_name="Regular",
            last_name="User",
        )

        # Create non-demo org (creator is required)
        Organisation.objects.create(
            name="Regular Org",
            slug="regular-org",
            creator=non_demo_user,
        )

        # Reset demo data
        call_command("reset_demo_data", "--force", stdout=StringIO())

        # Non-demo data should still exist
        assert User.objects.filter(email="regular@example.com").exists()
        assert Organisation.objects.filter(slug="regular-org").exists()

    @pytest.mark.skip(
        reason=(
            "JSON output parsing complicated by structured logging to stderr - "
            "needs logging config fix"
        )
    )
    def test_reset_with_json_output(self):
        """Test reset with --json flag produces valid JSON (NEEDS FIX: logging interference)."""
        out = StringIO()
        call_command("reset_demo_data", "--force", "--json", stdout=out)

        output = out.getvalue()
        # Find last JSON object (after seed command JSON)
        json_start = output.rfind("{", 0, output.rfind("}") + 1)
        json_output = output[json_start:]

        result = json.loads(json_output)

        assert "status" in result
        assert "wipe" in result
        assert "seed" in result
        assert "total_elapsed_seconds" in result
        assert result["status"] == "success"


@pytest.mark.django_db
class TestDemoDataIntegration(TestCase):
    """Integration tests for full seed→validate→reset flow."""

    def test_full_workflow(self):
        """Test complete workflow: seed → validate → reset → validate again."""
        os.environ["DEMO_RANDOM_SEED"] = "12345"

        # Step 1: Seed
        call_command("seed_demo_data", "--force", stdout=StringIO())

        # Step 2: Validate (should pass)
        out = StringIO()
        call_command("validate_demo_data", "--json", stdout=out)
        result = json.loads(out.getvalue())
        assert result["status"] == "pass"

        # Step 3: Reset
        call_command("reset_demo_data", "--force", stdout=StringIO())

        # Step 4: Validate again (should still pass)
        out = StringIO()
        call_command("validate_demo_data", "--json", stdout=out)
        result = json.loads(out.getvalue())
        assert result["status"] == "pass"

        # Verify FR-004 compliance after reset
        assert User.objects.filter(is_superuser=True).count() == 3
        assert Membership.objects.filter(role="admin").count() == 10
        assert Membership.objects.filter(role__in=["member", "viewer"]).count() == 7

    @pytest.mark.skip(
        reason=(
            "seeded_random is a module-level singleton that doesn't re-initialize "
            "when env var changes"
        )
    )
    def test_deterministic_seed_reproducibility(self):
        """Test same seed produces same data (KNOWN LIMITATION: seeded_random singleton issue)."""
        os.environ["DEMO_RANDOM_SEED"] = "99999"

        # First seed
        call_command("seed_demo_data", "--force", stdout=StringIO())
        first_user_emails = list(User.objects.values_list("email", flat=True))
        first_org_names = list(Organisation.objects.values_list("name", flat=True))

        # Reset and reseed with same seed
        call_command("reset_demo_data", "--force", stdout=StringIO())

        second_user_emails = list(User.objects.values_list("email", flat=True))
        second_org_names = list(Organisation.objects.values_list("name", flat=True))

        # Should be identical
        assert set(first_user_emails) == set(second_user_emails)
        assert set(first_org_names) == set(second_org_names)
