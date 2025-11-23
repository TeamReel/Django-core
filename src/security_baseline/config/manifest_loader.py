"""YAML manifest loader with environment-specific override support.

This module loads security rule manifests from YAML files and applies
environment-specific overrides using a deep merge strategy.

OWASP ASVS 4.0.3 Level 1 - Architecture compliance:
- V1.2.2: Configuration-driven security controls
- V1.14.3: Secure configuration management

Usage:
    loader = ManifestLoader()
    manifest = loader.load_manifest()  # Auto-detects environment
    manifest = loader.load_manifest(environment='production')  # Explicit
"""

import os
from pathlib import Path
from typing import Any, Dict

import yaml


class ManifestLoaderError(Exception):
    """Raised when manifest loading fails."""

    pass


class ManifestLoader:
    """
    Loads security rule manifests with environment-specific overrides.

    Strategy:
    1. Load base manifest from .security/manifests/runtime.yaml
    2. Detect environment from DJANGO_ENV or Django settings
    3. Load environment-specific overrides from .security/manifests/environments/{env}.yaml
    4. Deep merge environment overrides over base manifest
    5. Return merged configuration

    Environment Detection:
    - Checks DJANGO_ENV environment variable first
    - Falls back to Django settings.ENVIRONMENT if available
    - Defaults to 'local' if not specified

    Merge Strategy:
    - Nested dictionaries are merged recursively
    - Lists are replaced (not merged)
    - Environment values override base values
    """

    def __init__(self, base_path: Path | None = None):
        """Initialize manifest loader.

        Args:
            base_path: Root path for .security/ directory. If None, auto-detects
                      from this file's location (4 levels up from src/security_baseline/config/)
        """
        if base_path is None:
            # Auto-detect: Go up from src/security_baseline/config/ to project root
            base_path = Path(__file__).parent.parent.parent.parent / ".security"
        else:
            base_path = Path(base_path) / ".security"

        self.manifests_dir = base_path / "manifests"
        self.environments_dir = self.manifests_dir / "environments"
        self.base_manifest_path = self.manifests_dir / "runtime.yaml"

    def load_manifest(self, environment: str | None = None) -> Dict[str, Any]:
        """Load security manifest with environment-specific overrides.

        Args:
            environment: Target environment ('local', 'staging', 'production').
                        If None, auto-detects from DJANGO_ENV or Django settings.

        Returns:
            Merged manifest dictionary with environment overrides applied

        Raises:
            ManifestLoaderError: If base manifest missing or YAML parse fails
        """
        # Detect environment if not provided
        if environment is None:
            environment = self._detect_environment()

        # Load base manifest
        base_manifest = self._load_yaml(self.base_manifest_path)

        # Load environment-specific overrides (if they exist)
        env_manifest_path = self.environments_dir / f"{environment}.yaml"
        if env_manifest_path.exists():
            env_overrides = self._load_yaml(env_manifest_path)
            # Deep merge environment overrides over base
            manifest = self._deep_merge(base_manifest, env_overrides)
        else:
            # No environment overrides, use base manifest
            manifest = base_manifest

        return manifest

    def _detect_environment(self) -> str:
        """Detect current environment from environment variables or Django settings.

        Priority:
        1. DJANGO_ENV environment variable
        2. Django settings.ENVIRONMENT (if Django is configured)
        3. Default to 'local'

        Returns:
            Environment name ('local', 'staging', 'production')
        """
        # Check DJANGO_ENV first
        env = os.getenv("DJANGO_ENV")
        if env:
            return env

        # Try Django settings (if available)
        try:
            from django.conf import settings

            if hasattr(settings, "ENVIRONMENT"):
                return settings.ENVIRONMENT
        except (ImportError, Exception):  # noqa: S110
            # Django not configured or settings unavailable
            # No logging needed - this is expected in some environments
            pass

        # Default to local
        return "local"

    def _load_yaml(self, path: Path) -> Dict[str, Any]:
        """Load YAML file with security and error handling.

        Args:
            path: Path to YAML file

        Returns:
            Parsed YAML as dictionary

        Raises:
            ManifestLoaderError: If file missing, not readable, or YAML parse fails
        """
        if not path.exists():
            raise ManifestLoaderError(f"Manifest file not found: {path}")

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            if data is None:
                # Empty YAML file
                return {}

            if not isinstance(data, dict):
                raise ManifestLoaderError(
                    f"Invalid manifest format in {path}: expected dictionary, "
                    f"got {type(data).__name__}"
                )

            return data

        except yaml.YAMLError as e:
            # Parse error with line number
            raise ManifestLoaderError(f"YAML parse error in {path}: {e}") from e
        except IOError as e:
            raise ManifestLoaderError(f"Cannot read manifest {path}: {e}") from e

    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge two dictionaries (override values replace base values).

        Strategy:
        - Nested dictionaries are merged recursively
        - Lists, primitives, and other types are replaced (not merged)
        - Override values always win

        Args:
            base: Base dictionary
            override: Override dictionary (values replace base)

        Returns:
            Merged dictionary (new dict, does not modify inputs)

        Example:
            base = {"a": {"b": 1, "c": 2}, "d": 3}
            override = {"a": {"c": 99}, "e": 4}
            result = {"a": {"b": 1, "c": 99}, "d": 3, "e": 4}
        """
        result = base.copy()

        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Both are dicts - merge recursively
                result[key] = self._deep_merge(result[key], value)
            else:
                # Replace value (primitives, lists, or new keys)
                result[key] = value

        return result
