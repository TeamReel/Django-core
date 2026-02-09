---
work_package_id: "WP04"
subtasks: ["T032", "T033", "T034", "T035", "T036", "T037", "T038", "T039", "T040", "T041"]
title: "Validator & Hook Registry"
phase: "Phase 0 - Foundation"
lane: "planned"
history:
  - timestamp: "2026-02-09T18:18:50Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
---

# WP04 – Validator & Hook Registry

## Objective
Implement registration pattern for pluggable validators and hooks per research.md Decision 4 (registry isolation).

## Key Files
- `src/workflows/registry.py` - ValidatorRegistry and HookRegistry classes
- `src/workflows/examples.py` - Example validators/hooks for documentation
- `tests/workflows/unit/test_registry.py` - Registry tests with isolation

## Implementation Pattern

```python
# src/workflows/registry.py
class ValidatorRegistry:
    _validators = {}

    @classmethod
    def validator(cls, name: str):
        def decorator(func):
            cls._validators[name] = func
            return func
        return decorator

    @classmethod
    def get(cls, name: str):
        if name not in cls._validators:
            raise KeyError(f"Validator '{name}' not registered")
        return cls._validators[name]

class HookRegistry:
    _hooks = {'on_enter': {}, 'on_exit': {}, 'on_transition': {}}

    @classmethod
    def hook(cls, hook_type: str, key: str):
        def decorator(func):
            if key not in cls._hooks[hook_type]:
                cls._hooks[hook_type][key] = []
            cls._hooks[hook_type][key].append(func)
            return func
        return decorator

    @classmethod
    def get_hooks(cls, hook_type: str, key: str) -> list:
        return cls._hooks.get(hook_type, {}).get(key, [])
```

## Test Strategy
Use fixtures for isolated registries - don't pollute global state.

## Done Checklist
- [ ] Registries support decorator pattern
- [ ] Example validators/hooks created
- [ ] Tests use isolated registries
- [ ] Documentation updated in README

Activity Log: 2026-02-09T18:18:50Z – Created
