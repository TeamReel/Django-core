"""OWASP ASVS coverage calculation and reporting utilities."""

import logging
from collections import defaultdict
from typing import Dict, List

from security_baseline.reports.security_report import ASVSCoverage
from security_baseline.rules.base import SecurityRuleViolation

logger = logging.getLogger(__name__)


class ASVSCoverageCalculator:
    """
    Calculate OWASP ASVS coverage from security rules and violations.

    Groups rules by ASVS category and calculates coverage percentages.
    """

    def calculate_coverage(
        self, all_rules: List[object], violations: List[SecurityRuleViolation]
    ) -> Dict[str, ASVSCoverage]:
        """
        Calculate OWASP ASVS coverage from rules and violations.

        Args:
            all_rules: List of all security rules that were executed
            violations: List of security rule violations found

        Returns:
            Dictionary with top-level fields
            (total_controls_checked, level_1_coverage_percent,
            categories) plus per-category coverage information
        """
        # Group rules by ASVS category
        rules_by_category = self._group_rules_by_asvs_category(all_rules)

        # Group violations by ASVS category
        violations_by_category = self._group_violations_by_asvs_category(violations)

        # Calculate coverage for each category
        coverage = {}
        category_counts = {}
        total_checked = 0
        total_passed = 0

        for category, rules in rules_by_category.items():
            category_violations = violations_by_category.get(category, [])

            total_rules = len(rules)
            failed_rules = len(category_violations)
            passed_rules = total_rules - failed_rules

            coverage_percentage = (passed_rules / total_rules * 100) if total_rules > 0 else 0.0

            coverage[category] = ASVSCoverage(
                category=category,
                total_rules=total_rules,
                passed_rules=passed_rules,
                failed_rules=failed_rules,
                coverage_percentage=round(coverage_percentage, 2),
                violations=category_violations,
            )

            # Track totals for top-level fields
            total_checked += total_rules
            total_passed += passed_rules

            # Build category counts dict (category_name -> count)
            # Convert "V3 - Session Management" to "V3_Session_Management"
            safe_category = category.replace(" - ", "_").replace(" ", "_")
            category_counts[safe_category] = total_rules

        # Add top-level summary fields required by schema
        coverage["total_controls_checked"] = total_checked
        coverage["level_1_coverage_percent"] = (
            round((total_passed / total_checked * 100), 2) if total_checked > 0 else 0.0
        )
        coverage["categories"] = category_counts

        return coverage

    def _group_rules_by_asvs_category(self, rules: List[object]) -> Dict[str, List[object]]:
        """Group security rules by their OWASP ASVS category."""
        categories = defaultdict(list)

        for rule in rules:
            # Extract ASVS category from rule's OWASP references
            if hasattr(rule, "owasp_asvs_refs") and rule.owasp_asvs_refs:
                for ref in rule.owasp_asvs_refs:
                    category = self._extract_asvs_category(ref)
                    categories[category].append(rule)
                    break  # Only assign rule to first category to avoid duplicates
            else:
                # Default category for rules without ASVS references
                categories["Other"].append(rule)

        return dict(categories)

    def _group_violations_by_asvs_category(
        self, violations: List[SecurityRuleViolation]
    ) -> Dict[str, List[SecurityRuleViolation]]:
        """Group security violations by their OWASP ASVS category."""
        categories = defaultdict(list)

        for violation in violations:
            if violation.owasp_asvs_refs:
                for ref in violation.owasp_asvs_refs:
                    category = self._extract_asvs_category(ref)
                    categories[category].append(violation)
                    break  # Only assign violation to first category
            else:
                categories["Other"].append(violation)

        return dict(categories)

    def _extract_asvs_category(self, asvs_ref: str) -> str:
        """
        Extract ASVS category from reference string.

        Examples:
            'V1.2.2' -> 'V1 - Architecture, Design and Threat Modeling'
            'V4.2.1' -> 'V4 - Access Control'
            'V14.2.3' -> 'V14 - Configuration'
        """
        if not asvs_ref or not asvs_ref.startswith("V"):
            return "Other"

        # Extract major version number (V1, V2, etc.)
        try:
            version_part = asvs_ref.split(".")[0]  # Get 'V1' from 'V1.2.2'
            version_num = int(version_part[1:])  # Get 1 from 'V1'

            # Map version numbers to category names
            category_map = {
                1: "V1 - Architecture, Design and Threat Modeling",
                2: "V2 - Authentication",
                3: "V3 - Session Management",
                4: "V4 - Access Control",
                5: "V5 - Validation, Sanitization and Encoding",
                6: "V6 - Stored Cryptography",
                7: "V7 - Error Handling and Logging",
                8: "V8 - Data Protection",
                9: "V9 - Communication",
                10: "V10 - Malicious Code",
                11: "V11 - Business Logic",
                12: "V12 - Files and Resources",
                13: "V13 - API and Web Service",
                14: "V14 - Configuration",
            }

            return category_map.get(version_num, f"V{version_num} - Unknown Category")

        except (IndexError, ValueError):
            logger.warning(f"Invalid ASVS reference format: {asvs_ref}")
            return "Other"
