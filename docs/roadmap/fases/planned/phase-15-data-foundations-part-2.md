# Phase 15: Data Foundations Part 2 (263-267)

**Focus**: Structured output validation, tool-call logging, prompt experiments, evaluations, annotations

---

## [D06: Structured Output Validation](../modules/backlog/263-D06-structured-output-validation/index.md)

**Feature**: `D06-structured-output-validation`

**Goal**: Runtime validatie van structured outputs (JSON, Pydantic, TypeScript types) voor data quality.

**Package**: `@django-core/validation` (backend + frontend)

**Core Features**:
- **Schema Registry**: Central registry voor validation schemas (JSON Schema, Pydantic, Zod)
- **Runtime Validation**: Validate data against schemas met detailed error messages
- **Type Coercion**: Auto-convert compatible types (string "123" → int 123)
- **Custom Validators**: Plugin system voor domain-specific validation rules
- **Error Formatting**: User-friendly error messages met field paths

**Validation Formats**:
- JSON Schema (backend + frontend)
- Pydantic models (Python backend)
- Zod schemas (TypeScript frontend)
- OpenAPI specs (API responses)

**Demo**: ✅ Validation Test Page (`/demo/validation`) - Schema editor, data input, validate, see errors

**Acceptance Criteria**:
- [ ] JSON Schema validation werkt voor complex nested objects
- [ ] Pydantic model validation integreert met Django views
- [ ] Zod schemas valideren frontend forms
- [ ] Custom validators via plugin registration
- [ ] Error messages tonen field path + human-readable description

---

## [D07: Tool-Call Logging Infrastructure](../modules/backlog/264-D07-tool-call-logging-infrastructure/index.md)

**Feature**: `D07-tool-call-logging`

**Goal**: Secure logging van AI agent tool calls met automatic secret redaction en audit trail.

**Package**: `@django-core/tool-call-logger` (backend)

**Core Features**:
- **Structured Logging**: JSON logs met tool name, args, result, duration, agent_id
- **Secret Redaction**: Auto-detect en redact API keys, tokens, passwords, PII
- **Audit Trail**: Integration met B09 audit events (immutable log)
- **Query Interface**: Filter logs by agent, tool, date range, success/failure
- **Retention Policies**: Auto-archive old logs (configurable per org)

**Redaction Patterns**:
- API keys (regex patterns)
- Bearer tokens (Authorization headers)
- Passwords/secrets (field name heuristics)
- PII (email, phone, SSN via regex)
- Custom patterns (tenant-specific)

**Demo**: 🔧 Tool Calls Log (`/demo/tool-calls`) - List recent tool calls, filter, view redacted logs

**Acceptance Criteria**:
- [ ] All tool calls logged met structured format
- [ ] Secret redaction werkt voor 10+ common patterns
- [ ] B09 audit integration (immutable trail)
- [ ] Query interface met filters (agent, tool, date)
- [ ] Retention policy archives logs >90 days

---

## [D08: Prompt Experiment Tracking](../modules/backlog/265-D08-prompt-experiment-tracking/index.md)

**Feature**: `D08-prompt-experiment-tracking`

**Goal**: A/B testing framework voor prompt variations met metrics tracking en comparison.

**Package**: `@django-core/prompt-experiments` (backend)

**Core Features**:
- **Experiment Definition**: Define base prompt + variants (A/B/C testing)
- **Parameter Sweeps**: Test temperature, max_tokens, top_p variations
- **Metrics Collection**: Track latency, token usage, success rate, custom metrics
- **Comparison Views**: Side-by-side results, statistical significance tests
- **Winner Selection**: Auto-promote best variant to production

**Experiment Types**:
- Prompt template variations (different phrasing)
- Parameter sweeps (temperature 0.0 → 1.0)
- Model comparisons (GPT-4 vs Claude vs Llama)
- Chain-of-thought vs direct prompting

**Demo**: 🧪 Prompt Experiments (`/demo/experiments/prompts`) - Create experiments, run variants, compare results

**Acceptance Criteria**:
- [ ] Create experiment met 3+ variants
- [ ] Run experiment op test dataset (100+ samples)
- [ ] Metrics dashboard toont per-variant results
- [ ] Statistical significance tests (p-value < 0.05)
- [ ] Winner promotion naar D13 prompt library

---

## [D09: Evaluation & Metrics Framework](../modules/backlog/266-D09-evaluation-and-metrics-framework/index.md)

**Feature**: `D09-evaluation-metrics-framework`

**Goal**: Comprehensive evaluation framework voor ML models en AI agents met custom metrics.

**Package**: `@django-core/evaluation` (backend)

**Core Features**:
- **Metric Library**: 20+ built-in metrics (accuracy, F1, BLEU, ROUGE, perplexity)
- **Custom Metrics**: Plugin system voor domain-specific evaluation functions
- **Test Datasets**: Registry voor evaluation datasets (golden sets)
- **Batch Evaluation**: Run model against full test dataset
- **Regression Detection**: Alert when metrics drop vs previous version

**Built-in Metrics**:
- Classification: accuracy, precision, recall, F1, confusion matrix
- Generation: BLEU, ROUGE, perplexity, semantic similarity
- RAG: answer relevance, context precision, context recall
- Latency: p50, p95, p99 response time
- Cost: tokens used, API costs

**Demo**: 📈 Evaluation Dashboard (`/demo/evaluations`) - Run evaluations, see metrics, compare versions

**Acceptance Criteria**:
- [ ] Run evaluation op test dataset (1000+ samples)
- [ ] 10+ built-in metrics werken out-of-box
- [ ] Custom metric registration via Python decorators
- [ ] Regression alerts via email/Slack (>5% drop)
- [ ] Compare metrics tussen model versions

---

## [D10: Annotation & Labeling Tools](../modules/backlog/267-D10-annotation-and-labeling-tools/index.md)

**Feature**: `D10-annotation-labeling-tools`

**Goal**: Web-based annotation interface voor ML training data (text, images, structured data).

**Package**: `@django-core/labeling` (backend + frontend)

**Core Features**:
- **Task Queue**: Assign labeling tasks to annotators (with load balancing)
- **Annotation UI**: Multi-format support (text classification, NER, bounding boxes)
- **Quality Control**: Multi-annotator agreement, review/approve workflow
- **Export Formats**: JSONL, CSV, COCO (images), CoNLL (NER)
- **Progress Tracking**: Per-annotator throughput, quality metrics

**Annotation Types**:
- Text classification (single/multi-label)
- Named Entity Recognition (NER)
- Sentiment analysis (5-point scale)
- Bounding boxes (images)
- Pairwise comparisons (ranking)

**Demo**: 🏷️ Labeling Interface (`/demo/labeling`) - Task queue, label items, review/approve, export

**Acceptance Criteria**:
- [ ] Task queue met load balancing (distribute evenly)
- [ ] Annotation UI voor 3+ formats (text, NER, images)
- [ ] Multi-annotator agreement (Cohen's kappa score)
- [ ] Review/approve workflow (2-stage QC)
- [ ] Export naar JSONL + COCO formats

---

**Phase 15 Complete**: 5 modules (D06-D10)
