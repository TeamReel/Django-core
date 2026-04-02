"""Tests for _common.py utility functions (color helpers, ffmpeg_escape)."""

from __future__ import annotations

import pytest

from src.video.services._common import (
    ffmpeg_escape,
    hex_to_rgb,
    hex_to_rgba,
)


class TestHexToRgb:
    """Tests for hex_to_rgb()."""

    def test_six_digit_hex(self):
        assert hex_to_rgb("#FF0000") == (255, 0, 0)

    def test_six_digit_lowercase(self):
        assert hex_to_rgb("#d2122e") == (210, 18, 46)

    def test_without_hash(self):
        assert hex_to_rgb("00FF00") == (0, 255, 0)

    def test_three_digit_hex(self):
        """3-digit shorthand should expand to 6-digit."""
        assert hex_to_rgb("#FFF") == (255, 255, 255)

    def test_three_digit_color(self):
        assert hex_to_rgb("#F00") == (255, 0, 0)

    def test_black(self):
        assert hex_to_rgb("#000000") == (0, 0, 0)

    def test_white(self):
        assert hex_to_rgb("#FFFFFF") == (255, 255, 255)

    def test_mixed_case(self):
        assert hex_to_rgb("#aAbBcC") == (170, 187, 204)


class TestHexToRgba:
    """Tests for hex_to_rgba()."""

    def test_adds_alpha_255(self):
        assert hex_to_rgba("#FF0000") == (255, 0, 0, 255)

    def test_three_digit(self):
        assert hex_to_rgba("#F00") == (255, 0, 0, 255)

    def test_black_with_alpha(self):
        assert hex_to_rgba("#000000") == (0, 0, 0, 255)

    def test_return_type_is_tuple(self):
        result = hex_to_rgba("#ABCDEF")
        assert isinstance(result, tuple)
        assert len(result) == 4


class TestFfmpegEscape:
    """Tests for ffmpeg_escape()."""

    def test_plain_text_unchanged(self):
        assert ffmpeg_escape("Hello World") == "Hello World"

    def test_colon_escaped(self):
        assert ffmpeg_escape("12:30") == "12\\:30"

    def test_backslash_escaped(self):
        assert ffmpeg_escape("path\\to") == "path\\\\to"

    def test_single_quote_stripped(self):
        assert ffmpeg_escape("it's") == "its"

    def test_multiple_specials(self):
        """Multiple special chars in one string."""
        assert ffmpeg_escape("it's 12:30\\pm") == "its 12\\:30\\\\pm"

    def test_empty_string(self):
        assert ffmpeg_escape("") == ""

    def test_no_double_escaping_colon(self):
        """Already-escaped colon should not be double-escaped."""
        # Input has a literal backslash followed by colon
        result = ffmpeg_escape("\\:")
        # The backslash gets escaped, then the colon gets escaped
        assert result == "\\\\\\:"
