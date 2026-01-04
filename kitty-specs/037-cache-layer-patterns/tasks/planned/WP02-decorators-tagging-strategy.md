# WP02: Decorators & Tagging Strategy

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
