"""Tests for FFmpeg error parsing and categorization."""

from __future__ import annotations

import json

from src.media.validation.ffmpeg_errors import (
    FFmpegError,
    FFmpegErrorCategory,
    FFmpegErrorParser,
)


class TestFFmpegErrorCategory:
    def test_category_values_are_strings(self) -> None:
        assert FFmpegErrorCategory.OOM.value == "out_of_memory"
        assert FFmpegErrorCategory.TIMEOUT.value == "timeout"
        assert FFmpegErrorCategory.CODEC.value == "codec_error"
        assert FFmpegErrorCategory.IO.value == "io_error"
        assert FFmpegErrorCategory.CORRUPT.value == "corrupt_input"
        assert FFmpegErrorCategory.UNKNOWN.value == "unknown"

    def test_has_six_categories(self) -> None:
        assert len(FFmpegErrorCategory) == 6


class TestFFmpegError:
    def test_is_transient_oom(self) -> None:
        error = FFmpegError(
            category=FFmpegErrorCategory.OOM,
            message="Cannot allocate memory",
            raw_stderr="",
            exit_code=1,
        )
        assert error.is_transient is True

    def test_is_transient_timeout(self) -> None:
        error = FFmpegError(
            category=FFmpegErrorCategory.TIMEOUT,
            message="Process killed",
            raw_stderr="",
            exit_code=137,
        )
        assert error.is_transient is True

    def test_not_transient_codec(self) -> None:
        error = FFmpegError(
            category=FFmpegErrorCategory.CODEC,
            message="Decoder not found",
            raw_stderr="",
            exit_code=1,
        )
        assert error.is_transient is False

    def test_not_transient_io(self) -> None:
        error = FFmpegError(
            category=FFmpegErrorCategory.IO,
            message="No such file",
            raw_stderr="",
            exit_code=1,
        )
        assert error.is_transient is False

    def test_not_transient_corrupt(self) -> None:
        error = FFmpegError(
            category=FFmpegErrorCategory.CORRUPT,
            message="Invalid data",
            raw_stderr="",
            exit_code=1,
        )
        assert error.is_transient is False

    def test_not_transient_unknown(self) -> None:
        error = FFmpegError(
            category=FFmpegErrorCategory.UNKNOWN,
            message="Something",
            raw_stderr="",
            exit_code=1,
        )
        assert error.is_transient is False

    def test_user_message_dutch(self) -> None:
        """All categories return Dutch user messages."""
        for category in FFmpegErrorCategory:
            error = FFmpegError(
                category=category, message="test", raw_stderr="", exit_code=1
            )
            assert isinstance(error.user_message, str)
            assert len(error.user_message) > 0

    def test_user_message_corrupt(self) -> None:
        error = FFmpegError(
            category=FFmpegErrorCategory.CORRUPT,
            message="Invalid data",
            raw_stderr="",
            exit_code=1,
        )
        assert error.user_message == "Video bestand is beschadigd"

    def test_to_dict_serializable(self) -> None:
        error = FFmpegError(
            category=FFmpegErrorCategory.OOM,
            message="Cannot allocate memory",
            raw_stderr="raw output",
            exit_code=1,
        )
        d = error.to_dict()
        assert d["category"] == "out_of_memory"
        assert d["is_transient"] is True
        assert d["message"] == "Cannot allocate memory"
        assert d["exit_code"] == 1
        # Must be JSON-serializable
        json.dumps(d)

    def test_to_dict_does_not_include_raw_stderr(self) -> None:
        """raw_stderr is debug data, not for API responses."""
        error = FFmpegError(
            category=FFmpegErrorCategory.UNKNOWN,
            message="err",
            raw_stderr="big debug output",
            exit_code=1,
        )
        d = error.to_dict()
        assert "raw_stderr" not in d


class TestFFmpegErrorParser:
    # Real stderr samples from FFmpeg
    OOM_STDERR = """
[libx264 @ 0x1234] Cannot allocate memory
Error while opening encoder for output stream #0:0
"""

    TIMEOUT_STDERR = """
frame=  100 fps=0.5 q=0.0 size=       0kB time=00:00:04.00 bitrate=N/A speed=0.02x
Killed
"""

    CODEC_STDERR = """
[h264 @ 0x1234] Decoder h264_cuvid not found
Stream mapping:
  Stream #0:0 -> #0:0 (h264 (native) -> h264 (libx264))
"""

    IO_STDERR = """
/tmp/input.mp4: No such file or directory
"""

    CORRUPT_STDERR = """
[mov,mp4,m4a,3gp,3g2,mj2 @ 0x1234] moov atom not found
/tmp/input.mp4: Invalid data found when processing input
"""

    def test_parse_oom(self) -> None:
        result = FFmpegErrorParser.parse(self.OOM_STDERR, exit_code=1)
        assert result.category == FFmpegErrorCategory.OOM
        assert "memory" in result.message.lower()

    def test_parse_timeout(self) -> None:
        result = FFmpegErrorParser.parse(self.TIMEOUT_STDERR, exit_code=137)
        assert result.category == FFmpegErrorCategory.TIMEOUT

    def test_parse_codec(self) -> None:
        result = FFmpegErrorParser.parse(self.CODEC_STDERR, exit_code=1)
        assert result.category == FFmpegErrorCategory.CODEC
        assert "decoder" in result.message.lower()

    def test_parse_io(self) -> None:
        result = FFmpegErrorParser.parse(self.IO_STDERR, exit_code=1)
        assert result.category == FFmpegErrorCategory.IO
        assert "no such file" in result.message.lower()

    def test_parse_corrupt(self) -> None:
        result = FFmpegErrorParser.parse(self.CORRUPT_STDERR, exit_code=1)
        assert result.category == FFmpegErrorCategory.CORRUPT

    def test_parse_empty_stderr(self) -> None:
        result = FFmpegErrorParser.parse("", exit_code=1)
        assert result.category == FFmpegErrorCategory.UNKNOWN
        assert "no error output" in result.message.lower()

    def test_parse_unknown_error(self) -> None:
        result = FFmpegErrorParser.parse("Something weird happened", exit_code=1)
        assert result.category == FFmpegErrorCategory.UNKNOWN
        assert result.message == "Something weird happened"

    def test_message_truncation(self) -> None:
        long_stderr = "error: " + "x" * 500
        result = FFmpegErrorParser.parse(long_stderr, exit_code=1)
        assert len(result.message) <= 200

    def test_to_dict_from_parsed(self) -> None:
        result = FFmpegErrorParser.parse(self.OOM_STDERR, exit_code=1)
        d = result.to_dict()
        assert d["category"] == "out_of_memory"
        assert d["is_transient"] is True
        json.dumps(d)  # Should not raise

    def test_raw_stderr_preserved(self) -> None:
        result = FFmpegErrorParser.parse(self.IO_STDERR, exit_code=2)
        assert result.raw_stderr == self.IO_STDERR
        assert result.exit_code == 2

    def test_signal_9_is_timeout(self) -> None:
        stderr = "received signal 9: killing process"
        result = FFmpegErrorParser.parse(stderr, exit_code=137)
        assert result.category == FFmpegErrorCategory.TIMEOUT

    def test_permission_denied_is_io(self) -> None:
        stderr = "/var/data/output.mp4: Permission denied"
        result = FFmpegErrorParser.parse(stderr, exit_code=1)
        assert result.category == FFmpegErrorCategory.IO

    def test_unsupported_codec(self) -> None:
        stderr = "Unsupported codec with id 12345 for input stream 0"
        result = FFmpegErrorParser.parse(stderr, exit_code=1)
        assert result.category == FFmpegErrorCategory.CODEC

    def test_truncated_is_corrupt(self) -> None:
        stderr = "Input file is truncated"
        result = FFmpegErrorParser.parse(stderr, exit_code=1)
        assert result.category == FFmpegErrorCategory.CORRUPT

    def test_default_exit_code(self) -> None:
        result = FFmpegErrorParser.parse("some error")
        assert result.exit_code == 1
