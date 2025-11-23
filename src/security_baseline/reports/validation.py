"""JSON Schema validation utilities for security reports."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

logger = logging.getLogger(__name__)

try:
    import jsonschema

    JSONSCHEMA_AVAILABLE = True
except ImportError:
    JSONSCHEMA_AVAILABLE = False
    logger.warning("jsonschema package not available - report validation disabled")


class SecurityReportValidator:
    """
    Validates SecurityReport objects against JSON Schema contracts.

    Loads schema from contracts/ directory and validates report structure.
    """

    def __init__(self, schema_path: str = None):
        """
        Initialize validator with schema path.

        Args:
            schema_path: Path to security-report.json schema file
        """
        self.schema_path = schema_path
        self.schema = None

        if schema_path and JSONSCHEMA_AVAILABLE:
            self._load_schema()

    def _load_schema(self) -> None:
        """Load JSON schema from file."""
        try:
            schema_file = Path(self.schema_path)
            if schema_file.exists():
                with open(schema_file, "r", encoding="utf-8") as f:
                    content = f.read()

                # Handle schema file that might have markdown formatting
                if content.strip().startswith("#"):
                    # Extract JSON from markdown code block
                    lines = content.split("\n")
                    json_start = None
                    json_end = None

                    for i, line in enumerate(lines):
                        if line.strip() == "```json" and json_start is None:
                            json_start = i + 1
                        elif line.strip() == "```" and json_start is not None and json_end is None:
                            json_end = i
                            break

                    if json_start is not None and json_end is not None:
                        json_content = "\n".join(lines[json_start:json_end])
                        self.schema = json.loads(json_content)
                    else:
                        logger.error(f"Could not extract JSON from schema file: {schema_file}")
                else:
                    # Regular JSON file
                    self.schema = json.loads(content)

                logger.info(f"Loaded security report schema from {schema_file}")
            else:
                logger.warning(f"Schema file not found: {schema_file}")

        except (json.JSONDecodeError, FileNotFoundError, IOError) as e:
            logger.error(f"Failed to load schema from {self.schema_path}: {e}")

    def validate_report(self, report_data: Dict[str, Any]) -> tuple[bool, List[str]]:
        """
        Validate security report data against schema.

        Args:
            report_data: Dictionary representation of SecurityReport

        Returns:
            Tuple of (is_valid, validation_errors)
        """
        if not JSONSCHEMA_AVAILABLE:
            logger.warning("jsonschema not available - skipping validation")
            return True, []

        if not self.schema:
            logger.warning("No schema loaded - skipping validation")
            return True, []

        try:
            jsonschema.validate(instance=report_data, schema=self.schema)
            logger.debug("Security report validation passed")
            return True, []

        except jsonschema.ValidationError as e:
            error_msg = f"Validation error at {'.'.join(str(p) for p in e.path)}: {e.message}"
            logger.error(f"Security report validation failed: {error_msg}")
            return False, [error_msg]

        except jsonschema.SchemaError as e:
            error_msg = f"Schema error: {e.message}"
            logger.error(f"Invalid schema: {error_msg}")
            return False, [error_msg]

        except Exception as e:
            error_msg = f"Unexpected validation error: {str(e)}"
            logger.error(error_msg)
            return False, [error_msg]

    def validate_report_object(self, report) -> tuple[bool, List[str]]:
        """
        Validate SecurityReport object against schema.

        Args:
            report: SecurityReport instance

        Returns:
            Tuple of (is_valid, validation_errors)
        """
        try:
            report_data = report.to_dict(sanitize_sensitive=False)
            return self.validate_report(report_data)
        except Exception as e:
            error_msg = f"Failed to convert report to dict: {str(e)}"
            logger.error(error_msg)
            return False, [error_msg]


# Default validator instance (will be initialized when schema path is known)
_default_validator = None


def get_default_validator() -> SecurityReportValidator:
    """Get or create default validator instance."""
    global _default_validator
    if _default_validator is None:
        # Try to find schema file relative to this module
        current_dir = Path(__file__).parent
        schema_path = (
            current_dir.parent.parent.parent
            / "kitty-specs"
            / "003-core-security-baseline"
            / "contracts"
            / "security-report.json"
        )
        _default_validator = SecurityReportValidator(
            str(schema_path) if schema_path.exists() else None
        )
    return _default_validator


def validate_security_report(report) -> tuple[bool, List[str]]:
    """
    Validate SecurityReport using default validator.

    Args:
        report: SecurityReport instance or dict

    Returns:
        Tuple of (is_valid, validation_errors)
    """
    validator = get_default_validator()

    if hasattr(report, "to_dict"):
        return validator.validate_report_object(report)
    else:
        return validator.validate_report(report)
