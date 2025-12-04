"""
User experience utilities for scaffolding CLI.

Provides TTY detection, interactive prompts, progress indicators,
and post-generation summaries for enhanced CLI usability.
"""

from scaffolding.ux.detection import is_interactive
from scaffolding.ux.progress import ProgressReporter
from scaffolding.ux.prompts import prompt_for_app_name, prompt_for_template
from scaffolding.ux.summary import print_generation_summary

__all__ = [
    "is_interactive",
    "prompt_for_template",
    "prompt_for_app_name",
    "ProgressReporter",
    "print_generation_summary",
]
