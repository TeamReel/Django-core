"""
Integration tests for sport configuration inheritance patterns.

Tests the Project.get_sport() inheritance chain and OutfitLookupService
inheritance behavior (Club → Team fallback).
"""

import pytest
from django.contrib.auth import get_user_model
from organisations.models import Organisation
from projects.models import Project
from sport_configuration.models import OutfitConfiguration, Sport, SportConfiguration
from sport_configuration.services.outfits import OutfitLookupService
from sport_configuration.services.validation import SportValidationService

User = get_user_model()


@pytest.fixture
def user(db) -> User:
    """Create a test user."""
    return User.objects.create_user(
        username="testuser",
        email="test@example.com",
        password="testpassword123",
    )


@pytest.fixture
def organisation(db, user: User) -> Organisation:
    """Create a test organisation."""
    return Organisation.objects.create(
        name="Test Organisation",
        slug="test-org",
        creator=user,
    )


@pytest.fixture
def football_sport(db) -> Sport:
    """Create football sport with configuration."""
    sport = Sport.objects.create(
        name="Football (11v11)",
        slug="football-11",
        sport_icon="⚽",
    )
    SportConfiguration.objects.create(
        sport=sport,
        team_size_min=11,
        team_size_max=11,
        max_substitutes=7,
        positions=["GK", "LB", "CB", "RB", "CM", "LW", "RW", "ST"],
        formations={"4-3-3": {}, "4-4-2": {}},
        outfit_types=["home", "away", "goalkeeper"],
        has_goalkeeper=True,
    )
    return sport


@pytest.fixture
def futsal_sport(db) -> Sport:
    """Create futsal sport with configuration."""
    sport = Sport.objects.create(
        name="Futsal (5v5)",
        slug="futsal-5",
        sport_icon="⚽",
    )
    SportConfiguration.objects.create(
        sport=sport,
        team_size_min=5,
        team_size_max=5,
        max_substitutes=7,
        positions=["GK", "FIXO", "ALA", "PIVOT"],
        formations={"1-2-2": {}},
        outfit_types=["home", "away", "goalkeeper"],
        has_goalkeeper=True,
    )
    return sport


@pytest.fixture
def club(db, organisation: Organisation, user: User, football_sport: Sport) -> Project:
    """Create a club project with sport assigned."""
    return Project.objects.create(
        name="FC Example",
        slug="fc-example",
        organisation=organisation,
        creator=user,
        sport=football_sport,
    )


@pytest.fixture
def team(db, organisation: Organisation, user: User, club: Project) -> Project:
    """Create a team project under the club (no sport set)."""
    return Project.objects.create(
        name="FC Example U19",
        slug="fc-example-u19",
        organisation=organisation,
        creator=user,
        parent_project=club,
    )


@pytest.mark.django_db
class TestProjectSportIntegration:
    """Tests for Project.get_sport() inheritance."""

    def test_project_sport_direct(
        self, organisation: Organisation, user: User, football_sport: Sport
    ) -> None:
        """Project with direct sport assignment returns that sport."""
        project = Project.objects.create(
            name="Direct Sport Club",
            slug="direct-sport-club",
            organisation=organisation,
            creator=user,
            sport=football_sport,
        )
        assert project.get_sport() == football_sport

    def test_project_sport_inheritance(
        self, club: Project, team: Project, football_sport: Sport
    ) -> None:
        """Team inherits sport from parent club."""
        # Team has no direct sport assigned
        assert team.sport is None
        # But get_sport() returns the parent's sport
        assert team.get_sport() == football_sport

    def test_team_can_override_sport(
        self,
        organisation: Organisation,
        user: User,
        club: Project,
        football_sport: Sport,
        futsal_sport: Sport,
    ) -> None:
        """Team can have different sport than parent."""
        # Create team with explicit sport override
        futsal_team = Project.objects.create(
            name="FC Example Futsal",
            slug="fc-example-futsal",
            organisation=organisation,
            creator=user,
            parent_project=club,
            sport=futsal_sport,
        )

        # Club still has football
        assert club.get_sport() == football_sport
        # Team overrides with futsal
        assert futsal_team.get_sport() == futsal_sport

    def test_project_no_sport(self, organisation: Organisation, user: User) -> None:
        """Project without sport returns None."""
        project = Project.objects.create(
            name="No Sport Club",
            slug="no-sport-club",
            organisation=organisation,
            creator=user,
        )
        assert project.get_sport() is None

    def test_team_no_sport_no_parent_sport(self, organisation: Organisation, user: User) -> None:
        """Team with no sport and parent with no sport returns None."""
        # Create club without sport
        club_no_sport = Project.objects.create(
            name="No Sport Club",
            slug="no-sport-club-2",
            organisation=organisation,
            creator=user,
        )
        # Create team under it
        team_no_sport = Project.objects.create(
            name="No Sport Team",
            slug="no-sport-team",
            organisation=organisation,
            creator=user,
            parent_project=club_no_sport,
        )
        assert team_no_sport.get_sport() is None


@pytest.mark.django_db
class TestOutfitInheritance:
    """Tests for OutfitLookupService inheritance patterns."""

    def test_project_own_outfit(self, club: Project) -> None:
        """Project gets its own outfit configuration."""
        # Create outfit for club
        outfit = OutfitConfiguration.objects.create(
            project=club,
            outfit_type="home",
            colors={"primary": "#FF0000", "secondary": "#FFFFFF"},
        )

        service = OutfitLookupService()
        result = service.get_outfit(club, "home")

        assert result is not None
        assert result == outfit
        assert result.colors["primary"] == "#FF0000"

    def test_outfit_inherited_from_club(self, club: Project, team: Project) -> None:
        """Team gets outfit from parent club when no own outfit."""
        # Create outfit only for club
        club_outfit = OutfitConfiguration.objects.create(
            project=club,
            outfit_type="home",
            colors={"primary": "#FF0000", "secondary": "#FFFFFF"},
        )

        service = OutfitLookupService()
        result = service.get_outfit(team, "home")

        assert result is not None
        assert result == club_outfit
        assert result.project == club  # Inherited from club

    def test_team_overrides_club_outfit(self, club: Project, team: Project) -> None:
        """Team's own outfit takes precedence over club's."""
        # Create outfit for club
        OutfitConfiguration.objects.create(
            project=club,
            outfit_type="home",
            colors={"primary": "#FF0000"},
        )
        # Create outfit for team (overrides)
        team_outfit = OutfitConfiguration.objects.create(
            project=team,
            outfit_type="home",
            colors={"primary": "#00FF00"},
        )

        service = OutfitLookupService()
        result = service.get_outfit(team, "home")

        assert result is not None
        assert result == team_outfit
        assert result.project == team  # Team's own
        assert result.colors["primary"] == "#00FF00"

    def test_outfit_not_found(self, club: Project) -> None:
        """Returns None when no outfit found at any level."""
        service = OutfitLookupService()
        result = service.get_outfit(club, "third_kit")

        assert result is None

    def test_get_all_outfits_merged(self, club: Project, team: Project) -> None:
        """get_all_outfits returns merged outfits from parent and child."""
        # Club has home and away
        OutfitConfiguration.objects.create(
            project=club,
            outfit_type="home",
            colors={"primary": "#FF0000"},
        )
        OutfitConfiguration.objects.create(
            project=club,
            outfit_type="away",
            colors={"primary": "#0000FF"},
        )
        # Team overrides home only
        OutfitConfiguration.objects.create(
            project=team,
            outfit_type="home",
            colors={"primary": "#00FF00"},
        )

        service = OutfitLookupService()
        result = service.get_all_outfits(team)

        assert "home" in result
        assert "away" in result
        # Home is team's override
        assert result["home"].project == team
        # Away is inherited from club
        assert result["away"].project == club

    def test_resolved_outfit_data_own(self, club: Project) -> None:
        """get_resolved_outfit_data marks own outfit as not inherited."""
        OutfitConfiguration.objects.create(
            project=club,
            outfit_type="home",
            colors={"primary": "#FF0000"},
        )

        service = OutfitLookupService()
        result = service.get_resolved_outfit_data(club, "home")

        assert result["inherited"] is False
        assert result["outfit_type"] == "home"
        assert result["source_project_id"] == club.id

    def test_resolved_outfit_data_inherited(self, club: Project, team: Project) -> None:
        """get_resolved_outfit_data marks inherited outfit as inherited."""
        OutfitConfiguration.objects.create(
            project=club,
            outfit_type="home",
            colors={"primary": "#FF0000"},
        )

        service = OutfitLookupService()
        result = service.get_resolved_outfit_data(team, "home")

        assert result["inherited"] is True
        assert result["source_project_id"] == club.id


@pytest.mark.django_db
class TestValidationServiceIntegration:
    """Integration tests for SportValidationService with real data."""

    def test_validate_team_size_with_config(self, football_sport: Sport) -> None:
        """Validate team size against actual sport configuration."""
        config = football_sport.configuration
        service = SportValidationService()

        # Exact match (11 players for 11v11 football)
        result = service.validate_team_size(config, player_count=11)
        assert result.is_valid is True
        assert len(result.issues) == 0

        # Below minimum
        result = service.validate_team_size(config, player_count=9)
        assert result.is_valid is True  # Warnings don't invalidate per CL-1
        assert result.has_warnings is True
        assert any("TEAM_TOO_SMALL" in i.code for i in result.issues)

    def test_validate_positions_with_config(self, football_sport: Sport) -> None:
        """Validate positions against actual sport configuration."""
        config = football_sport.configuration
        service = SportValidationService()

        # All valid positions
        result = service.validate_positions(config, positions=["GK", "CB", "ST"])
        assert result.is_valid is True
        assert len(result.issues) == 0

        # Mix of valid and unknown
        result = service.validate_positions(config, positions=["GK", "UNKNOWN_POS", "ST"])
        assert result.has_warnings is True
        assert any("UNKNOWN_POSITION" in i.code for i in result.issues)

    def test_validate_formation_with_config(self, football_sport: Sport) -> None:
        """Validate formation against actual sport configuration."""
        config = football_sport.configuration
        service = SportValidationService()

        # Known formation
        result = service.validate_formation(config, formation="4-3-3")
        assert result.is_valid is True

        # Unknown formation
        result = service.validate_formation(config, formation="9-0-1")
        assert result.has_warnings is True
        assert any("UNKNOWN_FORMATION" in i.code for i in result.issues)

    def test_validate_project_full_integration(self, club: Project, football_sport: Sport) -> None:
        """Validate a full project configuration."""
        # Ensure club has outfit
        OutfitConfiguration.objects.create(
            project=club,
            outfit_type="home",
            colors={"primary": "#FF0000"},
        )

        service = SportValidationService()
        result = service.validate_project(club)

        # Project should be valid (has sport and outfit)
        assert result.is_valid is True


@pytest.mark.django_db
class TestSportConfigurationRelationship:
    """Tests for Sport to SportConfiguration relationship."""

    def test_sport_has_configuration(self, football_sport: Sport) -> None:
        """Sport has related configuration accessible."""
        assert hasattr(football_sport, "configuration")
        config = football_sport.configuration
        assert config.team_size_min == 11
        assert config.team_size_max == 11

    def test_configuration_references_sport(self, football_sport: Sport) -> None:
        """Configuration references back to sport."""
        config = football_sport.configuration
        assert config.sport == football_sport
        assert config.sport.name == "Football (11v11)"
