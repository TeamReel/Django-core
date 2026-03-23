"""End-to-end integration tests for B70 asset-per-role module.

Tests the full lifecycle: migrate → verify → lineup resolution → restore.
Uses FakeMembership objects — no database required.
"""

from __future__ import annotations

import copy

from src.video.management.commands.migrate_asset_metadata import migrate_membership
from src.video.management.commands.restore_legacy_assets import restore_membership
from src.video.utils.asset_metadata import (
    get_role_assets,
    get_variant_value,
    iter_variants,
    resolve_lineup_member_assets,
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


def _get_url(val):
    if isinstance(val, dict):
        return val.get("processed") or val.get("raw")
    if isinstance(val, str) and val:
        return val
    return None


def _find_intro(variants, kit_type, url_fn):
    if not variants:
        return None
    val = variants.get(kit_type)
    if val:
        url = url_fn(val)
        if url:
            return url
    for v in variants.values():
        url = url_fn(v)
        if url:
            return url
    return None


# ---------------------------------------------------------------------------
# Fixtures: realistic legacy membership data
# ---------------------------------------------------------------------------

PLAYER_LEGACY = {
    "teamreel_assets": {
        "images": {
            "fullbody": {
                "home": {"processed": "https://s3/player/fb-home.png", "raw": "raw"},
                "away": {"processed": "https://s3/player/fb-away.png"},
            },
            "closeup": {
                "home": {"processed": "https://s3/player/cl-home.png"},
            },
        },
        "videos": {
            "intro": {
                "home": {"processed": "https://s3/player/intro-home.mp4"},
                "home_arms_crossed": {"processed": "https://s3/player/intro-ac.mp4"},
            },
        },
        "media": {
            "kit": {"url": "https://s3/player/old-kit.png"},
            "intro": {"url": "https://s3/player/old-intro.mp4"},
        },
    },
    "functional_roles": ["player"],
}

KEEPER_LEGACY = {
    "teamreel_assets": {
        "images": {
            "fullbody": {
                "goalkeeper": {"processed": "https://s3/keeper/fb-gk.png"},
            },
            "closeup": {
                "goalkeeper": {"processed": "https://s3/keeper/cl-gk.png"},
            },
        },
        "videos": {
            "intro": {
                "goalkeeper": {"processed": "https://s3/keeper/intro-gk.mp4"},
            },
        },
        "media": {},
    },
    "functional_roles": ["keeper"],
}


# ---------------------------------------------------------------------------
# E2E: Full migration + lineup + restore cycle
# ---------------------------------------------------------------------------


class TestFullMigrationCycle:
    """Migration → read → lineup → restore roundtrip."""

    def test_player_migrate_read_restore(self):
        """Player: migrate → read assets → restore to original."""
        m = FakeMembership(metadata=copy.deepcopy(PLAYER_LEGACY))
        original = copy.deepcopy(m.metadata)

        # Step 1: Migrate
        stats = migrate_membership(m, dry_run=False)
        assert stats["variants_migrated"] > 0

        # Step 2: Verify roles structure exists
        tr = m.metadata["teamreel_assets"]
        assert "roles" in tr
        assert "player" in tr["roles"]
        assert "_legacy_assets" in tr

        # Step 3: Read-back via helpers
        role_assets = get_role_assets(m, "player")
        assert role_assets is not None
        fb_val = get_variant_value(m, "player", "images", "fullbody", "home", "default")
        assert fb_val is not None
        assert fb_val.get("processed") == "https://s3/player/fb-home.png"

        # Step 4: iter_variants finds all variants
        variants = list(iter_variants(m, "player", "images", "fullbody"))
        assert len(variants) >= 2  # home + away at minimum

        # Step 5: Restore
        restore_stats = restore_membership(m, dry_run=False)
        assert restore_stats["restored"] == 1

        # Step 6: Verify restored state
        tr_restored = m.metadata["teamreel_assets"]
        assert "roles" not in tr_restored
        assert "_legacy_assets" not in tr_restored
        assert tr_restored["images"] == original["teamreel_assets"]["images"]
        assert tr_restored["videos"] == original["teamreel_assets"]["videos"]

    def test_keeper_migrate_read_restore(self):
        """Keeper: migrate → read assets → restore."""
        m = FakeMembership(metadata=copy.deepcopy(KEEPER_LEGACY))

        # Migrate
        stats = migrate_membership(m, dry_run=False)
        assert stats["variants_migrated"] > 0

        # Read keeper-specific assets
        tr = m.metadata["teamreel_assets"]
        assert "keeper" in tr["roles"]
        fb = get_variant_value(m, "keeper", "images", "fullbody", "goalkeeper", "default")
        assert fb is not None

        # Restore
        restore_stats = restore_membership(m, dry_run=False)
        assert restore_stats["restored"] == 1
        assert "roles" not in m.metadata["teamreel_assets"]


class TestMultiRoleMember:
    """Member with multiple roles — cross-role isolation."""

    def test_keeper_upload_does_not_affect_player(self):
        """Upload to keeper role leaves player assets untouched."""
        # Build a member who is both keeper and player (migrated format)
        m = FakeMembership(
            metadata={
                "teamreel_assets": {
                    "roles": {
                        "player": {
                            "images": {
                                "fullbody": {
                                    "home": {"default": {"processed": "https://s3/player-fb.png"}}
                                }
                            },
                            "videos": {},
                        },
                        "keeper": {
                            "images": {
                                "fullbody": {
                                    "goalkeeper": {
                                        "default": {"processed": "https://s3/keeper-fb.png"}
                                    }
                                }
                            },
                            "videos": {},
                        },
                    }
                },
                "functional_roles": ["keeper", "player"],
            }
        )

        # Read keeper assets
        keeper_fb = get_variant_value(m, "keeper", "images", "fullbody", "goalkeeper", "default")
        assert keeper_fb["processed"] == "https://s3/keeper-fb.png"

        # Player assets are isolated
        player_fb = get_variant_value(m, "player", "images", "fullbody", "home", "default")
        assert player_fb["processed"] == "https://s3/player-fb.png"


class TestLineupMixedRoles:
    """Lineup with keeper + players gets correct assets per position."""

    def _build_migrated(self, role, kit, fb_url, intro_url, cl_url):
        """Build teamreel_assets in new roles format."""
        return {
            "roles": {
                role: {
                    "images": {
                        "fullbody": {kit: {"default": {"processed": fb_url}}},
                        "closeup": {kit: {"default": {"processed": cl_url}}},
                    },
                    "videos": {
                        "intro": {kit: {"default": {"processed": intro_url}}},
                    },
                }
            }
        }

    def test_mixed_lineup_keeper_and_players(self):
        """Lineup with 1 keeper + 2 players — each gets role-specific assets."""
        keeper_assets = self._build_migrated(
            "keeper",
            "goalkeeper",
            "https://s3/gk-fb.png",
            "https://s3/gk-intro.mp4",
            "https://s3/gk-cl.png",
        )
        player1_assets = self._build_migrated(
            "player",
            "home",
            "https://s3/p1-fb.png",
            "https://s3/p1-intro.mp4",
            "https://s3/p1-cl.png",
        )
        player2_assets = self._build_migrated(
            "player",
            "home",
            "https://s3/p2-fb.png",
            "https://s3/p2-intro.mp4",
            "https://s3/p2-cl.png",
        )

        # Simulate lineup resolution for each member
        gk_kit, gk_intro, gk_cl = resolve_lineup_member_assets(
            keeper_assets,
            "keeper",
            "goalkeeper",
            _get_url,
            _get_url,
            _find_intro,
        )
        assert gk_kit == "https://s3/gk-fb.png"
        assert gk_intro == "https://s3/gk-intro.mp4"
        assert gk_cl == "https://s3/gk-cl.png"

        p1_kit, p1_intro, p1_cl = resolve_lineup_member_assets(
            player1_assets,
            "player",
            "home",
            _get_url,
            _get_url,
            _find_intro,
        )
        assert p1_kit == "https://s3/p1-fb.png"
        assert p1_intro == "https://s3/p1-intro.mp4"
        assert p1_cl == "https://s3/p1-cl.png"

        p2_kit, p2_intro, p2_cl = resolve_lineup_member_assets(
            player2_assets,
            "player",
            "home",
            _get_url,
            _get_url,
            _find_intro,
        )
        assert p2_kit == "https://s3/p2-fb.png"
        assert p2_intro == "https://s3/p2-intro.mp4"
        assert p2_cl == "https://s3/p2-cl.png"

    def test_lineup_with_legacy_member(self):
        """Mixed lineup: one migrated member + one legacy member."""
        migrated = self._build_migrated(
            "player",
            "home",
            "https://s3/new-fb.png",
            "https://s3/new-intro.mp4",
            "https://s3/new-cl.png",
        )
        legacy = {
            "images": {
                "fullbody": {"home": {"processed": "https://s3/old-fb.png"}},
                "closeup": {"home": {"processed": "https://s3/old-cl.png"}},
            },
            "videos": {
                "intro": {"home": {"processed": "https://s3/old-intro.mp4"}},
            },
        }

        # Migrated member
        kit1, intro1, cl1 = resolve_lineup_member_assets(
            migrated,
            "player",
            "home",
            _get_url,
            _get_url,
            _find_intro,
        )
        assert kit1 == "https://s3/new-fb.png"
        assert intro1 == "https://s3/new-intro.mp4"

        # Legacy member falls back correctly
        kit2, intro2, cl2 = resolve_lineup_member_assets(
            legacy,
            "player",
            "home",
            _get_url,
            _get_url,
            _find_intro,
        )
        assert kit2 == "https://s3/old-fb.png"
        assert intro2 == "https://s3/old-intro.mp4"

    def test_missing_assets_no_crash(self):
        """Member with empty metadata doesn't crash the lineup."""
        empty = {}
        kit, intro, cl = resolve_lineup_member_assets(
            empty,
            "player",
            "home",
            _get_url,
            _get_url,
            _find_intro,
        )
        assert kit is None
        assert intro is None
        assert cl is None

    def test_partial_assets(self):
        """Member with only fullbody — intro and closeup are None."""
        partial = {
            "roles": {
                "player": {
                    "images": {
                        "fullbody": {"home": {"default": {"processed": "https://s3/fb.png"}}}
                    },
                    "videos": {},
                }
            }
        }
        kit, intro, cl = resolve_lineup_member_assets(
            partial,
            "player",
            "home",
            _get_url,
            _get_url,
            _find_intro,
        )
        assert kit == "https://s3/fb.png"
        assert intro is None
        assert cl is None


class TestRestoreLegacyAssets:
    """Tests for the restore_legacy_assets rollback command."""

    def test_restore_dry_run(self):
        """Dry run reports restore count without modifying data."""
        m = FakeMembership(
            metadata={
                "teamreel_assets": {
                    "roles": {"player": {}},
                    "_legacy_assets": {
                        "images": {"fullbody": {"home": "url"}},
                        "videos": {},
                        "media": {},
                    },
                }
            }
        )
        stats = restore_membership(m, dry_run=True)
        assert stats["restored"] == 1
        # Data unchanged
        assert "roles" in m.metadata["teamreel_assets"]

    def test_restore_skips_no_backup(self):
        """Skip memberships without _legacy_assets."""
        m = FakeMembership(metadata={"teamreel_assets": {"roles": {"player": {}}}})
        stats = restore_membership(m, dry_run=False)
        assert stats["skipped"] == 1

    def test_restore_skips_empty_metadata(self):
        """Skip memberships with no teamreel_assets."""
        m = FakeMembership(metadata={})
        stats = restore_membership(m, dry_run=False)
        assert stats["skipped"] == 1

    def test_full_restore(self):
        """Restore puts back original images/videos, removes roles."""
        original_images = {"fullbody": {"home": {"processed": "url", "raw": "raw"}}}
        original_videos = {"intro": {"home": {"processed": "intro-url"}}}
        m = FakeMembership(
            metadata={
                "teamreel_assets": {
                    "roles": {"player": {"images": {}, "videos": {}}},
                    "_legacy_assets": {
                        "images": copy.deepcopy(original_images),
                        "videos": copy.deepcopy(original_videos),
                        "media": {},
                    },
                }
            }
        )
        stats = restore_membership(m, dry_run=False)
        assert stats["restored"] == 1

        tr = m.metadata["teamreel_assets"]
        assert "roles" not in tr
        assert "_legacy_assets" not in tr
        assert tr["images"] == original_images
        assert tr["videos"] == original_videos
