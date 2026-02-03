# Hierarchical Search Navigation

## Overview

The Hierarchical Search Navigation feature adds entity-centric navigation trees alongside global search results. When searching, users can optionally request a `hierarchy=true` parameter to receive a structured tree view of related entities, enabling better navigation and context discovery.

**Key characteristics**:
- **Pluggable resolvers**: Define custom navigation logic per domain entity
- **Fail-safe**: Hierarchy errors never affect search functionality
- **Performance-optimized**: <50ms overhead, respects depth/node limits
- **Production-ready**: Comprehensive testing, logging, and monitoring

## Architecture

### Core Components

**BaseHierarchyResolver** (`hierarchy/base.py`)
- Abstract base class for implementing hierarchy builders
- Handles recursion, depth limits, node counting
- Enforces 80/20 principle (max 3 levels deep, max 100 nodes)
- Accessible as `from search.hierarchy import BaseHierarchyResolver`

**HierarchyNode** (`hierarchy/nodes.py`)
- Data class representing a single node in the tree
- Fields: `id`, `type`, `title`, `url`, `description`, `children`
- Serializable to JSON for API responses

**Registry Pattern** (`hierarchy/registry.py`)
- Settings-driven resolver discovery
- Configurable per model via `SEARCH_HIERARCHY_RESOLVERS`
- Instantiates resolvers with `request` context for permission checks

**Serializers** (`hierarchy/serializers.py`)
- `HierarchyNodeSerializer`: Recursive node serialization
- `HierarchyAnchorSerializer`: Anchor (root entity) data

### Configuration Settings

```python
# settings.py

# Map model ContentType to resolver class
SEARCH_HIERARCHY_RESOLVERS = {
    'organisations.Organisation': 'organisations.resolvers.OrganisationHierarchyResolver',
    'projects.Project': 'projects.resolvers.ProjectHierarchyResolver',
}

# Models that can be hierarchy anchors (roots)
# Listed in priority order (earlier = higher priority)
SEARCH_HIERARCHY_ANCHOR_TYPES = [
    'organisations.Organisation',
    'projects.Project',
]

# Maximum depth (default: 3)
SEARCH_HIERARCHY_MAX_DEPTH = 3

# Maximum total nodes (default: 100)
SEARCH_HIERARCHY_MAX_NODES = 100

# Enable/disable feature (default: True)
SEARCH_HIERARCHY_ENABLED = True
```

## Quickstart: Implementing a Custom Resolver

### Step 1: Create a Resolver

Create a `resolvers.py` file in your app module and subclass `BaseHierarchyResolver`:

```python
# src/organisations/resolvers.py
from search.hierarchy import BaseHierarchyResolver, HierarchyNode


class OrganisationHierarchyResolver(BaseHierarchyResolver):
    """
    Builds a hierarchy tree for: Organisation -> Teams -> Members
    """

    def get_children(self, instance):
        """
        Return direct children of the given instance.

        Args:
            instance: The parent entity instance

        Returns:
            List[HierarchyNode]: Child nodes to display in the hierarchy

        Notes:
            - Always apply self._per_level_limit to limit children per level
            - Use select_related/prefetch_related for performance
            - Return only nodes the user is allowed to see (permission checks here)
        """
        # Example: Get teams in this organisation
        teams = instance.teams.filter(
            is_active=True
        ).order_by('name')[: self._per_level_limit]

        return [
            HierarchyNode(
                id=str(team.id),
                type='organisations.Team',
                title=team.name,
                url=team.get_absolute_url(),
                description=f"{team.members.count()} members",
                instance=team,  # Pass instance for recursion
            )
            for team in teams
        ]
```

### Step 2: Register the Resolver

Add your resolver to `settings.py`:

```python
SEARCH_HIERARCHY_RESOLVERS = {
    'organisations.Organisation': 'organisations.resolvers.OrganisationHierarchyResolver',
}
```

### Step 3: Configure Anchor Types (Optional)

If this model should be prioritized as a hierarchy root:

```python
SEARCH_HIERARCHY_ANCHOR_TYPES = [
    'organisations.Organisation',  # Highest priority
    'projects.Project',            # Medium priority
]
```

### Step 4: Test the API

```bash
curl "http://localhost:8000/api/v1/search/?q=Acme&hierarchy=true" \
  -H "Authorization: Token <token>"
```

**Expected Response:**

```json
{
  "count": 42,
  "results": [
    {
      "id": "org-123",
      "title": "Acme Corp",
      "type": "organisations.Organisation"
    }
  ],
  "hierarchy": {
    "anchor": {
      "id": "org-123",
      "type": "organisations.Organisation",
      "title": "Acme Corp",
      "url": "/organisations/acme-corp/"
    },
    "tree": [
      {
        "id": "team-456",
        "type": "organisations.Team",
        "title": "Engineering",
        "description": "12 members",
        "children": [
          {
            "id": "member-789",
            "type": "accounts.User",
            "title": "Alice Chen",
            "url": "/users/alice/",
            "children": []
          }
        ]
      }
    ]
  }
}
```

## API Integration

### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | required | Search query |
| `hierarchy` | boolean | false | Include hierarchy tree in response |

### Response Format

```json
{
  "hierarchy": {
    "anchor": { ... },
    "tree": [ ... ]
  }
}
```

Or `null` if:
- `hierarchy=false` (not requested)
- No matching results
- No resolver configured for result type
- Error during hierarchy generation (fail-safe)

## Error Handling

The hierarchy feature is **fail-safe**: any errors during generation are logged but do not break search functionality.

### Error Scenarios

1. **Resolver not found**: `hierarchy: null`, search continues
2. **Resolver exception**: Logged to Sentry, `hierarchy: null`, search continues
3. **Permission denied**: Resolver returns empty children, tree is truncated
4. **Depth/node limits exceeded**: Tree is gracefully truncated

All errors are logged with:
- Full stack trace (for debugging)
- Request context (user, search query)
- Resolver class name
- Timestamp

## Best Practices

### Permission Checks

Always check permissions in your resolver's `get_children` method:

```python
def get_children(self, instance):
    # Check if user can see this entity
    if not self.request.user.has_perm('view_organisation', instance):
        return []  # Hide all children

    # Fetch and filter children
    teams = instance.teams.all()
    visible_teams = [t for t in teams if self.request.user.has_perm('view_team', t)]

    return [
        HierarchyNode(
            id=str(team.id),
            type='organisations.Team',
            title=team.name,
            instance=team,
        )
        for team in visible_teams
    ]
```

### Query Optimization

Always use `select_related` and `prefetch_related`:

```python
def get_children(self, instance):
    # ❌ BAD: N+1 queries
    teams = instance.teams.all()  # One query per team

    # ✅ GOOD: Optimized queries
    teams = instance.teams.select_related('owner').prefetch_related(
        'members'
    ).all()
```

### Respecting Limits

Always apply `self._per_level_limit` to your querysets:

```python
def get_children(self, instance):
    # ✅ GOOD: Respects per-level limit
    teams = instance.teams.all()[: self._per_level_limit]

    return [...]
```

### Returning Instances

Always set the `instance` attribute on nodes for recursion:

```python
def get_children(self, instance):
    teams = instance.teams.all()[: self._per_level_limit]

    return [
        HierarchyNode(
            id=str(team.id),
            type='organisations.Team',
            title=team.name,
            instance=team,  # ✅ REQUIRED for recursion
        )
        for team in teams
    ]
```

## Testing

### Unit Tests

Write tests for your resolver:

```python
import pytest
from django.test import RequestFactory
from organisations.resolvers import OrganisationHierarchyResolver


@pytest.fixture
def org_with_teams(db):
    org = Organisation.objects.create(name='Acme')
    Team.objects.create(organisation=org, name='Engineering')
    Team.objects.create(organisation=org, name='Sales')
    return org


@pytest.mark.django_db
def test_resolver_returns_teams(org_with_teams):
    request = RequestFactory().get('/')
    request.user = User.objects.create_user('testuser')

    resolver = OrganisationHierarchyResolver(request)
    nodes = resolver.get_children(org_with_teams)

    assert len(nodes) == 2
    assert nodes[0].type == 'organisations.Team'
    assert nodes[0].title == 'Engineering'
```

### Integration Tests

Test via the API:

```python
@pytest.mark.django_db
def test_search_with_hierarchy(api_client, org_with_teams):
    api_client.force_login(user)
    response = api_client.get('/api/v1/search/?q=Acme&hierarchy=true')

    assert response.status_code == 200
    data = response.json()
    assert 'hierarchy' in data
    assert data['hierarchy'] is not None
```

## Troubleshooting

### No hierarchy in response

1. Check `SEARCH_HIERARCHY_ENABLED = True` in settings
2. Verify resolver is registered in `SEARCH_HIERARCHY_RESOLVERS`
3. Verify search results contain a type with a registered resolver
4. Check logs for errors (search for "Hierarchy" in logs)

### Hierarchy is `null` for valid results

1. Check permissions: Resolver may be returning empty children
2. Check resolver is being called: Add logging or debugger breakpoint
3. Check for exceptions: Look in Sentry or error logs

### Performance issues

1. Check query count: Use `django-debug-toolbar`
2. Verify `select_related`/`prefetch_related` are used
3. Check depth/node limits aren't too high
4. Profile with `pytest-benchmark`

## Related Documentation

- [Architecture Decision: Stateful Resolvers](../adr/045-01-stateful-hierarchy-resolvers.md)
- [Architecture Decision: Fail-Safe Error Handling](../adr/045-02-fail-safe-error-handling.md)
- [Feature Specification](https://github.com/your-org/repo/issues/045)

## References

- **Specification**: Feature 045 - Hierarchical Search Navigation
- **Resolvers**: `src/search/hierarchy/`
- **Tests**: `src/search/tests/test_*.py`
- **Implementation**: `src/search/api/views.py` - SearchAPIView
