# Feature Specification: Workflow Engine & State Machine

**Feature Branch**: `048-workflow-engine-state`
**Created**: 2026-02-09
**Status**: Draft
**Input**: Generic workflow/state machine for business processes with hybrid scoping, snapshot versioning, and pluggable validators

## Summary

A generic, reusable workflow engine that allows defining state machines for business processes. Workflows are defined as templates at the system level, instantiated per project with permission overrides, and track progress through state transitions with full audit trail.

**Key Design Decisions**:
1. **Hybrid Scoping**: Global workflow templates that projects can instantiate with custom permission mappings
2. **Snapshot Versioning**: Workflow definition is copied to instance at creation time (immutable)
3. **Pluggable Validators**: Python functions registered as transition validators for extensibility

## Clarifications

### Session 2026-02-09

- Q: What should happen with async hooks (celery tasks) when they fail? → A: Track status - Store task_id in TransitionHistory, allow querying completion/failure, but don't block transition
- Q: What limits should apply to WorkflowInstance context JSON? → A: 64KB max - Sufficient for structured metadata (video details, match info), prevents abuse, maintains query performance
- Q: What should happen when workflow template is modified with active instances? → A: Soft-lock with override - Warn admins of active instance count, require explicit confirmation flag to proceed

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Define Workflow Template (Priority: P1)

As a system administrator, I want to define workflow templates with states and transitions, so that projects can use standardized business processes.

**Why this priority**: Foundation for all other functionality - without workflow definitions, nothing else works.

**Independent Test**: Can be fully tested by creating a workflow template via API and verifying the states/transitions are stored correctly.

**Acceptance Scenarios**:

1. **Given** I am authenticated as a system admin, **When** I create a workflow template with states ["draft", "submitted", "approved", "rejected"] and valid transitions, **Then** the workflow template is stored and retrievable via API
2. **Given** a workflow template exists, **When** I define a transition from "draft" to "approved" (skipping "submitted"), **Then** the transition is stored (validation happens at runtime, not definition time)
3. **Given** I am not a system admin, **When** I try to create a workflow template, **Then** I receive a 403 Forbidden error
4. **Given** a workflow template has 15 active instances, **When** I try to update it without force flag, **Then** I receive a 400 error with message "15 active instances exist. Use force_update=true to proceed."
5. **Given** a workflow template has active instances, **When** I update it with force_update=true, **Then** the update succeeds (existing instances retain their snapshot)

---

### User Story 2 - Create Workflow Instance (Priority: P1)

As a project member, I want to start a workflow for a specific object (e.g., a video, document), so that it progresses through the defined approval process.

**Why this priority**: Core value proposition - tracking objects through states.

**Independent Test**: Can be fully tested by creating a workflow instance linked to a content object and verifying the initial state is set correctly.

**Acceptance Scenarios**:

1. **Given** a workflow template "Content Approval" exists and I am a project member, **When** I create a workflow instance for a video object, **Then** an instance is created with the initial state and a snapshot of the workflow definition
2. **Given** I create a workflow instance, **When** the workflow template is later modified, **Then** my instance retains its original workflow definition (snapshot)
3. **Given** I am not a project member, **When** I try to create a workflow instance in that project, **Then** I receive a 403 Forbidden error

---

### User Story 3 - Execute State Transition (Priority: P1)

As a project member with appropriate permissions, I want to transition a workflow instance from one state to another, so that the business process progresses.

**Why this priority**: Core state machine functionality - the main interaction users have with workflows.

**Independent Test**: Can be fully tested by executing a transition via API and verifying the state changes, validators run, and hooks fire.

**Acceptance Scenarios**:

1. **Given** a workflow instance in state "draft" with transition "submit" allowed to "submitted", **When** I execute the "submit" transition, **Then** the instance state becomes "submitted"
2. **Given** a workflow instance in state "draft", **When** I try to execute transition "approve" (not allowed from draft), **Then** I receive a 400 error indicating invalid transition
3. **Given** a transition requires "approver" permission and I don't have it, **When** I try to execute that transition, **Then** I receive a 403 Forbidden error
4. **Given** a transition has a validator that checks `context.amount < 1000`, **When** I execute with amount=1500 in context, **Then** I receive a 400 error with validator failure message

---

### User Story 4 - Configure Project Permission Overrides (Priority: P2)

As a project admin, I want to customize which membership roles can execute which transitions, so that my project has appropriate access control.

**Why this priority**: Enables multi-tenant flexibility without requiring separate workflow definitions per project.

**Independent Test**: Can be fully tested by creating permission overrides for a project and verifying transition access is controlled accordingly.

**Acceptance Scenarios**:

1. **Given** a workflow template defines transition "approve" requires "admin" role, **When** I create a project override mapping "approve" to "coach" role, **Then** coaches in my project can execute the approve transition
2. **Given** no project override exists, **When** a user tries to execute a transition, **Then** the default template permissions apply
3. **Given** I am not a project admin, **When** I try to modify permission overrides, **Then** I receive a 403 Forbidden error

---

### User Story 5 - View Workflow History (Priority: P2)

As a project member, I want to see the transition history of a workflow instance, so that I can understand how it reached its current state.

**Why this priority**: Essential for audit and debugging, but not blocking core functionality.

**Independent Test**: Can be fully tested by executing several transitions and retrieving the history via API.

**Acceptance Scenarios**:

1. **Given** a workflow instance has transitioned through draft → submitted → approved, **When** I request its history, **Then** I see all transitions with timestamps, actors, and previous/new states
2. **Given** a transition had a comment/reason provided, **When** I view the history, **Then** the comment is visible in the transition record

---

### User Story 6 - Register Custom Validators (Priority: P3)

As a developer extending the platform, I want to register custom Python functions as transition validators, so that complex business rules can be enforced.

**Why this priority**: Extension point for downstream products - core engine works without custom validators.

**Independent Test**: Can be fully tested by registering a validator function, creating a workflow with that validator, and verifying it's called during transitions.

**Acceptance Scenarios**:

1. **Given** I register a validator function `validate_budget_approval`, **When** I define a transition with this validator, **Then** the function is called during transition execution
2. **Given** a validator function raises `ValidationError`, **When** a transition is attempted, **Then** the transition fails with the validator's error message
3. **Given** a validator function returns `True`, **When** a transition is attempted, **Then** the transition proceeds normally

---

### Edge Cases

- What happens when a workflow template has no initial state defined? → Error on instance creation
- What happens when an instance reaches a terminal state (no outgoing transitions)? → Instance is marked as "completed", no further transitions allowed
- How does the system handle a validator function that doesn't exist (e.g., code removed)? → Transition fails with "validator not found" error, logged as warning
- What happens when a content object is deleted while workflow instance exists? → Instance remains (orphaned) with null content reference, can still be queried for audit purposes
- What happens when concurrent transitions are attempted? → Optimistic locking via version field; second request fails with conflict error

## Requirements *(mandatory)*

### Functional Requirements

**Workflow Templates**
- **FR-001**: System MUST allow defining workflow templates with name, description, and version
- **FR-002**: System MUST store states as a list of state definitions (name, is_initial, is_terminal)
- **FR-003**: System MUST store transitions as a list (name, from_state, to_state, required_permission, validators)
- **FR-004**: System MUST validate that exactly one initial state exists per workflow
- **FR-005**: System MUST support soft-delete of workflow templates (is_active flag)
- **FR-005a**: System MUST warn admins when updating template with active instances (show count)
- **FR-005b**: System MUST require explicit `force_update=true` flag to proceed with template updates when instances exist

**Workflow Instances**
- **FR-006**: System MUST create instances linked to any model via generic foreign key (content_type, object_id)
- **FR-007**: System MUST snapshot the entire workflow definition at instance creation time
- **FR-008**: System MUST track current_state, created_by, updated_at, and arbitrary context JSON (max 64KB)
- **FR-008a**: System MUST reject instance creation or updates if context JSON exceeds 64KB
- **FR-009**: System MUST support a version field for optimistic concurrency control
- **FR-010**: System MUST scope instances to a project (FK to Project)

**State Transitions**
- **FR-011**: System MUST validate that requested transition exists in workflow definition
- **FR-012**: System MUST validate that transition is allowed from current state
- **FR-013**: System MUST check user has required permission for transition (via role mapping)
- **FR-014**: System MUST execute all registered validators before allowing transition
- **FR-015**: System MUST record transition in history (from_state, to_state, timestamp, actor, comment)
- **FR-016**: System MUST fire action hooks (on_exit_state, on_transition, on_enter_state) in order

**Permission Overrides**
- **FR-017**: System MUST support project-level permission overrides per transition
- **FR-018**: System MUST fall back to template defaults when no override exists
- **FR-019**: System MUST map permissions to membership roles (via B07 Projects)

**Action Hooks**
- **FR-020**: System MUST support registering Python functions as hooks (on_enter, on_exit, on_transition)
- **FR-021**: System MUST pass workflow instance, transition details, and actor to hooks
- **FR-022**: System MUST allow hooks to be async (via B15 background tasks)
- **FR-022a**: System MUST store Celery task_id in TransitionHistory when async hooks are triggered
- **FR-022b**: System MUST provide API endpoint to query async hook status (pending/success/failure)

**Integrations**
- **FR-023**: System MUST log all transitions to audit trail (B09 Audit)
- **FR-024**: System MUST support triggering notifications on transitions (B16 Notifications)
- **FR-025**: System MUST support triggering background tasks on transitions (B15 Tasks)

### Key Entities

- **WorkflowTemplate**: Defines a reusable workflow with states and transitions. System-level, created by admins.
- **WorkflowInstance**: Tracks an object's progress through a workflow. Project-scoped, contains snapshot of definition. Context JSON limited to 64KB.
- **TransitionHistory**: Immutable record of each state transition for an instance. Includes optional task_id for async hooks.
- **ProjectPermissionOverride**: Project-specific mapping of transitions to required membership roles.
- **ValidatorRegistry**: In-memory registry of Python functions for transition validation (not a model).
- **HookRegistry**: In-memory registry of Python functions for action hooks (not a model).

## Constitution Alignment *(mandatory)*

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented (validators, hooks, permission overrides)

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering: new `workflows` Django app with single responsibility
- [x] No circular dependencies: workflows depends on projects, audit, notifications, tasks (all existing)
- [x] Extension points are stable: validator/hook registries use decorator pattern

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in all modules (models, services, API)
- [x] Code will be formatted with Black and linted with Ruff

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets: >90% for models, >85% for API, >80% for services
- [x] Integration tests planned for: full transition flow, hook execution, audit logging

### Security & Privacy (Principle V)
- [x] Secure defaults maintained
- [x] No secrets in code
- [x] Authorization handled through project membership checks (B07) and permission mappings
- [x] No sensitive data logged (context JSON may contain PII - logged by reference only)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries: instance queries use select_related for content_object
- [x] Pagination implemented for history and instance lists
- [x] Structured logging included for all transitions
- [x] Graceful degradation: if sync hook fails, transition still completes (logged as warning)
- [x] Async hook tracking: task_id stored in TransitionHistory for status queries without blocking transition

### API Design (Principle VII)
- [x] DRF standards followed with ViewSets
- [x] API responses use standard envelope format
- [x] No breaking changes (new feature)
- [x] Validation in serializers

### Documentation (Principle XI)
- [x] Feature documentation: README with usage examples
- [x] Extension guide: How to register validators and hooks
- [x] No major ADR needed (standard patterns used)

### Delivery & Integration (Principle XIII)
- [x] Migration plan: additive only (new tables, no destructive operations)
- [x] Seed data: factory_boy factories for testing
- [x] Admin registration: WorkflowTemplate, WorkflowInstance with filters
- [x] API documentation: Swagger annotations
- [x] Demo app: Not required (backend-only per Constitution)
- [x] Manual test file: `documents/08-testing/manual-tests/B37-workflow-engine.md`

**Violations Requiring Justification**: None

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can define and test a new workflow in under 15 minutes using the API
- **SC-002**: State transitions complete in under 200ms (excluding async hooks)
- **SC-003**: System correctly enforces permissions for 100% of transition attempts
- **SC-004**: All transitions are logged to audit trail with full context
- **SC-005**: Test coverage exceeds 85% for the workflows module
- **SC-006**: Zero N+1 queries in standard list/detail API endpoints
- **SC-007**: Documentation enables a new developer to integrate workflows in under 30 minutes

## Assumptions

1. B07 Projects module provides membership role checking capabilities
2. B09 Audit module provides `AuditEvent.objects.create()` for logging
3. B15 Tasks module provides `@shared_task` decorator for async hooks
4. B16 Notifications module provides notification triggering capabilities
5. Generic foreign keys (ContentType framework) are acceptable for linking to arbitrary objects
6. Validators and hooks are registered at Django app ready time (not dynamically at runtime)
7. Workflow templates are system-wide (not organization-scoped) for simplicity
