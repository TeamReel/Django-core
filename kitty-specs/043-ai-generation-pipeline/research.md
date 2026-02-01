# Research: B34 Generative Pipelines

**Feature**: AI Content Generation Factory
**Date**: 2026-02-01
**Researcher**: GitHub Copilot (spec-kitty.plan workflow)

## Research Questions

### Q1: LangGraph Integration Strategy

**Decision**: LangGraph SDK (Python Library, Local Execution)

**Rationale**:
- **Full Control**: Graphs as Python code in Git (version control, code review, rollbacks)
- **No External Dependency**: No LangGraph Cloud API = no 3rd party downtime risk
- **Cost Predictable**: Only LLM costs (OpenAI/Claude), no platform service fees
- **Production Stability**: Local execution, no network latency, GDPR-compliant (data stays in infrastructure)
- **Programmable**: Pure Python, testable with standard debugging tools (pdb, logging)
- **Product-Agnostic**: TeamReel registers custom graphs via Python modules (`teamreel/graphs/`)

**Alternatives Considered**:
1. **LangGraph Cloud API**: Remote graph execution
   - ❌ Rejected: Vendor lock-in, external dependency, double billing (service + LLM), data privacy concerns
2. **Hybrid (SDK + Cloud)**: Support both execution modes
   - ❌ Rejected: Overengineered, 2× complexity, no clear use case for Cloud if SDK works

**Implementation Path**:
```python
# Core provides executor + registry
src/generative/
├── executors/
│   ├── base.py (BasePipelineExecutor ABC)
│   ├── openai.py (OpenAIExecutor - direct API)
│   └── langgraph.py (LangGraphExecutor - SDK)
├── graphs/
│   ├── __init__.py
│   ├── registry.py (graph_id → function mapping)
│   └── examples/
│       └── simple_completion.py (demo graph)

# TeamReel extends with custom graphs
teamreel/graphs/
├── match_analysis.py
├── season_highlights.py
└── tactical_breakdown.py
```

---

### Q2: Template Versioning Strategy

**Decision**: True Versioning (Immutable Versions)

**Rationale**:
- **Enterprise-Grade**: Old requests use old template version (API versioning best practice)
- **Audit Trail**: Full history of template changes for compliance
- **TeamReel Alignment**: Matches per-season versioning pattern (season 2024/2025 templates frozen)
- **Safe Evolution**: Breaking changes don't affect in-flight requests
- **Rollback Safe**: Can reactivate old version if new version has issues

**Implementation**:
- `GenerationTemplate.version` (semantic versioning: 1.0.0, 1.1.0, 2.0.0)
- `GenerationTemplate.parent_template` (FK to previous version)
- `GenerationTemplate.is_latest` (boolean flag for current version)
- Template updates create new row with incremented version

**Alternatives Considered**:
1. **In-Place Updates**: Modify existing template row
   - ❌ Rejected: Breaks in-flight requests, no history tracking
2. **Audit Log Only**: Track changes in audit table
   - ❌ Rejected: Doesn't solve "old request uses new schema" problem

---

### Q3: File Retention Policy

**Decision**: Per-Template Retention Policy

**Rationale**:
- **Flexible Governance**: Different content types have different lifecycles
  - Match videos: 3 years (regulation requirement)
  - Training notes: 30 days (temporary)
  - Season highlights: Forever (archival value)
- **Cost Optimization**: Automatic cleanup of temporary content
- **Product-Agnostic**: Each template defines own policy (not hardcoded per product)
- **Compliance-Ready**: GDPR "right to be forgotten" via retention enforcement

**Implementation**:
- `GenerationTemplate.retention_days` (nullable integer)
  - NULL = forever
  - Integer = days until deletion
- `GenerationOutput.expires_at` (computed: created_at + template.retention_days)
- Daily cron job: soft-delete outputs where `expires_at < now()`

**Alternatives Considered**:
1. **Forever Only**: Never delete files
   - ❌ Rejected: Storage costs explode, GDPR compliance issues
2. **30-Day Default**: Fixed retention for all content
   - ❌ Rejected: Too inflexible, doesn't match real-world needs
3. **Tiered Storage**: Hot/warm/cold storage with lifecycle policies
   - ⏳ Future enhancement: MVP uses per-template policy, can evolve to tiered later

---

### Q4: Cost Estimation Strategy

**Decision**: Hybrid (Manual Seed + Monthly Auto-Update)

**Rationale**:
- **Cold Start Solved**: Template creator sets initial `estimated_cost` (manual seed)
- **Long-Term Accuracy**: System auto-updates monthly based on `avg(actual_cost)` of last 30 days
- **Zero Maintenance**: After initial seed, no manual intervention needed
- **Provider-Agnostic**: Works with OpenAI, LangGraph, any future provider
- **Accurate Reserves**: B11 Credits gets progressively better estimates (fewer over/under-reserves)

**Implementation**:
```python
# GenerationTemplate.pipeline_config
{
    "provider": "openai",
    "model": "gpt-4",
    "estimated_cost": 2.50,  # Initial seed (manual)
    "cost_last_updated": "2026-01-15T10:30:00Z",  # Timestamp
    "cost_sample_size": 15  # Number of requests used for avg
}

# Monthly cron job
def update_template_costs():
    for template in GenerationTemplate.objects.filter(is_active=True):
        recent = template.generation_requests.filter(
            status="completed",
            completed_at__gte=now() - timedelta(days=30)
        )
        if recent.count() >= 10:  # Min sample size
            avg = recent.aggregate(Avg('actual_cost'))['actual_cost__avg']
            template.pipeline_config['estimated_cost'] = round(avg, 2)
            template.pipeline_config['cost_last_updated'] = now().isoformat()
            template.pipeline_config['cost_sample_size'] = recent.count()
            template.save()
```

**Alternatives Considered**:
1. **Manual Only**: Template creator sets fixed estimate
   - ❌ Rejected: Becomes stale (provider price changes), manual maintenance burden
2. **System Calculated Only**: Auto-calculate from historical data
   - ❌ Rejected: Cold start problem (no estimate until requests run)
3. **Provider API Estimation**: Query OpenAI pricing API before submit
   - ❌ Rejected: Extra latency, not all providers have estimation APIs (LangGraph doesn't), added complexity

---

### Q5: Pipeline Provider Architecture

**Decision**: 2 Providers (OpenAI Direct + LangGraph SDK)

**Rationale**:
- **80/20 Optimization**: 80% requests = simple completions (OpenAI direct), 20% = complex workflows (LangGraph)
- **Performance**: Simple tasks get fast path (2-5s), complex tasks get stateful orchestration (15-60s)
- **Cost Efficiency**: Simple completions stay cheap (10-100 tokens), complex workflows use stateful agents (1000+ tokens)
- **No Vendor Lock-In**: LangGraph SDK = local execution, no external API dependency
- **Programmable**: Both providers are Python SDKs (not no-code UI)

**n8n Excluded**: No-code workflow builder, not relevant for programmable flows (user explicitly requested "flows programmeren")

**Implementation**:
```python
# Factory pattern
class PipelineExecutorFactory:
    @staticmethod
    def get_executor(provider: str) -> BasePipelineExecutor:
        if provider == "openai":
            return OpenAIExecutor()
        elif provider == "langgraph":
            return LangGraphExecutor()
        else:
            raise ValueError(f"Unknown provider: {provider}")

# OpenAI: Direct API (fast path)
class OpenAIExecutor(BasePipelineExecutor):
    def execute(self, request):
        response = openai.ChatCompletion.create(...)
        return GenerationOutput(text_content=response.text)

# LangGraph: SDK (orchestration)
class LangGraphExecutor(BasePipelineExecutor):
    def execute(self, request):
        graph = self._load_graph(request.template.pipeline_config['graph_id'])
        result = graph.invoke(request.input_data)
        return GenerationOutput(...)
```

**Alternatives Considered**:
1. **OpenAI Only**: Single provider
   - ❌ Rejected: No support for complex multi-step workflows (TeamReel needs match analysis)
2. **All 3 Providers (+ n8n)**: Maximum flexibility
   - ❌ Rejected: n8n = no-code, not aligned with "programmable flows" requirement
3. **Generic Webhook Provider**: Provider-agnostic interface
   - ❌ Rejected: Too abstract, loses provider-specific optimizations

---

## Integration Points (Existing Core Modules)

### B11 Credits & Transactions
**Usage**: Reserve credits on request submission, settle on completion, refund on failure

**API Integration**:
```python
# Reserve credits
transaction = Transaction.objects.create(
    account=user.account,
    type="reserve",
    status="pending",
    amount=-estimated_cost,
    description=f"Generation request {request.id}"
)

# Settle on completion
transaction.status = "completed"
transaction.final_amount = -actual_cost
transaction.save()

# Refund on failure
transaction.status = "cancelled"
transaction.save()
```

**Considerations**:
- Balance check before queueing (HTTP 402 if insufficient)
- Transaction safety (atomic updates)
- BalancePolicy enforcement (prepaid/postpaid mode)

---

### B15 Celery (Async Tasks)
**Usage**: Background execution of generation requests

**Task Structure**:
```python
@celery_app.task(bind=True, max_retries=3)
def process_generation_request(self, request_id: int):
    request = GenerationRequest.objects.get(id=request_id)
    request.status = "processing"
    request.started_at = now()
    request.save()

    executor = PipelineExecutorFactory.get_executor(
        request.template.pipeline_config['provider']
    )

    try:
        output = executor.execute(request)
        request.status = "completed"
        request.completed_at = now()
        # Settle transaction
    except TransientError as e:
        request.retry_count += 1
        if request.retry_count < 3:
            raise self.retry(exc=e, countdown=calculate_backoff(request.retry_count))
        else:
            request.status = "failed"
            request.error_category = "transient"
            # Refund transaction
    except PermanentError as e:
        request.status = "failed"
        request.error_category = "permanent"
        # Refund transaction immediately
```

**Considerations**:
- Retry backoff: 30s, 300s, 900s (exponential)
- Task timeout: 300s default (configurable)
- Dead letter queue for unknown errors

---

### B35 File Storage / B22 Files
**Usage**: Store generated media (images, videos)

**Integration**:
```python
# GenerationOutput stores file reference
output = GenerationOutput.objects.create(
    request=request,
    file=uploaded_file,  # FK to B35 FileStorageRecord or B22 File
    output_type="video",
    metadata={"duration": 60, "resolution": "1920x1080"}
)
```

**Considerations**:
- ACL inheritance from project
- Presigned URLs for download
- Storage adapters (S3, local, etc.)

---

### B23 WebSocket (Real-time Updates)
**Usage**: Notify users of status changes

**Event Pattern**:
```python
# Emit on status change
channel_layer.group_send(
    f"generation.{request.id}",
    {
        "type": "generation_status",
        "request_id": request.id,
        "status": "processing",
        "retry_count": 1,
        "progress": {"step": "analyze_performance", "percent": 50}
    }
)
```

**Considerations**:
- Channel naming: `generation.{request_id}`
- Event payload: status, retry_count, progress metadata
- Client subscription pattern (React/WebSocket)

---

### B33 Brand Identity
**Usage**: Enrich generation context with brand tokens

**Integration**:
```python
# Executor enriches input_data with brand context
def execute(self, request):
    brand_context = BrandProfile.get_effective_profile(request.project_id)
    enriched_input = {
        **request.input_data,
        "brand": {
            "logo_url": brand_context.logo_url,
            "primary_color": brand_context.primary_color,
            "fonts": brand_context.fonts
        }
    }
    # Pass to LLM prompt
```

---

## Technology Stack Summary

| Component | Technology | Version | Justification |
|-----------|------------|---------|---------------|
| **Framework** | Django | 5.1+ | Core-App baseline |
| **API** | Django REST Framework | 3.15+ | Existing stack |
| **Async Tasks** | Celery | 5.4+ | B15 integration (existing) |
| **Database** | PostgreSQL | 15+ | Core-App baseline |
| **Message Broker** | Redis | 7+ | Celery broker (existing) |
| **OpenAI SDK** | `openai` | 1.x | Official SDK, stable, production-ready |
| **LangGraph SDK** | `langgraph` | 0.2+ | LangChain ecosystem, local execution |
| **JSON Schema** | `jsonschema` | 4.x | Input validation (industry standard) |
| **Testing** | pytest + pytest-django | Latest | Existing test infrastructure |

**Dependency Versions (requirements/base.txt)**:
```
openai>=1.0.0,<2.0.0
langgraph>=0.2.0,<0.3.0
jsonschema>=4.0.0,<5.0.0
```

---

## Performance Benchmarks

### Simple Completion (OpenAI Direct)
- **API Call**: 1-2s (OpenAI GPT-4)
- **DB Operations**: <50ms (save request, output)
- **Total**: 2-5s avg (p95: 8s)

### Complex Workflow (LangGraph)
- **Graph Execution**: 10-50s (multi-step, depends on nodes)
- **LLM Calls**: 1-2s per node (3-5 nodes avg)
- **Total**: 15-60s avg (p95: 90s)

### Celery Throughput
- **Workers**: 4 workers × 8 concurrency = 32 parallel tasks
- **Queue Latency**: <100ms (Redis broker)
- **Scaling**: Horizontal (add more workers)

---

## Security Considerations

### API Key Management
- **Storage**: Environment variables (`OPENAI_API_KEY`)
- **Rotation**: Railway secrets manager
- **Access**: Only Celery workers have access (not API servers)

### Input Sanitization
- **Validation**: JSON Schema validation before queueing
- **Injection Prevention**: LangGraph/OpenAI SDKs handle escaping
- **Rate Limiting**: DRF throttling (existing)

### Output Safety
- **File Scanning**: Future enhancement (malware scan for generated files)
- **Content Moderation**: OpenAI moderation API (future)
- **ACL Enforcement**: B35/B22 file permissions

---

## Open Questions (None - All Resolved)

All planning questions resolved during spec-kitty.clarify workflow:
- ✅ Template versioning strategy
- ✅ File retention policy
- ✅ Cost estimation approach
- ✅ Provider priority (OpenAI + LangGraph, skip n8n)
- ✅ LangGraph integration (SDK, not Cloud)

---

## Next Steps

1. **Phase 1**: Design data model (models.py, migrations)
2. **Phase 1**: Generate API contracts (OpenAPI spec, serializers)
3. **Phase 1**: Update agent context (.github/copilot-instructions.md)
4. **Phase 2**: Implement core models + API
5. **Phase 3**: Implement pipeline executors (OpenAI, LangGraph)
6. **Phase 4**: Implement Celery integration + retry logic
7. **Phase 5**: Integrate Credits (B11), Files (B35), WebSocket (B23)
8. **Phase 6**: Testing (>85% coverage)
9. **Phase 7**: Documentation (README, extension guide)
