"""
Tests for SportValidationService.

Coverage target: ≥85% per Constitution Art. IV.
"""

import pytest
from sport_configuration.models import Sport, SportConfiguration
from sport_configuration.services import (
    SportValidationService,
    ValidationLevel,
    ValidationResult,
)


@pytest.fixture
def sport():
    """Create a test sport."""
    return Sport.objects.create(
        name="Football 11v11",
        slug="football-11",
    )


@pytest.fixture
def sport_config(sport):
    """Create a test sport configuration with full data."""
    return SportConfiguration.objects.create(
        sport=sport,
        team_size_min=11,
        team_size_max=25,
        max_substitutes=5,
        positions=["GK", "CB", "LB", "RB", "CM", "CDM", "CAM", "LW", "RW", "ST"],
        formations={
            "4-3-3": {"defenders": 4, "midfielders": 3, "forwards": 3},
            "4-4-2": {"defenders": 4, "midfielders": 4, "forwards": 2},
            "3-5-2": {"defenders": 3, "midfielders": 5, "forwards": 2},
        },
        outfit_types=["home", "away", "third", "goalkeeper"],
        has_goalkeeper=True,
    )


@pytest.fixture
def service():
    """Create SportValidationService instance."""
    return SportValidationService()


@pytest.mark.django_db
class TestValidationResult:
    """Test cases for ValidationResult dataclass."""

    def test_create_valid_result(self):
        """ValidationResult starts as valid with no issues."""
        result = ValidationResult()
        assert result.is_valid is True
        assert result.issues == []
        assert result.has_errors is False
        assert result.has_warnings is False

    def test_add_warning_does_not_invalidate(self):
        """Adding warning doesn't set is_valid to False (CL-1)."""
        result = ValidationResult()
        result.add_warning("TEST", "Test warning")
        assert result.is_valid is True
        assert result.has_warnings is True
        assert len(result.issues) == 1
        assert result.issues[0].level == ValidationLevel.WARNING

    def test_add_error_invalidates(self):
        """Adding error sets is_valid to False."""
        result = ValidationResult()
        result.add_error("TEST", "Test error")
        assert result.is_valid is False
        assert result.has_errors is True
        assert len(result.issues) == 1
        assert result.issues[0].level == ValidationLevel.ERROR

    def test_add_info(self):
        """Adding info doesn't affect validity."""
        result = ValidationResult()
        result.add_info("TEST", "Test info")
        assert result.is_valid is True
        assert result.has_warnings is False
        assert len(result.issues) == 1
        assert result.issues[0].level == ValidationLevel.INFO

    def test_merge_results(self):
        """Merge combines issues from both results."""
        result1 = ValidationResult()
        result1.add_warning("WARN1", "Warning 1")

        result2 = ValidationResult()
        result2.add_error("ERR1", "Error 1")

        result1.merge(result2)
        assert result1.is_valid is False
        assert len(result1.issues) == 2
        assert result1.has_warnings is True
        assert result1.has_errors is True

    def test_to_dict(self):
        """to_dict produces serializable output."""
        result = ValidationResult()
        result.add_warning("TEST", "Test message", field="test_field")

        data = result.to_dict()
        assert data["is_valid"] is True
        assert data["has_warnings"] is True
        assert len(data["issues"]) == 1
        assert data["issues"][0]["code"] == "TEST"
        assert data["issues"][0]["field"] == "test_field"

    def test_warnings_property(self):
        """warnings property returns only warning issues."""
        result = ValidationResult()
        result.add_warning("WARN1", "Warning 1")
        result.add_error("ERR1", "Error 1")
        result.add_info("INFO1", "Info 1")

        warnings = result.warnings
        assert len(warnings) == 1
        assert warnings[0].code == "WARN1"

    def test_errors_property(self):
        """errors property returns only error issues."""
        result = ValidationResult()
        result.add_warning("WARN1", "Warning 1")
        result.add_error("ERR1", "Error 1")

        errors = result.errors
        assert len(errors) == 1
        assert errors[0].code == "ERR1"


@pytest.mark.django_db
class TestValidateTeamSize:
    """Test cases for validate_team_size method."""

    def test_valid_team_size(self, service, sport_config):
        """Valid team size returns no warnings."""
        result = service.validate_team_size(sport_config, player_count=15)
        assert result.is_valid is True
        assert len(result.issues) == 0

    def test_team_at_minimum(self, service, sport_config):
        """Team at exact minimum is valid."""
        result = service.validate_team_size(sport_config, player_count=11)
        assert result.is_valid is True
        assert len(result.issues) == 0

    def test_team_at_maximum(self, service, sport_config):
        """Team at exact maximum is valid."""
        result = service.validate_team_size(sport_config, player_count=25)
        assert result.is_valid is True
        assert len(result.issues) == 0

    def test_team_too_small(self, service, sport_config):
        """Team below minimum gets warning (not error per CL-1)."""
        result = service.validate_team_size(sport_config, player_count=8)
        assert result.is_valid is True  # Still valid per CL-1
        assert result.has_warnings is True
        assert result.issues[0].code == "TEAM_TOO_SMALL"
        assert result.issues[0].context["player_count"] == 8
        assert result.issues[0].context["min"] == 11

    def test_team_too_large(self, service, sport_config):
        """Team above maximum gets warning (not error per CL-1)."""
        result = service.validate_team_size(sport_config, player_count=30)
        assert result.is_valid is True  # Still valid per CL-1
        assert result.has_warnings is True
        assert result.issues[0].code == "TEAM_TOO_LARGE"
        assert result.issues[0].context["player_count"] == 30
        assert result.issues[0].context["max"] == 25


@pytest.mark.django_db
class TestValidatePositions:
    """Test cases for validate_positions method."""

    def test_valid_positions(self, service, sport_config):
        """All valid positions return no warnings."""
        result = service.validate_positions(sport_config, positions=["GK", "CB", "ST"])
        assert result.is_valid is True
        assert len(result.issues) == 0

    def test_empty_positions_list(self, service, sport_config):
        """Empty positions list is valid."""
        result = service.validate_positions(sport_config, positions=[])
        assert result.is_valid is True
        assert len(result.issues) == 0

    def test_unknown_position(self, service, sport_config):
        """Unknown position gets warning."""
        result = service.validate_positions(sport_config, positions=["GK", "UNKNOWN_POS"])
        assert result.is_valid is True
        assert result.has_warnings is True
        assert result.issues[0].code == "UNKNOWN_POSITION"
        assert result.issues[0].context["position"] == "UNKNOWN_POS"

    def test_multiple_unknown_positions(self, service, sport_config):
        """Multiple unknown positions each get warnings."""
        result = service.validate_positions(sport_config, positions=["INVALID1", "INVALID2"])
        assert result.is_valid is True
        assert len(result.issues) == 2

    def test_sport_without_positions(self, service, sport):
        """Sport with no positions defined skips validation."""
        config = SportConfiguration.objects.create(
            sport=sport,
            team_size_min=5,
            team_size_max=10,
            positions=[],  # Empty positions
            formations={},
            outfit_types=[],
        )
        # Recreate with different slug to avoid conflict
        Sport.objects.filter(pk=sport.pk).delete()
        sport2 = Sport.objects.create(name="Minimal Sport", slug="minimal")
        config2 = SportConfiguration.objects.create(
            sport=sport2,
            team_size_min=5,
            team_size_max=10,
            positions=[],
            formations={},
            outfit_types=[],
        )
        result = service.validate_positions(config2, positions=["ANY"])
        assert result.is_valid is True
        assert len(result.issues) == 0


@pytest.mark.django_db
class TestValidateFormation:
    """Test cases for validate_formation method."""

    def test_valid_formation(self, service, sport_config):
        """Valid formation returns no warnings."""
        result = service.validate_formation(sport_config, formation="4-3-3")
        assert result.is_valid is True
        assert len(result.issues) == 0

    def test_unknown_formation(self, service, sport_config):
        """Unknown formation gets warning."""
        result = service.validate_formation(sport_config, formation="5-5-0")
        assert result.is_valid is True
        assert result.has_warnings is True
        assert result.issues[0].code == "UNKNOWN_FORMATION"
        assert result.issues[0].context["formation"] == "5-5-0"
        assert "4-3-3" in result.issues[0].context["available"]

    def test_sport_without_formations(self, service, sport):
        """Sport with no formations defined skips validation."""
        sport2 = Sport.objects.create(name="No Formations", slug="no-formations")
        config = SportConfiguration.objects.create(
            sport=sport2,
            team_size_min=5,
            team_size_max=10,
            positions=[],
            formations={},  # Empty formations
            outfit_types=[],
        )
        result = service.validate_formation(config, formation="any")
        assert result.is_valid is True
        assert len(result.issues) == 0


@pytest.mark.django_db
class TestValidateProject:
    """Test cases for validate_project method."""

    @pytest.fixture
    def user(self):
        """Create test user."""
        from accounts.models import User

        return User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )

    @pytest.fixture
    def organisation(self, user):
        """Create test organisation."""
        from organisations.models import Organisation

        return Organisation.objects.create(
            name="Test Org",
            slug="test-org",
            creator=user,
        )

    @pytest.fixture
    def project(self, organisation, user):
        """Create test project without sport."""
        from projects.models import Project

        return Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Test Team",
            slug="test-team",
        )

    def test_project_without_sport(self, service, project):
        """Project without sport gets warning."""
        result = service.validate_project(project)
        assert result.is_valid is True
        assert result.has_warnings is True
        assert result.issues[0].code == "NO_SPORT"

    def test_project_with_sport_no_config(self, service, project, sport):
        """Project with sport but no config gets warning."""
        project.sport = sport
        project.save()

        result = service.validate_project(project)
        assert result.is_valid is True
        assert result.has_warnings is True
        assert result.issues[0].code == "NO_CONFIG"

    def test_project_with_sport_and_config(self, service, project, sport_config):
        """Project with sport and config is valid."""
        project.sport = sport_config.sport
        project.save()

        result = service.validate_project(project)
        assert result.is_valid is True
        assert len(result.issues) == 0


@pytest.mark.django_db
class TestValidateAll:
    """Test cases for validate_all comprehensive validation."""

    @pytest.fixture
    def user(self):
        """Create test user."""
        from accounts.models import User

        return User.objects.create_user(
            email="test2@example.com",
            password="testpass123",
        )

    @pytest.fixture
    def organisation(self, user):
        """Create test organisation."""
        from organisations.models import Organisation

        return Organisation.objects.create(
            name="Test Org 2",
            slug="test-org-2",
            creator=user,
        )

    @pytest.fixture
    def project_with_sport(self, organisation, user, sport_config):
        """Create project with sport assigned."""
        from projects.models import Project

        return Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Test Team with Sport",
            slug="test-team-sport",
            sport=sport_config.sport,
        )

    def test_validate_all_everything_valid(self, service, project_with_sport):
        """All valid parameters returns no issues."""
        result = service.validate_all(
            project_with_sport,
            player_count=15,
            positions=["GK", "CB"],
            formation="4-3-3",
        )
        assert result.is_valid is True
        assert len(result.issues) == 0

    def test_validate_all_with_issues(self, service, project_with_sport):
        """Multiple issues are collected."""
        result = service.validate_all(
            project_with_sport,
            player_count=5,  # Too small
            positions=["INVALID"],  # Unknown
            formation="9-0-1",  # Unknown
        )
        assert result.is_valid is True  # Warnings don't invalidate
        assert len(result.issues) == 3

    def test_validate_all_partial_params(self, service, project_with_sport):
        """Only provided params are validated."""
        result = service.validate_all(
            project_with_sport,
            player_count=15,
            # No positions or formation
        )
        assert result.is_valid is True
        assert len(result.issues) == 0
