# Architecture Decision Record: B34 Generative Pipelines

This document captures key architectural decisions made during the design and implementation of the B34 Generative Pipelines module.

## ADR-001: LangGraph SDK vs Cloud API

**Date**: 2026-01-15
**Status**: Accepted
**Context**: Need stateful workflow execution for complex AI generation tasks

### Problem

Complex generation workflows (e.g., multi-step analysis, iterative refinement) require state management beyond simple completion APIs. LangGraph provides two deployment options:

1. **LangGraph Cloud API**: Hosted service with managed infrastructure
2. **LangGraph SDK**: Self-hosted local execution

### Decision

Use **LangGraph SDK** for self-hosted execution.

### Rationale

**Pros**:
- **No vendor lock-in**: Open-source SDK, can migrate providers
- **Full control**: Deploy on own infrastructure, customize execution
- **GDPR compliance**: Data stays on-premises, no external API calls
- **Cost predictability**: No per-run fees, only compute costs
- **Performance**: Direct execution, no network latency to external service

**Cons**:
- **Deployment overhead**: Must manage LangGraph server infrastructure
- **Scaling responsibility**: Must handle scaling (vs cloud auto-scale)
- **Maintenance burden**: Updates, security patches on us

### Consequences

- Development team manages LangGraph server deployment (Docker/Kubernetes)
- Infrastructure team responsible for scaling based on load
- Cost savings from avoiding per-run API fees (estimated $2K/month at scale)
- Data residency requirements automatically satisfied

---

## ADR-002: True Versioning Pattern

**Date**: 2026-01-18
**Status**: Accepted
**Context**: Templates evolve over time, need version history and audit trail

### Problem

Generation templates change as prompts are refined and features added. Need to track changes while maintaining references from historical requests. Two approaches:

1. **JSONField version history**: Single row per template, versions stored in JSON array
2. **True versioning**: New database row per version, parent_template foreign key

### Decision

Use **true versioning** with separate rows per version.

### Rationale

**Pros**:
- **Immutable versions**: Each version is a separate row, cannot be accidentally modified
- **Query flexibility**: Can filter/join by version, use database indexes
- **Audit trail**: Full history preserved in database, not JSON blob
- **Relationships intact**: GenerationRequest.template FK points to specific version
- **Type safety**: Version fields are proper columns with constraints

**Cons**:
- **More database rows**: 10 versions = 10 rows (vs 1 row with JSON)
- **Cleanup complexity**: Need logic to delete old versions if retention policy

### Consequences

- GenerationTemplate model has `parent_template` FK and `version` field
- Cloning creates new row with `parent_template` set
- `is_latest` flag marks current version (simplifies queries)
- Cleanup cron job can delete old versions if needed
- Historical requests always link to correct template version

---

## ADR-003: Per-Template Retention Policy

**Date**: 2026-01-20
**Status**: Accepted
**Context**: Different content types have different storage requirements

### Problem

Generated content has varying retention needs:
- Temporary outputs (test generations): 7 days
- Blog posts: 90 days
- Marketing materials: 365 days
- Legal documents: Forever

A global retention policy doesn't fit all use cases.

### Decision

Use **per-template retention** with `retention_days` field on GenerationTemplate.

### Rationale

**Pros**:
- **Flexibility**: Each template defines its own retention (7/30/90/365/NULL days)
- **Cost optimization**: Delete temp content early, keep important content longer
- **Product-agnostic**: TeamReel can override per use case without touching core
- **Explicit forever**: NULL retention_days = keep forever (no ambiguity)

**Cons**:
- **More complex cleanup**: Cron job must check per-output expiration (vs global cutoff)
- **Configuration overhead**: Admins must set retention when creating templates

### Consequences

- GenerationTemplate.retention_days can be NULL (forever) or integer (days)
- GenerationOutput.expires_at calculated from retention_days at creation time
- Cleanup cron job: `DELETE FROM outputs WHERE expires_at < NOW() AND expires_at IS NOT NULL`
- Default retention in spec: 30 days (reasonable middle ground)
- TeamReel override example: match highlights = 365 days, temp renders = 7 days

---

## ADR-004: Hybrid Cost Estimation

**Date**: 2026-01-22
**Status**: Accepted
**Context**: Need accurate cost estimates before executing requests

### Problem

Users need to know costs before submitting requests. Three approaches:

1. **Manual seed values**: Hardcoded estimates in code/config
2. **Real-time API pricing**: Fetch current pricing before each request
3. **Hybrid**: Manual seed + monthly auto-update from actual usage

### Decision

Use **hybrid approach** with seed values updated monthly by cron.

### Rationale

**Pros**:
- **Fast**: No API call per request (uses cached estimate)
- **Accurate**: Updated monthly from actual usage patterns
- **Resilient**: Works offline with seed values if update fails
- **Self-correcting**: Drifts toward reality over time

**Cons**:
- **Monthly drift**: Estimates can be stale between updates
- **Initial inaccuracy**: Seed values may not match real usage
- **Update complexity**: Cron job requires >10 samples to update

### Consequences

- GenerationTemplate.pipeline_config['estimated_cost'] stores estimate
- Initial templates seeded with provider default costs:
  - GPT-4: $0.03 input + $0.06 output per 1K tokens
  - GPT-3.5-turbo: $0.0015 input + $0.002 output per 1K tokens
- Monthly cron job (`update_template_costs`):
  - Fetches completed requests from last 30 days
  - Calculates average actual_cost (if >= 10 samples)
  - Updates estimated_cost + stores sample size
  - Logs percentage change for monitoring
- Users see estimate in API response before committing

---

## ADR-005: 80/20 Provider Split (OpenAI vs LangGraph)

**Date**: 2026-01-25
**Status**: Accepted
**Context**: Balance simplicity vs complexity in execution architecture

### Problem

Generation workflows vary in complexity:
- **Simple**: Single completion (blog post, description, title)
- **Complex**: Multi-step workflows (analysis → summary → recommendations)

Two extremes:
1. **OpenAI only**: Simple, no LangGraph overhead
2. **LangGraph only**: Everything is a graph (overkill for simple tasks)

### Decision

Use **hybrid 80/20 split**: OpenAI for simple (80%), LangGraph for complex (20%).

### Rationale

**Pros**:
- **Performance**: OpenAI direct API faster for simple tasks (no graph compilation)
- **Developer UX**: Simple tasks don't require graph definition
- **Cost-effective**: Avoid LangGraph server overhead for 80% of requests
- **Flexibility**: Complex workflows still supported via LangGraph

**Cons**:
- **Two executors to maintain**: OpenAIExecutor + LangGraphExecutor
- **Decision boundary**: Developers must choose provider per template
- **Testing overhead**: Must test both execution paths

### Consequences

- BasePipelineExecutor ABC with two implementations:
  - OpenAIExecutor: Direct API calls, simple prompts
  - LangGraphExecutor: Graph execution, stateful workflows
- Template.pipeline_config['provider'] determines executor:
  - `"openai"` → OpenAIExecutor
  - `"langgraph"` → LangGraphExecutor + graph_name
- Executor factory pattern resolves provider at runtime
- 80% estimate based on TeamReel use cases:
  - Player descriptions: OpenAI
  - Match summaries: OpenAI
  - Video descriptions: OpenAI
  - Complex analysis: LangGraph
  - Multi-step workflows: LangGraph

---

## ADR-006: Async Processing via Celery

**Date**: 2026-01-28
**Status**: Accepted
**Context**: AI generation can take 5-60 seconds, unsuitable for synchronous HTTP

### Problem

Generation requests can take significant time:
- GPT-4 completion: 5-15 seconds
- LangGraph workflow: 30-60 seconds
- File generation: 10-45 seconds

Synchronous API would block HTTP connection, timeout, poor UX.

### Decision

Use **async processing** via Celery with status polling.

### Rationale

**Pros**:
- **Non-blocking**: Return HTTP 202 immediately, process in background
- **Retry logic**: Celery handles transient errors (rate limits, network)
- **Scalability**: Add workers to handle more concurrent requests
- **Monitoring**: Celery provides task inspection, metrics

**Cons**:
- **Polling complexity**: Frontend must poll for status updates
- **Infrastructure**: Requires Celery + Redis/RabbitMQ
- **Debugging**: Async errors harder to trace than sync

### Consequences

- API endpoint returns HTTP 202 Accepted with request_id
- Frontend polls GET /requests/{id}/ for status
- Celery task `process_generation_request` handles execution
- Retry logic: Exponential backoff up to 5 attempts
- Optional: WebSocket for real-time status updates (avoids polling)
- Status workflow: pending → processing → completed/failed/cancelled

---

## ADR-007: Credit Reserve/Settle Pattern

**Date**: 2026-02-01
**Status**: Accepted
**Context**: Need to charge users for AI generation but cost unknown until completion

### Problem

Actual cost unknown until after execution:
- Prompt length varies (input tokens)
- Response length varies (output tokens)
- Can't charge exact amount upfront

### Decision

Use **reserve/settle** pattern:
1. Reserve estimated cost on submit
2. Settle actual cost on completion
3. Refund difference if estimated > actual

### Rationale

**Pros**:
- **User protection**: Only charged actual cost, not estimate
- **Availability check**: Fail fast if insufficient credits
- **Audit trail**: Two transactions (reserve + settle) show full history
- **Cancellation support**: Can refund reserved credits if cancelled

**Cons**:
- **Two transactions**: More complex than single charge
- **Temporary hold**: Credits reserved but not spent until completion
- **Refund handling**: Need logic to return difference

### Consequences

- GenerationRequest.transaction_id stores reserve transaction
- On submit:
  - Reserve estimated_cost (creates negative transaction)
  - Store transaction_id on request
  - Return HTTP 402 if insufficient balance
- On completion:
  - Settle with actual_cost
  - If estimated > actual: Refund difference
  - If estimated < actual: Charge difference
- On cancellation:
  - Refund full reserved amount
  - Mark transaction as reversed

---

## ADR-008: Soft Delete for Templates

**Date**: 2026-02-02
**Status**: Accepted
**Context**: Templates referenced by historical requests, cannot hard delete

### Problem

Templates link to historical generation requests. Hard deleting template breaks foreign key relationships and audit trail.

### Decision

Use **soft delete** with `is_active=False` flag.

### Rationale

**Pros**:
- **Referential integrity**: Historical requests still link to template
- **Audit trail**: Can see what template was used even if "deleted"
- **Reversible**: Can reactivate if deletion was mistake
- **Query simplicity**: Filter `is_active=True` to exclude deleted

**Cons**:
- **Database bloat**: Deleted rows remain in database
- **Query overhead**: Must remember to filter is_active
- **Confusion**: "Deleted" templates still exist in DB

### Consequences

- DELETE endpoint sets `is_active=False` (not actual DELETE)
- API list endpoints filter `is_active=True` by default
- Admin can see deleted templates with filter
- Cleanup cron could hard delete old inactive templates if needed
- Consider adding `deleted_at` timestamp for audit trail

---

## Summary

These decisions balance **production safety**, **developer experience**, and **cost optimization** for the B34 Generative Pipelines module. Key themes:

1. **Self-hosting over SaaS**: LangGraph SDK, local execution
2. **Data integrity**: True versioning, soft deletes, audit trails
3. **Flexibility**: Per-template policies, hybrid execution
4. **User protection**: Reserve/settle credits, cost transparency
5. **Operational excellence**: Async processing, retry logic, monitoring

Future ADRs should maintain these principles while adapting to evolving requirements.
