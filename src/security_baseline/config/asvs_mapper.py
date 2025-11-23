"""OWASP ASVS control mapper with lazy loading.

This module loads OWASP ASVS Level 1 control mappings and provides
bi-directional lookup between security rules and ASVS controls.

OWASP ASVS 4.0.3 Level 1 - V1.2.2:
Verify that all security controls are clearly documented and tested.

Usage:
    mapper = ASVSMapper()
    controls = mapper.get_controls_for_rule('SEC001-DEBUG-MODE')
    rules = mapper.get_rules_for_control('V1.2.2')
    coverage = mapper.get_coverage_statistics()
"""

from pathlib import Path
from typing import Dict, List, Set

import yaml


class ASVSMapperError(Exception):
    """Raised when ASVS mapping operations fail."""

    pass


class ASVSMapper:
    """
    OWASP ASVS control mapper with lazy loading and bi-directional lookup.

    This class loads control-to-rule mappings from YAML and provides:
    - Lookup rules for a given ASVS control
    - Lookup ASVS controls for a given rule
    - Coverage statistics (rules mapped vs unmapped)

    Mappings are loaded once and cached in memory for performance.
    """

    def __init__(self, mappings_path: Path | None = None):
        """Initialize ASVS mapper with lazy loading.

        Args:
            mappings_path: Path to asvs-l1-controls.yaml. If None, auto-detects
                          from this file's location (4 levels up + .security/mappings/)
        """
        if mappings_path is None:
            # Auto-detect: Go up from src/security_baseline/config/ to project root
            base_path = Path(__file__).parent.parent.parent.parent
            mappings_path = base_path / ".security" / "mappings" / "asvs-l1-controls.yaml"
        else:
            mappings_path = Path(mappings_path)

        self.mappings_path = mappings_path
        self._mappings: Dict[str, Dict] | None = None  # Lazy-loaded cache
        self._rule_to_controls: Dict[str, Set[str]] | None = None  # Reverse index

    def get_controls_for_rule(self, rule_id: str) -> List[str]:
        """Get ASVS controls that map to a given rule.

        Args:
            rule_id: Rule identifier (e.g., 'SEC001-DEBUG-MODE')

        Returns:
            List of ASVS control IDs (e.g., ['V1.2.2', 'V7.4.1'])

        Example:
            >>> mapper = ASVSMapper()
            >>> mapper.get_controls_for_rule('SEC001-DEBUG-MODE')
            ['V1.2.2', 'V7.4.1']
        """
        self._ensure_loaded()

        # Use reverse index for fast lookup
        return list(self._rule_to_controls.get(rule_id, set()))

    def get_rules_for_control(self, control_id: str) -> List[str]:
        """Get security rules that implement a given ASVS control.

        Args:
            control_id: ASVS control identifier (e.g., 'V1.2.2')

        Returns:
            List of rule IDs (e.g., ['SEC001-DEBUG-MODE', 'SEC002-SECRET-KEY'])

        Raises:
            ASVSMapperError: If control_id not found in mappings

        Example:
            >>> mapper = ASVSMapper()
            >>> mapper.get_rules_for_control('V1.2.2')
            ['SEC001-DEBUG-MODE', 'SEC002-SECRET-KEY']
        """
        self._ensure_loaded()

        control = self._mappings.get("controls", {}).get(control_id)
        if control is None:
            raise ASVSMapperError(f"ASVS control not found: {control_id}")

        return control.get("rule_ids", [])

    def get_coverage_statistics(self) -> Dict[str, any]:
        """Calculate ASVS coverage statistics.

        Returns:
            Dictionary with coverage metrics:
            - total_controls: Total ASVS controls defined
            - implemented_controls: Controls with rules implemented
            - coverage_percentage: (implemented / total) * 100
            - unmapped_controls: List of control IDs without implementations
            - total_rules: Total unique rule IDs mapped
            - rules_by_category: Count of rules per ASVS category (V1, V2, etc.)

        Example:
            >>> mapper = ASVSMapper()
            >>> stats = mapper.get_coverage_statistics()
            >>> print(f"{stats['coverage_percentage']:.1f}% coverage")
            85.0% coverage
        """
        self._ensure_loaded()

        controls = self._mappings.get("controls", {})
        total_controls = len(controls)
        implemented = 0
        unmapped = []
        all_rules = set()
        rules_by_category = {}

        for control_id, control_data in controls.items():
            rule_ids = control_data.get("rule_ids", [])
            status = control_data.get("status", "")

            if rule_ids and status == "implemented":
                implemented += 1
                all_rules.update(rule_ids)
            else:
                unmapped.append(control_id)

            # Extract category (V1, V2, etc.) from control ID (V1.2.2 -> V1)
            category = control_id.split(".")[0]
            rules_by_category[category] = rules_by_category.get(category, 0) + len(rule_ids)

        coverage_pct = (implemented / total_controls * 100) if total_controls > 0 else 0

        return {
            "total_controls": total_controls,
            "implemented_controls": implemented,
            "coverage_percentage": coverage_pct,
            "unmapped_controls": unmapped,
            "total_rules": len(all_rules),
            "rules_by_category": rules_by_category,
        }

    def _ensure_loaded(self):
        """Ensure mappings are loaded (lazy loading).

        Loads mappings from YAML on first call, then caches for future calls.

        Raises:
            ASVSMapperError: If mappings file missing or invalid
        """
        if self._mappings is not None:
            return  # Already loaded

        if not self.mappings_path.exists():
            raise ASVSMapperError(f"ASVS mappings file not found: {self.mappings_path}")

        try:
            with open(self.mappings_path, "r", encoding="utf-8") as f:
                self._mappings = yaml.safe_load(f)

            if not isinstance(self._mappings, dict):
                raise ASVSMapperError(
                    f"Invalid mappings format: expected dictionary, "
                    f"got {type(self._mappings).__name__}"
                )

            # Build reverse index (rule_id -> [control_ids])
            self._build_reverse_index()

        except yaml.YAMLError as e:
            raise ASVSMapperError(f"YAML parse error in {self.mappings_path}: {e}") from e
        except IOError as e:
            raise ASVSMapperError(f"Cannot read mappings {self.mappings_path}: {e}") from e

    def _build_reverse_index(self):
        """Build reverse index from rule_id to control_ids for fast lookup.

        This creates a dictionary mapping each rule_id to the set of
        ASVS control IDs that reference it.
        """
        self._rule_to_controls = {}
        controls = self._mappings.get("controls", {})

        for control_id, control_data in controls.items():
            rule_ids = control_data.get("rule_ids", [])
            for rule_id in rule_ids:
                if rule_id not in self._rule_to_controls:
                    self._rule_to_controls[rule_id] = set()
                self._rule_to_controls[rule_id].add(control_id)
