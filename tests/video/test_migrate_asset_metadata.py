"""Tests for the migrate_asset_metadata management command.

Tests the pure migration logic functions using FakeMembership objects.
No database required — all tests run in pure Python.
"""

from __future__ import annotations


from src.video.management.commands.migrate_asset_metadata import (
    KNOWN_KITS,
    _get_primary_role,
    _normalize_variant_value,
    _role_for_kit,
    _split_composite_key,
    migrate_membership,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class FakeMembership:
    """Minimal stand-in for ProjectMembership in unit tests."""

    def __init__(self, metadata: dict | None = None):
        self.metadata = metadata if metadata is not None else {}
        self.pk = "test-pk-001"
        self._saved = False

    def save(self, update_fields=None):
        self._saved = True
        self._update_fields = update_fields


def _make_legacy_membership(
    *,
    images: dict | None = None,
    videos: dict | None = None,
    media: dict | None = None,
    functional_roles: list[str] | None = None,
) -> FakeMembership:
    """Build a membership with old-format teamreel_assets."""
    tr: dict = {}
    if images is not None:
        tr["images"] = images
    if videos is not None:
        tr["videos"] = videos
    if media is not None:
        tr["media"] = media

    meta: dict = {"teamreel_assets": tr}
    if functional_roles is not None:
        meta["functional_roles"] = functional_roles
    return FakeMembership(metadata=meta)


# ---------------------------------------------------------------------------
# _normalize_variant_value
# ---------------------------------------------------------------------------


class TestNormalizeVariantValue:
    def test_string_url(self):
        result = _normalize_variant_value("https://s3.example.com/photo.jpg")
        assert result == {"raw": "https://s3.example.com/photo.jpg"}

    def test_empty_string(self):
        assert _normalize_variant_value("") is None

    def test_none(self):
        assert _normalize_variant_value(None) is None

    def test_dict_with_raw(self):
        val = {"raw": "url1", "processed": "url2"}
        result = _normalize_variant_value(val)
        assert result == {"raw": "url1", "processed": "url2"}

    def test_dict_with_processing_state_only(self):
        val = {"processing_state": "pending"}
        result = _normalize_variant_value(val)
        assert result == {"processing_state": "pending"}

    def test_empty_dict(self):
        assert _normalize_variant_value({}) is None

    def test_dict_without_known_keys(self):
        assert _normalize_variant_value({"unknown": "val"}) is None


# ---------------------------------------------------------------------------
# _split_composite_key
# ---------------------------------------------------------------------------


class TestSplitCompositeKey:
    def test_kit_only(self):
        assert _split_composite_key("home") == ("home", "default")

    def test_known_kit_with_variant(self):
        assert _split_composite_key("home_arms_crossed") == ("home", "arms_crossed")

    def test_away_kit(self):
        assert _split_composite_key("away_behind_back") == ("away", "behind_back")

    def test_goalkeeper_kit(self):
        assert _split_composite_key("goalkeeper_hands_on_hips") == (
            "goalkeeper",
            "hands_on_hips",
        )

    def test_third_kit(self):
        assert _split_composite_key("third") == ("third", "default")

    def test_bare_variant_no_kit(self):
        """A variant without kit prefix defaults to 'home'."""
        assert _split_composite_key("arms_crossed") == ("home", "arms_crossed")

    def test_empty_string(self):
        assert _split_composite_key("") == ("home", "default")

    def test_transformation_snap(self):
        """Style variants don't start with kit prefixes."""
        assert _split_composite_key("transformation_snap") == (
            "home",
            "transformation_snap",
        )

    def test_known_kits_constant(self):
        assert KNOWN_KITS == {"home", "away", "third", "goalkeeper"}


# ---------------------------------------------------------------------------
# _role_for_kit / _get_primary_role
# ---------------------------------------------------------------------------


class TestRoleHelpers:
    def test_goalkeeper_kit_returns_keeper(self):
        m = FakeMembership(metadata={"functional_roles": ["player"]})
        assert _role_for_kit(m, "goalkeeper") == "keeper"

    def test_home_kit_with_player_role(self):
        m = FakeMembership(metadata={"functional_roles": ["player"]})
        assert _role_for_kit(m, "home") == "player"

    def test_home_kit_with_coach_role(self):
        m = FakeMembership(metadata={"functional_roles": ["coach"]})
        assert _role_for_kit(m, "home") == "coach"

    def test_home_kit_with_no_roles(self):
        m = FakeMembership(metadata={})
        assert _role_for_kit(m, "home") == "player"

    def test_primary_role_first_in_list(self):
        m = FakeMembership(metadata={"functional_roles": ["coach", "player"]})
        assert _get_primary_role(m) == "coach"

    def test_primary_role_defaults_to_player(self):
        m = FakeMembership(metadata={})
        assert _get_primary_role(m) == "player"


# ---------------------------------------------------------------------------
# migrate_membership — Format 3/4: composite keys (most common)
# ---------------------------------------------------------------------------


class TestMigrateCompositeKeys:
    """Format 3 (string) and Format 4 (dict) — images under kit key, videos under composite key."""

    def test_image_dict_value(self):
        """images.fullbody.home = {raw, processed} → roles.player.images.fullbody.home.default."""
        m = _make_legacy_membership(
            images={
                "fullbody": {
                    "home": {"raw": "raw.jpg", "processed": "proc.jpg"},
                }
            },
            functional_roles=["player"],
        )
        result = migrate_membership(m)
        assert result["variants_migrated"] == 1

        roles = m.metadata["teamreel_assets"]["roles"]
        assert roles["player"]["images"]["fullbody"]["home"]["default"] == {
            "raw": "raw.jpg",
            "processed": "proc.jpg",
        }

    def test_video_composite_string(self):
        """videos.intro.home_arms_crossed = 'url' → roles.player.videos.intro.home.arms_crossed."""
        m = _make_legacy_membership(
            videos={
                "intro": {
                    "home_arms_crossed": "https://s3.example.com/intro.mp4",
                }
            },
            functional_roles=["player"],
        )
        result = migrate_membership(m)
        assert result["variants_migrated"] == 1

        roles = m.metadata["teamreel_assets"]["roles"]
        assert roles["player"]["videos"]["intro"]["home"]["arms_crossed"] == {
            "raw": "https://s3.example.com/intro.mp4",
        }

    def test_video_composite_dict(self):
        """videos.intro.home_arms_crossed = {raw, processed} → properly nested."""
        m = _make_legacy_membership(
            videos={
                "intro": {
                    "home_arms_crossed": {
                        "raw": "raw.mp4",
                        "processed": "proc.mp4",
                        "processing_state": "completed",
                    },
                }
            },
            functional_roles=["player"],
        )
        result = migrate_membership(m)
        assert result["variants_migrated"] == 1

        roles = m.metadata["teamreel_assets"]["roles"]
        val = roles["player"]["videos"]["intro"]["home"]["arms_crossed"]
        assert val["raw"] == "raw.mp4"
        assert val["processed"] == "proc.mp4"

    def test_goalkeeper_kit_goes_to_keeper_role(self):
        """goalkeeper kit assets land under the 'keeper' role."""
        m = _make_legacy_membership(
            images={
                "fullbody": {
                    "goalkeeper": {"raw": "gk.jpg", "processed": "gk_proc.jpg"},
                }
            },
            functional_roles=["keeper", "player"],
        )
        result = migrate_membership(m)
        assert result["variants_migrated"] == 1

        roles = m.metadata["teamreel_assets"]["roles"]
        assert "keeper" in roles
        assert roles["keeper"]["images"]["fullbody"]["goalkeeper"]["default"] == {
            "raw": "gk.jpg",
            "processed": "gk_proc.jpg",
        }

    def test_multiple_kits(self):
        """Multiple kits per asset type all migrate correctly."""
        m = _make_legacy_membership(
            images={
                "fullbody": {
                    "home": {"raw": "home.jpg"},
                    "away": {"raw": "away.jpg"},
                }
            },
            functional_roles=["player"],
        )
        result = migrate_membership(m)
        assert result["variants_migrated"] == 2

        roles = m.metadata["teamreel_assets"]["roles"]
        assert "home" in roles["player"]["images"]["fullbody"]
        assert "away" in roles["player"]["images"]["fullbody"]


# ---------------------------------------------------------------------------
# migrate_membership — Format 2: bare variant keys
# ---------------------------------------------------------------------------


class TestMigrateBareVariants:
    """Format 2: videos.intro.arms_crossed (no kit prefix) defaults to kit 'home'."""

    def test_bare_variant_defaults_to_home(self):
        m = _make_legacy_membership(
            videos={
                "intro": {
                    "arms_crossed": {"raw": "raw.mp4", "processed": "proc.mp4"},
                }
            },
            functional_roles=["player"],
        )
        result = migrate_membership(m)
        assert result["variants_migrated"] == 1

        roles = m.metadata["teamreel_assets"]["roles"]
        assert roles["player"]["videos"]["intro"]["home"]["arms_crossed"] == {
            "raw": "raw.mp4",
            "processed": "proc.mp4",
        }


# ---------------------------------------------------------------------------
# migrate_membership — Format 1: flat media
# ---------------------------------------------------------------------------


class TestMigrateFlatMedia:
    """Format 1 (oldest): media.kit.url → roles.{role}.images.fullbody.home.default."""

    def test_media_kit_slot(self):
        m = _make_legacy_membership(
            media={
                "kit": {"url": "https://s3.example.com/kit.jpg"},
            },
            functional_roles=["player"],
        )
        result = migrate_membership(m)
        assert result["variants_migrated"] == 1

        roles = m.metadata["teamreel_assets"]["roles"]
        assert roles["player"]["images"]["fullbody"]["home"]["default"] == {
            "raw": "https://s3.example.com/kit.jpg",
        }

    def test_media_slot_does_not_overwrite_specific_data(self):
        """If images.fullbody.home already migrated, media.kit should not overwrite."""
        m = _make_legacy_membership(
            images={
                "fullbody": {
                    "home": {"raw": "specific.jpg", "processed": "specific_proc.jpg"},
                }
            },
            media={
                "kit": {"url": "https://s3.example.com/old-kit.jpg"},
            },
            functional_roles=["player"],
        )
        result = migrate_membership(m)

        roles = m.metadata["teamreel_assets"]["roles"]
        # The specific data from images should win
        assert roles["player"]["images"]["fullbody"]["home"]["default"]["raw"] == "specific.jpg"


# ---------------------------------------------------------------------------
# migrate_membership — edge cases
# ---------------------------------------------------------------------------


class TestMigrateEdgeCases:
    def test_no_teamreel_assets_skipped(self):
        m = FakeMembership(metadata={})
        result = migrate_membership(m)
        assert result["skipped"] == 1
        assert not m._saved

    def test_empty_teamreel_assets_skipped(self):
        m = FakeMembership(metadata={"teamreel_assets": {}})
        result = migrate_membership(m)
        assert result["skipped"] == 1
        assert not m._saved

    def test_already_migrated_detected(self):
        m = FakeMembership(
            metadata={
                "teamreel_assets": {
                    "_legacy_assets": {"migrated_at": "2025-01-01"},
                    "roles": {"player": {}},
                }
            }
        )
        result = migrate_membership(m)
        assert result["already_migrated"] == 1
        assert not m._saved

    def test_already_new_format_detected(self):
        """roles present, no images/videos → already migrated."""
        m = FakeMembership(
            metadata={
                "teamreel_assets": {
                    "roles": {
                        "player": {"images": {"fullbody": {"home": {"default": {"raw": "x"}}}}}
                    }
                }
            }
        )
        result = migrate_membership(m)
        assert result["already_migrated"] == 1

    def test_dry_run_does_not_save(self):
        m = _make_legacy_membership(
            images={"fullbody": {"home": {"raw": "photo.jpg"}}},
            functional_roles=["player"],
        )
        result = migrate_membership(m, dry_run=True)
        assert result["variants_migrated"] == 1
        assert not m._saved

    def test_backup_created(self):
        m = _make_legacy_membership(
            images={"fullbody": {"home": {"raw": "photo.jpg"}}},
            functional_roles=["player"],
        )
        migrate_membership(m)

        legacy = m.metadata["teamreel_assets"]["_legacy_assets"]
        assert "images" in legacy
        assert "migrated_at" in legacy

    def test_root_images_removed_after_migration(self):
        m = _make_legacy_membership(
            images={"fullbody": {"home": {"raw": "photo.jpg"}}},
            functional_roles=["player"],
        )
        migrate_membership(m)

        tr = m.metadata["teamreel_assets"]
        assert "images" not in tr
        assert "videos" not in tr
        assert "roles" in tr

    def test_media_dict_preserved(self):
        """media.* aliases are kept for backward compat (removed in H5)."""
        m = _make_legacy_membership(
            images={"fullbody": {"home": {"raw": "photo.jpg"}}},
            media={"kit": {"url": "https://example.com/kit.jpg"}},
            functional_roles=["player"],
        )
        migrate_membership(m)

        tr = m.metadata["teamreel_assets"]
        assert "media" in tr

    def test_save_called_with_correct_fields(self):
        m = _make_legacy_membership(
            images={"fullbody": {"home": {"raw": "photo.jpg"}}},
            functional_roles=["player"],
        )
        migrate_membership(m)
        assert m._saved
        assert "metadata" in m._update_fields
        assert "updated_at" in m._update_fields

    def test_none_variant_value_skipped(self):
        """None values in the asset dict get skipped."""
        m = _make_legacy_membership(
            images={"fullbody": {"home": None}},
            functional_roles=["player"],
        )
        result = migrate_membership(m)
        assert result["skipped"] == 1

    def test_mixed_formats_single_membership(self):
        """A membership with both images and videos migrates both."""
        m = _make_legacy_membership(
            images={
                "fullbody": {"home": {"raw": "fb.jpg"}},
                "closeup": {"home": {"raw": "cu.jpg"}},
            },
            videos={
                "intro": {"home_arms_crossed": {"raw": "intro.mp4"}},
                "celebration": {"home_fist_pump": {"raw": "cel.mp4"}},
            },
            functional_roles=["player"],
        )
        result = migrate_membership(m)
        assert result["variants_migrated"] == 4

        roles = m.metadata["teamreel_assets"]["roles"]
        assert roles["player"]["images"]["fullbody"]["home"]["default"]["raw"] == "fb.jpg"
        assert roles["player"]["images"]["closeup"]["home"]["default"]["raw"] == "cu.jpg"
        assert roles["player"]["videos"]["intro"]["home"]["arms_crossed"]["raw"] == "intro.mp4"
        assert roles["player"]["videos"]["celebration"]["home"]["fist_pump"]["raw"] == "cel.mp4"
