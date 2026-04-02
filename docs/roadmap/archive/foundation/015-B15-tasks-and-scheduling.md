# B15: Tasks & Scheduling

**Phase:** 4
**Status:** ✅ Done
**Module ID:** 015
**Category:** Backend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 15. B15 – Tasks & Scheduling Foundation

**Doel**: Async tasks en cron-like scheduling via Celery + broker.

**Status**: ✅ Complete

**Key Features**:
- Celery 5.3+ integration
- Redis broker configuration
- Celery Beat for scheduling
- Task result backend
- Retry patterns and error handling
- Task monitoring hooks (B18 integration)
- pytest-celery for testing

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Tasks & Scheduling Foundation
*Path: kitty-specs/015-tasks-scheduling-foundation/spec.md*

**Feature Branch**: `015-tasks-scheduling-foundation`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Introduce an asynchronous task and scheduling foundation (e.g. Celery-based) for the Django Core-App, so background jobs and periodic maintenance can run safely and consistently across all downstream products."

## User Scenarios & Testing

### User Story 1 - Execute Background Tasks (Priority: P1)

A developer needs to offload a slow operation (e.g., sending bulk notifications, generating a large report) to run asynchronously without blocking the HTTP request/response cycle. They define a task function, trigger it from their view or service code, and the system executes it in the background with automatic retry on failure.

**Why this priority**: Core value proposition - enables async execution of heavy operations that would otherwise timeout or block users.

**Independent Test**: Developer can define a simple task (e.g., `send_email`), trigger it via `.delay()`, and verify it executes in background worker with logs showing success/failure.

**Acceptance Scenarios**:

1. **Given** a task decorated with `@app.task`, **When** developer calls `task.delay(args)`, **Then** task executes asynchronously in a worker process and logs completion
2. **Given** a task that fails during execution, **When** the task raises an exception, **Then** system automatically retries up to 3 times with exponential backoff
3. **Given** a task that ultimately fails all retries, **When** maximum retries exhausted, **Then** system logs failure details and does not retry further
4. **Given** a long-running task, **When** developer checks task status, **Then** system provides basic status information (pending/started/success/failure)

---

### User Story 2 - Schedule Recurring Jobs (Priority: P2)

An operator needs to run periodic maintenance tasks (e.g., cleanup old sessions, sync external data) on a fixed schedule (every hour, daily at 3am, etc.). They configure a periodic task via Django settings (baseline) or optionally via database (advanced), and the system's beat scheduler ensures it runs at the specified intervals.

**Why this priority**: Critical for operational automation - enables housekeeping, data syncs, and maintenance without manual intervention.

**Independent Test**: Operator configures a periodic task in Django settings (e.g., `cleanup_sessions` every 24 hours), starts beat scheduler, and verifies task executes automatically at scheduled time with audit logs.

**Acceptance Scenarios**:

1. **Given** a periodic task configured with interval schedule (e.g., every 1 hour), **When** beat scheduler runs, **Then** task executes on schedule and logs each execution
2. **Given** a periodic task configured with cron schedule (e.g., daily at 3:00 AM), **When** time matches cron expression, **Then** task executes and logs timestamp
3. **Given** a periodic task that fails, **When** next schedule interval arrives, **Then** scheduler continues to trigger task as scheduled (does not stop on failure)
4. **Given** multiple periodic tasks configured, **When** beat scheduler runs, **Then** all tasks execute independently on their own schedules without blocking each other

---

### User Story 3 - Audit Task Execution (Priority: P2)

A security officer or operator needs to verify that sensitive background operations (e.g., data exports, bulk updates) are logged and auditable. When a task executes, the system automatically creates audit events showing who triggered it, when it ran, and whether it succeeded or failed.

**Why this priority**: Security and compliance requirement - ensures background operations follow same audit policies as synchronous code.

**Independent Test**: Developer triggers a task that processes sensitive data, and operator verifies audit log shows task execution with metadata (task name, arguments, user context, result).

**Acceptance Scenarios**:

1. **Given** a task decorated with audit integration, **When** task executes successfully, **Then** system creates audit event with task name, trigger context, and success status
2. **Given** a task that fails, **When** task exhausts retries, **Then** system creates audit event with failure details and error message
3. **Given** a task triggered by authenticated user, **When** task executes, **Then** audit event includes user context (user ID, organisation ID if applicable)
4. **Given** an operator reviewing audit logs, **When** filtering by task execution events, **Then** operator can see full history of task runs with timestamps and outcomes

---

### User Story 4 - Configure Task Infrastructure (Priority: P3)

A platform maintainer needs to swap task broker/backend (e.g., from Redis to RabbitMQ) or adjust task execution settings (retry policies, timeout limits) without changing task code. They update configuration settings, restart workers, and the system uses new infrastructure seamlessly.

**Why this priority**: Operational flexibility - enables environment-specific configuration and infrastructure changes without code modifications.

**Independent Test**: Maintainer changes `CELERY_BROKER_URL` from Redis to RabbitMQ in settings, restarts workers, and verifies tasks execute normally with new broker.

**Acceptance Scenarios**:

1. **Given** task infrastructure configured with Redis broker, **When** maintainer switches to RabbitMQ broker via settings, **Then** tasks execute normally after worker restart
2. **Given** default retry policy (3 attempts, exponential backoff), **When** maintainer overrides retry settings in configuration, **Then** tasks use new retry behavior
3. **Given** task timeout set globally, **When** specific task needs longer timeout, **Then** task can override timeout without affecting other tasks
4. **Given** multiple environments (dev, staging, production), **When** each uses different broker/backend, **Then** same task code works across all environments

---

### Edge Cases

- What happens when broker is unavailable when task is triggered? System should queue task locally if possible or raise clear error indicating infrastructure failure.
- How does system handle tasks that exceed maximum retry attempts? System logs final failure, creates audit event if applicable, and does not retry further.
- What happens when beat scheduler crashes and restarts? Scheduler resumes from last known state; some scheduled executions may be delayed but system continues normally.
- How does system handle tasks with duplicate execution (e.g., task triggered twice)? Each task execution is independent; idempotency is responsibility of task implementation, not infrastructure.
- What happens when worker is forcefully terminated during task execution? Task may be retried by another worker depending on acknowledgment settings (default: retry on worker failure).
- How does system handle scheduled tasks when multiple beat schedulers run? Only one beat scheduler should run per deployment; running multiple schedulers will cause duplicate task executions.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide decorator-based API for defining asynchronous tasks that can be triggered via `.delay()` or `.apply_async()`
- **FR-002**: System MUST automatically retry failed tasks up to 3 times with exponential backoff (default: 2s, 4s, 8s between retries)
- **FR-003**: System MUST support periodic task scheduling with both interval-based (every N seconds/minutes/hours) and cron-based (cron expression) schedules configured via Django settings by default. System SHOULD provide clear extension point for optional database-backed scheduling (django-celery-beat style) to enable runtime schedule modifications.
- **FR-004**: System MUST integrate with existing B09 audit logging to record task execution events (start, success, failure) with task metadata
- **FR-005**: System MUST support pluggable broker configuration (Redis, RabbitMQ, or others) via Django settings without code changes
- **FR-006**: System MUST provide basic task status queries (task ID lookup returns pending/started/success/failure/retry state)
- **FR-007**: System MUST allow per-task configuration of retry policy, timeout, and execution options via decorator parameters
- **FR-008**: System MUST log task execution to structured logging system (compatible with B01 settings structure)
- **FR-009**: System MUST support task context propagation (user ID, organisation ID, request ID) for audit and tracing purposes
- **FR-010**: System MUST integrate with B02 constitutional enforcement by validating task definitions against product-agnostic constraints
- **FR-011**: System MUST expose basic health check endpoint for monitoring worker availability and broker connectivity
- **FR-012**: System MUST support graceful shutdown of workers (complete in-progress tasks before terminating)
- **FR-013**: System MUST provide example tasks demonstrating integration with B12 notifications, B09 audit logging, and common patterns
- **FR-014**: System MUST allow configuration of task result backend (Redis, database, or no backend) for storing task outcomes
- **FR-015**: System MUST prevent task queue flooding by supporting rate limits and priority levels for tasks

### Non-Functional Requirements

- **NFR-001**: Task execution latency should be under 100ms overhead (time between `.delay()` call and task starting in worker)
- **NFR-002**: System should support at least 100 concurrent task executions per worker process
- **NFR-003**: Periodic task scheduling should have accuracy within ±10 seconds of configured schedule time
- **NFR-004**: Task infrastructure should be documented with setup instructions, example configurations, and troubleshooting guide
- **NFR-005**: All task-related code should maintain 80%+ test coverage including unit tests for task logic and integration tests for scheduling

### Key Entities

- **Task**: A unit of work defined as a Python function decorated with `@app.task`, containing the logic to be executed asynchronously. Has configuration (retry policy, timeout, routing) and metadata (name, arguments, result).
- **Periodic Task**: A scheduled task that runs automatically on a recurring basis. Has schedule definition (interval or cron), task reference, enabled/disabled state, and execution history.
- **Task Execution**: A specific run of a task, tracked by unique task ID. Has status (pending/started/success/failure/retry), start/end timestamps, arguments, result or error details, and retry count.
- **Worker**: A process that consumes tasks from the queue and executes them. Has configuration (concurrency level, queue subscriptions), health status, and execution metrics.
- **Beat Scheduler**: A singleton process that triggers periodic tasks according to their schedule definitions. Has configuration (schedule source - settings by default, optional database backend for runtime changes) and last-run tracking.

## Constitution Alignment

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented if product-specific behavior is needed

**Rationale**: Task infrastructure provides only generic async execution and scheduling patterns. Example tasks demonstrate integration but contain no product-specific logic. Downstream products can define their own tasks using the provided decorators and patterns.

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering and single responsibility per Django app
- [x] No circular dependencies introduced
- [x] Extension points are stable and documented

**Rationale**: Task infrastructure is isolated in its own Django app (`tasks` or `background`). Integrates with existing apps (audit, settings) via stable interfaces. Provides clear extension points via Celery's signal system and custom task base classes.

### Code Quality (Principle III)
- [x] Python 3.12+ baseline maintained
- [x] Type hints will be used in core modules
- [x] Code will be formatted with Black and linted with Ruff

**Rationale**: All task infrastructure code will follow existing code quality standards. Task decorators, configuration utilities, and example tasks will include complete type hints.

### Testing (Principle IV)
- [x] Test plan includes pytest + pytest-django tests
- [x] Coverage targets defined (80%+ for task infrastructure)
- [x] Integration tests planned for key flows

**Rationale**: Test suite will include unit tests for task execution, retry logic, and scheduling; integration tests for broker connectivity, periodic execution, and audit integration; and example tests demonstrating task testing patterns for downstream developers.

### Security & Privacy (Principle V)
- [x] Secure defaults (CSRF, secure cookies, ALLOWED_HOSTS) maintained
- [x] No secrets in code; env vars/secret managers documented
- [x] Authentication/authorization handled through centralized mechanisms
- [x] No sensitive data will be logged

**Rationale**: Broker URLs and credentials configured via environment variables. Task context propagation includes user/org IDs for authorization checks within tasks. Sensitive task arguments can be masked in logs via configuration. Audit integration ensures task execution follows same security policies as synchronous code.

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (query optimization plan documented if applicable)
- [x] Pagination implemented for unbounded responses (N/A for task execution)
- [x] Structured logging and metrics hooks included
- [x] Graceful degradation strategy defined for failure scenarios

**Rationale**: Task execution uses connection pooling for broker. Failed tasks retry automatically with exponential backoff. Workers support graceful shutdown to complete in-progress tasks. Structured logging includes task metadata for debugging. Basic health checks enable monitoring of infrastructure availability.

### API Design (Principle VII)
- [x] DRF standards followed (N/A - no REST API in this feature)
- [x] API responses are consistent and documented
- [x] Breaking changes use versioning or deprecation paths
- [x] Validation occurs at boundary (serializers/forms)

**Rationale**: Task API uses standard Celery patterns (`.delay()`, `.apply_async()`). Task status queries return consistent structured data. Configuration API uses Django settings conventions. Future extensions will follow DRF standards if REST API is added.

### Documentation (Principle XI)
- [x] Feature documentation plan included
- [x] Extension guide updates identified if applicable
- [x] ADR planned if major architectural decision involved

**Rationale**: Documentation will include: setup/installation guide, task definition patterns, scheduling configuration, retry/error handling strategies, integration examples (audit, notifications), testing patterns, and troubleshooting guide. ADR will document Celery selection rationale and broker choice considerations.

**Violations Requiring Justification**: None

## Success Criteria

### Measurable Outcomes

- **SC-001**: Developers can define and trigger a background task with less than 10 lines of code (decorator + function definition + trigger call)
- **SC-002**: System executes background tasks with less than 100ms overhead (measured from `.delay()` call to task start in worker)
- **SC-003**: Periodic tasks execute within ±10 seconds of configured schedule time under normal load
- **SC-004**: Failed tasks automatically retry according to configured policy without manual intervention in 95%+ of transient failure cases
- **SC-005**: Task execution audit events appear in B09 audit logs with complete metadata (task name, user context, outcome) for 100% of executed tasks
- **SC-006**: System handles at least 100 concurrent task executions per worker without degradation
- **SC-007**: Operators can swap broker infrastructure (Redis ↔ RabbitMQ) with zero code changes (configuration-only)
- **SC-008**: Task infrastructure maintains 80%+ test coverage including unit and integration tests
- **SC-009**: Developer documentation enables new contributor to create and schedule a task in under 15 minutes
- **SC-010**: System logs all task failures with sufficient detail (task name, arguments, stack trace) for debugging within 5 minutes of failure

## Assumptions

- **Assumption 1**: Celery is selected as the task framework based on its maturity, Django integration, and widespread adoption in Python ecosystem. Alternative frameworks (RQ, Dramatiq) were considered but Celery provides best balance of features and stability.
- **Assumption 2**: Default broker will be Redis for development and RabbitMQ for production deployments. System supports both via configuration.
- **Assumption 3**: Task result persistence is optional and disabled by default to reduce infrastructure complexity. Can be enabled per-environment via settings.
- **Assumption 4**: Only one beat scheduler process should run per deployment. Multi-scheduler coordination is out of scope. Baseline implementation uses settings-driven periodic task schedules; database-backed scheduling (django-celery-beat) is documented as optional extension point but not implemented in first iteration.
- **Assumption 5**: Task idempotency is responsibility of task implementation, not infrastructure. Infrastructure provides tools (task ID, execution tracking) to support idempotency patterns.
- **Assumption 6**: Basic task monitoring (status queries, logs) is sufficient for initial release. Advanced monitoring (metrics, tracing, dashboards) will integrate with B18-observability in future work.
- **Assumption 7**: Task priority and rate limiting are configured at task definition level, not dynamically per execution. Dynamic priority requires queue design changes beyond MVP scope.
- **Assumption 8**: Task execution context (user ID, org ID) is propagated via task arguments or custom context middleware. Request context is not automatically available in async tasks.

## Clarifications

### Session 2025-11-30

- Q: Where should periodic task schedules be stored by default (settings vs database)? → A: Both supported, settings as default. Baseline implementation uses settings-driven schedules (static, deployment-driven). Database-backed scheduling (django-celery-beat style) should be defined as clear extension point but marked optional/advanced - no full implementation required in first iteration.

## Open Questions

None - all critical decisions resolved during discovery phase.
