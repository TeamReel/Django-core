"""
Tests for OutfitLookupService.

Coverage target: ≥85% per Constitution Art. IV.
Tests inheritance fallback logic (PL-2).
"""

import pytest
from sport_configuration.models import OutfitConfiguration, Sport, SportConfiguration
from sport_configuration.services import OutfitLookupService


@pytest.fixture
def user():
    """Create test user."""
    from accounts.models import User

    return User.objects.create_user(
        email="outfit-test@example.com",
        password="testpass123",
    )


@pytest.fixture
def organisation(user):
    """Create test organisation."""
    from organisations.models import Organisation

    return Organisation.objects.create(
        name="Outfit Test Org",
        slug="outfit-test-org",
        creator=user,
    )


@pytest.fixture
def sport():
    """Create test sport."""
    return Sport.objects.create(
        name="Football",
        slug="football-outfit-test",
    )


@pytest.fixture
def sport_config(sport):
    """Create sport configuration with outfit types."""
    return SportConfiguration.objects.create(
        sport=sport,
        team_size_min=11,
        team_size_max=25,
        positions=["GK", "CB", "ST"],
        formations={"4-3-3": {}},
        outfit_types=["home", "away", "goalkeeper"],
    )


@pytest.fixture
def club(organisation, user, sport):
    """Create a club (parent project) with sport."""
    from projects.models import Project

    return Project.objects.create(
        organisation=organisation,
        creator=user,
        name="Test Club",
        slug="test-club",
        sport=sport,
    )


@pytest.fixture
def team(organisation, user, club):
    """Create a team (child project) under club."""
    from projects.models import Project

    return Project.objects.create(
        organisation=organisation,
        creator=user,
        name="Test Team",
        slug="test-team",
        parent_project=club,
    )


@pytest.fixture
def club_home_outfit(club):
    """Create home outfit for club."""
    return OutfitConfiguration.objects.create(
        project=club,
        outfit_type="home",
        colors={"primary": "#FF0000", "secondary": "#FFFFFF"},
        sponsor_config={"main": "Club Sponsor"},
        number_font="Arial",
        badge_position="left",
    )


@pytest.fixture
def club_away_outfit(club):
    """Create away outfit for club."""
    return OutfitConfiguration.objects.create(
        project=club,
        outfit_type="away",
        colors={"primary": "#0000FF", "secondary": "#FFFFFF"},
        sponsor_config={"main": "Club Sponsor"},
        number_font="Arial",
        badge_position="left",
    )


@pytest.fixture
def team_home_outfit(team):
    """Create home outfit for team (overrides club)."""
    return OutfitConfiguration.objects.create(
        project=team,
        outfit_type="home",
        colors={"primary": "#00FF00", "secondary": "#000000"},
        sponsor_config={"main": "Team Sponsor"},
        number_font="Helvetica",
        badge_position="right",
    )


@pytest.fixture
def service():
    """Create OutfitLookupService instance."""
    return OutfitLookupService()


@pytest.mark.django_db
class TestGetOutfit:
    """Test cases for get_outfit method."""

    def test_get_outfit_direct(self, service, club, club_home_outfit):
        """get_outfit returns project's own outfit config."""
        outfit = service.get_outfit(club, "home")
        assert outfit is not None
        assert outfit.id == club_home_outfit.id
        assert outfit.colors["primary"] == "#FF0000"

    def test_get_outfit_not_found(self, service, club):
        """get_outfit returns None when outfit doesn't exist."""
        outfit = service.get_outfit(club, "third")
        assert outfit is None

    def test_get_outfit_inherited(self, service, team, club_home_outfit):
        """get_outfit falls back to parent outfit."""
        outfit = service.get_outfit(team, "home")
        assert outfit is not None
        assert outfit.id == club_home_outfit.id
        assert outfit.project_id == club_home_outfit.project_id

    def test_get_outfit_override(self, service, team, club_home_outfit, team_home_outfit):
        """get_outfit returns team's outfit when it exists (overrides club)."""
        outfit = service.get_outfit(team, "home")
        assert outfit is not None
        assert outfit.id == team_home_outfit.id
        assert outfit.colors["primary"] == "#00FF00"

    def test_get_outfit_inactive_skipped(self, service, club):
        """get_outfit skips inactive outfit configs."""
        OutfitConfiguration.objects.create(
            project=club,
            outfit_type="third",
            colors={"primary": "#PURPLE"},
            is_active=False,
        )
        outfit = service.get_outfit(club, "third")
        assert outfit is None


@pytest.mark.django_db
class TestGetAllOutfits:
    """Test cases for get_all_outfits method."""

    def test_get_all_outfits_single_project(
        self, service, club, club_home_outfit, club_away_outfit
    ):
        """get_all_outfits returns all outfits for project."""
        outfits = service.get_all_outfits(club)
        assert len(outfits) == 2
        assert "home" in outfits
        assert "away" in outfits
        assert outfits["home"].id == club_home_outfit.id
        assert outfits["away"].id == club_away_outfit.id

    def test_get_all_outfits_with_inheritance(
        self, service, team, club_home_outfit, club_away_outfit
    ):
        """get_all_outfits inherits parent outfits."""
        outfits = service.get_all_outfits(team)
        assert len(outfits) == 2
        assert "home" in outfits
        assert "away" in outfits

    def test_get_all_outfits_with_override(
        self, service, team, club_home_outfit, club_away_outfit, team_home_outfit
    ):
        """get_all_outfits shows team outfit overriding club."""
        outfits = service.get_all_outfits(team)
        assert len(outfits) == 2
        # Home should be team's version
        assert outfits["home"].id == team_home_outfit.id
        assert outfits["home"].colors["primary"] == "#00FF00"
        # Away should be inherited from club
        assert outfits["away"].id == club_away_outfit.id

    def test_get_all_outfits_empty(self, service, club):
        """get_all_outfits returns empty dict when no outfits."""
        outfits = service.get_all_outfits(club)
        assert outfits == {}


@pytest.mark.django_db
class TestGetResolvedOutfitData:
    """Test cases for get_resolved_outfit_data method."""

    def test_resolved_data_direct(self, service, club, club_home_outfit):
        """Resolved data shows not inherited for own outfit."""
        data = service.get_resolved_outfit_data(club, "home")
        assert data["outfit_type"] == "home"
        assert data["colors"]["primary"] == "#FF0000"
        assert data["inherited"] is False
        assert data["source_project_id"] == club.id

    def test_resolved_data_inherited(self, service, team, club_home_outfit):
        """Resolved data shows inherited flag when from parent."""
        data = service.get_resolved_outfit_data(team, "home")
        assert data["outfit_type"] == "home"
        assert data["inherited"] is True
        assert data["source_project_id"] == club_home_outfit.project_id

    def test_resolved_data_not_found(self, service, club):
        """Resolved data returns empty dict when not found."""
        data = service.get_resolved_outfit_data(club, "nonexistent")
        assert data == {}

    def test_resolved_data_includes_all_fields(self, service, club, club_home_outfit):
        """Resolved data includes all expected fields."""
        data = service.get_resolved_outfit_data(club, "home")
        expected_keys = [
            "outfit_type",
            "colors",
            "sponsor_config",
            "number_font",
            "badge_position",
            "source_project_id",
            "inherited",
        ]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"


@pytest.mark.django_db
class TestGetAllResolvedOutfits:
    """Test cases for get_all_resolved_outfits method."""

    def test_get_all_resolved_outfits(
        self, service, team, club_home_outfit, club_away_outfit, team_home_outfit
    ):
        """get_all_resolved_outfits returns resolved data for all outfits."""
        data = service.get_all_resolved_outfits(team)
        assert len(data) == 2

        # Home is team's (not inherited)
        assert data["home"]["inherited"] is False
        assert data["home"]["source_project_id"] == team.id

        # Away is club's (inherited)
        assert data["away"]["inherited"] is True
        assert data["away"]["source_project_id"] == club_away_outfit.project_id


@pytest.mark.django_db
class TestHasOutfit:
    """Test cases for has_outfit method."""

    def test_has_outfit_true_direct(self, service, club, club_home_outfit):
        """has_outfit returns True when outfit exists directly."""
        assert service.has_outfit(club, "home") is True

    def test_has_outfit_true_inherited(self, service, team, club_home_outfit):
        """has_outfit returns True when outfit is inherited."""
        assert service.has_outfit(team, "home") is True

    def test_has_outfit_false(self, service, club):
        """has_outfit returns False when outfit doesn't exist."""
        assert service.has_outfit(club, "nonexistent") is False


@pytest.mark.django_db
class TestGetMissingOutfitTypes:
    """Test cases for get_missing_outfit_types method."""

    def test_missing_with_explicit_required(self, service, club, club_home_outfit):
        """Returns missing types from explicit required list."""
        missing = service.get_missing_outfit_types(club, required_types=["home", "away", "third"])
        assert "home" not in missing
        assert "away" in missing
        assert "third" in missing

    def test_missing_from_sport_config(self, service, club, club_home_outfit, sport_config):
        """Returns missing types from sport configuration."""
        # Sport config requires: home, away, goalkeeper
        missing = service.get_missing_outfit_types(club)
        assert "home" not in missing  # club has home
        assert "away" in missing
        assert "goalkeeper" in missing

    def test_missing_all_present(self, service, club, club_home_outfit, club_away_outfit):
        """Returns empty list when all required types present."""
        missing = service.get_missing_outfit_types(club, required_types=["home", "away"])
        assert missing == []

    def test_missing_inherited_counts(self, service, team, club_home_outfit, club_away_outfit):
        """Inherited outfits count as present."""
        missing = service.get_missing_outfit_types(team, required_types=["home", "away", "third"])
        assert "home" not in missing  # inherited from club
        assert "away" not in missing  # inherited from club
        assert "third" in missing

    def test_missing_no_sport_config(self, service, organisation, user):
        """Returns empty when no sport config and no explicit list."""
        from projects.models import Project

        project = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="No Sport Project",
            slug="no-sport-proj",
        )
        missing = service.get_missing_outfit_types(project)
        assert missing == []
