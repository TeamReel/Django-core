#!/usr/bin/env python
"""Static Security Analysis CLI (WP11)

Wraps bandit with manifest-driven configuration.
See: .security/manifests/bandit.yaml
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
    """Load Bandit manifest configuration.

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


def get_changed_python_files(base_branch: str = "main") -> list[Path]:
    """Get list of Python files changed in current branch (incremental scanning).

    Args:
        base_branch: Git branch to compare against

    Returns:
        List of changed Python file paths

    Raises:
        subprocess.CalledProcessError: If git command fails
    """
    try:
        result = subprocess.run(
            ["git", "diff", f"{base_branch}...HEAD", "--name-only", "--diff-filter=ACMR"],
            capture_output=True,
            text=True,
            check=True,
            timeout=10,
        )
        changed_files = [
            Path(line.strip())
            for line in result.stdout.strip().split("\n")
            if line.strip() and line.endswith(".py")
        ]
        return changed_files
    except subprocess.CalledProcessError:
        # If git diff fails (e.g., not in a git repo), return empty list
        return []


def validate_nosec_comments(file_path: Path) -> list[dict[str, Any]]:
    """Validate that each # nosec comment has an adjacent justification comment.

    Args:
        file_path: Path to Python file to validate

    Returns:
        List of validation issues (empty if all # nosec comments are justified)
    """
    issues = []

    try:
        with open(file_path, encoding="utf-8") as f:
            lines = f.readlines()

        for line_num, line in enumerate(lines, start=1):
            if "# nosec" in line or "# noqa: S" in line:  # nosec or noqa for Bandit
                # Check if there's a justification comment nearby (same line or previous line)
                has_justification = False

                # Check same line for justification after nosec
                if "# nosec" in line:
                    # Split on nosec to get text after it
                    parts = line.split("# nosec")
                    if len(parts) > 1:
                        after_nosec = parts[1].strip()
                        # Check if there's meaningful text after nosec (not just B### codes)
                        if after_nosec and not after_nosec.startswith("B") and after_nosec != "":
                            # Ensure it's not just whitespace or test IDs
                            cleaned = (
                                after_nosec.replace("B", "")
                                .replace("0", "")
                                .replace("1", "")
                                .replace("2", "")
                                .replace("3", "")
                                .replace("4", "")
                                .replace("5", "")
                                .replace("6", "")
                                .replace("7", "")
                                .replace("8", "")
                                .replace("9", "")
                                .strip()
                            )
                            if len(cleaned) > 1:  # Has actual text beyond test IDs
                                has_justification = True

                elif "# noqa: S" in line:
                    # Similar check for noqa syntax
                    parts = line.split("# noqa:")
                    if len(parts) > 1:
                        after_noqa = parts[1].strip()
                        # Check for text beyond just the S### code
                        if after_noqa and len(after_noqa) > 5:  # More than just "S307"
                            has_justification = True

                # Check previous line for justification comment
                if not has_justification and line_num > 1:
                    prev_line = lines[line_num - 2].strip()
                    if (
                        prev_line.startswith("#")
                        and "nosec" not in prev_line.lower()
                        and "noqa" not in prev_line.lower()
                    ):
                        # Previous line is a comment and not another nosec
                        if len(prev_line) > 2:  # Has actual content beyond just "#"
                            has_justification = True

                if not has_justification:
                    issues.append(
                        {
                            "file": str(file_path),
                            "line": line_num,
                            "message": "# nosec comment without justification",
                            "severity": "MEDIUM",
                        }
                    )

    except Exception as e:
        issues.append(
            {
                "file": str(file_path),
                "line": 0,
                "message": f"Error validating nosec comments: {e}",
                "severity": "LOW",
            }
        )

    return issues


def run_bandit(
    scan_paths: list[Path],
    exclude_paths: list[str],
    timeout: int = 300,
    output_format: str = "json",
) -> dict[str, Any] | None:
    """Execute Bandit and parse output.

    Args:
        scan_paths: List of paths to scan
        exclude_paths: List of path patterns to exclude
        timeout: Maximum execution time in seconds
        output_format: Output format ("json" or "sarif")

    Returns:
        Parsed Bandit output dictionary, or None if execution failed

    Raises:
        subprocess.TimeoutExpired: If Bandit execution exceeds timeout
    """
    cmd = ["bandit", "-r", "-f", output_format]

    # Add scan paths
    for path in scan_paths:
        if path.exists():
            cmd.append(str(path))

    # Add exclude patterns
    if exclude_paths:
        exclude_str = ",".join(exclude_paths)
        cmd.extend(["-x", exclude_str])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,  # Don't raise on non-zero exit (Bandit exits 1 when issues found)
        )

        # Bandit exits with 1 when issues are found, which is expected
        if output_format == "json":
            return json.loads(result.stdout) if result.stdout else None
        else:  # sarif
            return json.loads(result.stdout) if result.stdout else None

    except subprocess.TimeoutExpired as e:
        raise subprocess.TimeoutExpired(cmd, timeout) from e
    except json.JSONDecodeError:
        return None


def filter_by_severity(
    results: dict[str, Any],
    block_severities: list[str],
    warn_severities: list[str],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Filter Bandit results by severity and confidence.

    Args:
        results: Parsed Bandit JSON output
        block_severities: List of severities that should block the build
        warn_severities: List of severities that should only warn

    Returns:
        Tuple of (blocking_issues, warning_issues)
    """
    blocking_issues = []
    warning_issues = []

    if not results or "results" not in results:
        return blocking_issues, warning_issues

    for issue in results.get("results", []):
        severity = issue.get("issue_severity", "MEDIUM").upper()
        confidence = issue.get("issue_confidence", "MEDIUM").upper()

        # Only block on issues with HIGH confidence
        if severity in [s.upper() for s in block_severities] and confidence == "HIGH":
            blocking_issues.append(issue)
        elif severity in [s.upper() for s in warn_severities]:
            warning_issues.append(issue)

    return blocking_issues, warning_issues


def generate_security_report(
    blocking_issues: list[dict[str, Any]],
    warning_issues: list[dict[str, Any]],
    scan_metadata: dict[str, Any],
) -> dict[str, Any]:
    """Generate SecurityReport-compatible output.

    Args:
        blocking_issues: List of blocking security issues
        warning_issues: List of warning-level issues
        scan_metadata: Metadata about the scan execution

    Returns:
        SecurityReport-formatted dictionary
    """
    return {
        "report_type": "static_code_analysis",
        "scan_timestamp": datetime.utcnow().isoformat(),
        "total_issues": len(blocking_issues) + len(warning_issues),
        "blocking_issues": len(blocking_issues),
        "warning_issues": len(warning_issues),
        "issues": {
            "blocking": [
                {
                    "test_id": issue.get("test_id", "UNKNOWN"),
                    "test_name": issue.get("test_name", "Unknown Test"),
                    "severity": issue.get("issue_severity", "MEDIUM"),
                    "confidence": issue.get("issue_confidence", "MEDIUM"),
                    "file": issue.get("filename", "unknown"),
                    "line": issue.get("line_number", 0),
                    "code": issue.get("code", ""),
                    "issue_text": issue.get("issue_text", ""),
                }
                for issue in blocking_issues
            ],
            "warnings": [
                {
                    "test_id": issue.get("test_id", "UNKNOWN"),
                    "test_name": issue.get("test_name", "Unknown Test"),
                    "severity": issue.get("issue_severity", "MEDIUM"),
                    "confidence": issue.get("issue_confidence", "MEDIUM"),
                    "file": issue.get("filename", "unknown"),
                    "line": issue.get("line_number", 0),
                    "code": issue.get("code", ""),
                    "issue_text": issue.get("issue_text", ""),
                }
                for issue in warning_issues
            ],
        },
        "scan_metadata": scan_metadata,
    }


def main() -> int:
    """Run static security analysis on Python code.

    Returns:
        0 on success, non-zero on failure or issues found
    """
    parser = argparse.ArgumentParser(description="Run static security analysis on Python code")
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(".security/manifests/bandit.yaml"),
        help="Path to bandit manifest (default: .security/manifests/bandit.yaml)",
    )
    parser.add_argument(
        "--incremental",
        action="store_true",
        help="Run incremental scan (changed files only)",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Path to output JSON report (optional)",
    )
    parser.add_argument(
        "--sarif",
        action="store_true",
        help="Output in SARIF format for GitHub Code Scanning",
    )
    parser.add_argument(
        "--validate-nosec",
        action="store_true",
        help="Validate that all # nosec comments have justifications",
    )

    args = parser.parse_args()

    try:
        # Load manifest configuration
        manifest = load_manifest(args.manifest)

        # Determine scan paths
        if args.incremental:
            scan_paths = get_changed_python_files()
            if not scan_paths:
                print("✓ No Python files changed - skipping incremental scan")
                return 0
            timeout = manifest.get("timeout_seconds", 300)  # 5 minutes for incremental
        else:
            scan_paths = [Path(p) for p in manifest.get("scan_paths", ["src/", "tests/"])]
            timeout = manifest.get("timeout_seconds", 600)  # 10 minutes for full scan

        exclude_paths = manifest.get("exclude_paths", [])

        # Validate nosec comments if requested
        nosec_issues = []
        if args.validate_nosec:
            for path in scan_paths:
                if path.is_file():
                    nosec_issues.extend(validate_nosec_comments(path))
                elif path.is_dir():
                    for py_file in path.rglob("*.py"):
                        nosec_issues.extend(validate_nosec_comments(py_file))

        # Run Bandit
        output_format = "sarif" if args.sarif else "json"
        results = run_bandit(scan_paths, exclude_paths, timeout, output_format)

        if results is None:
            print("❌ Bandit execution failed or produced invalid output")
            return 1

        # For SARIF format, output directly and exit
        if args.sarif:
            if args.output:
                args.output.parent.mkdir(parents=True, exist_ok=True)
                with open(args.output, "w", encoding="utf-8") as f:
                    json.dump(results, f, indent=2)
                print(f"✓ SARIF report saved to {args.output}")
            else:
                print(json.dumps(results, indent=2))
            return 0

        # Filter by severity
        block_severities = manifest.get("severity_thresholds", {}).get(
            "block_on", ["HIGH", "CRITICAL"]
        )
        warn_severities = manifest.get("severity_thresholds", {}).get("warn_on", ["MEDIUM", "LOW"])

        blocking_issues, warning_issues = filter_by_severity(
            results, block_severities, warn_severities
        )

        # Add nosec validation issues to blocking issues
        if nosec_issues:
            blocking_issues.extend(nosec_issues)

        # Generate report
        scan_metadata = {
            "tool": "bandit",
            "scan_type": "incremental" if args.incremental else "full",
            "scan_paths": [str(p) for p in scan_paths],
            "timeout_seconds": timeout,
            "manifest_path": str(args.manifest),
        }

        report = generate_security_report(blocking_issues, warning_issues, scan_metadata)

        # Output report
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
            print(f"✓ Security report saved to {args.output}")
        else:
            print(json.dumps(report, indent=2))

        # Print summary
        print("\n📊 Static Code Analysis Summary:")
        print(f"   Total issues: {report['total_issues']}")
        print(f"   Blocking: {report['blocking_issues']}")
        print(f"   Warnings: {report['warning_issues']}")

        # Exit with error if blocking issues found
        if blocking_issues:
            print("\n❌ Build blocked due to HIGH severity security issues")
            return 1

        print("\n✓ No blocking security issues found")
        return 0

    except FileNotFoundError as e:
        print(f"❌ {e}")
        return 1
    except subprocess.TimeoutExpired:
        print(f"❌ Bandit execution timed out after {timeout} seconds")
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
