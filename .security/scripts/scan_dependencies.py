#!/usr/bin/env python
"""Dependency Vulnerability Scanner CLI (WP10)

Wraps pip-audit with manifest-driven configuration.
See: .security/manifests/pip-audit.yaml
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml


def load_manifest(manifest_path: Path) -> dict[str, Any]:
    """Load pip-audit manifest configuration.

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


def get_changed_requirements(base_branch: str = "main") -> list[Path]:
    """Get list of requirements files changed in current branch (incremental scanning).

    Args:
        base_branch: Git branch to compare against

    Returns:
        List of changed requirements file paths

    Raises:
        subprocess.CalledProcessError: If git command fails
    """
    try:
        result = subprocess.run(
            ["git", "diff", f"{base_branch}...HEAD", "--name-only", "--", "requirements/"],
            capture_output=True,
            text=True,
            check=True,
            timeout=10,
        )
        changed_files = [
            Path(line.strip())
            for line in result.stdout.strip().split("\n")
            if line.strip() and line.endswith(".txt")
        ]
        return changed_files
    except subprocess.CalledProcessError:
        # If git diff fails (e.g., not in a git repo), return empty list
        return []


def is_exempted(package: str, cve: str, exemptions: list[dict[str, Any]]) -> bool:
    """Check if a vulnerability is exempted.

    Args:
        package: Package name
        cve: CVE identifier
        exemptions: List of exemption dictionaries from manifest

    Returns:
        True if exempted and not expired, False otherwise
    """
    today = datetime.now().date()

    for exemption in exemptions:
        if exemption.get("package") == package and exemption.get("cve") == cve:
            # Check expiration date
            expires_str = exemption.get("expires")
            if expires_str:
                try:
                    expires_date = datetime.strptime(expires_str, "%Y-%m-%d").date()
                    if today <= expires_date:
                        return True
                except ValueError:
                    # Invalid date format, treat as not exempted
                    pass
    return False


def run_pip_audit(requirements_path: Path, timeout: int = 300) -> dict[str, Any] | None:
    """Execute pip-audit and parse JSON output.

    Args:
        requirements_path: Path to requirements file
        timeout: Timeout in seconds

    Returns:
        Parsed JSON output from pip-audit, or None on error

    Raises:
        subprocess.TimeoutExpired: If pip-audit exceeds timeout
    """
    try:
        result = subprocess.run(
            [
                "pip-audit",
                "--format",
                "json",
                "--requirement",
                str(requirements_path),
            ],
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,  # Don't raise on non-zero exit (vulnerabilities found)
        )

        # pip-audit exits with 0 if no vulnerabilities, 1 if found
        if result.returncode not in (0, 1):
            print(
                f"⚠️  pip-audit failed with exit code {result.returncode}",
                file=sys.stderr,
            )
            print(result.stderr, file=sys.stderr)
            return None

        return json.loads(result.stdout)

    except subprocess.TimeoutExpired:
        print(
            f"❌ pip-audit timed out after {timeout} seconds. "
            "Consider increasing timeout in manifest or using incremental scanning.",
            file=sys.stderr,
        )
        raise
    except json.JSONDecodeError as e:
        print(f"❌ Failed to parse pip-audit JSON output: {e}", file=sys.stderr)
        return None


def filter_by_severity(
    vulnerabilities: list[dict[str, Any]],
    severity_thresholds: dict[str, list[str]],
    exemptions: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Filter vulnerabilities by severity threshold and exemptions.

    Args:
        vulnerabilities: List of vulnerability dictionaries from pip-audit
        severity_thresholds: Severity threshold config from manifest
        exemptions: List of exemptions from manifest

    Returns:
        Tuple of (blocking_vulns, warning_vulns)
    """
    block_on = severity_thresholds.get("block_on", ["CRITICAL", "HIGH"])
    warn_on = severity_thresholds.get("warn_on", ["MEDIUM"])

    blocking_vulns = []
    warning_vulns = []

    for vuln in vulnerabilities:
        package = vuln.get("name", "")
        cve = vuln.get("id", "")
        severity = vuln.get("severity", "UNKNOWN").upper()

        # Check if exempted
        if is_exempted(package, cve, exemptions):
            continue

        # Filter by severity
        if severity in block_on:
            blocking_vulns.append(vuln)
        elif severity in warn_on:
            warning_vulns.append(vuln)
        # Ignore others (LOW, INFO, etc.)

    return blocking_vulns, warning_vulns


def generate_security_report(
    scan_result: dict[str, Any],
    blocking_vulns: list[dict[str, Any]],
    warning_vulns: list[dict[str, Any]],
    requirements_path: Path,
    environment: str = "ci",
) -> dict[str, Any]:
    """Generate SecurityReport format matching the schema.

    Args:
        scan_result: Raw pip-audit results
        blocking_vulns: Vulnerabilities that block the build
        warning_vulns: Vulnerabilities that generate warnings
        requirements_path: Path to requirements file scanned
        environment: Environment context

    Returns:
        SecurityReport dictionary
    """
    timestamp = datetime.utcnow().isoformat() + "Z"

    # Convert vulnerabilities to SecurityRuleViolation format
    violations = []
    for vuln in blocking_vulns + warning_vulns:
        violation = {
            "rule_id": f"PIP-AUDIT-{vuln.get('id', 'UNKNOWN')}",
            "rule_name": "Dependency Vulnerability",
            "message": f"Vulnerable package: {vuln.get('name')} {vuln.get('version')}",
            "severity": vuln.get("severity", "UNKNOWN").upper(),
            "violated_setting": f"requirements dependency: {vuln.get('name')}",
            "current_value": vuln.get("version", "unknown"),
            "expected_value": (
                vuln.get("fix_versions", ["latest"])[0] if vuln.get("fix_versions") else "latest"
            ),
            "owasp_asvs_refs": ["V14.2.6"],  # ASVS: Known vulnerable components
            "remediation": f"Update to: {', '.join(vuln.get('fix_versions', ['latest']))}. "
            f"See: {vuln.get('advisory', 'N/A')}",
            "timestamp": timestamp,
            "environment": environment,
        }
        violations.append(violation)

    # Calculate overall status
    overall_status = "FAIL" if blocking_vulns else ("WARN" if warning_vulns else "PASS")

    report = {
        "report_id": f"pip-audit-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "report_type": "ci_dependency_scan",
        "timestamp": timestamp,
        "environment": environment,
        "enforcement_mode": "strict",  # CI always uses strict mode
        "violations": violations,
        "passed_rules": [],
        "overall_status": overall_status,
        "owasp_asvs_coverage": {
            "V14 - Configuration": {
                "category": "V14 - Configuration",
                "total_rules": 1,
                "passed_rules": 1 if not violations else 0,
                "failed_rules": 1 if violations else 0,
                "coverage_percentage": 0.0 if violations else 100.0,
                "violations": violations,
            }
        },
        "execution_time_ms": 0,  # pip-audit doesn't provide timing
        "metadata": {
            "requirements_file": str(requirements_path),
            "total_packages_scanned": len(scan_result.get("dependencies", [])),
            "total_vulnerabilities": len(blocking_vulns) + len(warning_vulns),
            "blocking_vulnerabilities": len(blocking_vulns),
            "warning_vulnerabilities": len(warning_vulns),
            "pip_audit_version": scan_result.get("version", "unknown"),
        },
    }

    return report


def main() -> int:
    """Run dependency vulnerability scan.

    Returns:
        0 on success (no blocking vulnerabilities),
        1 on vulnerabilities found,
        2 on scan error
    """
    parser = argparse.ArgumentParser(
        description="Scan Python dependencies for known vulnerabilities"
    )
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(".security/manifests/pip-audit.yaml"),
        help="Path to pip-audit manifest (default: .security/manifests/pip-audit.yaml)",
    )
    parser.add_argument(
        "--requirements",
        type=Path,
        default=Path("requirements/base.txt"),
        help="Path to requirements file (default: requirements/base.txt)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Path to output JSON report (optional)",
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Only scan requirements files changed in current branch",
    )
    parser.add_argument(
        "--environment",
        default="ci",
        help="Environment context for report (default: ci)",
    )

    args = parser.parse_args()

    # Load manifest configuration
    try:
        manifest = load_manifest(args.manifest)
    except FileNotFoundError as e:
        print(f"❌ {e}", file=sys.stderr)
        return 2
    except yaml.YAMLError as e:
        print(f"❌ Invalid YAML in manifest: {e}", file=sys.stderr)
        return 2

    # Determine which requirements files to scan
    requirements_files = []
    if args.incremental:
        base_branch = manifest.get("incremental", {}).get("base_branch", "main")
        changed_files = get_changed_requirements(base_branch)
        if changed_files:
            requirements_files = changed_files
            print(f"🔍 Incremental scan: {len(changed_files)} changed requirements files")
        else:
            print("✅ No requirements files changed - skipping scan")
            return 0
    else:
        # Scan specified requirements file
        if not args.requirements.exists():
            print(f"❌ Requirements file not found: {args.requirements}", file=sys.stderr)
            return 2
        requirements_files = [args.requirements]

    # Run pip-audit for each requirements file
    timeout = manifest.get("timeout_seconds", 300)
    severity_thresholds = manifest.get("severity_thresholds", {})
    exemptions = manifest.get("exemptions", [])

    all_blocking_vulns = []
    all_warning_vulns = []
    combined_scan_result = {"dependencies": [], "version": "unknown"}

    for req_file in requirements_files:
        print(f"🔍 Scanning {req_file}...")

        try:
            scan_result = run_pip_audit(req_file, timeout)
            if scan_result is None:
                return 2

            # Merge results
            combined_scan_result["dependencies"].extend(scan_result.get("dependencies", []))
            combined_scan_result["version"] = scan_result.get("version", "unknown")

            # Extract vulnerabilities from scan result
            vulns = []
            for dep in scan_result.get("dependencies", []):
                for vuln in dep.get("vulns", []):
                    vuln["name"] = dep.get("name")
                    vuln["version"] = dep.get("version")
                    vulns.append(vuln)

            # Filter by severity
            blocking, warning = filter_by_severity(vulns, severity_thresholds, exemptions)
            all_blocking_vulns.extend(blocking)
            all_warning_vulns.extend(warning)

        except subprocess.TimeoutExpired:
            return 2

    # Generate security report
    report = generate_security_report(
        combined_scan_result,
        all_blocking_vulns,
        all_warning_vulns,
        args.requirements,
        args.environment,
    )

    # Output report
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)
        print(f"📄 Report saved to {args.output}")
    else:
        print(json.dumps(report, indent=2))

    # Print summary
    print("\n" + "=" * 60)
    print("DEPENDENCY SCAN SUMMARY")
    print("=" * 60)
    print(f"Total packages scanned: {report['metadata']['total_packages_scanned']}")
    print(f"Total vulnerabilities: {report['metadata']['total_vulnerabilities']}")
    print(f"  - Blocking (CRITICAL/HIGH): {report['metadata']['blocking_vulnerabilities']}")
    print(f"  - Warning (MEDIUM): {report['metadata']['warning_vulnerabilities']}")
    print(f"Overall status: {report['overall_status']}")

    if all_blocking_vulns:
        print("\n❌ BLOCKING VULNERABILITIES FOUND")
        for vuln in all_blocking_vulns:
            print(
                f"  - {vuln.get('name')} {vuln.get('version')}: {vuln.get('id')} "
                f"({vuln.get('severity')})"
            )
        return 1
    elif all_warning_vulns:
        print("\n⚠️  WARNING: Medium severity vulnerabilities found")
        for vuln in all_warning_vulns:
            print(
                f"  - {vuln.get('name')} {vuln.get('version')}: {vuln.get('id')} "
                f"({vuln.get('severity')})"
            )
        return 0  # Don't fail build on warnings
    else:
        print("\n✅ No vulnerabilities found!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
