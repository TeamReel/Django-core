# Data Model: Hierarchy Node

**Status**: Virtual (API Response Only)

## Entities

### `HierarchyNode`
Represents a single node in the hierarchy tree.

| Field | Type | Description |
|---|---|---|
| `id` | `Union[str, int]` | Unique identifier for the object (e.g., UUID or PK). |
| `type` | `str` | Logical type label (e.g., "Season", "Match"). |
| `title` | `str` | Display title for the node. |
| `url` | `str` | Optional deep link to the resource. |
| `description` | `str` | Optional subtitle or metadata. |
| `children` | `List[HierarchyNode]` | Nested nodes (recursive). |

## JSON Structure

```json
{
  "hierarchy": {
    "anchor": {
      "id": "123",
      "type": "Competition",
      "title": "Premier League",
      "url": "/competitions/123/"
    },
    "tree": [
      {
        "id": "2024",
        "type": "Season",
        "title": "2024/2025",
        "children": [...]
      }
    ]
  }
}
```
