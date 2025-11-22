"""Utility functions for the basic project."""

import json
from pathlib import Path
from typing import Any, Dict


def load_config(config_path: Path) -> Dict[str, Any]:
    """Load configuration from JSON file."""
    with open(config_path, "r") as f:
        return json.load(f)


def format_data(data: Dict[str, Any]) -> str:
    """Format data as JSON string."""
    return json.dumps(data, indent=2)
