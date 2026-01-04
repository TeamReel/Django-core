---
lane: "for_review"
assignee: "Claude Agent"
agent: "claude"
shell_pid: "45452"
review_status: ""
---

# WP02: Decorators & Tagging Strategy

## Activity Log
- 2026-01-04T00:00:00Z – claude – shell_pid=45452 – lane=doing – Started implementation
- 2026-01-04T00:15:00Z – claude – shell_pid=45452 – lane=for_review – Completed implementation

## Context
- **Spec:** [spec.md](../../spec.md)
- **Plan:** [plan.md](../../plan.md)
- **Data Model:** [data-model.md](../../data-model.md)

## Goal
Implement the developer-facing API (`@cache_result`) and tag-based invalidation.

## Tasks
- [ ] **T005**: Implement `CacheService.add_tags(key, tags)` using Redis Sets.
- [ ] **T006**: Implement `CacheService.invalidate_tags(tags)` using Redis Sets.
- [ ] **T007**: Implement `@cache_result` decorator with hybrid key generation.
- [ ] **T008**: Implement `@cache_invalidate` decorator.
- [ ] **T009**: Unit tests for decorators and tagging scenarios.

## Definition of Done
- `@cache_result` correctly caches return values.
- `invalidate_tags` correctly removes all keys associated with a tag.
- Decorators handle `self` (methods) and standalone functions correctly.
