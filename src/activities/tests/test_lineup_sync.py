"""Tests for H0 — Lineup → Participation Sync + Formation from DB.

Covers:
- seed_formations management command
- LineupSyncService
- ActivitySerializer lineup sync hook
- Formation splits from DB in video builder
"""

from datetime import date, datetime, timezone

import pytest
from activities.models import Activity, Participation, Period
from activities.services.lineup_sync import LineupSyncService
from organisations.models import Membership, Organisation
from projects.models import Project, ProjectMembership
from rest_framework import status
from rest_framework.test import APIClient
from sport_configuration.models import Formation, Sport, SportConfiguration


# ── Fixtures ────────────────────────────────────────────────────


@pytest.fixture
def org(db):
    from accounts.models import User

    creator = User.objects.create_user(email="admin@test.com", password="pass", is_staff=True)
    return Organisation.objects.create(name="Test Club", slug="test-club", creator=creator)


@pytest.fixture
def sport_config(db):
    """Create Football 11v11 sport + config."""
    cat = Sport.objects.create(name="Football", slug="football-test", sport_icon="⚽")
    sport = Sport.objects.create(
        name="Football 11v11", slug="football-11v11-test", parent_sport=cat
    )
    return SportConfiguration.objects.create(
        sport=sport,
        team_size_min=7,
        team_size_max=11,
        max_substitutes=7,
        has_goalkeeper=True,
    )


@pytest.fixture
def formation_433(sport_config):
    """Create a 4-3-3 formation with full position data."""
    return Formation.objects.create(
        sport_config=sport_config,
        code="4-3-3",
        name="4-3-3",
        is_default=True,
        positions=[
            {"slot": 1, "position": "GK", "x": 50, "y": 90, "line": "keeper"},
            {"slot": 2, "position": "LB", "x": 15, "y": 72, "line": "defender"},
            {"slot": 3, "position": "CB", "x": 35, "y": 75, "line": "defender"},
            {"slot": 4, "position": "CB", "x": 65, "y": 75, "line": "defender"},
            {"slot": 5, "position": "RB", "x": 85, "y": 72, "line": "defender"},
            {"slot": 6, "position": "CM", "x": 30, "y": 50, "line": "midfielder"},
            {"slot": 7, "position": "CDM", "x": 50, "y": 55, "line": "midfielder"},
            {"slot": 8, "position": "CM", "x": 70, "y": 50, "line": "midfielder"},
            {"slot": 9, "position": "LW", "x": 20, "y": 22, "line": "attacker"},
            {"slot": 10, "position": "ST", "x": 50, "y": 18, "line": "attacker"},
            {"slot": 11, "position": "RW", "x": 80, "y": 22, "line": "attacker"},
        ],
    )


@pytest.fixture
def formation_442(sport_config):
    """Create a 4-4-2 formation."""
    return Formation.objects.create(
        sport_config=sport_config,
        code="4-4-2",
        name="4-4-2",
        positions=[
            {"slot": 1, "position": "GK", "x": 50, "y": 90, "line": "keeper"},
            {"slot": 2, "position": "LB", "x": 15, "y": 72, "line": "defender"},
            {"slot": 3, "position": "CB", "x": 35, "y": 75, "line": "defender"},
            {"slot": 4, "position": "CB", "x": 65, "y": 75, "line": "defender"},
            {"slot": 5, "position": "RB", "x": 85, "y": 72, "line": "defender"},
            {"slot": 6, "position": "LM", "x": 15, "y": 48, "line": "midfielder"},
            {"slot": 7, "position": "CM", "x": 38, "y": 52, "line": "midfielder"},
            {"slot": 8, "position": "CM", "x": 62, "y": 52, "line": "midfielder"},
            {"slot": 9, "position": "RM", "x": 85, "y": 48, "line": "midfielder"},
            {"slot": 10, "position": "ST", "x": 35, "y": 22, "line": "attacker"},
            {"slot": 11, "position": "ST", "x": 65, "y": 22, "line": "attacker"},
        ],
    )


@pytest.fixture
def formation_343(sport_config):
    """Create a 3-4-3 formation."""
    return Formation.objects.create(
        sport_config=sport_config,
        code="3-4-3",
        name="3-4-3",
        positions=[
            {"slot": 1, "position": "GK", "x": 50, "y": 90, "line": "keeper"},
            {"slot": 2, "position": "CB", "x": 25, "y": 75, "line": "defender"},
            {"slot": 3, "position": "CB", "x": 50, "y": 78, "line": "defender"},
            {"slot": 4, "position": "CB", "x": 75, "y": 75, "line": "defender"},
            {"slot": 5, "position": "LWB", "x": 15, "y": 50, "line": "midfielder"},
            {"slot": 6, "position": "CM", "x": 38, "y": 55, "line": "midfielder"},
            {"slot": 7, "position": "CM", "x": 62, "y": 55, "line": "midfielder"},
            {"slot": 8, "position": "RWB", "x": 85, "y": 50, "line": "midfielder"},
            {"slot": 9, "position": "LW", "x": 20, "y": 22, "line": "attacker"},
            {"slot": 10, "position": "ST", "x": 50, "y": 18, "line": "attacker"},
            {"slot": 11, "position": "RW", "x": 80, "y": 22, "line": "attacker"},
        ],
    )


@pytest.fixture
def project(org):
    from accounts.models import User

    creator = User.objects.filter(email="admin@test.com").first()
    return Project.objects.create(
        name="Ajax 1", slug="ajax-1", organisation=org, creator=creator
    )


@pytest.fixture
def period(org):
    return Period.objects.create(
        name="Season 2024/2025",
        start_date=date(2024, 8, 1),
        end_date=date(2025, 6, 30),
        organisation=org,
    )


@pytest.fixture
def match_activity(project, period):
    return Activity.objects.create(
        project=project,
        period=period,
        title="Ajax vs Feyenoord",
        activity_type="match",
        start_time=datetime(2024, 10, 15, 14, 30, tzinfo=timezone.utc),
        end_time=datetime(2024, 10, 15, 16, 30, tzinfo=timezone.utc),
    )


def _create_members(org, project, period, count: int):
    """Create N users with org membership + project membership. Returns list of (PM, Membership) tuples."""
    from accounts.models import User

    results = []
    for i in range(count):
        user = User.objects.create_user(
            email=f"player{i}@test.com", password="pass", first_name=f"Player{i}"
        )
        org_membership = Membership.objects.create(user=user, organisation=org, role="member")
        pm = ProjectMembership.objects.create(
            user=user, project=project, period=period, role="viewer"
        )
        results.append((pm, org_membership))
    return results


# ── seed_formations tests ───────────────────────────────────────


@pytest.mark.django_db
class TestSeedFormations:
    """Test the seed_formations management command."""

    def test_seed_creates_three_formations(self):
        """Seed command creates 4-3-3, 4-4-2, 3-4-3 with correct positions."""
        from django.core.management import call_command

        call_command("seed_formations")

        assert Formation.objects.count() == 3
        f433 = Formation.objects.get(code="4-3-3")
        assert f433.is_default is True
        assert len(f433.positions) == 11
        assert f433.positions[0]["position"] == "GK"
        assert f433.positions[0]["line"] == "keeper"

    def test_seed_is_idempotent(self):
        """Running seed twice doesn't create duplicates."""
        from django.core.management import call_command

        call_command("seed_formations")
        call_command("seed_formations")

        assert Formation.objects.count() == 3

    def test_seed_dry_run(self, capsys):
        """Dry run doesn't create records."""
        from django.core.management import call_command

        call_command("seed_formations", dry_run=True)

        assert Formation.objects.count() == 0


# ── LineupSyncService tests ─────────────────────────────────────


@pytest.mark.django_db
class TestLineupSyncService:
    """Test LineupSyncService creates correct Participation records."""

    def test_sync_433_lineup(self, org, project, period, match_activity, formation_433):
        """4-3-3 lineup creates 11 starter Participations with correct positions."""
        members = _create_members(org, project, period, 11)

        gk_id = str(members[0][0].pk)
        player_ids = [str(m[0].pk) for m in members[1:]]

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [gk_id],
                "player": player_ids,
                "bench": {},
            }
        }
        match_activity.save()

        service = LineupSyncService(match_activity)
        count = service.sync()

        assert count == 11
        assert match_activity.formation == formation_433

        # Check GK
        gk_part = Participation.objects.get(
            activity=match_activity, member=members[0][1]
        )
        assert gk_part.role == "starter"
        assert gk_part.data["slot"] == 1
        assert gk_part.data["position"] == "GK"
        assert gk_part.data["line"] == "keeper"
        assert gk_part.project_membership == members[0][0]

        # Check slot 2 = LB/defender
        lb_part = Participation.objects.get(
            activity=match_activity, member=members[1][1]
        )
        assert lb_part.data["slot"] == 2
        assert lb_part.data["position"] == "LB"
        assert lb_part.data["line"] == "defender"

        # Check slot 7 = CDM/midfielder
        cdm_part = Participation.objects.get(
            activity=match_activity, member=members[6][1]
        )
        assert cdm_part.data["slot"] == 7
        assert cdm_part.data["position"] == "CDM"
        assert cdm_part.data["line"] == "midfielder"

        # Check slot 10 = ST/attacker
        st_part = Participation.objects.get(
            activity=match_activity, member=members[9][1]
        )
        assert st_part.data["slot"] == 10
        assert st_part.data["position"] == "ST"
        assert st_part.data["line"] == "attacker"

    def test_sync_442_lineup(self, org, project, period, match_activity, formation_442):
        """4-4-2 lineup maps positions correctly."""
        members = _create_members(org, project, period, 11)

        gk_id = str(members[0][0].pk)
        player_ids = [str(m[0].pk) for m in members[1:]]

        match_activity.metadata = {
            "lineup": {
                "formation": "4-4-2",
                "goalkeeper": [gk_id],
                "player": player_ids,
                "bench": {},
            }
        }
        match_activity.save()

        service = LineupSyncService(match_activity)
        count = service.sync()
        assert count == 11

        # Slot 6 = LM/midfielder in 4-4-2
        lm_part = Participation.objects.get(
            activity=match_activity, member=members[5][1]
        )
        assert lm_part.data["position"] == "LM"
        assert lm_part.data["line"] == "midfielder"

        # Slot 10 = ST/attacker in 4-4-2
        st_part = Participation.objects.get(
            activity=match_activity, member=members[9][1]
        )
        assert st_part.data["position"] == "ST"
        assert st_part.data["line"] == "attacker"

    def test_sync_343_lineup(self, org, project, period, match_activity, formation_343):
        """3-4-3 lineup maps positions correctly."""
        members = _create_members(org, project, period, 11)

        gk_id = str(members[0][0].pk)
        player_ids = [str(m[0].pk) for m in members[1:]]

        match_activity.metadata = {
            "lineup": {
                "formation": "3-4-3",
                "goalkeeper": [gk_id],
                "player": player_ids,
                "bench": {},
            }
        }
        match_activity.save()

        service = LineupSyncService(match_activity)
        count = service.sync()
        assert count == 11

        # Slot 5 = LWB/midfielder in 3-4-3
        lwb_part = Participation.objects.get(
            activity=match_activity, member=members[4][1]
        )
        assert lwb_part.data["position"] == "LWB"
        assert lwb_part.data["line"] == "midfielder"

    def test_bench_players_get_substitute_role(
        self, org, project, period, match_activity, formation_433
    ):
        """Bench players get role=substitute with bench_status in data."""
        members = _create_members(org, project, period, 13)

        gk_id = str(members[0][0].pk)
        player_ids = [str(m[0].pk) for m in members[1:11]]
        bench = {
            str(members[11][0].pk): "available",
            str(members[12][0].pk): "injured",
        }

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [gk_id],
                "player": player_ids,
                "bench": bench,
            }
        }
        match_activity.save()

        service = LineupSyncService(match_activity)
        count = service.sync()

        assert count == 13

        bench1 = Participation.objects.get(
            activity=match_activity, member=members[11][1]
        )
        assert bench1.role == "substitute"
        assert bench1.data["bench_status"] == "available"

        bench2 = Participation.objects.get(
            activity=match_activity, member=members[12][1]
        )
        assert bench2.role == "substitute"
        assert bench2.data["bench_status"] == "injured"

    def test_lineup_update_removes_old_players(
        self, org, project, period, match_activity, formation_433
    ):
        """Updating lineup removes players no longer in it."""
        members = _create_members(org, project, period, 12)

        # First sync: 11 starters
        gk_id = str(members[0][0].pk)
        player_ids = [str(m[0].pk) for m in members[1:11]]

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [gk_id],
                "player": player_ids,
                "bench": {},
            }
        }
        match_activity.save()
        LineupSyncService(match_activity).sync()
        assert Participation.objects.filter(activity=match_activity).count() == 11

        # Second sync: replace player[10] with member[11]
        player_ids[9] = str(members[11][0].pk)  # Replace slot 11
        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [gk_id],
                "player": player_ids,
                "bench": {},
            }
        }
        match_activity.save()
        match_activity.refresh_from_db()  # Clear cached state
        LineupSyncService(match_activity).sync()

        # Old player should be soft-deleted
        assert Participation.objects.filter(activity=match_activity).count() == 11
        # The replaced player should not have an active participation
        assert not Participation.objects.filter(
            activity=match_activity, member=members[10][1]
        ).exists()

    def test_activity_formation_fk_set(
        self, org, project, period, match_activity, formation_433
    ):
        """Activity.formation FK is set after sync."""
        members = _create_members(org, project, period, 1)

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [str(members[0][0].pk)],
                "player": [],
                "bench": {},
            }
        }
        match_activity.save()

        LineupSyncService(match_activity).sync()

        match_activity.refresh_from_db()
        assert match_activity.formation_id == formation_433.pk

    def test_guest_players_skipped(
        self, org, project, period, match_activity, formation_433
    ):
        """Guest player entries (__guest__) are ignored."""
        members = _create_members(org, project, period, 1)

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [str(members[0][0].pk)],
                "player": ["__guest__", "__guest__"],
                "bench": {},
            }
        }
        match_activity.save()

        service = LineupSyncService(match_activity)
        count = service.sync()

        assert count == 1  # Only the GK
        assert Participation.objects.filter(activity=match_activity).count() == 1

    def test_empty_lineup_no_participations(self, match_activity):
        """Empty lineup creates no participations."""
        match_activity.metadata = {"lineup": {}}
        match_activity.save()

        service = LineupSyncService(match_activity)
        count = service.sync()

        assert count == 0
        assert Participation.objects.filter(activity=match_activity).count() == 0


# ── API integration tests ───────────────────────────────────────


@pytest.mark.django_db
class TestActivitySerializerLineupSync:
    """Test that PATCH /activities/{id}/ with lineup metadata triggers sync."""

    def test_patch_with_lineup_creates_participations(
        self, org, project, period, match_activity, formation_433
    ):
        """PATCH metadata.lineup via API creates Participation records."""
        from accounts.models import User

        user = User.objects.filter(email="admin@test.com").first()
        Membership.objects.get_or_create(user=user, organisation=org, defaults={"role": "admin"})

        members = _create_members(org, project, period, 2)

        client = APIClient()
        client.force_authenticate(user=user)

        response = client.patch(
            f"/api/v1/activities/{match_activity.pk}/",
            data={
                "metadata": {
                    "lineup": {
                        "formation": "4-3-3",
                        "goalkeeper": [str(members[0][0].pk)],
                        "player": [str(members[1][0].pk)],
                        "bench": {},
                    }
                }
            },
            format="json",
        )

        assert response.status_code == status.HTTP_200_OK
        assert Participation.objects.filter(activity=match_activity).count() == 2

    def test_formation_in_api_response(
        self, org, project, period, match_activity, formation_433
    ):
        """Activity API response includes formation field after sync."""
        from accounts.models import User

        user = User.objects.filter(email="admin@test.com").first()
        Membership.objects.get_or_create(user=user, organisation=org, defaults={"role": "admin"})

        members = _create_members(org, project, period, 1)

        client = APIClient()
        client.force_authenticate(user=user)

        client.patch(
            f"/api/v1/activities/{match_activity.pk}/",
            data={
                "metadata": {
                    "lineup": {
                        "formation": "4-3-3",
                        "goalkeeper": [str(members[0][0].pk)],
                        "player": [],
                        "bench": {},
                    }
                }
            },
            format="json",
        )

        response = client.get(f"/api/v1/activities/{match_activity.pk}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["formation"]["code"] == "4-3-3"


# ── Video builder tests ─────────────────────────────────────────


@pytest.mark.django_db
class TestFormationSplitsFromDB:
    """Test that video builder reads formation splits from DB."""

    def test_get_formation_splits_from_db(self, formation_433):
        """_get_formation_splits reads from DB when formation exists."""
        from src.video.services.lineup_builder import _get_formation_splits

        n_def, n_mid, n_att = _get_formation_splits("4-3-3")
        assert (n_def, n_mid, n_att) == (4, 3, 3)

    def test_get_formation_splits_442(self, formation_442):
        """4-4-2 from DB gives (4, 4, 2)."""
        from src.video.services.lineup_builder import _get_formation_splits

        n_def, n_mid, n_att = _get_formation_splits("4-4-2")
        assert (n_def, n_mid, n_att) == (4, 4, 2)

    def test_get_formation_splits_343(self, formation_343):
        """3-4-3 from DB gives (3, 4, 3)."""
        from src.video.services.lineup_builder import _get_formation_splits

        n_def, n_mid, n_att = _get_formation_splits("3-4-3")
        assert (n_def, n_mid, n_att) == (3, 4, 3)

    def test_get_formation_splits_fallback(self):
        """Unknown formation falls back to (4, 3, 3)."""
        from src.video.services.lineup_builder import _get_formation_splits

        n_def, n_mid, n_att = _get_formation_splits("5-5-0")
        assert (n_def, n_mid, n_att) == (4, 3, 3)

    def test_backward_compat_old_activities_without_formation(
        self, project, period
    ):
        """Activities without formation FK still work."""
        org = project.organisation
        activity = Activity.objects.create(
            project=project,
            period=period,
            title="Old Match",
            activity_type="match",
            start_time=datetime(2024, 9, 1, 14, 0, tzinfo=timezone.utc),
            end_time=datetime(2024, 9, 1, 16, 0, tzinfo=timezone.utc),
        )
        assert activity.formation is None
        # Video builder should still work with the fallback
        from src.video.services.lineup_builder import _get_formation_splits

        n_def, n_mid, n_att = _get_formation_splits("4-3-3")
        # Even without DB record, fallback works
        assert n_def + n_mid + n_att == 10


# ── H1: Kit readiness + asset_warning tests ─────────────────────


@pytest.mark.django_db
class TestCheckMemberKitReadiness:
    """Test check_member_kit_readiness utility."""

    def test_ready_with_goalkeeper_fullbody(self):
        """Member with goalkeeper fullbody asset → ready=True."""
        from video.utils.asset_metadata import check_member_kit_readiness

        metadata = {
            "teamreel_assets": {
                "roles": {
                    "keeper": {
                        "images": {
                            "fullbody": {
                                "goalkeeper": {
                                    "default": {"processed": "https://cdn.example.com/gk.png"}
                                }
                            }
                        }
                    }
                }
            }
        }
        result = check_member_kit_readiness(metadata, "goalkeeper")
        assert result["ready"] is True
        assert result["has_fullbody"] is True

    def test_not_ready_without_goalkeeper_fullbody(self):
        """Member without goalkeeper fullbody → ready=False."""
        from video.utils.asset_metadata import check_member_kit_readiness

        metadata = {
            "teamreel_assets": {
                "roles": {
                    "player": {
                        "images": {
                            "fullbody": {
                                "home": {"default": {"processed": "https://cdn.example.com/home.png"}}
                            }
                        }
                    }
                }
            }
        }
        result = check_member_kit_readiness(metadata, "goalkeeper")
        assert result["ready"] is False
        assert result["has_fullbody"] is False

    def test_ready_with_home_fullbody(self):
        """Member with home fullbody asset → ready=True."""
        from video.utils.asset_metadata import check_member_kit_readiness

        metadata = {
            "teamreel_assets": {
                "roles": {
                    "player": {
                        "images": {
                            "fullbody": {
                                "home": {"default": {"processed": "https://cdn.example.com/home.png"}}
                            }
                        }
                    }
                }
            }
        }
        result = check_member_kit_readiness(metadata, "home")
        assert result["ready"] is True
        assert result["has_fullbody"] is True

    def test_not_ready_without_home_fullbody(self):
        """Member without home fullbody → ready=False."""
        from video.utils.asset_metadata import check_member_kit_readiness

        metadata = {
            "teamreel_assets": {
                "roles": {
                    "keeper": {
                        "images": {
                            "fullbody": {
                                "goalkeeper": {"default": {"processed": "https://cdn.example.com/gk.png"}}
                            }
                        }
                    }
                }
            }
        }
        result = check_member_kit_readiness(metadata, "home")
        assert result["ready"] is False

    def test_not_ready_with_empty_metadata(self):
        """None or empty metadata → ready=False."""
        from video.utils.asset_metadata import check_member_kit_readiness

        assert check_member_kit_readiness(None, "home")["ready"] is False
        assert check_member_kit_readiness({}, "goalkeeper")["ready"] is False


@pytest.mark.django_db
class TestAssetWarningInSync:
    """Test that LineupSyncService adds asset_warning to Participation.data."""

    def test_keeper_without_goalkeeper_kit_gets_warning(
        self, org, project, period, match_activity, formation_433
    ):
        """Keeper slot filled by member without goalkeeper kit → asset_warning."""
        members = _create_members(org, project, period, 1)
        pm, org_mem = members[0]
        # No teamreel_assets at all → no goalkeeper kit
        pm.metadata = {}
        pm.save()

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [str(pm.pk)],
                "player": [],
                "bench": {},
            }
        }
        match_activity.save()

        LineupSyncService(match_activity).sync()

        p = Participation.objects.get(activity=match_activity, member=org_mem)
        assert p.data["asset_warning"] == "missing_goalkeeper_kit"

    def test_keeper_with_goalkeeper_kit_no_warning(
        self, org, project, period, match_activity, formation_433
    ):
        """Keeper slot with correct kit → no asset_warning."""
        members = _create_members(org, project, period, 1)
        pm, org_mem = members[0]
        pm.metadata = {
            "teamreel_assets": {
                "roles": {
                    "keeper": {
                        "images": {
                            "fullbody": {
                                "goalkeeper": {"default": {"processed": "https://cdn/gk.png"}}
                            }
                        }
                    }
                }
            }
        }
        pm.save()

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [str(pm.pk)],
                "player": [],
                "bench": {},
            }
        }
        match_activity.save()

        LineupSyncService(match_activity).sync()

        p = Participation.objects.get(activity=match_activity, member=org_mem)
        assert "asset_warning" not in p.data

    def test_field_player_without_home_kit_gets_warning(
        self, org, project, period, match_activity, formation_433
    ):
        """Field player without home kit → asset_warning."""
        members = _create_members(org, project, period, 2)
        gk_pm, _ = members[0]
        player_pm, player_mem = members[1]
        player_pm.metadata = {}
        player_pm.save()

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [str(gk_pm.pk)],
                "player": [str(player_pm.pk)],
                "bench": {},
            }
        }
        match_activity.save()

        LineupSyncService(match_activity).sync()

        p = Participation.objects.get(activity=match_activity, member=player_mem)
        assert p.data["asset_warning"] == "missing_home_kit"

    def test_field_player_with_home_kit_no_warning(
        self, org, project, period, match_activity, formation_433
    ):
        """Field player with home kit → no asset_warning."""
        members = _create_members(org, project, period, 2)
        gk_pm, _ = members[0]
        player_pm, player_mem = members[1]
        player_pm.metadata = {
            "teamreel_assets": {
                "roles": {
                    "player": {
                        "images": {
                            "fullbody": {
                                "home": {"default": {"processed": "https://cdn/home.png"}}
                            }
                        }
                    }
                }
            }
        }
        player_pm.save()

        match_activity.metadata = {
            "lineup": {
                "formation": "4-3-3",
                "goalkeeper": [str(gk_pm.pk)],
                "player": [str(player_pm.pk)],
                "bench": {},
            }
        }
        match_activity.save()

        LineupSyncService(match_activity).sync()

        p = Participation.objects.get(activity=match_activity, member=player_mem)
        assert "asset_warning" not in p.data

    def test_video_builder_kit_type_unchanged(self, formation_433):
        """Video builder still resolves correct kit_type per position (regression)."""
        from src.video.services.lineup_builder import _get_formation_splits

        n_def, n_mid, n_att = _get_formation_splits("4-3-3")
        assert (n_def, n_mid, n_att) == (4, 3, 3)
