---
work_package_id: "WP03"
subtasks:
  - "T008"
  - "T009"
  - "T010"
  - "T011"
title: "Serialization Layer"
phase: "Phase 2 - API Integration"
lane: "for_review"
assignee: ""
agent: "claude"
shell_pid: "10500"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2026-02-03T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2026-02-03T18:27:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "10500"
    action: "Started WP03 implementation"
  - timestamp: "2026-02-03T18:29:30Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "10500"
    action: "Completed implementation - All serializers working with validation and recursive support"
---

# Work Package Prompt: WP03 – Serialization Layer

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **Mark as acknowledged**: Update `review_status: acknowledged` when addressing feedback.

---

## Review Feedback

*[Empty initially. Reviewers will populate this section if work needs changes.]*

---

## Objectives & Success Criteria

- Implement DRF serializers for `HierarchyNode` and anchor metadata
- Support recursive serialization of node children
- Validate required fields (id, type, title)
- Output matches OpenAPI contract exactly
- Can serialize mock node trees to JSON

## Context & Constraints

**Prerequisites**:
- WP02 must be complete (`HierarchyNode` dataclass exists)
- Django REST Framework installed and configured

**References**:
- [contracts/openapi.yaml](../contracts/openapi.yaml) - API response schema
- [data-model.md](../data-model.md) - Node structure specification

**Architectural Constraints**:
- Use DRF's `Serializer` (not `ModelSerializer` since nodes are virtual)
- Must support recursive children
- Output must be compatible with `drf-spectacular` for OpenAPI schema generation

## Subtasks & Detailed Guidance

### Subtask T008 – Implement HierarchyNodeSerializer

**Purpose**: Serialize `HierarchyNode` dataclasses to JSON.

**Steps**:
1. Create `src/core/apps/search/hierarchy/serializers.py`
2. Implement the node serializer:
   ```python
   """DRF serializers for hierarchy API responses."""
   from rest_framework import serializers


   class HierarchyNodeSerializer(serializers.Serializer):
       """
       Serializer for hierarchy tree nodes.

       Supports recursive structure for nested children.
       Matches the HierarchyNode schema in contracts/openapi.yaml.
       """
       id = serializers.CharField(required=True)
       type = serializers.CharField(required=True)
       title = serializers.CharField(required=True)
       url = serializers.CharField(required=False, allow_null=True)
       description = serializers.CharField(required=False, allow_null=True)

       # Recursive field for children (self-reference)
       children = serializers.ListField(
           child=serializers.DictField(),  # Placeholder, will be properly recursive
           required=False,
           default=list
       )

       def to_representation(self, instance):
           """
           Custom representation to handle recursive children.

           Args:
               instance: HierarchyNode dataclass instance

           Returns:
               Dictionary representation for JSON serialization
           """
           data = {
               'id': str(instance.id),
               'type': instance.type,
               'title': instance.title,
           }

           if instance.url:
               data['url'] = instance.url

           if instance.description:
               data['description'] = instance.description

           # Recursively serialize children
           if instance.children:
               data['children'] = [
                   self.to_representation(child) for child in instance.children
               ]

           return data
   ```

**Files**:
- Create: `src/core/apps/search/hierarchy/serializers.py`

**Parallel**: No (foundational serializer)

**Notes**:
- Use `to_representation` for clean recursive handling
- `children` field must handle nested lists
- Filter out None/null values for optional fields
- Ensure id is always string (consistent with API contract)

### Subtask T009 – Implement HierarchyAnchorSerializer

**Purpose**: Serialize metadata about the anchor entity.

**Steps**:
1. Add to `src/core/apps/search/hierarchy/serializers.py`:
   ```python
   class HierarchyAnchorSerializer(serializers.Serializer):
       """
       Serializer for hierarchy anchor metadata.

       Describes the entity chosen as the root of the hierarchy.
       """
       id = serializers.CharField(required=True)
       type = serializers.CharField(required=True)
       title = serializers.CharField(required=True)
       url = serializers.CharField(required=False, allow_null=True)
       score = serializers.FloatField(required=False, allow_null=True)

       def to_representation(self, instance):
           """Convert anchor data to dictionary."""
           data = {
               'id': str(instance.get('id', instance.id)),
               'type': instance.get('type', ''),
               'title': instance.get('title', ''),
           }

           if 'url' in instance and instance['url']:
               data['url'] = instance['url']

           if 'score' in instance and instance['score'] is not None:
               data['score'] = float(instance['score'])

           return data
   ```

**Files**:
- Edit: `src/core/apps/search/hierarchy/serializers.py`

**Parallel**: Yes (independent of T008 complexity)

**Notes**:
- Anchor is typically a dict, not a dataclass (from search results)
- Handle both dict and object attribute access
- Score is optional (relevance from search engine)

### Subtask T010 – Add field validation

**Purpose**: Ensure required fields are present and valid.

**Steps**:
1. Add validation methods to serializers:
   ```python
   # In HierarchyNodeSerializer
   def validate_id(self, value):
       """Ensure id is non-empty."""
       if not value or not str(value).strip():
           raise serializers.ValidationError("Node id cannot be empty")
       return str(value)

   def validate_type(self, value):
       """Ensure type is non-empty."""
       if not value or not value.strip():
           raise serializers.ValidationError("Node type cannot be empty")
       return value

   def validate_title(self, value):
       """Ensure title is non-empty."""
       if not value or not value.strip():
           raise serializers.ValidationError("Node title cannot be empty")
       return value
   ```

**Files**:
- Edit: `src/core/apps/search/hierarchy/serializers.py`

**Parallel**: Yes (can add after T008-T009)

**Notes**:
- Validation prevents malformed nodes from reaching the API
- Empty strings should be rejected for required fields
- Validation runs on deserialization (when creating from data)

### Subtask T011 – Add recursive serialization support

**Purpose**: Ensure deep nesting works correctly.

**Steps**:
1. Test the recursive `to_representation` method with nested data
2. Add a helper method if needed:
   ```python
   # In HierarchyNodeSerializer
   def get_children_representation(self, instance):
       """
       Helper to serialize children recursively.

       Separated for clarity and potential performance optimization.
       """
       if not instance.children:
           return []

       return [
           HierarchyNodeSerializer(child).data
           for child in instance.children
       ]
   ```

**Files**:
- Edit: `src/core/apps/search/hierarchy/serializers.py`

**Parallel**: Yes (optimization after T008)

**Notes**:
- DRF handles recursion naturally via `to_representation`
- Consider max depth limits (already enforced in resolver)
- Performance: Serialization is O(nodes), acceptable for <100 nodes

## Definition of Done Checklist

- [ ] `serializers.py` exists with `HierarchyNodeSerializer`
- [ ] `HierarchyAnchorSerializer` implemented
- [ ] Field validation added for required fields
- [ ] Recursive children serialization works correctly
- [ ] Can serialize a 3-level deep node tree to JSON
- [ ] Output matches OpenAPI schema (verify against contract)
- [ ] `tasks.md` updated with completion status

## Review Guidance

**Key checkpoints**:
- Serializers use DRF's `Serializer` base class (not ModelSerializer)
- Required fields have validation
- Recursion doesn't cause stack overflow (resolver guards prevent deep trees)
- JSON output is clean (no internal fields like `instance` exposed)
- Optional fields are omitted if None (not `"url": null`)

**Context for reviewers**:
- These serializers are the API boundary; strict validation is important
- Recursive pattern is standard DRF; `to_representation` handles it cleanly
- Compare output to `contracts/openapi.yaml` for exact schema match

## Activity Log

- 2026-02-03T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
