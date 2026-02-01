# Feature Specification: AI Generation Pipeline Factory with Intelligent Retry

**Feature Branch**: `043-ai-generation-pipeline`
**Module ID**: B34 / 043
**Created**: 2026-02-01
**Status**: Draft
**Phase**: 10
**Category**: Backend

## Executive Summary

AI content generation factory that manages generation requests (jobs), routes to appropriate pipelines (LangGraph/n8n/OpenAI), and handles async execution with intelligent retry logic. This is a **core infrastructure module** that provides product-agnostic content generation capabilities.

**Key Design Decisions (from Discovery):**
1. **Pipeline Selection**: Hardcoded in template config (predictable, testable, simple for end users)
2. **Credit Deduction**: Hybrid reserve/settle model (reserve on submit, settle on completion, refund on failure)
3. **Retry Logic**: Intelligent error classification (transient errors → auto retry, permanent errors → no retry, unknown → conservative retry)

**Integrations**: B15 Celery (async), B11 Credits (transactions), B33 Brand Identity (tokens), B35 File Storage (outputs), B23 WebSocket (status updates)

## User Scenarios & Testing

### User Story 1 - Template-Based Content Generation (Priority: P1)

**User Journey**: As a **developer** building a product (e.g., TeamReel), I want to define a GenerationTemplate for "Match Report Instagram Post", so that my users can generate branded social media content by only providing match data.

**Why this priority**: Core value proposition - without templates, there's no content generation. This is the foundation for all other features.

**Independent Test**: Create template → Submit generation request with valid input → Receive generated content. This delivers immediate value as a working content generation API.

**Acceptance Scenarios**:

1. **Given** no templates exist, **When** admin creates template with name="Match Report IG", input_schema={"match_id": "integer"}, pipeline_config={"provider": "openai", "model": "gpt-4"}, **Then** template is saved and can be retrieved via API
2. **Given** template exists, **When** user submits generation request with valid input_data={"match_id": 123}, **Then** request is created with status="pending" and queued for processing
3. **Given** request is processing, **When** pipeline completes successfully, **Then** request status="completed" and GenerationOutput is created with result
4. **Given** request completed, **When** user retrieves output, **Then** response includes file URL (if image/video) or text_content (if text)

---

### User Story 2 - Credit Management with Reserve/Settle (Priority: P1)

**User Journey**: As a **SaaS operator**, I want credits to be reserved on job submission and settled on completion, so that users only pay for successful generations and spam is prevented.

**Why this priority**: Critical for production SaaS - without proper credit handling, either users get charged for failures (bad UX) or system is vulnerable to spam (business risk).

**Independent Test**: User with 1000 credits submits job requiring 200 credits → balance shows 800 available (reserved) → job completes → transaction settles at actual cost (e.g., 150) → balance shows 850 available.

**Acceptance Scenarios**:

1. **Given** user has 1000 credits, **When** user submits generation request with estimated_cost=200, **Then** 200 credits are reserved (transaction created with type="reserve", status="pending")
2. **Given** request completes successfully with actual_cost=150, **When** system settles transaction, **Then** reserved transaction is settled (status="completed", final_amount=150) and 50 credits are released back to user
3. **Given** request fails permanently, **When** system cancels transaction, **Then** reserved credits are fully refunded (transaction status="cancelled") and user balance returns to 1000
4. **Given** user has 100 credits, **When** user submits request requiring 200 credits, **Then** request is rejected with error "Insufficient credits" (HTTP 402)

---

### User Story 3 - Intelligent Retry with Error Classification (Priority: P1)

**User Journey**: As a **platform operator**, I want transient errors (rate limits, timeouts) to be automatically retried but permanent errors (bad input) to fail immediately, so that costs are minimized and users get fast feedback.

**Why this priority**: Production reliability - external APIs (OpenAI, LangGraph) have transient failures. Without intelligent retry, success rate drops (bad UX) and debugging is harder.

**Independent Test**: Mock OpenAI rate limit error → request retries with exponential backoff → eventually succeeds. Mock bad input error → request fails immediately with no retry.

**Acceptance Scenarios**:

1. **Given** request is processing, **When** OpenAI returns 429 rate limit error, **Then** request is retried after 30s (retry_count=1, error_category="transient")
2. **Given** request failed with transient error (retry_count=1), **When** retry also fails with rate limit, **Then** request is retried after 5min (retry_count=2)
3. **Given** request is processing, **When** OpenAI returns 400 bad request error (invalid input), **Then** request fails immediately with status="failed", error_category="permanent", retry_count=0
4. **Given** request failed with unknown error (retry_count=0), **When** error cannot be classified, **Then** request is retried once after 1min (conservative retry for unknown errors)
5. **Given** request reached max retries (3 for transient), **When** final retry fails, **Then** request status="failed" with full error history in metadata

---

### User Story 4 - Multi-Provider Pipeline Routing (Priority: P2)

**User Journey**: As a **template designer**, I want to specify pipeline provider in template config (OpenAI for simple text, LangGraph for complex agents, n8n for workflows), so that each content type uses the optimal generation engine.

**Why this priority**: Enables flexibility for different use cases, but can start with single provider (OpenAI) for MVP.

**Independent Test**: Create 3 templates with different providers → Submit requests for each → Verify correct pipeline executor is invoked.

**Acceptance Scenarios**:

1. **Given** template with pipeline_config={"provider": "openai", "model": "gpt-4"}, **When** request is processed, **Then** OpenAI API executor is invoked
2. **Given** template with pipeline_config={"provider": "langgraph", "flow_id": "match-story-v1"}, **When** request is processed, **Then** LangGraph executor is invoked with flow_id
3. **Given** template with pipeline_config={"provider": "n8n", "workflow_url": "https://..."}, **When** request is processed, **Then** n8n webhook is called
4. **Given** template with unsupported provider="custom", **When** request is validated, **Then** validation fails with error "Unsupported provider"

---

### User Story 5 - Brand Context Integration (Priority: P2)

**User Journey**: As a **content generator**, I want generation requests to automatically include brand identity tokens from B33, so that generated content is branded without manual token management.

**Why this priority**: Nice-to-have for MVP, critical for production quality (ensures consistent branding).

**Independent Test**: Submit request with project_id → Verify brand tokens are fetched from B33 and passed to pipeline.

**Acceptance Scenarios**:

1. **Given** request has project_id=123, **When** pipeline executor prepares context, **Then** brand tokens are fetched via `BrandProfile.get_effective_profile(project=123)` and included in generation context
2. **Given** brand profile has colors=["#FF0000"], logo_url="...", **When** tokens are passed to OpenAI, **Then** system message includes "Brand colors: #FF0000, Logo: ..."
3. **Given** project has no brand profile, **When** tokens are fetched, **Then** default/empty tokens are used (generation continues without error)

---

### User Story 6 - Real-Time Status Updates (Priority: P3)

**User Journey**: As a **frontend developer**, I want to receive real-time status updates via WebSocket (B23), so that users see live progress without polling.

**Why this priority**: Nice-to-have for UX polish, not blocking for API functionality.

**Independent Test**: Submit request → Subscribe to WebSocket channel → Receive status updates (pending → processing → completed).

**Acceptance Scenarios**:

1. **Given** request is created, **When** status changes to "processing", **Then** WebSocket event is emitted to channel `generation.{request_id}`
2. **Given** request is retrying, **When** retry_count increments, **Then** WebSocket event includes retry metadata (attempt number, error category)
3. **Given** request completes, **When** output is stored, **Then** WebSocket event includes output preview (file URL or text excerpt)

---

### Edge Cases

- **What happens when pipeline provider is unreachable?** → Classified as transient error, retried with exponential backoff up to 3 times
- **What happens when input_data doesn't match template's input_schema?** → Request fails validation before queueing (HTTP 400), no credits reserved
- **What happens when generation costs more credits than reserved?** → Transaction settles at actual cost, potentially resulting in negative balance (per B11 BalancePolicy configuration)
- **What happens when user deletes template while requests are processing?** → Requests continue with cached template config (soft delete or FK constraint prevents hard delete)
- **What happens when file storage (B35) is unavailable?** → Output creation fails, request is retried (storage failure = transient error)
- **What happens when Celery worker is down?** → Requests remain in "pending" status, processed when worker restarts (queue persistence)
- **What happens when same user submits 100 requests simultaneously?** → All are queued if user has sufficient credits (rate limiting is out of scope, handled by API throttling in B08)

## Requirements

### Functional Requirements

**Models & Data Schema:**

- **FR-001**: System MUST provide `GenerationTemplate` model with fields: name, slug, version, input_schema (JSON Schema), pipeline_config (JSON), is_active, created_at, updated_at
- **FR-002**: System MUST provide `GenerationRequest` model with fields: template (FK), status (pending/processing/completed/failed), input_data (JSON), requester (FK User), project (FK Project), retry_count, error_category (transient/permanent/unknown), error_message, estimated_cost, actual_cost, created_at, started_at, completed_at
- **FR-003**: System MUST provide `GenerationOutput` model with fields: request (FK), file (FK to B35 FileStorageRecord or B22 File), text_content (TextField), output_type (image/video/text/json), metadata (JSON), created_at
- **FR-004**: System MUST validate input_data against template's input_schema before queueing request (fail fast with HTTP 400)

**Pipeline Execution:**

- **FR-005**: System MUST support pipeline providers: "openai" (direct API), "langgraph" (agent flows), "n8n" (workflow webhooks)
- **FR-006**: System MUST select pipeline executor based on template.pipeline_config["provider"] (hardcoded, no automatic detection)
- **FR-007**: System MUST execute generation requests asynchronously via Celery tasks (B15 integration)
- **FR-008**: Pipeline executors MUST return standardized output format: `{"type": "image|video|text|json", "content": "...", "metadata": {...}}`

**Credit Management:**

- **FR-009**: System MUST reserve credits on request submission via B11 Transactions API (transaction type="reserve", status="pending")
- **FR-010**: System MUST settle transaction on successful completion with actual cost (transaction status="completed", final_amount=actual_cost)
- **FR-011**: System MUST refund reserved credits on permanent failure (transaction status="cancelled", full refund)
- **FR-012**: System MUST reject requests if user has insufficient available credits (HTTP 402 Payment Required)
- **FR-013**: Credit calculations MUST use template.pipeline_config["estimated_cost"] for reservation, actual API usage for settlement

**Intelligent Retry:**

- **FR-014**: System MUST classify errors into categories: TRANSIENT (rate limit, timeout, network), PERMANENT (bad input, auth failed, not found), UNKNOWN (unrecognized errors)
- **FR-015**: System MUST retry transient errors up to 3 times with exponential backoff: [30s, 300s, 900s]
- **FR-016**: System MUST NOT retry permanent errors (fail immediately with retry_count=0)
- **FR-017**: System MUST retry unknown errors once with 60s delay (conservative approach)
- **FR-018**: System MUST track retry_count and error_category in GenerationRequest model
- **FR-019**: Error classification MUST be provider-specific (OpenAI errors ≠ LangGraph errors ≠ n8n errors)

**Integration:**

- **FR-020**: System MUST fetch brand tokens from B33 BrandProfile.get_effective_profile(project=request.project_id) and pass to pipeline executor
- **FR-021**: System MUST store output files via B35 FileStorageRecord (primary) or B22 File (fallback)
- **FR-022**: System MUST emit WebSocket events (B23) on status changes: created, processing, retry, completed, failed
- **FR-023**: WebSocket events MUST include: request_id, status, retry_count, error_category, progress_percentage (if available)

**API Endpoints:**

- **FR-024**: System MUST provide REST API endpoints:
  - `POST /api/generation/templates/` - Create template (admin only)
  - `GET /api/generation/templates/` - List templates (with filtering by is_active)
  - `GET /api/generation/templates/{id}/` - Retrieve template
  - `POST /api/generation/requests/` - Submit generation request
  - `GET /api/generation/requests/` - List user's requests (with filtering by status, project)
  - `GET /api/generation/requests/{id}/` - Retrieve request details
  - `GET /api/generation/requests/{id}/output/` - Retrieve generation output
  - `POST /api/generation/requests/{id}/retry/` - Manual retry (for failed requests)

**Security & Permissions:**

- **FR-025**: Template creation/update MUST be restricted to organisation admins (B08 RBAC)
- **FR-026**: Users MUST only see requests they created or have project access to (B07 Membership filtering)
- **FR-027**: Output files MUST inherit ACL from request.project (B22/B35 file permissions)

**Validation & Error Handling:**

- **FR-028**: System MUST validate input_schema is valid JSON Schema format (use `jsonschema` library)
- **FR-029**: System MUST validate pipeline_config contains required keys for each provider (e.g., OpenAI needs "model", LangGraph needs "flow_id")
- **FR-030**: System MUST return structured error responses with error_code, message, details (follow Django Core error format)

### Non-Functional Requirements

- **NFR-001**: Request processing latency MUST be < 60s for 95% of OpenAI simple completions
- **NFR-002**: System MUST handle 1000 concurrent requests without degradation (Celery worker scaling)
- **NFR-003**: Error classification MUST be extensible (new providers can add error mappers without modifying core logic)
- **NFR-004**: System MUST log all pipeline executions with full context (request_id, provider, input_data hash, cost, duration)
- **NFR-005**: Database queries MUST be optimized (select_related for FK lookups, avoid N+1)
- **NFR-006**: All code MUST follow PEP8, include type hints, and have docstrings
- **NFR-007**: Test coverage MUST be > 85% (models, serializers, views, tasks, error classification)

### Key Entities

- **GenerationTemplate**: Defines reusable content generation blueprints
  - Attributes: name, slug, version, input_schema (JSON Schema), pipeline_config (provider + provider-specific settings), is_active
  - Relationships: One-to-many with GenerationRequest
  - Example: "Match Report IG" template defines inputs (match_id, mvp) and pipeline (OpenAI GPT-4)

- **GenerationRequest**: Represents a job submission and lifecycle
  - Attributes: status (pending/processing/completed/failed), input_data (JSON), retry_count, error_category, cost tracking (estimated/actual)
  - Relationships: Many-to-one with GenerationTemplate, User (requester), Project; One-to-one with GenerationOutput
  - Lifecycle: Created (pending) → Queued (Celery) → Processing → Completed/Failed (with retry logic)

- **GenerationOutput**: Stores the generated result
  - Attributes: output_type (image/video/text/json), file (FK to storage), text_content, metadata
  - Relationships: One-to-one with GenerationRequest
  - Storage: Files via B35 FileStorageRecord (primary) or B22 File (fallback)

- **ErrorClassifier**: Service class for error categorization (not a model)
  - Responsibility: Maps provider-specific exceptions to ErrorCategory enum (TRANSIENT/PERMANENT/UNKNOWN)
  - Extensibility: Provider-specific classification methods (_classify_openai, _classify_langgraph, etc.)

## Constitution Alignment

### Product-Agnostic Constraint (Principle I)
- ✅ This feature contains NO product-specific logic - it's a generic content generation factory
- ✅ All functionality is reusable (any product can define templates for their content types)
- ✅ Extension points: Pipeline providers can be added without modifying core logic (factory pattern)
- ✅ Brand integration (B33) is optional - system works without brand tokens

### Architecture & Modularity (Principle II)
- ✅ Clear layering: Models → Serializers → Views → Tasks (Celery) → Pipeline Executors
- ✅ No circular dependencies (one-way dependencies: generative → credits, files, branding)
- ✅ Extension points: New pipeline providers implement `BasePipelineExecutor` interface
- ✅ Separation of concerns: Error classification in separate module, credit management via B11 API

### Code Quality (Principle III)
- ✅ Python 3.12+ baseline (uses latest type hints, match statements for provider routing)
- ✅ Type hints for all functions: `def process_request(request: GenerationRequest) -> GenerationOutput`
- ✅ Docstrings for models, views, tasks (Google style)
- ✅ Black formatting + Ruff linting enforced

### Testing (Principle IV)
- ✅ Unit tests: Model validation, serializer logic, error classification
- ✅ Integration tests: Full job lifecycle (submit → process → output), credit reserve/settle flow
- ✅ Mocking strategy: Mock external APIs (OpenAI, LangGraph, n8n) with `responses` library
- ✅ Coverage target: >85% (pytest-cov)

### Security & Privacy (Principle V)
- ✅ Secure defaults: API credentials in environment variables (OPENAI_API_KEY, etc.)
- ✅ No secrets in logs: input_data is hashed in audit logs
- ✅ Permission checks: Template creation restricted to org admins, requests filtered by project membership
- ✅ File ACL: Output files inherit project permissions (B22/B35)

### Performance & Reliability (Principle VI)
- ✅ No N+1 queries: `select_related('template', 'requester', 'project')` in list views
- ✅ Pagination: DRF PageNumberPagination for request list endpoints
- ✅ Async processing: All heavy work in Celery (non-blocking API)
- ✅ Graceful degradation: Retry logic for transient failures, clear error messages for permanent failures
- ✅ Logging: Structured logs with request_id, provider, duration, cost (JSON format)

### API Design (Principle VII)
- ✅ DRF standards: ViewSets, serializers, standard HTTP status codes
- ✅ Consistent responses: All errors follow `{"error_code": "...", "message": "...", "details": {...}}`
- ✅ Versioning: `/api/v1/generation/...` (ready for v2 if breaking changes needed)
- ✅ Validation: Input schema validation via `jsonschema`, DRF serializer validation for API fields

### Documentation (Principle XI)
- ✅ Feature README: How to create templates, submit requests, handle outputs
- ✅ Pipeline provider guide: How to add new providers (implement BasePipelineExecutor)
- ✅ ADR: "ADR-043: Intelligent Retry Architecture" (error classification rationale)
- ✅ API documentation: Auto-generated via drf-spectacular (OpenAPI schema)

**Violations Requiring Justification**: None

## Success Criteria

### Measurable Outcomes

- **SC-001**: **Functional Completeness** - All 6 user stories are implemented and passing acceptance tests (100% scenario coverage)
- **SC-002**: **Reliability** - 95% of transient error retries succeed within 3 attempts (measured via error_category metrics)
- **SC-003**: **Cost Efficiency** - Permanent errors fail immediately (0 retries), saving estimated 40% in wasted API calls compared to blind retry
- **SC-004**: **Performance** - 95th percentile request processing latency < 60s for OpenAI simple completions (measured via structured logs)
- **SC-005**: **Developer UX** - Downstream products can add new template and submit request with < 5 API calls (template creation is one-time setup)
- **SC-006**: **Test Coverage** - Code coverage >85% across models, serializers, views, tasks, error classification (pytest-cov report)
- **SC-007**: **Production Readiness** - Zero security vulnerabilities in Bandit scan, zero type errors in mypy check

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer (DRF)                          │
│  TemplateViewSet │ RequestViewSet │ OutputViewSet               │
└────────────────┬────────────────────────────────┬────────────────┘
                 │                                │
                 ▼                                ▼
┌────────────────────────────┐    ┌──────────────────────────────┐
│   Serializers & Validation │    │   Permission Checks (B08)    │
│  - Input schema validation │    │  - Project membership (B07)  │
│  - Pipeline config checks  │    │  - Org admin for templates   │
└────────────┬───────────────┘    └──────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
│  GenerationService: Orchestrates job submission & credit mgmt    │
└────────────┬────────────────────────────────┬───────────────────┘
             │                                │
             ▼                                ▼
┌────────────────────────┐         ┌─────────────────────────────┐
│  Credits API (B11)     │         │   Celery Task Queue (B15)   │
│  - Reserve credits     │         │   process_generation_task   │
│  - Settle on complete  │         └──────────┬──────────────────┘
│  - Refund on failure   │                    │
└────────────────────────┘                    ▼
                              ┌────────────────────────────────────┐
                              │     Pipeline Executor Factory      │
                              │  BasePipelineExecutor (ABC)        │
                              └──┬──────────┬──────────┬───────────┘
                                 │          │          │
                    ┌────────────▼─┐  ┌────▼────┐  ┌─▼─────────┐
                    │ OpenAI Exec  │  │ LangGr. │  │ n8n Exec  │
                    │ - GPT-4/3.5  │  │ - Flows │  │ - Webhook │
                    └──────┬───────┘  └────┬────┘  └─┬─────────┘
                           │               │          │
                           └───────────────┼──────────┘
                                           ▼
                              ┌────────────────────────────────────┐
                              │     Error Classifier               │
                              │  - TRANSIENT → retry               │
                              │  - PERMANENT → fail                │
                              │  - UNKNOWN → conservative retry    │
                              └──────────┬─────────────────────────┘
                                         │
                         ┌───────────────┴────────────────┐
                         ▼                                ▼
          ┌──────────────────────────┐    ┌──────────────────────┐
          │  File Storage (B35/B22)  │    │  WebSocket (B23)     │
          │  - Store outputs         │    │  - Status updates    │
          │  - ACL inheritance       │    │  - Progress events   │
          └──────────────────────────┘    └──────────────────────┘
```

### Data Flow: Request Submission

1. **API Request**: `POST /api/generation/requests/`
   - Payload: `{"template_id": 123, "input_data": {"match_id": 456}, "project_id": 789}`

2. **Validation**: Serializer validates input_data against template.input_schema (JSON Schema)

3. **Credit Check**: Query user's available balance via B11 API
   - If insufficient → HTTP 402 Payment Required

4. **Credit Reserve**: Create pending transaction with estimated_cost
   - Transaction type="reserve", status="pending"

5. **Request Creation**: Save GenerationRequest with status="pending"

6. **Task Queue**: Submit Celery task `process_generation_request.delay(request_id)`

7. **API Response**: HTTP 201 Created with request details + WebSocket channel ID

### Data Flow: Request Processing

1. **Task Execution**: Celery worker picks up task

2. **Status Update**: Set request.status="processing", started_at=now()

3. **Brand Context**: Fetch brand tokens from B33 (if project_id present)
   - `BrandProfile.get_effective_profile(project=request.project_id)`

4. **Pipeline Selection**: Factory pattern selects executor based on template.pipeline_config["provider"]

5. **Executor Invocation**: Execute pipeline with input_data + brand_context
   - OpenAI: `client.chat.completions.create(...)`
   - LangGraph: `POST https://langgraph-api/v1/flows/{flow_id}/run`
   - n8n: `POST {workflow_url}` with webhook payload

6. **Error Handling**: On exception, classify error category
   - If TRANSIENT → retry with backoff (max 3 attempts)
   - If PERMANENT → mark failed, no retry
   - If UNKNOWN → retry once (conservative)

7. **Output Storage**: On success, save GenerationOutput
   - Files → B35 FileStorageRecord
   - Text → GenerationOutput.text_content

8. **Credit Settlement**: Settle transaction with actual_cost
   - Transaction status="completed", final_amount=actual_cost

9. **Status Update**: Set request.status="completed", completed_at=now()

10. **WebSocket Notification**: Emit completion event to channel

### Error Classification Matrix

| Provider | Error Type | Category | Retry? |
|----------|-----------|----------|--------|
| **OpenAI** | RateLimitError (429) | TRANSIENT | ✅ 3x |
| OpenAI | Timeout (504) | TRANSIENT | ✅ 3x |
| OpenAI | BadRequestError (400) | PERMANENT | ❌ No |
| OpenAI | AuthenticationError (401) | PERMANENT | ❌ No |
| OpenAI | InvalidRequestError | PERMANENT | ❌ No |
| **LangGraph** | HTTP 503 | TRANSIENT | ✅ 3x |
| LangGraph | ValidationError | PERMANENT | ❌ No |
| LangGraph | FlowNotFoundError | PERMANENT | ❌ No |
| **n8n** | Webhook timeout | TRANSIENT | ✅ 3x |
| n8n | Workflow error | PERMANENT | ❌ No |
| **All** | ConnectionError | TRANSIENT | ✅ 3x |
| **All** | Unknown exception | UNKNOWN | ✅ 1x |

### Database Schema

**generative_generationtemplate**
```
id: bigint (PK)
organisation_id: bigint (FK → organisations_organisation)
name: varchar(200)
slug: varchar(100, unique)
version: varchar(20)
description: text
input_schema: jsonb  # JSON Schema format
pipeline_config: jsonb  # {"provider": "openai", "model": "gpt-4", "estimated_cost": 100}
is_active: boolean (default=True)
created_at: timestamp
updated_at: timestamp
created_by_id: bigint (FK → accounts_user)
```

**generative_generationrequest**
```
id: bigint (PK)
template_id: bigint (FK → generative_generationtemplate)
requester_id: bigint (FK → accounts_user)
project_id: bigint (FK → projects_project, nullable)
status: varchar(20)  # pending, processing, completed, failed
input_data: jsonb  # User-provided inputs
retry_count: int (default=0)
error_category: varchar(20)  # transient, permanent, unknown (nullable)
error_message: text (nullable)
estimated_cost: decimal(10,4)
actual_cost: decimal(10,4) (nullable)
transaction_id: bigint (FK → transactions_transaction, nullable)
created_at: timestamp
started_at: timestamp (nullable)
completed_at: timestamp (nullable)

INDEX: (requester_id, status)
INDEX: (project_id, created_at)
INDEX: (template_id, status)
```

**generative_generationoutput**
```
id: bigint (PK)
request_id: bigint (FK → generative_generationrequest, unique)
output_type: varchar(20)  # image, video, text, json
file_id: bigint (FK → storage_filestoragerecord, nullable)
text_content: text (nullable)
metadata: jsonb  # Provider-specific metadata (tokens used, model version, etc.)
created_at: timestamp

CONSTRAINT: (file_id IS NOT NULL) OR (text_content IS NOT NULL)
```

### API Endpoints Specification

**POST /api/generation/templates/**
- **Auth**: Organisation admin only
- **Request**: `{"name": "...", "input_schema": {...}, "pipeline_config": {...}}`
- **Response**: `201 Created` with template details
- **Errors**: `400` (validation), `403` (not admin)

**GET /api/generation/templates/**
- **Auth**: Authenticated users
- **Query Params**: `?is_active=true`, `?provider=openai`
- **Response**: `200 OK` with paginated list
- **Errors**: `401` (not authenticated)

**POST /api/generation/requests/**
- **Auth**: Project member or organisation member
- **Request**: `{"template_id": 123, "input_data": {...}, "project_id": 789}`
- **Response**: `201 Created` with request details + WebSocket channel
- **Errors**: `400` (validation), `402` (insufficient credits), `403` (no access to project)

**GET /api/generation/requests/?status=completed&project_id=789**
- **Auth**: User's own requests or project member
- **Response**: `200 OK` with paginated list
- **Filters**: status, project_id, created_after, created_before

**GET /api/generation/requests/{id}/**
- **Auth**: Request owner or project member
- **Response**: `200 OK` with full request details (includes retry history in metadata)
- **Errors**: `404` (not found or no access)

**GET /api/generation/requests/{id}/output/**
- **Auth**: Request owner or project member
- **Response**: `200 OK` with output (file URL or text_content)
- **Errors**: `404` (no output yet), `403` (no access)

**POST /api/generation/requests/{id}/retry/**
- **Auth**: Request owner
- **Conditions**: Only for status="failed"
- **Response**: `201 Created` (creates NEW request with same input_data)
- **Errors**: `400` (request not failed), `402` (insufficient credits)

### Extension Points for Downstream Products

1. **Custom Pipeline Providers**:
   ```python
   from src.generative.executors import BasePipelineExecutor

   class CustomModelExecutor(BasePipelineExecutor):
       def execute(self, request, brand_context):
           # Your implementation
           return {"type": "image", "content": "...", "metadata": {...}}
   ```

2. **Template Presets** (in product code):
   ```python
   # TeamReel creates templates via migration
   GenerationTemplate.objects.get_or_create(
       slug="match-report-ig",
       defaults={
           "name": "Match Report Instagram",
           "input_schema": {...},
           "pipeline_config": {"provider": "openai", ...}
       }
   )
   ```

3. **Custom Brand Context** (override in product):
   ```python
   # TeamReel-specific brand enrichment
   def get_enriched_brand_context(request):
       base_context = BrandProfile.get_effective_profile(request.project_id)
       base_context["teamreel_specific_data"] = {...}
       return base_context
   ```

## Implementation Plan

### Phase 1: Core Models & API (Priority: P1)

**Work Package 1.1: Models & Migrations**
- Create `GenerationTemplate`, `GenerationRequest`, `GenerationOutput` models
- Add database indexes for performance
- Migration includes JSON Schema validation examples

**Work Package 1.2: Serializers & Validation**
- Template serializer with input_schema validation (jsonschema library)
- Request serializer with permission checks (project membership)
- Output serializer with file URL generation (presigned URLs via B35)

**Work Package 1.3: ViewSets & Permissions**
- TemplateViewSet (admin-only create, public read for active templates)
- RequestViewSet (authenticated users, filtered by project membership)
- OutputViewSet (nested under request, inherits permissions)

**Work Package 1.4: Basic Tests**
- Model tests: Validation, relationships, status transitions
- Serializer tests: Input schema validation, permission checks
- ViewSet tests: CRUD operations, filtering, pagination

**Deliverable**: API endpoints work with manual credit deduction, no retry logic yet

---

### Phase 2: Pipeline Executors (Priority: P1)

**Work Package 2.1: Executor Architecture**
- `BasePipelineExecutor` abstract class (defines interface)
- Factory pattern for executor selection based on provider
- Standardized output format validation

**Work Package 2.2: OpenAI Executor**
- Integration with `openai` library (GPT-4, GPT-3.5)
- Cost calculation (token usage → credits)
- Response parsing (text, JSON, function calls)

**Work Package 2.3: LangGraph Executor** (if in scope)
- HTTP client for LangGraph API
- Flow invocation with input mapping
- Result polling or webhook callback

**Work Package 2.4: n8n Executor** (if in scope)
- Webhook POST to workflow URL
- Standardized payload format
- Response parsing

**Work Package 2.5: Tests**
- Mock external APIs (responses library)
- Test success paths + error handling
- Test cost calculations

**Deliverable**: All pipeline providers work, but synchronous execution (no Celery yet)

---

### Phase 3: Async Execution & Celery (Priority: P1)

**Work Package 3.1: Celery Task**
- `process_generation_request` task with bind=True
- Task result backend configuration (Redis/PostgreSQL)
- Task timeout handling (prevent hung workers)

**Work Package 3.2: Job Lifecycle Management**
- Status transitions: pending → processing → completed/failed
- Timestamp tracking (started_at, completed_at)
- Transaction safety (atomic updates)

**Work Package 3.3: WebSocket Integration** (Priority: P3)
- Emit events on status changes (via B23)
- Channel naming: `generation.{request_id}`
- Event payload: status, retry_count, progress

**Work Package 3.4: Tests**
- Task execution tests (pytest-celery)
- Mock external dependencies
- Test async flow end-to-end

**Deliverable**: Jobs execute asynchronously, status updates via WebSocket

---

### Phase 4: Credit Management (Priority: P1)

**Work Package 4.1: Reserve/Settle Flow**
- Credit reservation on request submission (B11 API integration)
- Transaction linking (GenerationRequest.transaction_id)
- Settlement on completion (actual cost)

**Work Package 4.2: Refund Logic**
- Refund on permanent failure (full refund)
- Partial refund if actual < estimated
- Transaction cancellation handling

**Work Package 4.3: Insufficient Credits Handling**
- Check available balance before queueing
- HTTP 402 Payment Required response
- Error message includes required vs available credits

**Work Package 4.4: Tests**
- Mock B11 Transactions API
- Test reserve → settle flow
- Test reserve → refund flow
- Test insufficient credits rejection

**Deliverable**: Credit management fully integrated, no leakage on failures

---

### Phase 5: Intelligent Retry (Priority: P1)

**Work Package 5.1: Error Classification**
- `ErrorClassifier` class with provider-specific mappers
- ErrorCategory enum (TRANSIENT, PERMANENT, UNKNOWN)
- Classification tests for each provider

**Work Package 5.2: Retry Policy**
- Celery retry configuration per error category
- Exponential backoff: [30s, 300s, 900s]
- Max retries tracking in GenerationRequest.retry_count

**Work Package 5.3: Retry History**
- Store retry attempts in GenerationRequest.metadata
- Include: attempt number, error category, timestamp, cost
- Expose in API response for debugging

**Work Package 5.4: Tests**
- Mock transient errors → verify retry
- Mock permanent errors → verify no retry
- Mock unknown errors → verify conservative retry
- Test max retries reached → final failure

**Deliverable**: Intelligent retry fully operational, cost savings measurable

---

### Phase 6: Brand Integration (Priority: P2)

**Work Package 6.1: Brand Context Fetching**
- Integration with B33 `BrandProfile.get_effective_profile()`
- Graceful handling when no brand profile exists
- Cache brand tokens for request duration

**Work Package 6.2: Context Passing to Executors**
- Extend executor interface to accept brand_context
- OpenAI: Inject brand tokens in system message
- LangGraph: Pass as flow variables

**Work Package 6.3: Tests**
- Mock B33 API responses
- Test brand token injection
- Test fallback when brand unavailable

**Deliverable**: Generated content includes brand context (colors, logo, etc.)

---

### Phase 7: Polish & Production Readiness (Priority: P3)

**Work Package 7.1: Logging & Monitoring**
- Structured logging (JSON format) with request_id
- Metrics: request count, success rate, average cost, retry rate
- Error reporting (Sentry integration)

**Work Package 7.2: Admin Interface**
- Django Admin for GenerationTemplate management
- Request status dashboard (simple list view)
- Output preview in admin

**Work Package 7.3: Documentation**
- README: Feature overview, API usage examples
- Extension guide: How to add custom pipeline providers
- ADR: ADR-043 Intelligent Retry Architecture

**Work Package 7.4: Security Audit**
- Bandit scan (no high-severity issues)
- Dependency audit (pip-audit)
- Permission matrix verification

**Deliverable**: Production-ready feature with full documentation

## Testing Strategy

### Unit Tests (pytest + pytest-django)

**Models** (`tests/generative/test_models.py`):
- Template validation: input_schema must be valid JSON Schema
- Request status transitions: pending → processing → completed/failed
- Output constraints: file_id OR text_content required
- Relationship cascades: Delete template → keep requests (prevent data loss)

**Serializers** (`tests/generative/test_serializers.py`):
- Input data validation against template schema
- Pipeline config validation (required keys per provider)
- Permission checks (org admin for templates, project member for requests)
- Error response format consistency

**Executors** (`tests/generative/test_executors.py`):
- Mock OpenAI API responses (success + errors)
- Cost calculation accuracy (tokens → credits)
- Output format standardization
- Error classification for each provider

**Error Classifier** (`tests/generative/test_error_classification.py`):
- OpenAI error mapping: 429 → TRANSIENT, 400 → PERMANENT
- LangGraph error mapping
- n8n error mapping
- Unknown error → UNKNOWN category

### Integration Tests (`tests/generative/test_integration.py`)

**Full Job Lifecycle**:
1. Create template with valid schema
2. Submit request with valid input
3. Verify credit reservation
4. Mock pipeline execution (success)
5. Verify output creation
6. Verify credit settlement
7. Verify WebSocket event emitted

**Retry Flow**:
1. Submit request
2. Mock transient error (OpenAI 429)
3. Verify retry scheduled with 30s delay
4. Mock success on retry
5. Verify output created
6. Verify credit settlement (includes retry costs)

**Failure Flow**:
1. Submit request
2. Mock permanent error (OpenAI 400)
3. Verify no retry
4. Verify credit refund
5. Verify error message includes category

### API Tests (`tests/generative/test_api.py`)

**Template Endpoints**:
- `POST /api/generation/templates/` - Only org admin can create
- `GET /api/generation/templates/` - Authenticated users see active templates
- Filter by provider, is_active

**Request Endpoints**:
- `POST /api/generation/requests/` - Validates input_data against schema
- `POST /api/generation/requests/` - Returns 402 if insufficient credits
- `GET /api/generation/requests/` - User only sees own requests + project requests
- `GET /api/generation/requests/{id}/` - Returns retry history in metadata

**Output Endpoints**:
- `GET /api/generation/requests/{id}/output/` - Returns 404 if not completed
- `GET /api/generation/requests/{id}/output/` - File URL has presigned token
- `POST /api/generation/requests/{id}/retry/` - Creates new request with same input

### Performance Tests (`tests/generative/test_performance.py`)

- N+1 query prevention: List requests with template/requester data
- Pagination stress test: 10,000 requests, page size 100
- Concurrent request submission: 100 users submit simultaneously

### Coverage Target

- Overall: >85%
- Models: >95% (critical business logic)
- Executors: >90% (external dependencies mocked)
- Error classification: 100% (every error type tested)

### CI/CD Integration

```yaml
# .github/workflows/test-generative.yml
- pytest tests/generative/ --cov=src/generative --cov-report=xml
- pytest --durations=10  # Identify slow tests
- bandit -r src/generative/  # Security scan
- mypy src/generative/  # Type checking
```

## Dependencies

### Python Packages (to add to pyproject.toml)

```toml
[tool.poetry.dependencies]
openai = "^1.12.0"  # OpenAI API client
jsonschema = "^4.21.1"  # Input validation
httpx = "^0.26.0"  # Async HTTP client for LangGraph/n8n
```

### Django Core Modules (existing dependencies)

- **B07 Projects**: Project FK, membership filtering
- **B08 RBAC**: Permission checks (org admin, project member)
- **B11 Credits**: Reserve/settle transactions
- **B15 Celery**: Async task execution
- **B22 Files** (fallback): File storage if B35 unavailable
- **B23 WebSocket**: Real-time status updates
- **B33 Brand Identity**: Brand context for generation
- **B35 File Storage**: Primary file storage for outputs

### External Services

- **OpenAI API**: Requires `OPENAI_API_KEY` environment variable
- **LangGraph** (optional): Requires `LANGGRAPH_API_URL` + `LANGGRAPH_API_KEY`
- **n8n** (optional): Workflow URLs configured per template
- **Redis** (for Celery): Task queue + result backend

## Open Questions & Decisions Needed

### Resolved (from Discovery):
- ✅ **Q1: Pipeline Selection** → Hardcoded in template config (Optie A)
- ✅ **Q2: Credit Deduction** → Hybrid reserve/settle (Optie C)
- ✅ **Q3: Retry Logic** → Intelligent classification (Optie C)

### Still Open (to clarify during implementation):
- ❓ **Q4: Template Versioning** - When template is updated, what happens to pending requests?
  - Option A: Requests use cached config (immutable)
  - Option B: Requests dynamically fetch latest template (risky)
  - **Recommendation**: Option A (cache pipeline_config in GenerationRequest.metadata)

- ❓ **Q5: Output File Retention** - How long should generated files be stored?
  - Option A: Forever (user deletes manually)
  - Option B: 30-day retention (configurable per org)
  - **Recommendation**: Option A for MVP, add lifecycle policy in Phase 2

- ❓ **Q6: Cost Estimation** - Who sets estimated_cost in pipeline_config?
  - Option A: Template creator (manual, prone to drift)
  - Option B: System calculates from historical data (complex)
  - **Recommendation**: Option A for MVP (document in README: update quarterly)

- ❓ **Q7: LangGraph/n8n Priority** - Should these be in MVP or Phase 2?
  - TeamReel currently only uses OpenAI → Could defer LangGraph/n8n to reduce scope
  - **Decision**: Implement architecture for multi-provider, but only OpenAI executor in MVP

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **OpenAI API rate limits** | Jobs fail during peak usage | Medium | Intelligent retry with exponential backoff, queue throttling |
| **Credit calculation drift** | Users over/undercharged | Medium | Log actual costs, periodic audit, alert on >20% variance |
| **Large file outputs** | Storage costs spike | Low | Output size limits in template config, compression |
| **Celery worker outage** | Jobs stuck in pending | Medium | Worker health checks, alerting, auto-restart |
| **JSON Schema complexity** | Users create invalid templates | Medium | Schema validation on save, provide preset examples |
| **Retry loop (transient misclassification)** | Wasted API calls | Low | Unknown errors get conservative retry (max 1x) |

## Success Metrics (Post-Launch)

**Week 1 (Feature Adoption)**:
- 10+ templates created by downstream products
- 100+ generation requests submitted
- <5% requests fail validation (good schema design)

**Week 4 (Reliability)**:
- >95% of transient errors resolved via retry
- <2% of jobs reach max retries (well-classified errors)
- Zero credit leakage incidents (all failures refunded)

**Month 3 (Cost Efficiency)**:
- Permanent errors save 40% API calls vs blind retry (measured via logs)
- Average cost variance <10% (estimated vs actual)
- Zero overcharge complaints

**Month 6 (Extensibility)**:
- 2+ new pipeline providers added by downstream teams
- Zero breaking changes to core API
- Documentation rated >4/5 by developers

---

## Appendix

### Example Template: Match Report Instagram

```json
{
  "name": "Match Report Instagram",
  "slug": "match-report-ig",
  "version": "1.0.0",
  "description": "Generates Instagram post copy for match reports",
  "input_schema": {
    "type": "object",
    "properties": {
      "match_id": {"type": "integer"},
      "home_team": {"type": "string"},
      "away_team": {"type": "string"},
      "score": {"type": "string", "pattern": "^\\d+-\\d+$"},
      "mvp": {"type": "string"},
      "highlights": {
        "type": "array",
        "items": {"type": "string"},
        "maxItems": 3
      }
    },
    "required": ["match_id", "home_team", "away_team", "score"]
  },
  "pipeline_config": {
    "provider": "openai",
    "model": "gpt-4",
    "estimated_cost": 100.0,
    "max_tokens": 500,
    "temperature": 0.7
  }
}
```

### Example API Request

```bash
POST /api/generation/requests/
Authorization: Bearer <token>
Content-Type: application/json

{
  "template_id": 123,
  "project_id": 456,
  "input_data": {
    "match_id": 789,
    "home_team": "Ajax",
    "away_team": "PSV",
    "score": "3-1",
    "mvp": "Brobbey",
    "highlights": [
      "Brobbey hattrick in first half",
      "Defensive masterclass by Baas",
      "Record attendance at Johan Cruijff ArenA"
    ]
  }
}
```

### Example API Response

```json
{
  "id": 1001,
  "template": {
    "id": 123,
    "name": "Match Report Instagram",
    "slug": "match-report-ig"
  },
  "status": "pending",
  "input_data": { ... },
  "estimated_cost": 100.0,
  "retry_count": 0,
  "created_at": "2026-02-01T14:30:00Z",
  "websocket_channel": "generation.1001"
}
```

### Example WebSocket Event

```json
{
  "event": "generation.status_changed",
  "request_id": 1001,
  "status": "completed",
  "retry_count": 0,
  "progress": 100,
  "output_preview": {
    "type": "text",
    "excerpt": "🔥 AJAX DOMINEERT! 3-1 winst op PSV..."
  },
  "timestamp": "2026-02-01T14:30:45Z"
}
```

---

**Spec Status**: ✅ Complete - Ready for /spec-kitty.tasks breakdown
**Last Updated**: 2026-02-01
**Next Step**: Break into work packages for implementation
