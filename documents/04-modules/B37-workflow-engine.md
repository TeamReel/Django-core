# B37: Workflow Engine & State Machine

**Status**: ✅ Production Ready (Railway Deployed)
**Module**: `src.workflows`
**Purpose**: Generic workflow state machine for business processes
**API Endpoints**: `/api/workflows/templates/`, `/api/workflows/instances/`
**Admin Interface**: `/admin/workflows/`

## Overview

The Workflow Engine provides a flexible, extensible state machine for managing business process workflows across products. Workflows are defined as templates with JSON-based state definitions, instantiated per project with permission overrides, and track state transitions with full audit trails.

**Deployment Status**:
- ✅ Migrations applied to Railway production
- ✅ Seed data loaded (3 example workflows)
- ✅ All endpoints in Swagger docs
- ✅ Manual tests complete
- 📖 See [Railway Deployment Guide](../07-operations/railway-deployment-B37.md) for deployment details

## Architecture

**Pattern**: Hybrid state machine (JSON config + Python execution)

**Core Components**:
- **WorkflowTemplate**: System-level workflow definitions (admin-configurable)
- **WorkflowInstance**: Project-scoped workflow instances with runtime context
- **TransitionHistory**: Immutable audit trail of all state changes
- **ProjectPermissionOverride**: Project-specific permission customization
- **Registry Pattern**: Pluggable validators and transition hooks

**Design Principles**:
- Product-agnostic core with downstream extension points
- Type-safe validators via Python classes
- Audit compliance (immutable history)
- Performance-optimized for concurrent instances

## Key Features

1. **Template-Based Workflows**: Admin creates reusable workflow templates
2. **Project Scoping**: Workflows instantiated per project with context isolation
3. **Permission System**: Role-based state transition permissions with project overrides
4. **Audit Trail**: Full transition history with actor, timestamp, context snapshots
5. **Validation Hooks**: Pluggable validators run before transitions
6. **Snapshot Pattern**: Context versioning for rollback scenarios

## Database Models

### WorkflowTemplate
- System-level workflow definitions
- JSON schema for states, transitions, permissions
- Soft-delete pattern (is_active flag)
- **Manager**: `WorkflowTemplate.objects` (active only), `WorkflowTemplate.all_objects` (all)

### WorkflowInstance
- Project-scoped workflow instances
- GenericForeignKey to any model
- Runtime context (≤64KB JSON)
- Current state tracking

### TransitionHistory
- Immutable audit log
- Actor, timestamp, from_state, to_state
- Context snapshots for rollback

### ProjectPermissionOverride
- Project-specific permission customization
- Role-based access control integration

## Tech Stack

- **Django**: 5.x with modern model structure
- **Database**: PostgreSQL 15+ (JSONB support, table partitioning)
- **Testing**: pytest + pytest-django, factory_boy
- **Type Safety**: Python 3.12+ with type hints
- **Validation**: Custom validators via registry pattern

## API Endpoints

*(Will be documented after WP05-WP11 implementation)*

## Testing

**Test Structure**:
- `tests/workflows/unit/` - Model and service unit tests
- `tests/workflows/integration/` - End-to-end workflow tests
- `tests/workflows/conftest.py` - Shared fixtures
- `tests/workflows/factories.py` - factory_boy test data

**Coverage Targets**:
- Models: >90%
- Services: >80%
- API: >85%

## Configuration

Add to `INSTALLED_APPS`:
```python
INSTALLED_APPS = [
    # ...
    "src.workflows.apps.WorkflowsConfig",
    # ...
]
```

## Dependencies

**Required Modules**:
- B07: Projects (project scoping)
- B08: Authentication (user/actor context)
- B09: Audit (audit trail integration)

**Optional Integrations**:
- B15: Background Tasks (async hooks)
- B23: WebSocket (real-time state updates)

## Extension Points

### Product-Specific Workflows

Create custom validators in downstream products:

```python
# teamreel/workflows/validators.py
from src.workflows.registry import register_validator

@register_validator("match_status_validator")
class MatchStatusValidator:
    def validate(self, instance, to_state, context):
        # Product-specific validation logic
        pass
```

### Custom Transition Hooks

Register hooks for side effects:

```python
from src.workflows.registry import register_hook

@register_hook("after_transition")
def notify_stakeholders(instance, history_entry):
    # Send notifications, trigger workflows, etc.
    pass
```

## Development Status

**Current Phase**: Phase 0 - Foundation (WP01)

**Completed**:
- [x] Django app structure
- [x] Test infrastructure
- [x] Base model managers

**In Progress**:
- [ ] Core models (WP02)
- [ ] Engine service (WP03)
- [ ] Registry pattern (WP04)
- [ ] API endpoints (WP05-WP11)

## Related Documentation

- **Specification**: [kitty-specs/048-workflow-engine-state/spec.md](../../kitty-specs/048-workflow-engine-state/spec.md)
- **Implementation Plan**: [kitty-specs/048-workflow-engine-state/plan.md](../../kitty-specs/048-workflow-engine-state/plan.md)
- **Data Model**: [kitty-specs/048-workflow-engine-state/data-model.md](../../kitty-specs/048-workflow-engine-state/data-model.md)
- **API Contract**: [kitty-specs/048-workflow-engine-state/contracts/openapi.yaml](../../kitty-specs/048-workflow-engine-state/contracts/openapi.yaml)

## Constitutional Alignment

This module adheres to Django Core-App Constitution principles:
- **Principle II (Architecture)**: Single responsibility, stable APIs, minimal dependencies
- **Principle III (Code Quality)**: Type hints, Black formatting, Ruff linting
- **Principle VI (Performance)**: Indexed queries, pagination, no N+1 patterns

## Support

For questions or issues, see the [workflows tasks board](../../kitty-specs/048-workflow-engine-state/tasks.md).
