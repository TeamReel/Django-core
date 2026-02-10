"""Pytest conftest - run route debug from test."""


# Create a simple test that prints routes
def test_debug_routes(db, client):
    """Debug router URLs."""
    from src.workflows.urls import router
    from src.workflows.views import WorkflowInstanceViewSet

    print("\n" + "=" * 80)
    print("DRF Router URLs for Workflows:")
    print("=" * 80)
    for i, pattern in enumerate(router.urls):
        print(f"{i:3d}. {str(pattern.pattern):60} - {pattern.name}")
    print("=" * 80)
    print(f"Total routes: {len(router.urls)}")
    print("=" * 80 + "\n")

    # Check if custom actions are in the routes
    custom_action_patterns = [
        str(p.pattern)
        for p in router.urls
        if "execute" in str(p.name) or "available_actions" in str(p.name)
    ]
    print("\nCustom action routes found:")
    for p in custom_action_patterns:
        print(f"  - {p}")
    print()

    # Check the ViewSet methods
    print("\nWorkflowInstanceViewSet methods:")
    for method_name in dir(WorkflowInstanceViewSet):
        method = getattr(WorkflowInstanceViewSet, method_name)
        if hasattr(method, "mapping"):
            print(f"  - {method_name}: {method.mapping}")
    print()

    assert True  # Just for the test to pass
