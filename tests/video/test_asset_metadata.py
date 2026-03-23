"""Tests for asset metadata read/write helpers.

These helpers are the single entry point for all B70 metadata operations.
"""

from __future__ import annotations


from src.video.utils.asset_metadata import (
    IMAGE_ASSET_TYPES,
    ROLE_KIT_MAP,
    SHARED_ASSET_TYPES,
    VIDEO_ASSET_TYPES,
    build_s3_asset_path,
    get_asset_roles,
    get_available_kits,
    get_default_kit,
    get_functional_roles,
    get_role_assets,
    get_variant_value,
    iter_variants,
    media_type_for_asset,
    set_variant_value,
    update_media_aliases,
)


# ---------------------------------------------------------------------------
# Helpers — build a fake membership object
# ---------------------------------------------------------------------------


class FakeMembership:
    """Minimal stand-in for ProjectMembership in unit tests."""

    def __init__(self, metadata: dict | None = None):
        self.metadata = metadata if metadata is not None else {}


def _make_membership_with_assets(**role_data: dict) -> FakeMembership:
    """Shortcut: build metadata with teamreel_assets.roles pre-filled."""
    return FakeMembership(metadata={"teamreel_assets": {"roles": role_data}})


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------


class TestConstants:
    def test_role_kit_map_has_all_roles(self):
        assert "keeper" in ROLE_KIT_MAP
        assert "player" in ROLE_KIT_MAP
        assert "coach" in ROLE_KIT_MAP
        assert "assistant" in ROLE_KIT_MAP

    def test_keeper_default_kit(self):
        assert ROLE_KIT_MAP["keeper"]["default"] == "goalkeeper"
        assert ROLE_KIT_MAP["keeper"]["kits"] == ["goalkeeper"]

    def test_player_kits(self):
        assert ROLE_KIT_MAP["player"]["default"] == "home"
        assert "home" in ROLE_KIT_MAP["player"]["kits"]
        assert "away" in ROLE_KIT_MAP["player"]["kits"]

    def test_coach_has_no_kits(self):
        assert ROLE_KIT_MAP["coach"]["default"] is None
        assert ROLE_KIT_MAP["coach"]["kits"] == []

    def test_image_vs_video_types(self):
        assert "fullbody" in IMAGE_ASSET_TYPES
        assert "intro" in VIDEO_ASSET_TYPES
        assert IMAGE_ASSET_TYPES.isdisjoint(VIDEO_ASSET_TYPES)

    def test_shared_asset_types(self):
        assert "profile" in SHARED_ASSET_TYPES
        assert "action_photo" in SHARED_ASSET_TYPES


# ---------------------------------------------------------------------------
# media_type_for_asset
# ---------------------------------------------------------------------------


class TestMediaTypeForAsset:
    def test_image_types(self):
        for t in ("fullbody", "halfbody", "closeup", "action_photo"):
            assert media_type_for_asset(t) == "images"

    def test_video_types(self):
        for t in ("intro", "celebration", "then_vs_now"):
            assert media_type_for_asset(t) == "videos"


# ---------------------------------------------------------------------------
# get_variant_value
# ---------------------------------------------------------------------------


class TestGetVariantValue:
    def test_returns_value_when_present(self):
        m = _make_membership_with_assets(
            player={
                "images": {
                    "fullbody": {
                        "home": {
                            "default": {"raw": "s3://raw", "processed": "s3://proc"},
                        }
                    }
                }
            }
        )
        val = get_variant_value(m, "player", "images", "fullbody", "home", "default")
        assert val == {"raw": "s3://raw", "processed": "s3://proc"}

    def test_returns_none_when_missing_role(self):
        m = _make_membership_with_assets()
        assert get_variant_value(m, "keeper", "images", "fullbody", "gk") is None

    def test_returns_none_when_missing_kit(self):
        m = _make_membership_with_assets(player={"images": {"fullbody": {}}})
        assert get_variant_value(m, "player", "images", "fullbody", "away") is None

    def test_returns_none_when_missing_variant(self):
        m = _make_membership_with_assets(
            player={"images": {"fullbody": {"home": {"default": {"raw": "x"}}}}}
        )
        assert get_variant_value(m, "player", "images", "fullbody", "home", "arms_crossed") is None

    def test_default_variant_is_default(self):
        m = _make_membership_with_assets(
            player={"images": {"fullbody": {"home": {"default": {"raw": "x"}}}}}
        )
        # variant parameter defaults to "default"
        assert get_variant_value(m, "player", "images", "fullbody", "home") == {"raw": "x"}

    def test_empty_metadata(self):
        m = FakeMembership(metadata={})
        assert get_variant_value(m, "player", "images", "fullbody", "home") is None

    def test_none_metadata(self):
        m = FakeMembership(metadata=None)
        assert get_variant_value(m, "player", "images", "fullbody", "home") is None

    def test_video_variant(self):
        m = _make_membership_with_assets(
            keeper={
                "videos": {
                    "intro": {
                        "goalkeeper": {
                            "arms_crossed": {"raw": "s3://raw", "processing_state": "processed"},
                        }
                    }
                }
            }
        )
        val = get_variant_value(m, "keeper", "videos", "intro", "goalkeeper", "arms_crossed")
        assert val["raw"] == "s3://raw"


# ---------------------------------------------------------------------------
# get_role_assets
# ---------------------------------------------------------------------------


class TestGetRoleAssets:
    def test_returns_role_data(self):
        role_data = {"images": {"fullbody": {"home": {"default": {"raw": "x"}}}}}
        m = _make_membership_with_assets(player=role_data)
        assert get_role_assets(m, "player") == role_data

    def test_returns_empty_dict_for_missing_role(self):
        m = _make_membership_with_assets()
        assert get_role_assets(m, "keeper") == {}


# ---------------------------------------------------------------------------
# iter_variants
# ---------------------------------------------------------------------------


class TestIterVariants:
    def test_iterates_all_kits(self):
        m = _make_membership_with_assets(
            player={
                "videos": {
                    "intro": {
                        "home": {
                            "default": {"raw": "h1"},
                            "arms_crossed": {"raw": "h2"},
                        },
                        "away": {
                            "default": {"raw": "a1"},
                        },
                    }
                }
            }
        )
        results = list(iter_variants(m, "player", "videos", "intro"))
        assert len(results) == 3
        kits = {r[0] for r in results}
        assert kits == {"home", "away"}

    def test_iterates_single_kit(self):
        m = _make_membership_with_assets(
            player={
                "videos": {
                    "intro": {
                        "home": {"default": {"raw": "h1"}, "thumbs_up": {"raw": "h2"}},
                        "away": {"default": {"raw": "a1"}},
                    }
                }
            }
        )
        results = list(iter_variants(m, "player", "videos", "intro", kit="home"))
        assert len(results) == 2
        assert all(r[0] == "home" for r in results)

    def test_empty_when_no_data(self):
        m = _make_membership_with_assets()
        assert list(iter_variants(m, "player", "videos", "intro")) == []

    def test_yields_correct_tuples(self):
        val = {"raw": "s3://raw", "processed": "s3://proc"}
        m = _make_membership_with_assets(
            keeper={"images": {"closeup": {"goalkeeper": {"default": val}}}}
        )
        results = list(iter_variants(m, "keeper", "images", "closeup"))
        assert results == [("goalkeeper", "default", val)]


# ---------------------------------------------------------------------------
# set_variant_value
# ---------------------------------------------------------------------------


class TestSetVariantValue:
    def test_creates_nested_structure(self):
        m = FakeMembership(metadata={})
        set_variant_value(m, "player", "images", "fullbody", "home", "default", {"raw": "x"})

        expected = {
            "teamreel_assets": {
                "roles": {
                    "player": {
                        "images": {
                            "fullbody": {
                                "home": {
                                    "default": {"raw": "x"},
                                }
                            }
                        }
                    }
                }
            }
        }
        assert m.metadata == expected

    def test_overwrites_existing_variant(self):
        m = _make_membership_with_assets(
            player={"images": {"fullbody": {"home": {"default": {"raw": "old"}}}}}
        )
        set_variant_value(m, "player", "images", "fullbody", "home", "default", {"raw": "new"})
        val = get_variant_value(m, "player", "images", "fullbody", "home", "default")
        assert val == {"raw": "new"}

    def test_adds_new_variant_to_existing_kit(self):
        m = _make_membership_with_assets(
            player={"videos": {"intro": {"home": {"default": {"raw": "h1"}}}}}
        )
        set_variant_value(m, "player", "videos", "intro", "home", "arms_crossed", {"raw": "h2"})
        assert get_variant_value(m, "player", "videos", "intro", "home", "default") == {"raw": "h1"}
        assert get_variant_value(m, "player", "videos", "intro", "home", "arms_crossed") == {
            "raw": "h2"
        }

    def test_adds_new_role(self):
        m = _make_membership_with_assets(
            player={"images": {"fullbody": {"home": {"default": {"raw": "x"}}}}}
        )
        set_variant_value(m, "keeper", "images", "fullbody", "goalkeeper", "default", {"raw": "k"})
        # Both roles exist
        assert get_variant_value(m, "player", "images", "fullbody", "home") == {"raw": "x"}
        assert get_variant_value(m, "keeper", "images", "fullbody", "goalkeeper") == {"raw": "k"}

    def test_none_metadata_initializes(self):
        m = FakeMembership(metadata=None)
        set_variant_value(m, "player", "images", "fullbody", "home", "default", {"raw": "x"})
        assert get_variant_value(m, "player", "images", "fullbody", "home") == {"raw": "x"}

    def test_does_not_call_save(self):
        """set_variant_value should not persist — caller decides when to save."""
        m = FakeMembership(metadata={})
        set_variant_value(m, "player", "images", "fullbody", "home", "default", {"raw": "x"})
        # FakeMembership has no save method — would raise if called


# ---------------------------------------------------------------------------
# get_functional_roles / get_asset_roles
# ---------------------------------------------------------------------------


class TestRoleHelpers:
    def test_functional_roles_from_metadata(self):
        m = FakeMembership(metadata={"functional_roles": ["keeper", "player"]})
        assert get_functional_roles(m) == ["keeper", "player"]

    def test_functional_roles_empty(self):
        m = FakeMembership(metadata={})
        assert get_functional_roles(m) == []

    def test_asset_roles(self):
        m = _make_membership_with_assets(
            player={"images": {}},
            keeper={"images": {}},
        )
        roles = get_asset_roles(m)
        assert set(roles) == {"player", "keeper"}

    def test_asset_roles_empty(self):
        m = FakeMembership(metadata={})
        assert get_asset_roles(m) == []


# ---------------------------------------------------------------------------
# get_default_kit / get_available_kits
# ---------------------------------------------------------------------------


class TestKitHelpers:
    def test_default_kit_keeper(self):
        assert get_default_kit("keeper") == "goalkeeper"

    def test_default_kit_player(self):
        assert get_default_kit("player") == "home"

    def test_default_kit_coach(self):
        assert get_default_kit("coach") is None

    def test_default_kit_unknown_role(self):
        assert get_default_kit("unknown") is None

    def test_available_kits_player(self):
        assert get_available_kits("player") == ["home", "away", "third"]

    def test_available_kits_unknown(self):
        assert get_available_kits("unknown") == []


# ---------------------------------------------------------------------------
# update_media_aliases
# ---------------------------------------------------------------------------


class TestUpdateMediaAliases:
    def test_writes_media_slot(self):
        m = FakeMembership(metadata={"teamreel_assets": {}})
        update_media_aliases(m, "intro", "s3://url")
        media = m.metadata["teamreel_assets"]["media"]
        assert media["intro"]["url"] == "s3://url"

    def test_writes_kit_alias_for_fullbody(self):
        m = FakeMembership(metadata={"teamreel_assets": {}})
        update_media_aliases(m, "fullbody", "s3://fb-url")
        media = m.metadata["teamreel_assets"]["media"]
        assert media["fullbody"]["url"] == "s3://fb-url"
        assert media["kit"]["url"] == "s3://fb-url"

    def test_preserves_existing_caption(self):
        m = FakeMembership(
            metadata={
                "teamreel_assets": {"media": {"intro": {"url": "old", "caption": "my caption"}}}
            }
        )
        update_media_aliases(m, "intro", "s3://new")
        assert m.metadata["teamreel_assets"]["media"]["intro"]["url"] == "s3://new"
        assert m.metadata["teamreel_assets"]["media"]["intro"]["caption"] == "my caption"

    def test_handles_none_metadata(self):
        m = FakeMembership(metadata=None)
        update_media_aliases(m, "intro", "s3://url")
        assert m.metadata["teamreel_assets"]["media"]["intro"]["url"] == "s3://url"


# ---------------------------------------------------------------------------
# build_s3_asset_path
# ---------------------------------------------------------------------------


class TestBuildS3AssetPath:
    def test_standard_path(self):
        path = build_s3_asset_path(
            member_id="abc123",
            role="player",
            asset_type="intro",
            kit="home",
            variant="arms_crossed",
            content_hash="f7a2b1",
            ext="webm",
        )
        assert path == "members/abc123/processed/player/intro/home/arms_crossed_f7a2b1.webm"

    def test_default_variant(self):
        path = build_s3_asset_path(
            member_id="abc123",
            role="keeper",
            asset_type="fullbody",
            kit="goalkeeper",
            variant="default",
            content_hash="x1y2z3",
            ext="png",
        )
        assert path == "members/abc123/processed/keeper/fullbody/goalkeeper/default_x1y2z3.png"
