#!/usr/bin/env python3
"""Debug script to test dashboard feature scanning."""

import sys
from pathlib import Path

from specify_cli.dashboard.scanner import gather_feature_paths, scan_all_features


def _add_src_to_sys_path() -> None:
    """Ensure the src directory is on sys.path for imports."""
    src_dir = Path(__file__).parent.parent / "src"
    sys.path.insert(0, str(src_dir))


def main() -> None:
    _add_src_to_sys_path()
    if len(sys.argv) > 1:
        project_dir = Path(sys.argv[1]).resolve()
    else:
        project_dir = Path.cwd()

    print(f"Scanning project directory: {project_dir}")
    print()

    # Test gather_feature_paths
    print("=== Feature Paths ===")
    feature_paths = gather_feature_paths(project_dir)
    if not feature_paths:
        print("  No features found!")
        print()
        print("Checking directories:")
        main_specs = project_dir / "kitty-specs"
        worktrees_dir = project_dir / ".worktrees"
        print(f"  Main specs: {main_specs} exists: {main_specs.exists()}")
        print(f"  Worktrees: {worktrees_dir} exists: {worktrees_dir.exists()}")

        if (project_dir / ".worktrees").exists():
            for wt_dir in (project_dir / ".worktrees").iterdir():
                if wt_dir.is_dir():
                    wt_specs = wt_dir / "kitty-specs"
                    print(f"    {wt_dir.name}/kitty-specs exists: {wt_specs.exists()}")
                    if wt_specs.exists():
                        for feat_dir in wt_specs.iterdir():
                            if feat_dir.is_dir():
                                print(f"      Feature: {feat_dir.name}")
    else:
        for feature_id, feature_path in feature_paths.items():
            print(f"  {feature_id}: {feature_path}")
    print()

    # Test scan_all_features
    print("=== Scanned Features ===")
    features = scan_all_features(project_dir)
    if not features:
        print("  No features scanned!")
    else:
        for feature in features:
            print(f"  ID: {feature['id']}")
            print(f"    Name: {feature['name']}")
            print(f"    Path: {feature['path']}")
            print(f"    Artifacts: {feature['artifacts']}")
            print(f"    Workflow: {feature['workflow']}")
            print(f"    Kanban: {feature['kanban_stats']}")
            print()


if __name__ == "__main__":
    main()
