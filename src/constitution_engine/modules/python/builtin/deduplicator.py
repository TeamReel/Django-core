"""
Built-in validator: Duplicate Result Deduplicator

This validator removes duplicate check results.
"""

from constitution_engine.core.models import (
    CheckResult,
    ConfigurationProfile,
    RepositoryContext,
)

__all__ = ["DeduplicatorValidator"]


class DeduplicatorValidator:
    """
    Validator: Remove duplicate check results.

    This validator deduplicates check results based on:
    - Rule identifier
    - Message content
    - Location (file/line)

    Keeps the first occurrence of each unique result.
    """

    identifier = "duplicate-deduplicator"
    description = "Removes duplicate check results"

    def validate(
        self,
        results: list[CheckResult],
        context: RepositoryContext,
        config: ConfigurationProfile,
    ) -> list[CheckResult]:
        """
        Deduplicate check results.

        Args:
            results: Check results from rules
            context: Repository information
            config: Engine configuration

        Returns:
            Deduplicated list of check results
        """
        seen = set()
        deduplicated = []

        for result in results:
            # Create a unique key for this result
            key = self._make_result_key(result)

            if key not in seen:
                seen.add(key)
                deduplicated.append(result)

        # If duplicates were removed, we could optionally add metadata
        removed_count = len(results) - len(deduplicated)
        if removed_count > 0:
            # Could add a summary result here if desired
            pass

        return deduplicated

    def _make_result_key(self, result: CheckResult) -> tuple:
        """
        Create a unique key for a check result.

        Args:
            result: Check result to create key for

        Returns:
            Tuple that uniquely identifies this result
        """
        # Include rule identifier, severity, message, and affected_paths
        affected_paths_key = (
            tuple(str(p) for p in result.affected_paths) if result.affected_paths else None
        )

        return (
            result.rule_identifier,
            result.severity,
            result.message,
            affected_paths_key,
        )
