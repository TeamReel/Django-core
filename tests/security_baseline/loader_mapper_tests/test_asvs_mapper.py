"""Unit tests for ASVSMapper."""

import tempfile
from pathlib import Path

import pytest
import yaml
from security_baseline.config.asvs_mapper import ASVSMapper, ASVSMapperError


class TestASVSMapperBasics:
    """Test basic ASVSMapper functionality."""

    def test_initialization(self):
        """Test ASVSMapper initializes with default paths."""
        mapper = ASVSMapper()
        assert mapper.mappings_path.name == "asvs-l1-controls.yaml"
        assert mapper._mappings is None  # Lazy loading

    def test_initialization_with_custom_path(self):
        """Test ASVSMapper with custom mappings path."""
        custom_path = Path("/custom/path/asvs.yaml")
        mapper = ASVSMapper(mappings_path=custom_path)
        assert mapper.mappings_path == custom_path


class TestASVSMapperLazyLoading:
    """Test lazy loading behavior."""

    def test_lazy_loading_on_first_access(self):
        """Test that mappings load on first access."""
        with tempfile.TemporaryDirectory() as temp_dir:
            mappings_path = Path(temp_dir) / "asvs.yaml"

            # Create test mappings
            test_mappings = {
                "version": "1.0",
                "controls": {"V1.2.2": {"rule_ids": ["SEC001", "SEC002"], "title": "Test Control"}},
            }

            with open(mappings_path, "w") as f:
                yaml.dump(test_mappings, f)

            mapper = ASVSMapper(mappings_path=mappings_path)
            assert mapper._mappings is None  # Not loaded yet

            # Access triggers loading
            controls = mapper.get_controls_for_rule("SEC001")

            assert mapper._mappings is not None  # Now loaded
            assert "V1.2.2" in controls

    def test_lazy_loading_caches_result(self):
        """Test that mappings are cached after first load."""
        with tempfile.TemporaryDirectory() as temp_dir:
            mappings_path = Path(temp_dir) / "asvs.yaml"

            test_mappings = {"controls": {"V1.2.2": {"rule_ids": ["SEC001"], "title": "Test"}}}

            with open(mappings_path, "w") as f:
                yaml.dump(test_mappings, f)

            mapper = ASVSMapper(mappings_path=mappings_path)

            # First access
            mapper.get_controls_for_rule("SEC001")
            first_mappings = mapper._mappings

            # Second access - should use cache
            mapper.get_controls_for_rule("SEC001")
            second_mappings = mapper._mappings

            assert first_mappings is second_mappings  # Same object reference


class TestASVSMapperLookups:
    """Test control and rule lookup methods."""

    @pytest.fixture
    def mapper_with_test_data(self):
        """Create mapper with test data."""
        with tempfile.TemporaryDirectory() as temp_dir:
            mappings_path = Path(temp_dir) / "asvs.yaml"

            test_mappings = {
                "version": "1.0",
                "asvs_version": "4.0.3",
                "controls": {
                    "V1.2.2": {
                        "rule_ids": ["SEC001-DEBUG-MODE", "SEC002-SECRET-KEY"],
                        "title": "Security controls are identified and documented",
                        "status": "implemented",
                    },
                    "V2.1.1": {
                        "rule_ids": ["SEC017-PASSWORD-LENGTH", "SEC018-PASSWORD-COMPLEXITY"],
                        "title": "Password requirements",
                        "status": "implemented",
                    },
                    "V3.1.1": {
                        "rule_ids": [],  # No rules yet
                        "title": "Not implemented",
                        "status": "planned",
                    },
                },
            }

            with open(mappings_path, "w") as f:
                yaml.dump(test_mappings, f)

            yield ASVSMapper(mappings_path=mappings_path)

    def test_get_controls_for_rule_single_control(self, mapper_with_test_data):
        """Test getting controls for a rule with one mapping."""
        controls = mapper_with_test_data.get_controls_for_rule("SEC017-PASSWORD-LENGTH")
        assert len(controls) == 1
        assert "V2.1.1" in controls

    def test_get_controls_for_rule_multiple_controls(self, mapper_with_test_data):
        """Test getting controls for a rule mapped to multiple controls."""
        # SEC001 is in V1.2.2
        controls = mapper_with_test_data.get_controls_for_rule("SEC001-DEBUG-MODE")
        assert "V1.2.2" in controls

    def test_get_controls_for_rule_not_found(self, mapper_with_test_data):
        """Test getting controls for unmapped rule."""
        controls = mapper_with_test_data.get_controls_for_rule("SEC999-NONEXISTENT")
        assert controls == []  # Empty list, not error

    def test_get_rules_for_control_success(self, mapper_with_test_data):
        """Test getting rules for a control."""
        rules = mapper_with_test_data.get_rules_for_control("V1.2.2")
        assert len(rules) == 2
        assert "SEC001-DEBUG-MODE" in rules
        assert "SEC002-SECRET-KEY" in rules

    def test_get_rules_for_control_not_found(self, mapper_with_test_data):
        """Test getting rules for nonexistent control."""
        with pytest.raises(ASVSMapperError, match="not found"):
            mapper_with_test_data.get_rules_for_control("V99.99.99")

    def test_get_rules_for_control_empty(self, mapper_with_test_data):
        """Test getting rules for control with no rules."""
        rules = mapper_with_test_data.get_rules_for_control("V3.1.1")
        assert rules == []


class TestASVSMapperCoverageStatistics:
    """Test coverage statistics calculation."""

    @pytest.fixture
    def mapper_with_mixed_coverage(self):
        """Create mapper with mixed coverage data."""
        with tempfile.TemporaryDirectory() as temp_dir:
            mappings_path = Path(temp_dir) / "asvs.yaml"

            test_mappings = {
                "controls": {
                    # Implemented controls
                    "V1.2.2": {"rule_ids": ["SEC001", "SEC002"], "status": "implemented"},
                    "V1.6.1": {"rule_ids": ["SEC010", "SEC015"], "status": "implemented"},
                    "V2.1.1": {"rule_ids": ["SEC017", "SEC018", "SEC019"], "status": "implemented"},
                    # Planned control
                    "V3.1.1": {"rule_ids": [], "status": "planned"},
                    # Control without status
                    "V4.1.1": {"rule_ids": []},
                }
            }

            with open(mappings_path, "w") as f:
                yaml.dump(test_mappings, f)

            yield ASVSMapper(mappings_path=mappings_path)

    def test_coverage_total_controls(self, mapper_with_mixed_coverage):
        """Test total controls count."""
        stats = mapper_with_mixed_coverage.get_coverage_statistics()
        assert stats["total_controls"] == 5

    def test_coverage_implemented_controls(self, mapper_with_mixed_coverage):
        """Test implemented controls count."""
        stats = mapper_with_mixed_coverage.get_coverage_statistics()
        assert stats["implemented_controls"] == 3  # Only V1.2.2, V1.6.1, V2.1.1

    def test_coverage_percentage(self, mapper_with_mixed_coverage):
        """Test coverage percentage calculation."""
        stats = mapper_with_mixed_coverage.get_coverage_statistics()
        # 3 implemented / 5 total = 60%
        assert stats["coverage_percentage"] == 60.0

    def test_coverage_unmapped_controls(self, mapper_with_mixed_coverage):
        """Test unmapped controls list."""
        stats = mapper_with_mixed_coverage.get_coverage_statistics()
        assert "V3.1.1" in stats["unmapped_controls"]
        assert "V4.1.1" in stats["unmapped_controls"]
        assert len(stats["unmapped_controls"]) == 2

    def test_coverage_total_rules(self, mapper_with_mixed_coverage):
        """Test total unique rules count."""
        stats = mapper_with_mixed_coverage.get_coverage_statistics()
        # SEC001, SEC002, SEC010, SEC015, SEC017, SEC018, SEC019 = 7 unique rules
        assert stats["total_rules"] == 7

    def test_coverage_rules_by_category(self, mapper_with_mixed_coverage):
        """Test rules grouped by ASVS category."""
        stats = mapper_with_mixed_coverage.get_coverage_statistics()

        # V1 category: V1.2.2 (2 rules) + V1.6.1 (2 rules) = 4 rules
        assert stats["rules_by_category"]["V1"] == 4

        # V2 category: V2.1.1 (3 rules) = 3 rules
        assert stats["rules_by_category"]["V2"] == 3

        # V3 and V4 have 0 rules
        assert stats["rules_by_category"].get("V3", 0) == 0
        assert stats["rules_by_category"].get("V4", 0) == 0


class TestASVSMapperErrorHandling:
    """Test error handling."""

    def test_file_not_found(self):
        """Test error when mappings file doesn't exist."""
        mapper = ASVSMapper(mappings_path=Path("/nonexistent/file.yaml"))

        with pytest.raises(ASVSMapperError, match="not found"):
            mapper.get_controls_for_rule("SEC001")

    def test_malformed_yaml(self):
        """Test error with malformed YAML."""
        with tempfile.TemporaryDirectory() as temp_dir:
            mappings_path = Path(temp_dir) / "asvs.yaml"

            with open(mappings_path, "w") as f:
                f.write("invalid: yaml: content: [missing bracket")

            mapper = ASVSMapper(mappings_path=mappings_path)

            with pytest.raises(ASVSMapperError, match="YAML parse error"):
                mapper.get_controls_for_rule("SEC001")

    def test_invalid_mappings_format(self):
        """Test error with invalid mappings format (not a dict)."""
        with tempfile.TemporaryDirectory() as temp_dir:
            mappings_path = Path(temp_dir) / "asvs.yaml"

            with open(mappings_path, "w") as f:
                yaml.dump(["list", "instead", "of", "dict"], f)

            mapper = ASVSMapper(mappings_path=mappings_path)

            with pytest.raises(ASVSMapperError, match="Invalid mappings format"):
                mapper.get_controls_for_rule("SEC001")
