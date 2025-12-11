---
work_package_id: "WP14"
subtasks: ["T081", "T082", "T083", "T084", "T085"]
title: "Documentation & Examples"
phase: "Phase 6 - Documentation & Polish"
lane: "for_review"
assignee: "claude"
agent: "claude"
shell_pid: "26596"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-11T15:43:19Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP14 – Documentation & Examples

## Objectives & Success Criteria

Create comprehensive documentation, usage examples, and integration guides.

**Success Criteria**:
- README includes installation, quick start, API reference
- F06 example shows badge in header, panel in shell
- Custom type mappings example provided
- Router integration examples (React Router, Next.js)
- Troubleshooting guide covers common issues

## Key Documentation

### T081 – Package README.md
Sections: Installation, Quick Start, API Reference, Advanced Configuration, Testing, Troubleshooting.

### T082 – F06 Layouts Integration Example
Show badge in header, panel in shell, opening panel on click. Copy-paste ready code.

### T083 – Custom Type Mappings Example
Show overriding default mappings for custom notification types.

### T084 – Router Integration Patterns
Examples for React Router, Next.js App Router, Django templates.

### T085 – Troubleshooting Guide
Common issues: notifications not loading, toasts not appearing, badge not updating.

## Files
- Update `packages/notifications-hub/README.md`
- Create `examples/f06-integration.tsx`
- Create `examples/custom-mappings.ts`
- Create `examples/router-integration.tsx`

## References
- [quickstart.md](../quickstart.md) - Detailed integration guide
- Existing F02/F03 READMEs for structure

---

## Activity Log
- 2025-12-11T15:43:19Z – system – lane=planned – Prompt created
- 2025-12-11T21:35:00Z – claude – shell_pid=26596 – lane=doing – Started WP14: Documentation & Examples
- 2025-12-11T22:10:00Z – claude – shell_pid=26596 – lane=for_review – Ready for review
