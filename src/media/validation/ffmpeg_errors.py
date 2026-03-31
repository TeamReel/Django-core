"""FFmpeg error parsing and categorization.

Parses FFmpeg stderr output into actionable error categories for better
debugging, user-friendly error messages, and intelligent retry decisions.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Pattern

__all__ = [
    "FFmpegErrorCategory",
    "FFmpegError",
    "FFmpegErrorParser",
    "ERROR_PATTERNS",
]


class FFmpegErrorCategory(str, Enum):
    """Categorized FFmpeg error types for actionable error handling."""

    OOM = "out_of_memory"
    TIMEOUT = "timeout"
    CODEC = "codec_error"
    IO = "io_error"
    CORRUPT = "corrupt_input"
    UNKNOWN = "unknown"


@dataclass
class FFmpegError:
    """Parsed FFmpeg error with category and message."""

    category: FFmpegErrorCategory
    message: str
    raw_stderr: str
    exit_code: int

    @property
    def is_transient(self) -> bool:
        """Whether this error might succeed on retry."""
        return self.category in (
            FFmpegErrorCategory.OOM,
            FFmpegErrorCategory.TIMEOUT,
        )

    @property
    def user_message(self) -> str:
        """User-friendly message for UI display."""
        messages = {
            FFmpegErrorCategory.OOM: "Onvoldoende geheugen voor video verwerking",
            FFmpegErrorCategory.TIMEOUT: "Video verwerking duurde te lang",
            FFmpegErrorCategory.CODEC: "Video formaat niet ondersteund",
            FFmpegErrorCategory.IO: "Bestand kon niet worden gelezen",
            FFmpegErrorCategory.CORRUPT: "Video bestand is beschadigd",
            FFmpegErrorCategory.UNKNOWN: "Video verwerking mislukt",
        }
        return messages[self.category]

    def to_dict(self) -> dict:
        """Serialize for logging/API response."""
        return {
            "category": self.category.value,
            "message": self.message,
            "user_message": self.user_message,
            "is_transient": self.is_transient,
            "exit_code": self.exit_code,
        }


# Compiled regex patterns for performance — ordered by specificity, first match wins.
ERROR_PATTERNS: Dict[FFmpegErrorCategory, List[Pattern[str]]] = {
    FFmpegErrorCategory.OOM: [
        re.compile(r"cannot allocate memory", re.IGNORECASE),
        re.compile(r"out of memory", re.IGNORECASE),
        re.compile(r"memory allocation.*failed", re.IGNORECASE),
        re.compile(r"insufficient memory", re.IGNORECASE),
    ],
    FFmpegErrorCategory.TIMEOUT: [
        re.compile(r"timeout", re.IGNORECASE),
        re.compile(r"killed", re.IGNORECASE),
        re.compile(r"signal 9", re.IGNORECASE),
        re.compile(r"signal 15", re.IGNORECASE),
    ],
    FFmpegErrorCategory.CODEC: [
        re.compile(r"decoder.*not found", re.IGNORECASE),
        re.compile(r"encoder.*not found", re.IGNORECASE),
        re.compile(r"unsupported codec", re.IGNORECASE),
        re.compile(r"unknown.*codec", re.IGNORECASE),
        re.compile(r"codec not.*support", re.IGNORECASE),
    ],
    FFmpegErrorCategory.IO: [
        re.compile(r"no such file", re.IGNORECASE),
        re.compile(r"permission denied", re.IGNORECASE),
        re.compile(r"input/output error", re.IGNORECASE),
        re.compile(r"is a directory", re.IGNORECASE),
        re.compile(r"read error", re.IGNORECASE),
        re.compile(r"error opening", re.IGNORECASE),
    ],
    FFmpegErrorCategory.CORRUPT: [
        re.compile(r"invalid data", re.IGNORECASE),
        re.compile(r"corrupt", re.IGNORECASE),
        re.compile(r"moov atom not found", re.IGNORECASE),
        re.compile(r"invalid.*header", re.IGNORECASE),
        re.compile(r"truncated", re.IGNORECASE),
        re.compile(r"end of file", re.IGNORECASE),
    ],
}


class FFmpegErrorParser:
    """Parse FFmpeg stderr into categorized errors."""

    @classmethod
    def parse(cls, stderr: str, exit_code: int = 1) -> FFmpegError:
        """Parse FFmpeg stderr output into a categorized error.

        Args:
            stderr: Raw stderr output from FFmpeg
            exit_code: Process exit code

        Returns:
            FFmpegError with category and messages
        """
        if not stderr:
            return FFmpegError(
                category=FFmpegErrorCategory.UNKNOWN,
                message="FFmpeg failed with no error output",
                raw_stderr="",
                exit_code=exit_code,
            )

        # Try to match patterns in priority order
        for category, patterns in ERROR_PATTERNS.items():
            for pattern in patterns:
                match = pattern.search(stderr)
                if match:
                    matched_text = match.group(0)
                    return FFmpegError(
                        category=category,
                        message=cls._extract_message(stderr, matched_text),
                        raw_stderr=stderr,
                        exit_code=exit_code,
                    )

        # No pattern matched — return UNKNOWN
        return FFmpegError(
            category=FFmpegErrorCategory.UNKNOWN,
            message=cls._extract_first_error_line(stderr),
            raw_stderr=stderr,
            exit_code=exit_code,
        )

    @classmethod
    def _extract_message(cls, stderr: str, matched: str) -> str:
        """Extract a clean error message around the match."""
        for line in stderr.split("\n"):
            if matched.lower() in line.lower():
                line = line.strip()
                for prefix in ["[error]", "error:", "fatal:"]:
                    if line.lower().startswith(prefix):
                        line = line[len(prefix) :].strip()
                return line[:200]
        return matched

    @classmethod
    def _extract_first_error_line(cls, stderr: str) -> str:
        """Extract the first line that looks like an error."""
        error_indicators = ["error", "failed", "invalid", "cannot", "unable"]

        for line in stderr.split("\n"):
            line = line.strip()
            if any(ind in line.lower() for ind in error_indicators):
                return line[:200]

        # No obvious error line — return first non-empty line
        for line in stderr.split("\n"):
            line = line.strip()
            if line:
                return line[:200]

        return "Unknown FFmpeg error"
