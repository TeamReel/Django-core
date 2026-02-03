---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
title: "Setup & Configuration"
phase: "Phase 1 - Foundation"
lane: "done"
assignee: ""
agent: "claude"
shell_pid: "10500"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2026-02-03T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2026-02-03T18:16:43Z"
    agent: "claude"
    shell_pid: "10500"
    lane: "doing"
    action: "Started WP01 implementation"
  - timestamp: "2026-02-03T18:26:00Z"
    agent: "claude-reviewer"
    shell_pid: "10500"
    lane: "done"
    action: "Approved - All deliverables verified and working correctly"
---

# Work Package Prompt: WP01 – Setup & Configuration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged`.

---

## Review Feedback

**Status**: ✅ **Approved Without Changes**

**Review Summary**:
All WP01 objectives successfully met. Implementation is correct and follows project conventions.

**What Was Done Well**:
- ✅ Created `src/search/hierarchy/` package with proper `__init__.py`
- ✅ Added 6 Django settings with appropriate defaults and environment variable support
- ✅ Settings properly documented with inline comments
- ✅ All settings accessible via `django.conf.settings`
- ✅ Package structure follows Django conventions
- ✅ Code quality: No syntax errors, proper imports, type hints included
- ✅ Additional setting added (`SEARCH_HIERARCHY_PER_LEVEL_LIMIT`) for completeness

**Verification Results**:
```
✓ Directory exists: src/search/hierarchy/
✓ __init__.py present with proper docstring
✓ Settings verified in Django shell:
  - SEARCH_HIERARCHY_RESOLVERS: {} (empty dict)
  - SEARCH_HIERARCHY_ANCHOR_TYPES: [] (empty list)
  - SEARCH_HIERARCHY_MAX_DEPTH: 3
  - SEARCH_HIERARCHY_MAX_NODES: 100
  - SEARCH_HIERARCHY_PER_LEVEL_LIMIT: 5
  - SEARCH_HIERARCHY_ENABLED: True
```

**Note**: Implementation correctly used `src/search/hierarchy/` path (not `src/core/apps/search/hierarchy/` as stated in prompt). This matches the actual Django project structure where apps are at `src/<appname>/` level.

**Reviewed by**: claude-reviewer
**Review date**: 2026-02-03T18:26:00Z

---

## Objectives & Success Criteria

- Create the `core.apps.search.hierarchy` package structure
- Add hierarchy configuration settings to Django settings
- Package is importable from Django shell
- Settings are accessible via `django.conf.settings`

## Context & Constraints

**Prerequisites**:
- Django project structure exists at `src/core/apps/search/`
- Settings file at `src/core/settings/base.py` (or similar structure)

**References**:
- [spec.md](../spec.md) - Section 3.3 (Resolver Registry), 3.4 (Guardrails), 3.5 (Feature Flags)
- [plan.md](../plan.md) - Technical Context section
- [research.md](../research.md) - Registry Pattern decision

**Architectural Constraints**:
- Must use Django settings pattern (not database configuration)
- Settings must be overridable in downstream projects (TeamReel)
- Package must follow Django app conventions

## Subtasks & Detailed Guidance

### Subtask T001 – Create hierarchy package directory

**Purpose**: Establish the physical package structure for hierarchy code.

**Steps**:
1. Navigate to `src/core/apps/search/`
2. Create new directory: `hierarchy/`
3. Verify the full path exists: `src/core/apps/search/hierarchy/`

**Files**:
- Create directory: `src/core/apps/search/hierarchy/`

**Parallel**: No (must complete before T002)

**Notes**:
- Use absolute path from project root
- Ensure proper permissions on the directory

### Subtask T002 – Add __init__.py

**Purpose**: Make the hierarchy directory a Python package.

**Steps**:
1. Create `src/core/apps/search/hierarchy/__init__.py`
2. Add package-level imports for public API (initially empty, will be populated later):
   ```python
   """
   Hierarchical search navigation extension.

   Provides pluggable resolvers to generate entity-centric navigation trees
   from global search results.
   """

   # Public API will be exposed here as implementations are added
   ```

**Files**:
- Create: `src/core/apps/search/hierarchy/__init__.py`

**Parallel**: Yes (can proceed independently once T001 completes)

**Notes**:
- Keep the initial file minimal
- Add proper docstring for package documentation

### Subtask T003 – Add settings configuration

**Purpose**: Define Django settings for hierarchy configuration.

**Steps**:
1. Locate the appropriate settings file (likely `src/core/settings/base.py`)
2. Add a new section for search hierarchy configuration:
   ```python
   # ============================================================================
   # SEARCH HIERARCHY CONFIGURATION
   # ============================================================================

   # Registry mapping ContentType labels to resolver class paths
   # Example: {'projects.Project': 'core.apps.projects.resolvers.ProjectResolver'}
   SEARCH_HIERARCHY_RESOLVERS = {}

   # List of ContentType labels that can serve as hierarchy anchors (priority order)
   # Example: ['organisations.Organisation', 'projects.Project']
   SEARCH_HIERARCHY_ANCHOR_TYPES = []

   # Maximum depth for recursive hierarchy traversal (safety guard)
   SEARCH_HIERARCHY_MAX_DEPTH = 3

   # Maximum total nodes in a hierarchy tree (safety guard)
   SEARCH_HIERARCHY_MAX_NODES = 100

   # Master feature flag (future use)
   SEARCH_HIERARCHY_ENABLED = True
   ```

**Files**:
- Edit: `src/core/settings/base.py` (or equivalent settings file)

**Parallel**: Yes (can proceed independently of T001-T002)

**Notes**:
- Add clear comments explaining each setting
- Use sensible defaults that can be overridden
- Settings should be at module level in the settings file
- Consider adding to a "SEARCH" settings section if one exists

**Verification**:
Run in Django shell:
```bash
python manage.py shell
>>> from django.conf import settings
>>> print(settings.SEARCH_HIERARCHY_RESOLVERS)
{}
>>> print(settings.SEARCH_HIERARCHY_MAX_DEPTH)
3
```

## Definition of Done Checklist

- [ ] Directory `src/core/apps/search/hierarchy/` exists
- [ ] File `src/core/apps/search/hierarchy/__init__.py` exists with docstring
- [ ] Settings added to `src/core/settings/base.py`
- [ ] Package is importable: `python -c "import core.apps.search.hierarchy"`
- [ ] Settings are accessible from Django shell (verification command above passes)
- [ ] `tasks.md` updated with completion status

## Review Guidance

**Key checkpoints**:
- Package follows Django conventions (has `__init__.py`)
- Settings use correct names matching spec (SEARCH_HIERARCHY_*)
- Settings have appropriate default values
- Settings are documented with comments

**Context for reviewers**:
- This is purely structural setup; no business logic yet
- Settings must be overridable by downstream projects
- Verify settings are in the correct file (base.py for shared settings)

## Activity Log

- 2026-02-03T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2026-02-03T18:16:43Z – claude – shell_pid=10500 – lane=doing – Started WP01 implementation
