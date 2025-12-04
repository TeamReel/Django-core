"""
Template manifest schema and YAML parsing.

Defines TemplateManifest dataclass representing __template__.yaml structure
with validation and type checking.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import yaml


@dataclass
class TemplateManifest:
    """
    Template manifest schema.

    Represents metadata from __template__.yaml including template identification,
    variable definitions, file lists, and inheritance relationships.
    """

    name: str
    description: str
    variables: dict[str, dict[str, Any]]
    files: list[str]
    template_dir: Path
    extends: Optional[str] = None
    _source: str = field(default="unknown", repr=False)

    @classmethod
    def from_yaml(cls, manifest_path: Path) -> TemplateManifest:
        """
        Load template manifest from YAML file.

        Args:
            manifest_path: Path to __template__.yaml file

        Returns:
            Template manifest with parsed metadata

        Raises:
            ValueError: If manifest is invalid or missing required fields
            yaml.YAMLError: If YAML syntax is malformed
        """
        with open(manifest_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        if not isinstance(data, dict):
            raise ValueError(
                f"Manifest must be YAML dict, got {type(data).__name__}"
            )

        # Validate required fields
        required = ["name", "description", "variables", "files"]
        missing = [field for field in required if field not in data]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        # Validate field types
        if not isinstance(data["name"], str):
            raise ValueError(
                f"Field 'name' must be string, got {type(data['name']).__name__}"
            )
        if not isinstance(data["description"], str):
            raise ValueError(
                f"Field 'description' must be string, got {type(data['description']).__name__}"
            )
        if not isinstance(data["variables"], dict):
            raise ValueError(
                f"Field 'variables' must be dict, got {type(data['variables']).__name__}"
            )
        if not isinstance(data["files"], list):
            raise ValueError(
                f"Field 'files' must be list, got {type(data['files']).__name__}"
            )

        # Validate extends if present
        extends = data.get("extends")
        if extends is not None and not isinstance(extends, str):
            raise ValueError(
                f"Field 'extends' must be string, got {type(extends).__name__}"
            )

        return cls(
            name=data["name"],
            description=data["description"],
            variables=data["variables"],
            files=data["files"],
            template_dir=manifest_path.parent,
            extends=extends,
        )

    def validate(self) -> list[str]:
        """
        Validate template structure and manifest completeness.

        Checks:
        - All files in manifest exist in template directory
        - Variable definitions have required fields (type, description, required)
        - No circular inheritance (template extends itself)

        Returns:
            List of validation error messages (empty if valid)
        """
        errors = []

        # Check files exist in template directory
        for file_path in self.files:
            full_path = self.template_dir / file_path
            if not full_path.exists():
                errors.append(
                    f"File not found: {file_path} (expected at {full_path})"
                )

        # Check variable definitions have required fields
        for var_name, var_def in self.variables.items():
            if not isinstance(var_def, dict):
                errors.append(
                    f"Variable '{var_name}' definition must be dict, got {type(var_def).__name__}"
                )
                continue

            if "type" not in var_def:
                errors.append(f"Variable '{var_name}' missing 'type' field")
            if "description" not in var_def:
                errors.append(f"Variable '{var_name}' missing 'description' field")
            if "required" not in var_def:
                errors.append(f"Variable '{var_name}' missing 'required' field")

        # Check no circular inheritance
        if self.extends == self.name:
            errors.append(
                f"Template '{self.name}' extends itself (circular inheritance)"
            )

        return errors
