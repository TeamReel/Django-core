# Quickstart: Implementing Hierarchical Search

This guide explains how to add hierarchical navigation to your module (e.g., displaying Tasks under a Project in search results).

## 1. Create a Resolver

Create a `resolvers.py` file in your app (e.g., `src/core/apps/projects/resolvers.py`).
Subclass `BaseHierarchyResolver` and implement `get_children`.

```python
# src/core/apps/projects/resolvers.py
from core.apps.search.hierarchy import BaseHierarchyResolver, HierarchyNode
from core.apps.projects.models import Task

class ProjectHierarchyResolver(BaseHierarchyResolver):
    """
    Builds a tree for: Project -> Tasks
    """

    def get_children(self, instance):
        # 1. Fetch related data (optimized)
        # Note: 'instance' is the Project model instance (the anchor)
        tasks = Task.objects.filter(
            project=instance,
            status__in=['todo', 'in_progress']
        ).select_related('assignee')[:5]  # Respect limits!

        # 2. Map to HierarchyNode
        nodes = []
        for task in tasks:
            nodes.append(HierarchyNode(
                id=str(task.id),
                type='projects.Task',
                title=task.title,
                url=task.get_absolute_url(),
                description=f"Assigned to {task.assignee.name}",
                # Recursion happens automatically if we returned children here,
                # but let's keep it flat for this level.
                children=[]
            ))

        return nodes
```

## 2. Register Your Resolver

Add your resolver to `settings.py` (or `settings/base.py`), mapping it to the Model ContentType string.

```python
# settings.py

SEARCH_HIERARCHY_RESOLVERS = {
    # 'app_label.ModelName': 'path.to.ResolverClass'
    'projects.Project': 'core.apps.projects.resolvers.ProjectResolver',
}
```

## 3. Configure Anchor Types (Optional)

If your model should be prioritized as a hierarchy root (Anchor), add it to `SEARCH_HIERARCHY_ANCHOR_TYPES`.

```python
# settings.py

SEARCH_HIERARCHY_ANCHOR_TYPES = [
    'organisations.Organisation', # Highest priority
    'projects.Project',           # Medium priority
    # 'projects.Task'             # Tasks might not be good anchors
]
```

## 4. Test It

Run a search via the API and inspect the `hierarchy` field.

```bash
curl "http://localhost:8000/api/search/?q=Redesign&hierarchy=true" \
  -H "Authorization: Token <your_token>"
```

**Expected Response:**

```json
{
  "results": [...],
  "hierarchy": {
    "anchor": {
      "type": "projects.Project",
      "title": "Website Redesign 2025"
    },
    "tree": [
      {
        "type": "projects.Task",
        "title": "Fix Homepage Hero"
      },
      ...
    ]
  }
}
```
