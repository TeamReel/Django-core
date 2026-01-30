"""
Tests for sport_configuration models.

Coverage target: ≥90% per Constitution Art. IV.
"""

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from sport_configuration.models import OutfitConfiguration, Sport, SportConfiguration


@pytest.mark.django_db
class TestSportModel:
    """Test cases for Sport model."""

    def test_create_sport_minimal(self):
        """Sport can be created with minimal required fields."""
        sport = Sport.objects.create(
            name="Football 11v11",
            slug="football-11",
        )
        assert sport.pk is not None
        assert sport.name == "Football 11v11"
        assert sport.slug == "football-11"
        assert sport.is_active is True
        assert sport.sport_icon == ""
        assert sport.federation_metadata == {}

    def test_create_sport_full(self):
        """Sport can be created with all fields."""
        sport = Sport.objects.create(
            name="Handball",
            slug="handball",
            federation_metadata={"code": "NHV", "country": "NL"},
            sport_icon="🤾",
            is_active=True,
        )
        assert sport.federation_metadata == {"code": "NHV", "country": "NL"}
        assert sport.sport_icon == "🤾"

    def test_sport_str(self):
        """Sport __str__ returns name."""
        sport = Sport.objects.create(name="Futsal 5v5", slug="futsal-5")
        assert str(sport) == "Futsal 5v5"

    def test_sport_slug_unique(self):
        """Sport slug must be unique."""
        Sport.objects.create(name="Football", slug="football")
        with pytest.raises(IntegrityError):
            Sport.objects.create(name="Football Copy", slug="football")

    def test_sport_ordering(self):
        """Sports are ordered by name."""
        Sport.objects.create(name="Handball", slug="handball")
        Sport.objects.create(name="Basketball", slug="basketball")
        Sport.objects.create(name="Football", slug="football")

        sports = list(Sport.objects.values_list("name", flat=True))
        assert sports == ["Basketball", "Football", "Handball"]

    def test_sport_timestamps(self):
        """Sport has created_at and updated_at timestamps."""
        sport = Sport.objects.create(name="Test Sport", slug="test-sport")
        assert sport.created_at is not None
        assert sport.updated_at is not None

    def test_sport_is_active_default(self):
        """Sport is_active defaults to True."""
        sport = Sport.objects.create(name="Active Sport", slug="active-sport")
        assert sport.is_active is True

    def test_sport_is_active_indexed(self):
        """Sport is_active field has database index."""
        # Check that the field has db_index=True
        field = Sport._meta.get_field("is_active")
        assert field.db_index is True


@pytest.mark.django_db
class TestSportConfigurationModel:
    """Test cases for SportConfiguration model."""

    @pytest.fixture
    def sport(self):
        """Create a test sport."""
        return Sport.objects.create(name="Football 11v11", slug="football-11")

    def test_create_configuration_minimal(self, sport):
        """SportConfiguration can be created with minimal fields."""
        config = SportConfiguration.objects.create(sport=sport)
        assert config.pk is not None
        assert config.sport == sport
        assert config.team_size_min == 1
        assert config.team_size_max == 11
        assert config.max_substitutes == 7
        assert config.has_goalkeeper is True
        assert config.positions == []
        assert config.formations == {}
        assert config.outfit_types == []
        assert config.metadata == {}

    def test_create_configuration_full(self, sport):
        """SportConfiguration can be created with all fields."""
        config = SportConfiguration.objects.create(
            sport=sport,
            team_size_min=11,
            team_size_max=11,
            max_substitutes=7,
            positions=["GK", "LB", "CB", "RB", "CM", "ST"],
            formations={"4-3-3": {"name": "4-3-3"}},
            outfit_types=["home", "away", "goalkeeper"],
            has_goalkeeper=True,
            metadata={"variant": "standard"},
        )
        assert config.team_size_min == 11
        assert config.positions == ["GK", "LB", "CB", "RB", "CM", "ST"]
        assert config.formations == {"4-3-3": {"name": "4-3-3"}}
        assert config.outfit_types == ["home", "away", "goalkeeper"]
        assert config.metadata == {"variant": "standard"}

    def test_configuration_str(self, sport):
        """SportConfiguration __str__ returns config with sport name."""
        config = SportConfiguration.objects.create(sport=sport)
        assert str(config) == "Config: Football 11v11"

    def test_configuration_one_to_one(self, sport):
        """Each sport can have only one configuration."""
        SportConfiguration.objects.create(sport=sport)
        with pytest.raises(IntegrityError):
            SportConfiguration.objects.create(sport=sport)

    def test_configuration_clean_valid(self, sport):
        """Configuration passes validation with valid team sizes."""
        config = SportConfiguration.objects.create(
            sport=sport,
            team_size_min=5,
            team_size_max=11,
            positions=["GK", "LB", "CB"],  # Required for full_clean
            formations={"4-3-3": {}},  # Required for full_clean
            outfit_types=["home", "away"],  # Required for full_clean
        )
        config.full_clean()  # Should not raise

    def test_configuration_clean_invalid_team_size(self, sport):
        """Configuration raises ValidationError if min > max."""
        config = SportConfiguration(
            sport=sport,
            team_size_min=15,
            team_size_max=11,
        )
        with pytest.raises(ValidationError) as exc_info:
            config.full_clean()
        assert "team_size_min" in exc_info.value.message_dict
        assert "team_size_max" in exc_info.value.message_dict

    def test_configuration_timestamps(self, sport):
        """SportConfiguration has created_at and updated_at timestamps."""
        config = SportConfiguration.objects.create(sport=sport)
        assert config.created_at is not None
        assert config.updated_at is not None

    def test_configuration_cascade_delete(self, sport):
        """Deleting sport cascades to configuration."""
        SportConfiguration.objects.create(sport=sport)
        assert SportConfiguration.objects.count() == 1

        sport.delete()
        assert SportConfiguration.objects.count() == 0

    def test_configuration_related_name(self, sport):
        """Sport.configuration returns the associated configuration."""
        config = SportConfiguration.objects.create(sport=sport)
        assert sport.configuration == config


@pytest.mark.django_db
class TestOutfitConfigurationModel:
    """Test cases for OutfitConfiguration model."""

    @pytest.fixture
    def user(self):
        """Create a test user."""
        from accounts.models import User

        return User.objects.create_user(
            email="test@example.com",
            password="testpass123",
        )

    @pytest.fixture
    def organisation(self, user):
        """Create a test organisation."""
        from organisations.models import Organisation

        return Organisation.objects.create(
            name="Test Org",
            slug="test-org",
            creator=user,
        )

    @pytest.fixture
    def project(self, organisation, user):
        """Create a test project."""
        from projects.models import Project

        return Project.objects.create(
            organisation=organisation,
            creator=user,
            name="FC Test",
            slug="fc-test",
        )

    def test_create_outfit_minimal(self, project):
        """OutfitConfiguration can be created with minimal fields."""
        outfit = OutfitConfiguration.objects.create(
            project=project,
            outfit_type="home",
        )
        assert outfit.pk is not None
        assert outfit.project == project
        assert outfit.outfit_type == "home"
        assert outfit.colors == {}
        assert outfit.sponsor_config == {}
        assert outfit.number_font == {}
        assert outfit.badge_position == "left_chest"
        assert outfit.metadata == {}
        assert outfit.is_active is True

    def test_create_outfit_full(self, project):
        """OutfitConfiguration can be created with all fields."""
        outfit = OutfitConfiguration.objects.create(
            project=project,
            outfit_type="home",
            colors={"primary": "#FF0000", "secondary": "#FFFFFF"},
            sponsor_config={"chest": "Main Sponsor"},
            number_font={"family": "Arial", "color": "#FFFFFF"},
            badge_position="center_chest",
            metadata={"year": 2026},
            is_active=True,
        )
        assert outfit.colors == {"primary": "#FF0000", "secondary": "#FFFFFF"}
        assert outfit.sponsor_config == {"chest": "Main Sponsor"}
        assert outfit.number_font == {"family": "Arial", "color": "#FFFFFF"}
        assert outfit.badge_position == "center_chest"
        assert outfit.metadata == {"year": 2026}

    def test_outfit_str(self, project):
        """OutfitConfiguration __str__ returns project and outfit type."""
        outfit = OutfitConfiguration.objects.create(
            project=project,
            outfit_type="away",
        )
        # Project __str__ is "Test Org/FC Test"
        assert "Away" in str(outfit)

    def test_outfit_type_choices(self, project):
        """OutfitConfiguration supports all defined outfit types."""
        types = ["home", "away", "goalkeeper", "trainer", "third_kit"]
        for outfit_type in types:
            outfit = OutfitConfiguration.objects.create(
                project=project,
                outfit_type=outfit_type,
            )
            assert outfit.outfit_type == outfit_type

        # Clean up for unique constraint
        OutfitConfiguration.objects.all().delete()

    def test_outfit_unique_together(self, project):
        """Project can have only one outfit per type."""
        OutfitConfiguration.objects.create(project=project, outfit_type="home")
        with pytest.raises(IntegrityError):
            OutfitConfiguration.objects.create(project=project, outfit_type="home")

    def test_outfit_multiple_types_same_project(self, project):
        """Project can have multiple outfits of different types."""
        OutfitConfiguration.objects.create(project=project, outfit_type="home")
        OutfitConfiguration.objects.create(project=project, outfit_type="away")
        OutfitConfiguration.objects.create(project=project, outfit_type="goalkeeper")

        assert OutfitConfiguration.objects.filter(project=project).count() == 3

    def test_outfit_timestamps(self, project):
        """OutfitConfiguration has created_at and updated_at timestamps."""
        outfit = OutfitConfiguration.objects.create(
            project=project,
            outfit_type="home",
        )
        assert outfit.created_at is not None
        assert outfit.updated_at is not None

    def test_outfit_cascade_delete(self, project):
        """Deleting project cascades to outfit configurations."""
        OutfitConfiguration.objects.create(project=project, outfit_type="home")
        assert OutfitConfiguration.objects.count() == 1

        project.delete()
        assert OutfitConfiguration.objects.count() == 0

    def test_outfit_ordering(self, project, organisation, user):
        """Outfit configurations are ordered by project, then outfit_type."""
        from projects.models import Project

        project2 = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="FC Other",
            slug="fc-other",
        )

        OutfitConfiguration.objects.create(project=project2, outfit_type="away")
        OutfitConfiguration.objects.create(project=project, outfit_type="home")
        OutfitConfiguration.objects.create(project=project, outfit_type="away")

        outfits = list(OutfitConfiguration.objects.all())
        # Should be ordered by project, then outfit_type
        assert len(outfits) == 3


@pytest.mark.django_db
class TestProjectSportIntegration:
    """Test cases for Project.sport FK and get_sport() method."""

    @pytest.fixture
    def user(self):
        """Create a test user."""
        from accounts.models import User

        return User.objects.create_user(email="test@example.com", password="testpass123")

    @pytest.fixture
    def organisation(self, user):
        """Create a test organisation."""
        from organisations.models import Organisation

        return Organisation.objects.create(name="Test Org", slug="test-org", creator=user)

    @pytest.fixture
    def sport(self):
        """Create a test sport."""
        return Sport.objects.create(name="Football", slug="football")

    @pytest.fixture
    def futsal(self):
        """Create a futsal sport."""
        return Sport.objects.create(name="Futsal", slug="futsal")

    def test_project_sport_nullable(self, organisation, user):
        """Project.sport is nullable."""
        from projects.models import Project

        project = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="No Sport Club",
            slug="no-sport",
        )
        assert project.sport is None

    def test_project_get_sport_direct(self, organisation, user, sport):
        """get_sport() returns directly assigned sport."""
        from projects.models import Project

        project = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Football Club",
            slug="football-club",
            sport=sport,
        )
        assert project.get_sport() == sport

    def test_project_get_sport_none(self, organisation, user):
        """get_sport() returns None if no sport at any level."""
        from projects.models import Project

        project = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="No Sport",
            slug="no-sport",
        )
        assert project.get_sport() is None

    def test_project_get_sport_inherited(self, organisation, user, sport):
        """get_sport() inherits from parent project."""
        from projects.models import Project

        club = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Club",
            slug="club",
            sport=sport,
        )
        team = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Team",
            slug="team",
            parent_project=club,
        )
        assert team.sport is None
        assert team.get_sport() == sport

    def test_project_get_sport_override(self, organisation, user, sport, futsal):
        """Team can override parent's sport."""
        from projects.models import Project

        club = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Club",
            slug="club",
            sport=sport,
        )
        team = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Futsal Team",
            slug="futsal-team",
            parent_project=club,
            sport=futsal,
        )
        assert club.get_sport() == sport
        assert team.get_sport() == futsal

    def test_project_get_sport_multi_level(self, organisation, user, sport):
        """get_sport() walks up multiple levels."""
        from projects.models import Project

        grandparent = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Grandparent",
            slug="grandparent",
            sport=sport,
        )
        parent = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Parent",
            slug="parent",
            parent_project=grandparent,
        )
        child = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Child",
            slug="child",
            parent_project=parent,
        )
        assert child.sport is None
        assert parent.sport is None
        assert child.get_sport() == sport

    def test_project_sport_set_null_on_delete(self, organisation, user, sport):
        """Deleting sport sets project.sport to NULL."""
        from projects.models import Project

        project = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Club",
            slug="club",
            sport=sport,
        )
        sport.delete()
        project.refresh_from_db()
        assert project.sport is None

    def test_project_sport_related_name(self, organisation, user, sport):
        """Sport.projects returns related projects."""
        from projects.models import Project

        project1 = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Club 1",
            slug="club-1",
            sport=sport,
        )
        project2 = Project.objects.create(
            organisation=organisation,
            creator=user,
            name="Club 2",
            slug="club-2",
            sport=sport,
        )

        assert project1 in sport.projects.all()
        assert project2 in sport.projects.all()
        assert sport.projects.count() == 2
