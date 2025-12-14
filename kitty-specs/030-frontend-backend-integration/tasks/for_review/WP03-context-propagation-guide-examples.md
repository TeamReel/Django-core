---
work_package_id: "WP03"
subtasks:
  - "T016"
  - "T017"
  - "T018"
  - "T019"
  - "T020"
  - "T021"
  - "T022"
title: "Context Propagation Guide & Examples"
phase: "Phase 2 - Core Guides"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "copilot"
shell_pid: "36848"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-14T08:32:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-14T10:00:00Z"
    lane: "doing"
    agent: "copilot"
    shell_pid: "36848"
    action: "Started implementation (parallel with WP02)"
  - timestamp: "2025-12-14T09:45:00Z"
    lane: "for_review"
    agent: "copilot"
    shell_pid: "36848"
    action: "Implementation complete: docs/integration-guides/context-propagation.md (300+ lines), examples/context-example/vanilla.ts (ContextProvider factory), examples/context-example/react.tsx (React hooks), all validations passing"
    lane: "doing"
    agent: "copilot"
    shell_pid: "36848"
    action: "Started implementation (parallel with WP02)"
---

# Work Package Prompt: WP03 – Context Propagation Guide & Examples

## Objectives & Success Criteria

Deliver context propagation guide showing how to maintain and inject organization/project context into all API requests. Includes ContextProvider pattern with persistence, validation, and React integration.

**Success Metrics**:
- Guide covers all FR-014 to FR-020 requirements
- Examples demonstrate header injection (X-Organization-ID, X-Project-ID)
- Context validation includes API calls to verify access
- Anti-patterns section includes context drift scenarios
- Guide includes copy-paste checklist

---

## Context & Constraints

**Prerequisites**: WP01 (ContextProvider interface), WP02 (soft dependency for logout context clearing)

**Related Documents**:
- Spec: FR-014 to FR-020
- Data Model: ContextProvider entity
- Research: AP-5 to AP-8 (context anti-patterns)

**Architectural Constraints**:
- Must integrate with F03 Context Switcher UI
- Headers: X-Organization-ID, X-Project-ID
- Backend: B06 (orgs), B07 (projects) for validation

---

## Subtasks & Detailed Guidance

### T016-T022: [Similar structure to WP02]

See tasks.md for subtask details. Key deliverables:
- docs/integration-guides/context-propagation.md (guide)
- examples/context-example/vanilla.ts (ContextProvider implementation)
- examples/context-example/react.tsx (React Context wrapper)
- Anti-patterns: context drift, manual propagation, multi-tab conflicts

---

## Definition of Done Checklist

- [ ] Guide complete with all sections
- [ ] Examples compile and lint cleanly
- [ ] Header injection demonstrated in ApiClient integration
- [ ] Context persistence shown (localStorage pattern)
- [ ] Anti-patterns section complete
- [ ] `tasks.md` updated

---

## Activity Log

- 2025-12-14T08:32:00Z – system – lane=planned – Prompt created
