"""Tests for Django configuration security audit (WP12).

Tests cover:
- T108: audit_config.py implementation
- T109: AST parsing
- T110: SecurityRule logic reuse
- T111: Settings file discovery
- T112-T113: Reporting and CI integration
- T114-T116: Fixtures and documentation
"""

# Import functions from audit_config.py
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / ".security" / "scripts"))

from audit_config import (  # noqa: E402
    audit_settings_file,
    extract_setting_value,
    find_settings_files,
    generate_security_report,
    infer_environment,
    parse_settings_file,
    validate_setting,
)


@pytest.fixture
def sample_manifest():
    """Sample runtime manifest configuration."""
    return {
        "version": "1.0",
        "validation_rules": {},
    }


class TestSettingsFileDiscovery:
    """Tests for settings file discovery (T111)."""

    def test_find_settings_files(self, tmp_path):
        """Test finding Django settings files."""
        settings_dir = tmp_path / "config" / "settings"
        settings_dir.mkdir(parents=True)

        # Create various settings files
        (settings_dir / "base.py").write_text("DEBUG = False")
        (settings_dir / "local.py").write_text("DEBUG = True")
        (settings_dir / "production.py").write_text("DEBUG = False")
        (settings_dir / "__init__.py").write_text("")  # Should be ignored

        # Create __pycache__ directory (should be ignored)
        pycache_dir = settings_dir / "__pycache__"
        pycache_dir.mkdir()
        (pycache_dir / "base.cpython-312.pyc").write_text("compiled")

        result = find_settings_files(settings_dir)

        assert len(result) == 3
        assert any("base.py" in str(f) for f in result)
        assert any("local.py" in str(f) for f in result)
        assert any("production.py" in str(f) for f in result)
        assert not any("__init__.py" in str(f) for f in result)
        assert not any("__pycache__" in str(f) for f in result)

    def test_find_settings_files_nonexistent_dir(self, tmp_path):
        """Test finding settings files in nonexistent directory."""
        result = find_settings_files(tmp_path / "nonexistent")
        assert result == []


class TestEnvironmentInference:
    """Tests for environment type inference (T111)."""

    def test_infer_production_environment(self, tmp_path):
        """Test inferring production environment."""
        prod_file = tmp_path / "production.py"
        assert infer_environment(prod_file) == "production"

        prod_file2 = tmp_path / "prod.py"
        assert infer_environment(prod_file2) == "production"

    def test_infer_staging_environment(self, tmp_path):
        """Test inferring staging environment."""
        stage_file = tmp_path / "staging.py"
        assert infer_environment(stage_file) == "staging"

        stage_file2 = tmp_path / "stage.py"
        assert infer_environment(stage_file2) == "staging"

    def test_infer_local_environment(self, tmp_path):
        """Test inferring local/development environment."""
        local_file = tmp_path / "local.py"
        assert infer_environment(local_file) == "local"

        dev_file = tmp_path / "dev.py"
        assert infer_environment(dev_file) == "local"

    def test_infer_base_environment(self, tmp_path):
        """Test inferring base settings."""
        base_file = tmp_path / "base.py"
        assert infer_environment(base_file) == "base"

    def test_infer_unknown_environment(self, tmp_path):
        """Test inferring unknown environment."""
        custom_file = tmp_path / "custom_settings.py"
        assert infer_environment(custom_file) == "unknown"


class TestASTValueExtraction:
    """Tests for AST value extraction (T109)."""

    def test_extract_constant_values(self):
        """Test extracting constant values from AST."""
        import ast

        # String constant
        node = ast.Constant(value="test_string")
        assert extract_setting_value(node) == "test_string"

        # Integer constant
        node = ast.Constant(value=42)
        assert extract_setting_value(node) == 42

        # Boolean constant
        node = ast.Constant(value=True)
        assert extract_setting_value(node) is True

    def test_extract_list_values(self):
        """Test extracting list values from AST."""
        import ast

        list_node = ast.List(
            elts=[
                ast.Constant(value="item1"),
                ast.Constant(value="item2"),
                ast.Constant(value="item3"),
            ]
        )
        result = extract_setting_value(list_node)
        assert result == ["item1", "item2", "item3"]

    def test_extract_dict_values(self):
        """Test extracting dictionary values from AST."""
        import ast

        dict_node = ast.Dict(
            keys=[ast.Constant(value="key1"), ast.Constant(value="key2")],
            values=[ast.Constant(value="value1"), ast.Constant(value="value2")],
        )
        result = extract_setting_value(dict_node)
        assert result == {"key1": "value1", "key2": "value2"}

    def test_extract_variable_references(self):
        """Test extracting variable references from AST."""
        import ast

        # Variable name
        node = ast.Name(id="DEBUG")
        result = extract_setting_value(node)
        assert result.startswith("<variable:")


class TestSettingsFileParsing:
    """Tests for settings file AST parsing (T109)."""

    def test_parse_basic_settings(self, tmp_path):
        """Test parsing basic Django settings."""
        settings_file = tmp_path / "settings.py"
        settings_file.write_text(
            """
DEBUG = True
SECRET_KEY = "django-insecure-test-key-12345"
ALLOWED_HOSTS = ["example.com", "*.example.com"]
SESSION_COOKIE_SECURE = False
SECURE_HSTS_SECONDS = 31536000
"""
        )

        result = parse_settings_file(settings_file)

        assert "DEBUG" in result
        assert result["DEBUG"][0] is True
        assert "SECRET_KEY" in result
        assert result["SECRET_KEY"][0] == "django-insecure-test-key-12345"
        assert "ALLOWED_HOSTS" in result
        assert result["ALLOWED_HOSTS"][0] == ["example.com", "*.example.com"]
        assert "SESSION_COOKIE_SECURE" in result
        assert result["SESSION_COOKIE_SECURE"][0] is False
        assert "SECURE_HSTS_SECONDS" in result
        assert result["SECURE_HSTS_SECONDS"][0] == 31536000

    def test_parse_settings_with_comments(self, tmp_path):
        """Test parsing settings with comments."""
        settings_file = tmp_path / "settings.py"
        settings_file.write_text(
            """
# Security settings
DEBUG = False  # Disable debug mode
SECRET_KEY = "test-key"
"""
        )

        result = parse_settings_file(settings_file)

        assert "DEBUG" in result
        assert result["DEBUG"][0] is False
        assert "SECRET_KEY" in result

    def test_parse_settings_ignores_lowercase(self, tmp_path):
        """Test that parsing ignores lowercase variables (not Django settings)."""
        settings_file = tmp_path / "settings.py"
        settings_file.write_text(
            """
DEBUG = True
lowercase_var = "should_be_ignored"
_private_var = "also_ignored"
"""
        )

        result = parse_settings_file(settings_file)

        assert "DEBUG" in result
        assert "lowercase_var" not in result
        assert "_private_var" not in result


class TestSettingValidation:
    """Tests for individual setting validation (T110)."""

    def test_validate_debug_mode_production(self):
        """Test DEBUG=True validation in production."""
        violations = validate_setting("DEBUG", True, 10, "production", {})

        assert len(violations) == 1
        assert violations[0]["severity"] == "CRITICAL"
        assert "DEBUG=True" in violations[0]["message"]

    def test_validate_debug_mode_local(self):
        """Test DEBUG=True is allowed in local environment."""
        violations = validate_setting("DEBUG", True, 10, "local", {})
        assert len(violations) == 0

    def test_validate_secret_key_length(self):
        """Test SECRET_KEY length validation."""
        short_key = "short"
        violations = validate_setting("SECRET_KEY", short_key, 10, "production", {})

        assert len(violations) >= 1
        assert any("too short" in v["message"].lower() for v in violations)

    def test_validate_secret_key_hardcoded(self):
        """Test SECRET_KEY hardcoding validation."""
        hardcoded_key = "django-insecure-hardcoded-key-1234567890-abcdefghijk"
        violations = validate_setting("SECRET_KEY", hardcoded_key, 10, "production", {})

        assert len(violations) >= 1
        assert any("environment variable" in v["message"].lower() for v in violations)

    def test_validate_allowed_hosts_empty_production(self):
        """Test ALLOWED_HOSTS empty in production."""
        violations = validate_setting("ALLOWED_HOSTS", [], 10, "production", {})

        assert len(violations) == 1
        assert violations[0]["severity"] == "CRITICAL"
        assert "empty" in violations[0]["message"].lower()

    def test_validate_allowed_hosts_wildcard(self):
        """Test ALLOWED_HOSTS with wildcard."""
        violations = validate_setting("ALLOWED_HOSTS", ["*"], 10, "production", {})

        assert len(violations) == 1
        assert violations[0]["severity"] == "CRITICAL"
        assert "wildcard" in violations[0]["message"].lower()

    def test_validate_session_cookie_secure(self):
        """Test SESSION_COOKIE_SECURE validation."""
        violations = validate_setting("SESSION_COOKIE_SECURE", False, 10, "production", {})

        assert len(violations) == 1
        assert violations[0]["severity"] == "HIGH"

    def test_validate_session_cookie_httponly(self):
        """Test SESSION_COOKIE_HTTPONLY validation."""
        violations = validate_setting("SESSION_COOKIE_HTTPONLY", False, 10, "base", {})

        assert len(violations) == 1
        assert violations[0]["severity"] == "MEDIUM"

    def test_validate_session_cookie_samesite(self):
        """Test SESSION_COOKIE_SAMESITE validation."""
        violations = validate_setting("SESSION_COOKIE_SAMESITE", "None", 10, "base", {})

        assert len(violations) == 1
        assert "Lax" in violations[0]["message"] or "Strict" in violations[0]["message"]

    def test_validate_hsts_seconds(self):
        """Test SECURE_HSTS_SECONDS validation."""
        violations = validate_setting("SECURE_HSTS_SECONDS", 3600, 10, "production", {})

        assert len(violations) == 1
        assert "31536000" in violations[0]["message"]

    def test_validate_secure_ssl_redirect(self):
        """Test SECURE_SSL_REDIRECT validation."""
        violations = validate_setting("SECURE_SSL_REDIRECT", False, 10, "production", {})

        assert len(violations) == 1
        assert violations[0]["severity"] == "HIGH"


class TestSettingsFileAudit:
    """Tests for complete settings file audit (T108, T112)."""

    def test_audit_insecure_production_settings(self, tmp_path, sample_manifest):
        """Test auditing insecure production settings."""
        settings_file = tmp_path / "production.py"
        settings_file.write_text(
            """
DEBUG = True
SECRET_KEY = "short"
ALLOWED_HOSTS = ["*"]
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
"""
        )

        result = audit_settings_file(settings_file, sample_manifest)

        assert result["environment"] == "production"
        assert result["violation_count"] > 0
        assert len(result["violations"]) > 5  # Multiple violations

    def test_audit_secure_production_settings(self, tmp_path, sample_manifest):
        """Test auditing secure production settings."""
        settings_file = tmp_path / "production.py"
        settings_file.write_text(
            """
DEBUG = False
SECRET_KEY = "<variable:SECRET_KEY>"
ALLOWED_HOSTS = ["example.com", "www.example.com"]
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
"""
        )

        result = audit_settings_file(settings_file, sample_manifest)

        assert result["environment"] == "production"
        assert result["violation_count"] == 0

    def test_audit_permissive_local_settings(self, tmp_path, sample_manifest):
        """Test auditing permissive local settings (should be allowed)."""
        settings_file = tmp_path / "local.py"
        settings_file.write_text(
            """
DEBUG = True
SECRET_KEY = "django-insecure-local-dev-key-1234567890"
ALLOWED_HOSTS = ["*"]
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
"""
        )

        result = audit_settings_file(settings_file, sample_manifest)

        assert result["environment"] == "local"
        # Local environment allows DEBUG=True and other permissive settings
        # Only universal violations should be flagged
        assert result["violation_count"] < 5


class TestReportGeneration:
    """Tests for security report generation (T113)."""

    def test_generate_security_report_with_violations(self):
        """Test generating report with violations."""
        audit_results = [
            {
                "file": "production.py",
                "environment": "production",
                "settings_count": 10,
                "violations": [
                    {
                        "rule_id": "SEC-001",
                        "setting": "DEBUG",
                        "value": True,
                        "line": 5,
                        "severity": "CRITICAL",
                        "message": "DEBUG=True in production",
                        "remediation": "Set DEBUG=False",
                    },
                    {
                        "rule_id": "SEC-030",
                        "setting": "SECURE_HSTS_SECONDS",
                        "value": 0,
                        "line": 15,
                        "severity": "HIGH",
                        "message": "HSTS too low",
                        "remediation": "Set to 31536000",
                    },
                ],
                "violation_count": 2,
            }
        ]

        scan_metadata = {"tool": "audit_config"}

        report = generate_security_report(audit_results, scan_metadata)

        assert report["report_type"] == "configuration_audit"
        assert report["total_issues"] == 2
        assert report["blocking_issues"] == 2  # Both CRITICAL and HIGH
        assert report["warning_issues"] == 0
        assert len(report["issues"]["blocking"]) == 2
        assert len(report["files_audited"]) == 1

    def test_generate_security_report_no_violations(self):
        """Test generating report with no violations."""
        audit_results = [
            {
                "file": "production.py",
                "environment": "production",
                "settings_count": 10,
                "violations": [],
                "violation_count": 0,
            }
        ]

        report = generate_security_report(audit_results, {})

        assert report["total_issues"] == 0
        assert report["blocking_issues"] == 0
        assert report["warning_issues"] == 0


class TestFixtureFiles:
    """Tests with fixture settings files (T114-T116)."""

    def test_fixture_production_insecure(self, tmp_path, sample_manifest):
        """Test with insecure production fixture."""
        fixture_file = tmp_path / "production_insecure.py"
        fixture_file.write_text(
            """
# INSECURE production settings for testing
DEBUG = True  # Should fail
SECRET_KEY = "hardcoded-key-abc123"  # Should fail
ALLOWED_HOSTS = ["*"]  # Should fail
SESSION_COOKIE_SECURE = False  # Should fail
CSRF_COOKIE_SECURE = False  # Should fail
SECURE_SSL_REDIRECT = False  # Should fail
"""
        )

        result = audit_settings_file(fixture_file, sample_manifest)

        # Should have multiple CRITICAL/HIGH violations
        assert result["violation_count"] >= 6
        critical_high = [v for v in result["violations"] if v["severity"] in ["CRITICAL", "HIGH"]]
        assert len(critical_high) >= 6

    def test_fixture_staging_valid(self, tmp_path, sample_manifest):
        """Test with valid staging fixture."""
        fixture_file = tmp_path / "staging_valid.py"
        fixture_file.write_text(
            """
# Secure staging settings
DEBUG = False
SECRET_KEY = "<variable:SECRET_KEY>"
ALLOWED_HOSTS = ["staging.example.com"]
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = "DENY"
"""
        )

        result = audit_settings_file(fixture_file, sample_manifest)

        # Should have no violations
        assert result["violation_count"] == 0

    def test_fixture_local_permissive(self, tmp_path, sample_manifest):
        """Test with permissive local development fixture."""
        fixture_file = tmp_path / "local_permissive.py"
        fixture_file.write_text(
            """
# Permissive local development settings
DEBUG = True  # Allowed in local
SECRET_KEY = "django-insecure-local-key-for-development-only-1234567890"
ALLOWED_HOSTS = ["*"]  # Allowed in local
SESSION_COOKIE_SECURE = False  # Allowed in local for HTTP
CSRF_COOKIE_SECURE = False  # Allowed in local for HTTP
SECURE_SSL_REDIRECT = False  # Allowed in local
SESSION_COOKIE_HTTPONLY = True  # Still recommended
SESSION_COOKIE_SAMESITE = "Lax"  # Still recommended
"""
        )

        result = audit_settings_file(fixture_file, sample_manifest)

        # Local environment should have few violations
        # Only universal best practices might be flagged
        assert result["violation_count"] <= 2


# Documentation for CI integration (T112-T113)
"""
CI Integration Documentation
==============================

## Pre-commit Hook Integration

Add to `.pre-commit-config.yaml`:
```yaml
- repo: local
  hooks:
    - id: audit-django-config
      name: Audit Django Configuration
      entry: python .security/scripts/audit_config.py
      args: ['--settings-dir', 'src/config/settings']
      language: system
      pass_filenames: false
      files: src/config/settings/.*\\.py$
```

## GitHub Actions Integration

Add to `.github/workflows/security.yml`:
```yaml
- name: Audit Django Configuration
  run: |
    python .security/scripts/audit_config.py \\
      --settings-dir src/config/settings \\
      --output reports/config-audit.json
```

## GitLab CI Integration

Add to `.gitlab-ci.yml`:
```yaml
config_audit:
  script:
    - python .security/scripts/audit_config.py --settings-dir src/config/settings
  only:
    changes:
      - src/config/settings/**/*.py
```

## Usage Examples

```bash
# Audit all settings files
python .security/scripts/audit_config.py --settings-dir src/config/settings

# Audit specific file
python .security/scripts/audit_config.py \\
  --settings-file src/config/settings/production.py

# Generate JSON report
python .security/scripts/audit_config.py \\
  --settings-dir src/config/settings --output audit-report.json

# Fail on warnings (strict mode)
python .security/scripts/audit_config.py \\
  --settings-dir src/config/settings --fail-on-warnings
```

## Common Validation Patterns

1. **Production Checks**: DEBUG=False, ALLOWED_HOSTS configured, secure cookies
2. **Staging Checks**: Same as production but may allow more permissive ALLOWED_HOSTS
3. **Local Checks**: Permissive for development, still validates critical settings

## Environment Detection

The tool automatically infers environment from file names:
- `production.py` or `prod.py` → production (strictest)
- `staging.py` or `stage.py` → staging (strict)
- `local.py` or `dev.py` → local (permissive)
- `base.py` → base (universal checks only)
"""
