"""Test reporter discovery."""

from constitution_engine.core.plugins import discover_builtin_plugins, get_global_registry


def test_reporter_discovery():
    """Test that reporters are discovered by plugin system."""
    # Discover builtin plugins
    discover_builtin_plugins()

    # Get registry and list reporters
    registry = get_global_registry()
    reporters = registry.list_reporters()

    # Check that we found reporters
    assert len(reporters) > 0, "No reporters found"

    reporter_ids = {r.identifier for r in reporters}
    assert "console" in reporter_ids, "Console reporter not found"
    assert "json" in reporter_ids, "JSON reporter not found"

    # Check that reporters can be loaded
    console = registry.get_reporter("console")
    assert console is not None
    assert console.name == "console"

    json_reporter = registry.get_reporter("json")
    assert json_reporter is not None
    assert json_reporter.name == "json"

    print(f"✓ Found {len(reporters)} reporters:")
    for r in reporters:
        print(f"  - {r.identifier}: {r.class_name} (enabled={r.enabled})")


if __name__ == "__main__":
    test_reporter_discovery()
