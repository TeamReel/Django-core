"""
Constitutional validation integration for scaffolding.

Provides ValidationRunner for executing check_policy.py and parsing
validation reports for constitutional compliance.
"""

from scaffolding.validation.formatter import format_validation_report
from scaffolding.validation.runner import ValidationRunner

__all__ = [
    "ValidationRunner",
    "format_validation_report",
]
