#!/usr/bin/env python
"""Django Configuration Security Audit CLI (WP12)

Validates Django settings files against security rules using AST parsing.
See: .security/manifests/runtime.yaml
"""

import argparse
import ast
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml


def load_manifest(manifest_path: Path) -> dict[str, Any]:
    """Load runtime manifest configuration.

    Args:
        manifest_path: Path to YAML manifest file

    Returns:
        Parsed manifest dictionary

    Raises:
        FileNotFoundError: If manifest file doesn't exist
        yaml.YAMLError: If manifest is invalid YAML
    """
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    with open(manifest_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def find_settings_files(settings_dir: Path) -> list[Path]:
    """Find all Django settings files in the specified directory.

    Args:
        settings_dir: Directory containing Django settings files

    Returns:
        List of settings file paths
    """
    if not settings_dir.exists():
        return []

    # Find all Python files in settings directory
    settings_files = []
    for py_file in settings_dir.rglob("*.py"):
        # Skip __pycache__ and __init__.py
        if "__pycache__" in str(py_file) or py_file.name == "__init__.py":
            continue
        settings_files.append(py_file)

    return settings_files


def infer_environment(file_path: Path) -> str:
    """Infer environment type from settings file path/name.

    Args:
        file_path: Path to settings file

    Returns:
        Environment name (production, staging, local, base, unknown)
    """
    file_name = file_path.stem.lower()

    if "production" in file_name or "prod" in file_name:
        return "production"
    elif "staging" in file_name or "stage" in file_name:
        return "staging"
    elif "local" in file_name or "dev" in file_name:
        return "local"
    elif "base" in file_name:
        return "base"
    else:
        return "unknown"


def extract_setting_value(node: ast.AST) -> Any:
    """Extract Python value from AST node.

    Args:
        node: AST node representing a value

    Returns:
        Python value (str, int, bool, list, dict, None)
    """
    if isinstance(node, ast.Constant):
        return node.value
    elif isinstance(node, ast.List):
        return [extract_setting_value(elt) for elt in node.elts]
    elif isinstance(node, ast.Dict):
        return {
            extract_setting_value(k): extract_setting_value(v)
            for k, v in zip(node.keys, node.values)
        }
    elif isinstance(node, ast.Name):
        # Return the name as a string for variables
        return f"<variable:{node.id}>"
    elif isinstance(node, ast.Attribute):
        # For attribute access like os.environ
        return f"<attribute:{ast.unparse(node)}>"
    else:
        # For complex expressions, return unparsed code
        try:
            return f"<expr:{ast.unparse(node)}>"
        except Exception:
            return "<complex_expression>"


def parse_settings_file(file_path: Path) -> dict[str, tuple[Any, int]]:
    """Parse Django settings file using AST.

    Args:
        file_path: Path to settings file

    Returns:
        Dictionary mapping setting name to (value, line_number) tuple
    """
    settings = {}

    try:
        with open(file_path, encoding="utf-8") as f:
            content = f.read()

        tree = ast.parse(content, filename=str(file_path))

        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                # Only process module-level assignments
                if len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
                    setting_name = node.targets[0].id
                    # Only extract uppercase settings (Django convention)
                    if setting_name.isupper():
                        value = extract_setting_value(node.value)
                        line_number = node.lineno
                        settings[setting_name] = (value, line_number)

    except Exception:
        # If parsing fails, return empty dict and let validation report the error
        pass

    return settings


def validate_setting(
    setting_name: str,
    setting_value: Any,
    line_number: int,
    environment: str,
    validation_rules: dict[str, Any],
) -> list[dict[str, Any]]:
    """Validate a single Django setting against security rules.

    Args:
        setting_name: Name of the setting
        setting_value: Value of the setting
        line_number: Line number where setting is defined
        environment: Environment type (production, staging, local)
        validation_rules: Validation rules from manifest

    Returns:
        List of violation dictionaries
    """
    violations = []

    # DEBUG setting validation
    if setting_name == "DEBUG":
        if environment == "production" and setting_value is True:
            violations.append(
                {
                    "rule_id": "SEC-001",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "CRITICAL",
                    "message": "DEBUG=True in production environment is a critical security vulnerability",
                    "remediation": "Set DEBUG=False in production settings",
                }
            )

    # SECRET_KEY validation
    elif setting_name == "SECRET_KEY":
        if isinstance(setting_value, str):
            # Skip validation for variable/attribute references (they're loaded at runtime)
            if (
                setting_value.startswith("<variable:")
                or setting_value.startswith("<attribute:")
                or setting_value.startswith("<expr:")
            ):
                # Environment variable or computed value - acceptable
                pass
            else:
                # Hardcoded value - validate length and recommend environment loading
                if len(setting_value) < 50:
                    violations.append(
                        {
                            "rule_id": "SEC-002",
                            "setting": setting_name,
                            "value": "<redacted>",
                            "line": line_number,
                            "severity": "HIGH",
                            "message": f"SECRET_KEY is too short ({len(setting_value)} characters, minimum 50)",
                            "remediation": "Generate a longer SECRET_KEY (50+ characters)",
                        }
                    )
                # Hardcoded SECRET_KEY in production/staging is a violation
                if environment in ["production", "staging"]:
                    violations.append(
                        {
                            "rule_id": "SEC-002",
                            "setting": setting_name,
                            "value": "<redacted>",
                            "line": line_number,
                            "severity": "HIGH",
                            "message": "SECRET_KEY should be loaded from environment variable, not hardcoded",
                            "remediation": "Use os.environ.get('SECRET_KEY') or similar",
                        }
                    )

    # ALLOWED_HOSTS validation
    elif setting_name == "ALLOWED_HOSTS":
        if isinstance(setting_value, list):
            if environment in ["production", "staging"]:
                if not setting_value or setting_value == []:
                    violations.append(
                        {
                            "rule_id": "SEC-003",
                            "setting": setting_name,
                            "value": setting_value,
                            "line": line_number,
                            "severity": "CRITICAL",
                            "message": "ALLOWED_HOSTS is empty in production/staging environment",
                            "remediation": "Specify explicit allowed hostnames",
                        }
                    )
                elif "*" in setting_value:
                    violations.append(
                        {
                            "rule_id": "SEC-003",
                            "setting": setting_name,
                            "value": setting_value,
                            "line": line_number,
                            "severity": "CRITICAL",
                            "message": "ALLOWED_HOSTS contains wildcard '*' in production/staging",
                            "remediation": "Specify explicit allowed hostnames instead of wildcard",
                        }
                    )

    # Session cookie security
    elif setting_name == "SESSION_COOKIE_SECURE":
        if environment in ["production", "staging"] and setting_value is not True:
            violations.append(
                {
                    "rule_id": "SEC-010",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "HIGH",
                    "message": "SESSION_COOKIE_SECURE should be True in production/staging",
                    "remediation": "Set SESSION_COOKIE_SECURE = True",
                }
            )

    elif setting_name == "SESSION_COOKIE_HTTPONLY":
        if setting_value is not True:
            violations.append(
                {
                    "rule_id": "SEC-011",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "MEDIUM",
                    "message": "SESSION_COOKIE_HTTPONLY should be True to prevent XSS attacks",
                    "remediation": "Set SESSION_COOKIE_HTTPONLY = True",
                }
            )

    elif setting_name == "SESSION_COOKIE_SAMESITE":
        if setting_value not in ["Lax", "Strict"]:
            violations.append(
                {
                    "rule_id": "SEC-012",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "MEDIUM",
                    "message": f"SESSION_COOKIE_SAMESITE should be 'Lax' or 'Strict', not '{setting_value}'",
                    "remediation": "Set SESSION_COOKIE_SAMESITE = 'Lax' or 'Strict'",
                }
            )

    # CSRF cookie security
    elif setting_name == "CSRF_COOKIE_SECURE":
        if environment in ["production", "staging"] and setting_value is not True:
            violations.append(
                {
                    "rule_id": "SEC-020",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "HIGH",
                    "message": "CSRF_COOKIE_SECURE should be True in production/staging",
                    "remediation": "Set CSRF_COOKIE_SECURE = True",
                }
            )

    # Security headers
    elif setting_name == "SECURE_HSTS_SECONDS":
        if environment in ["production", "staging"]:
            if not isinstance(setting_value, int) or setting_value < 31536000:
                violations.append(
                    {
                        "rule_id": "SEC-030",
                        "setting": setting_name,
                        "value": setting_value,
                        "line": line_number,
                        "severity": "HIGH",
                        "message": f"SECURE_HSTS_SECONDS should be >= 31536000 (1 year), currently {setting_value}",
                        "remediation": "Set SECURE_HSTS_SECONDS = 31536000",
                    }
                )

    elif setting_name == "SECURE_CONTENT_TYPE_NOSNIFF":
        if setting_value is not True:
            violations.append(
                {
                    "rule_id": "SEC-031",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "MEDIUM",
                    "message": "SECURE_CONTENT_TYPE_NOSNIFF should be True",
                    "remediation": "Set SECURE_CONTENT_TYPE_NOSNIFF = True",
                }
            )

    elif setting_name == "SECURE_BROWSER_XSS_FILTER":
        if setting_value is not True:
            violations.append(
                {
                    "rule_id": "SEC-032",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "MEDIUM",
                    "message": "SECURE_BROWSER_XSS_FILTER should be True",
                    "remediation": "Set SECURE_BROWSER_XSS_FILTER = True",
                }
            )

    elif setting_name == "SECURE_SSL_REDIRECT":
        if environment in ["production", "staging"] and setting_value is not True:
            violations.append(
                {
                    "rule_id": "SEC-033",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "HIGH",
                    "message": "SECURE_SSL_REDIRECT should be True in production/staging",
                    "remediation": "Set SECURE_SSL_REDIRECT = True",
                }
            )

    elif setting_name == "X_FRAME_OPTIONS":
        if setting_value not in ["DENY", "SAMEORIGIN"]:
            violations.append(
                {
                    "rule_id": "SEC-034",
                    "setting": setting_name,
                    "value": setting_value,
                    "line": line_number,
                    "severity": "MEDIUM",
                    "message": f"X_FRAME_OPTIONS should be 'DENY' or 'SAMEORIGIN', not '{setting_value}'",
                    "remediation": "Set X_FRAME_OPTIONS = 'DENY' or 'SAMEORIGIN'",
                }
            )

    return violations


def audit_settings_file(
    file_path: Path,
    manifest: dict[str, Any],
) -> dict[str, Any]:
    """Audit a single Django settings file.

    Args:
        file_path: Path to settings file
        manifest: Runtime manifest configuration

    Returns:
        Audit results dictionary
    """
    environment = infer_environment(file_path)
    settings = parse_settings_file(file_path)
    all_violations = []

    # Validate each extracted setting
    for setting_name, (setting_value, line_number) in settings.items():
        violations = validate_setting(
            setting_name,
            setting_value,
            line_number,
            environment,
            manifest.get("validation_rules", {}),
        )
        all_violations.extend(violations)

    # Check for missing critical settings in production/staging
    if environment in ["production", "staging"]:
        required_settings = {
            "DEBUG": False,
            "SECRET_KEY": "<any>",
            "ALLOWED_HOSTS": "<non-empty>",
            "SESSION_COOKIE_SECURE": True,
            "CSRF_COOKIE_SECURE": True,
            "SECURE_SSL_REDIRECT": True,
            "SECURE_HSTS_SECONDS": 31536000,
        }

        for required_setting, expected_value in required_settings.items():
            if required_setting not in settings:
                all_violations.append(
                    {
                        "rule_id": f"SEC-MISSING-{required_setting}",
                        "setting": required_setting,
                        "value": None,
                        "line": 0,
                        "severity": "HIGH",
                        "message": f"Required setting {required_setting} is missing in {environment} environment",
                        "remediation": f"Add {required_setting} to settings file",
                    }
                )

    return {
        "file": str(file_path),
        "environment": environment,
        "settings_count": len(settings),
        "violations": all_violations,
        "violation_count": len(all_violations),
    }


def generate_security_report(
    audit_results: list[dict[str, Any]],
    scan_metadata: dict[str, Any],
) -> dict[str, Any]:
    """Generate SecurityReport-compatible output.

    Args:
        audit_results: List of per-file audit results
        scan_metadata: Metadata about the scan execution

    Returns:
        SecurityReport-formatted dictionary
    """
    total_violations = sum(result["violation_count"] for result in audit_results)

    # Categorize violations by severity
    blocking_violations = []
    warning_violations = []

    for result in audit_results:
        for violation in result["violations"]:
            violation_with_file = {**violation, "file": result["file"]}
            if violation["severity"] in ["CRITICAL", "HIGH"]:
                blocking_violations.append(violation_with_file)
            else:
                warning_violations.append(violation_with_file)

    return {
        "report_type": "configuration_audit",
        "scan_timestamp": datetime.utcnow().isoformat(),
        "total_issues": total_violations,
        "blocking_issues": len(blocking_violations),
        "warning_issues": len(warning_violations),
        "issues": {
            "blocking": blocking_violations,
            "warnings": warning_violations,
        },
        "files_audited": [result["file"] for result in audit_results],
        "scan_metadata": scan_metadata,
    }


def main() -> int:
    """Audit Django configuration for security compliance.

    Returns:
        0 on success, non-zero on security violations
    """
    parser = argparse.ArgumentParser(
        description="Audit Django configuration for security compliance"
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(".security/manifests/runtime.yaml"),
        help="Path to runtime manifest (default: .security/manifests/runtime.yaml)",
    )
    parser.add_argument(
        "--settings-dir",
        type=Path,
        default=Path("src/config/settings"),
        help="Directory containing Django settings files",
    )
    parser.add_argument(
        "--settings-file",
        type=Path,
        help="Specific settings file to audit (optional)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Path to output JSON report (optional)",
    )
    parser.add_argument(
        "--fail-on-warnings",
        action="store_true",
        help="Fail build on warning-level issues (not just blocking)",
    )

    args = parser.parse_args()

    try:
        # Load manifest configuration
        manifest = load_manifest(args.manifest)

        # Determine which files to audit
        if args.settings_file:
            settings_files = [args.settings_file] if args.settings_file.exists() else []
        else:
            settings_files = find_settings_files(args.settings_dir)

        if not settings_files:
            print("❌ No settings files found to audit")
            return 1

        # Audit each settings file
        audit_results = []
        for settings_file in settings_files:
            result = audit_settings_file(settings_file, manifest)
            audit_results.append(result)

        # Generate report
        scan_metadata = {
            "tool": "audit_config",
            "settings_dir": str(args.settings_dir),
            "files_audited": len(settings_files),
            "manifest_path": str(args.manifest),
        }

        report = generate_security_report(audit_results, scan_metadata)

        # Output report
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
            print(f"✓ Security report saved to {args.output}")
        else:
            print(json.dumps(report, indent=2))

        # Print summary
        print("\n📊 Configuration Audit Summary:")
        print(f"   Files audited: {len(settings_files)}")
        print(f"   Total violations: {report['total_issues']}")
        print(f"   Blocking: {report['blocking_issues']}")
        print(f"   Warnings: {report['warning_issues']}")

        # Exit with error if blocking issues found
        if report["blocking_issues"] > 0:
            print("\n❌ Build blocked due to CRITICAL/HIGH severity configuration violations")
            return 1

        if args.fail_on_warnings and report["warning_issues"] > 0:
            print("\n❌ Build blocked due to warning-level configuration violations")
            return 1

        print("\n✓ No blocking configuration violations found")
        return 0

    except FileNotFoundError as e:
        print(f"❌ {e}")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        import traceback

        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
