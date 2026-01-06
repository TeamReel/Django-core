# Modules 043-066: Data Foundations, ML/AI Platform & Operations

**Vervolg op modules 031-042**

---

## Fase 11: Data Foundations - Part 1 (043-047)

### 43. D01 – Data Storage Adapters

**Doel**
Adapter-laag voor verschillende data storage (file storage, databases, data lakes) zonder vendor lock-in.

**Waarom agnostisch**
Storage patterns zijn universeel: lokaal, S3, Azure Blob, data warehouses.

**Wat moet er gebeuren**
- **Storage adapter interface**: store(), retrieve(), list(), delete()
- **Implementations**: Local filesystem, S3 (boto3), Azure Blob (optional)
- **Metadata tracking**: Size, checksums, timestamps
- **Tenant scoping**: Namespace isolation per org/project
- **Integration**: Gebruikt door B22 (files), D02 (data ingestion)

**Demo Requirements**:
- 📦 **Storage Dashboard** in demo-shell:
  - Storage usage per adapter (local: 2.3GB, S3: 15.7GB)
  - Switch storage adapter via settings
  - Test file operations across adapters
  - Tests: upload via local → verify in S3 → switch adapter → still works

**Specify Prompt**

```
/spec-kitty.specify feature=D01-data-storage-adapters

[feature summary]
Provide vendor-agnostic storage adapter layer for files, datasets, and artifacts with consistent interface.

[goals and non-goals]
Goals:
- Unified storage interface across local/cloud providers
- Easy provider switching without code changes
- Tenant namespace isolation
- Metadata tracking (size, checksums, timestamps)

Non-goals:
- Build custom storage system (use existing providers)
- Real-time sync across providers
- Advanced CDN integration

[key user stories]
- As a developer, I switch storage providers via config
- As an operator, I monitor storage usage per tenant
- As security, I ensure tenant data isolation
- As finance, I optimize costs by choosing providers

[constraints and assumptions]
- Used by B22 (file management), D02 (data ingestion)
- Must support large files (>1GB)
- Tenant isolation via path prefixes
- Integrates with B09 audit logging

[demo requirements]
Demo page: /demo/storage
- Storage providers: Local (2.3GB), S3 (15.7GB), Azure (0GB)
- Upload test file → select provider → upload → verify
- List files per provider
- Switch default provider in settings → upload → verify uses new provider
- Tests: verify tenant isolation (org1 can't see org2 files)
```

---

### 44. D02 – ETL & Data Pipeline Foundation

**Doel**
Basis ETL framework voor data transformations, met job scheduling en monitoring.

**Waarom agnostisch**
ETL patterns zijn universeel: extract, transform, load voor elk data platform.

**Wat moet er gebeuren**
- **Pipeline models**: Pipeline, PipelineRun, PipelineStep
- **ETL operations**: Extract (from source), Transform (Python/SQL), Load (to destination)
- **Scheduling**: Via B15 (Celery) for recurring pipelines
- **Error handling**: Retries, dead letter queue, notifications
- **Observability**: Step-level timing, row counts, errors

**Demo Requirements**:
- 🔄 **Pipeline Dashboard** in demo-shell:
  - List pipelines: "Daily User Stats", "Weekly Sales Report"
  - Pipeline runs: status, duration, row counts
  - Trigger manual run button
  - View step-by-step progress
  - Tests: create simple pipeline → run → see results

**Specify Prompt**

```
/spec-kitty.specify feature=D02-etl-data-pipeline-foundation

[feature summary]
Provide ETL pipeline framework for data transformations with scheduling, monitoring, and error handling.

[goals and non-goals]
Goals:
- Define and run ETL pipelines declaratively
- Step-level observability and error handling
- Scheduling via B15 Celery
- Retry logic and failure notifications

Non-goals:
- Replace enterprise ETL tools (Airflow, dbt)
- Complex DAG orchestration (keep simple)
- Real-time streaming (see D04)

[key user stories]
- As a data engineer, I define ETL pipelines in Python
- As an operator, I monitor pipeline health and retries
- As a user, I get notified when my data is ready
- As a developer, I schedule recurring data jobs

[constraints and assumptions]
- Uses B15 for scheduling
- Integrates with D01 for storage access
- Python-based transformations (SQL via adapters)
- Tenant-scoped pipelines

[demo requirements]
Demo page: /demo/pipelines
- Pipeline list: "Daily User Stats" (runs daily 2am), "Weekly Sales" (runs Monday 9am)
- Click pipeline → see runs:
  - Run #123: Success, 2min 34s, 1,245 rows processed
  - Run #124: Failed (step 2: transform), 45s, retry scheduled
- Trigger manual run button → creates new run → updates in real-time (via B23)
- Run detail page:
  - Steps: Extract (15s, 1,300 rows) → Transform (1min 10s, 1,245 rows) → Load (9s, 1,245 rows)
  - Logs per step (redacted)
  - Retry button for failed steps
- Tests: create test pipeline → run → verify results in database
```

---

### 45. D03 – Dataset Management & Lineage

**Doel**
Dataset registry met metadata, versioning en lineage tracking tussen datasets.

**Waarom agnostisch**
Dataset management is universeel: versioning, lineage, cataloging.

**Wat moet er gebeuren**
- **Dataset model**: Name, version, schema, location (D01 reference), owner
- **Lineage tracking**: Input datasets → transformation → output datasets
- **Versioning**: Semantic versioning for datasets (v1.0.0)
- **Metadata**: Row count, column types, tags, description
- **Discovery API**: Search datasets by name/tags/owner

**Demo Requirements**:
- 📊 **Dataset Catalog** in demo-shell:
  - List datasets: "Users v1.2.0", "Sales Transactions v2.0.0"
  - Dataset detail: schema, lineage graph, versions
  - Version comparison view
  - Tests: create dataset → add version → see lineage

**Specify Prompt**

```
/spec-kitty.specify feature=D03-dataset-management-lineage

[feature summary]
Provide dataset registry with versioning, metadata, and lineage tracking for data governance.

[goals and non-goals]
Goals:
- Centralized dataset catalog with discovery
- Version tracking (semantic versioning)
- Lineage graph (input → transform → output)
- Schema metadata and validation

Non-goals:
- Store actual data (use D01 for that)
- Complex data profiling (optional extension)
- Real-time schema evolution

[key user stories]
- As a data engineer, I register datasets with metadata
- As a user, I discover datasets via search
- As an auditor, I trace data lineage
- As a developer, I version datasets semantically

[constraints and assumptions]
- References D01 for storage locations
- Uses D02 pipelines for lineage capture
- Tenant-scoped datasets
- Integrates with B09 audit logging

[demo requirements]
Demo page: /demo/datasets
- Dataset list: search bar, filters (owner, tags, version)
  - "Users" - Latest: v1.2.0, 10,453 rows, Owner: Data Team
  - "Sales Transactions" - Latest: v2.0.0, 123,456 rows, Owner: Finance Team
- Click "Users" dataset → detail page:
  - Metadata: description, tags, row count, columns
  - Schema: name (string), email (string), created_at (datetime)
  - Versions: v1.2.0 (current), v1.1.0, v1.0.0
  - Lineage graph: Raw Users CSV → Clean Users Pipeline → Users Dataset → User Stats Report
- Version comparison: v1.2.0 vs v1.1.0 → schema diff (added column: phone_number)
- Tests: register dataset → add version → verify lineage appears
```

---

### 46. D04 – Streaming Data Adapters

**Doel**
Adapter voor streaming data (Kafka, Kinesis, Redis Streams) met consumer patterns.

**Waarom agnostisch**
Streaming patterns zijn universeel: events, logs, real-time data.

**Wat moet er gebeuren**
- **Stream adapter interface**: publish(topic, message), subscribe(topic, handler)
- **Implementations**: Redis Streams (default), Kafka (optional)
- **Consumer patterns**: At-least-once, at-most-once delivery
- **Error handling**: Dead letter topics, retries
- **Monitoring**: Message rates, lag, consumer health

**Demo Requirements**:
- 📡 **Streaming Dashboard** in demo-shell:
  - Active streams: "user.events" (1,234 msg/min), "system.logs" (567 msg/min)
  - Consumer groups: status, lag
  - Publish test message button
  - See message appear in real-time
  - Tests: publish message → verify consumer receives

**Specify Prompt**

```
/spec-kitty.specify feature=D04-streaming-data-adapters

[feature summary]
Provide streaming data adapter for event streams with consumer patterns and monitoring.

[goals and non-goals]
Goals:
- Unified streaming interface (Redis Streams, Kafka)
- Consumer patterns (at-least-once, at-most-once)
- Error handling and dead letter topics
- Integration with D02 pipelines

Non-goals:
- Replace enterprise streaming platforms
- Complex stream processing (use external tools)
- Guaranteed ordering across partitions

[key user stories]
- As a developer, I publish events to streams
- As an operator, I monitor consumer lag
- As a data engineer, I consume streams in pipelines
- As security, I ensure tenant isolation

[constraints and assumptions]
- Redis Streams as default (already have Redis)
- Kafka optional for high-volume scenarios
- Tenant isolation via topic prefixes
- Integrates with B18 observability

[demo requirements]
Demo page: /demo/streams
- Stream list: "user.events" (1,234 msg/min), "system.logs" (567 msg/min)
- Click stream → detail:
  - Message rate graph (last hour)
  - Consumer groups: "pipeline-consumer" (lag: 45 messages)
  - Recent messages (last 10, redacted)
- Publish test message:
  - Form: topic, message (JSON)
  - Publish button → message ID returned
  - See message appear in "Recent messages" list instantly
- Tests: publish message → verify consumer receives → verify processed
```

---

### 47. D05 – Data Version Control

**Doel**
Version control voor datasets en data artifacts (like Git, but for data).

**Waarom agnostisch**
Data versioning is universeel: reproducibility, rollback, comparison.

**Wat moet er gebeuren**
- **Version tracking**: Snapshots of datasets with commit messages
- **Diff support**: Compare versions (row changes, schema changes)
- **Branching**: Experimental versions vs production
- **Rollback**: Restore previous versions
- **Storage**: Uses D01 for artifact storage

**Demo Requirements**:
- 🔀 **Data Versions Page** in demo-shell:
  - Dataset version timeline (like Git commits)
  - Diff viewer: compare v1 vs v2
  - Rollback button
  - Branch management
  - Tests: create version → make changes → diff → rollback

**Specify Prompt**

```
/spec-kitty.specify feature=D05-data-version-control

[feature summary]
Provide version control for datasets with diff, branching, and rollback capabilities.

[goals and non-goals]
Goals:
- Snapshot datasets with commit messages
- Diff support (row-level and schema-level)
- Branching for experimental changes
- Rollback to previous versions

Non-goals:
- Merge conflicts resolution (keep simple)
- Distributed version control (centralized only)
- Real-time collaboration on data

[key user stories]
- As a data engineer, I version datasets for reproducibility
- As an analyst, I compare dataset versions
- As a user, I rollback bad data changes
- As an auditor, I see full data change history

[constraints and assumptions]
- Uses D03 for dataset metadata
- Uses D01 for snapshot storage
- Tenant-scoped versioning
- Integrates with B09 audit logging

[demo requirements]
Demo page: /demo/datasets/{id}/versions
- Version timeline (like Git log):
  - v1.3.0 - 2025-12-15 14:30 - "Added phone_number column" (current)
  - v1.2.0 - 2025-12-10 09:15 - "Fixed duplicate emails"
  - v1.1.0 - 2025-12-05 16:20 - "Initial migration"
- Click version → detail:
  - Commit message, author, timestamp
  - Schema snapshot
  - Row count
  - Diff from previous version button
- Diff view (v1.3.0 vs v1.2.0):
  - Schema changes: +column phone_number (string)
  - Row changes: 15 rows modified, 3 rows added
  - Sample diff: show changed rows side-by-side
- Rollback button: "Rollback to v1.2.0" → confirmation → creates new version v1.4.0 (reverts v1.3.0)
- Tests: create version → modify data → create new version → diff → rollback
```

---

## Fase 12: Data Foundations - Part 2 (048-052)

### 48. D06 – Structured Output Validation

**Doel**
Validatie van structured outputs (JSON, Pydantic models) voor data quality en ML outputs.

**Waarom agnostisch**
Data validation is universeel: API responses, ML outputs, data imports.

**Wat moet er gebeuren**
- **Schema definitions**: JSON Schema, Pydantic models
- **Validation engine**: Validate data against schemas
- **Error reporting**: Clear validation errors with field-level details
- **Integration**: Used by D02 (ETL), ML model outputs, API responses
- **Caching**: Schema validation caching for performance

**Demo Requirements**:
- ✅ **Validation Test Page** in demo-shell:
  - Schema editor (JSON Schema or Pydantic)
  - Data input (JSON)
  - Validate button → shows errors or success
  - Tests: invalid data → see errors, valid data → success

**Specify Prompt**

```
/spec-kitty.specify feature=D06-structured-output-validation

[feature summary]
Provide structured output validation with JSON Schema and Pydantic for data quality and ML outputs.

[goals and non-goals]
Goals:
- Validate JSON/Pydantic models against schemas
- Clear, actionable error messages
- Integration with ETL pipelines and ML outputs
- Performance optimization via caching

Non-goals:
- Complex business logic validation (use custom code)
- Real-time schema evolution
- Auto-generate schemas from data

[key user stories]
- As a developer, I validate API responses against schemas
- As a data engineer, I validate ETL outputs
- As an ML engineer, I validate model outputs
- As a user, I get clear error messages for invalid data

[constraints and assumptions]
- Supports JSON Schema and Pydantic
- Used by D02, D07, ML modules
- Fast validation (<10ms per validation)
- Tenant-agnostic (pure validation logic)

[demo requirements]
Demo page: /demo/validation
- Schema editor: textarea with JSON Schema example
- Data editor: textarea with JSON data
- Validate button → results:
  - Success: green checkmark, "Valid data"
  - Errors: red X, field-level errors:
    - "email: not a valid email address"
    - "age: must be >= 18"
- Example schemas: User, Transaction, ML Output
- Tests: validate invalid email → see error, fix → see success
```

---

### 49. D07 – Tool-Call Logging Infrastructure

**Doel**
Logging infrastructure voor AI agent tool calls met redaction en audit trail.

**Waarom agnostisch**
Tool-call logging is universeel voor any system using external APIs or tools.

**Wat moet er gebeuren**
- **ToolCall model**: Tool name, inputs (redacted), outputs (redacted), status, duration
- **Redaction**: Auto-redact sensitive params (API keys, passwords, PII)
- **Audit trail**: All tool calls logged (B09 integration)
- **Query API**: Search tool calls by agent, tool, status, time
- **Monitoring**: Success rate, latency, error patterns

**Demo Requirements**:
- 🔧 **Tool Calls Log** in demo-shell:
  - List recent tool calls with status, duration
  - Click tool call → detail with inputs/outputs (redacted)
  - Filter by tool, status, agent
  - Tests: trigger tool call → see in log with redacted secrets

**Specify Prompt**

```
/spec-kitty.specify feature=D07-tool-call-logging-infrastructure

[feature summary]
Provide tool-call logging infrastructure with automatic redaction for AI agents and external API calls.

[goals and non-goals]
Goals:
- Log all tool calls with inputs/outputs
- Auto-redact sensitive data (API keys, PII)
- Audit trail integration (B09)
- Query and monitoring APIs

Non-goals:
- Replace full observability platforms
- Real-time debugging tools
- Complex trace correlation (keep simple)

[key user stories]
- As security, I audit all tool calls and ensure secrets are redacted
- As a developer, I debug failed tool calls
- As an operator, I monitor tool call success rates
- As an auditor, I trace which agent called which tools

[constraints and assumptions]
- Integrates with B09 audit logging
- Redaction via regex patterns + ML-based detection
- Used by D14 (agent operations) and any tool-using system
- Tenant-scoped logs

[demo requirements]
Demo page: /demo/tool-calls
- Tool call list:
  - Call #123: send_email, Success, 1.2s, Agent: "Sales Assistant"
  - Call #124: query_database, Failed, 0.5s, Agent: "Data Analyst"
  - Call #125: api_request, Success, 3.1s, Agent: "Integration Bot"
- Click Call #123 → detail:
  - Tool: send_email
  - Agent: Sales Assistant
  - Status: Success
  - Duration: 1.2s
  - Inputs: {to: "john@example.com", subject: "Welcome", api_key: "***REDACTED***"}
  - Outputs: {message_id: "abc123", status: "sent"}
  - Timestamp: 2025-12-15 14:35:22
- Filter: tool=send_email, status=failed → see only failed email sends
- Tests: trigger API call with secret → verify secret is redacted in logs
```

---

### 50. D08 – Prompt Experiment Tracking

**Doel**
Track prompt variations, parameters, and results for iterative improvement.

**Waarom agnostisch**
Prompt experimentation is universal for any LLM-based application.

**Wat moet er gebeuren**
- **Experiment models**: Experiment, Run, Variant
- **Version tracking**: Prompt versions with parameters (temperature, max_tokens, etc.)
- **Results logging**: Outputs, latency, token usage, quality scores
- **Comparison**: Compare variants side-by-side
- **Best variant selection**: Mark best performing variant

**Demo Requirements**:
- 🧪 **Prompt Experiments Page** in demo-shell:
  - List experiments with variants
  - Create experiment: define prompt + parameters
  - Run variants → see results
  - Compare variants side-by-side
  - Tests: create experiment → run 3 variants → compare → select best

**Specify Prompt**

```
/spec-kitty.specify feature=D08-prompt-experiment-tracking

[feature summary]
Provide prompt experiment tracking for iterative LLM prompt optimization with variant comparison.

[goals and non-goals]
Goals:
- Track prompt variants with parameters
- Log outputs, latency, token usage
- Compare variants side-by-side
- Select and promote best variants

Non-goals:
- Auto-optimize prompts (manual experimentation)
- Complex A/B testing infrastructure
- Real-time production experiments

[key user stories]
- As an ML engineer, I experiment with prompt variations
- As a product owner, I compare prompt quality
- As a developer, I track which prompt version is in production
- As an operator, I monitor prompt performance

[constraints and assumptions]
- Used by D13 (prompt templates) and D14 (agent operations)
- Integrates with token usage tracking
- Tenant-scoped experiments
- Manual quality scoring (1-5 stars)

[demo requirements]
Demo page: /demo/experiments/prompts
- Experiment list: "Email Subject Generator", "Code Review Assistant"
- Click "Email Subject Generator" → detail:
  - Variants:
    - v1: "You are a helpful assistant. Generate an email subject..." (current)
    - v2: "Generate a catchy email subject for..." (testing)
    - v3: "Create a professional email subject..." (archived)
  - Create new variant button
- Run experiment:
  - Input test cases (5 examples)
  - Run all variants button → processes in background
  - Results table:
    - Variant | Avg Latency | Avg Tokens | Quality Score | Examples
    - v1 | 1.2s | 45 | 4.2/5 | "Exclusive Offer Inside!", ...
    - v2 | 0.9s | 32 | 4.5/5 | "Don't Miss Out: Special Deal", ...
    - v3 | 1.5s | 58 | 3.8/5 | "Important Update Regarding...", ...
- Compare view: side-by-side outputs for same input
- Select best: mark v2 as "production" → updates D13 template
- Tests: create experiment → run variants → verify results → promote variant
```

---

### 51. D09 – Evaluation & Metrics Framework

**Doel**
Framework voor ML model en agent evaluation met custom metrics.

**Waarom agnostisch**
Evaluation is universal: ML models, data quality, agent performance.

**Wat moet er gebeuren**
- **Evaluation models**: EvaluationSuite, EvaluationRun, Metric
- **Metric types**: Accuracy, precision, recall, F1, custom metrics
- **Test datasets**: Reference datasets for evaluation
- **Comparison**: Compare model/agent versions
- **Thresholds**: Define quality gates (e.g., accuracy >= 0.85)

**Demo Requirements**:
- 📈 **Evaluation Dashboard** in demo-shell:
  - Evaluation suites list
  - Run evaluation on model/agent
  - See metrics: accuracy, latency, cost
  - Compare versions
  - Tests: run evaluation → see results → verify quality gate

**Specify Prompt**

```
/spec-kitty.specify feature=D09-evaluation-metrics-framework

[feature summary]
Provide evaluation framework for ML models and agents with custom metrics and quality gates.

[goals and non-goals]
Goals:
- Define evaluation suites with test cases
- Run evaluations on models/agents/prompts
- Track metrics (accuracy, latency, cost, custom)
- Compare versions and enforce quality gates

Non-goals:
- Auto-generate test cases (manual curation)
- Complex statistical analysis
- Real-time production monitoring (see D16)

[key user stories]
- As an ML engineer, I evaluate model quality before deployment
- As a product owner, I define quality thresholds
- As a developer, I run evaluations in CI pipeline
- As an operator, I compare model versions

[constraints and assumptions]
- Used by D12 (model registry), D13 (prompt templates), D14 (agent operations)
- Integrates with D08 (prompt experiments)
- Quality gates block promotions if failed
- Tenant-scoped evaluations

[demo requirements]
Demo page: /demo/evaluations
- Evaluation suite list: "Sentiment Analysis Test", "Code Generation Benchmark"
- Click "Sentiment Analysis Test" → detail:
  - Test cases: 100 labeled examples
  - Metrics: Accuracy, F1 Score, Latency, Cost per prediction
  - Quality gates: Accuracy >= 0.85, Latency <= 500ms
- Run evaluation:
  - Select model version: "sentiment-v1.2.0"
  - Run button → processes 100 examples
  - Results:
    - Accuracy: 0.87 ✅ (threshold: 0.85)
    - F1 Score: 0.85
    - Avg Latency: 320ms ✅ (threshold: 500ms)
    - Cost: $0.15 (100 predictions)
  - Quality Gate: PASSED ✅
- Compare versions: v1.2.0 vs v1.1.0
  - Side-by-side metrics
  - Improvement: +2% accuracy, -50ms latency
- Tests: run evaluation → fail quality gate → verify blocked promotion
```

---

### 52. D10 – Annotation & Labeling Tools

**Doel**
Tools voor data annotation en labeling voor ML training datasets.

**Waarom agnostisch**
Data labeling is universal for any supervised ML project.

**Wat moet er gebeuren**
- **Annotation models**: AnnotationTask, Label, Annotation
- **UI components**: Labeling interface (text, image, bounding boxes)
- **Workflow**: Assign tasks → annotate → review → approve
- **Quality checks**: Inter-annotator agreement, validation
- **Export**: Export labeled data for training

**Demo Requirements**:
- 🏷️ **Labeling Interface** in demo-shell:
  - Task queue: items to label
  - Labeling UI: select label, add notes
  - Review mode: approve/reject annotations
  - Export labeled dataset
  - Tests: label item → review → approve → export

**Specify Prompt**

```
/spec-kitty.specify feature=D10-annotation-labeling-tools

[feature summary]
Provide annotation and labeling tools for creating ML training datasets with quality checks.

[goals and non-goals]
Goals:
- Assign annotation tasks to team members
- Labeling UI for text, images, bounding boxes
- Review and approval workflow
- Quality metrics (inter-annotator agreement)
- Export labeled datasets

Non-goals:
- Complex video annotation (phase 2)
- Auto-labeling (separate ML module)
- Real-time collaborative labeling

[key user stories]
- As a data labeler, I annotate items from my queue
- As a reviewer, I approve or reject annotations
- As an ML engineer, I export labeled data for training
- As a manager, I monitor labeling progress and quality

[constraints and assumptions]
- Used by D03 (dataset management) for labeled datasets
- Tenant-scoped annotation projects
- Integrates with B08 for access control
- Simple label types: classification, tags, bounding boxes

[demo requirements]
Demo page: /demo/labeling
- Project: "Customer Feedback Sentiment"
- Task queue (25 pending):
  - "Great product, love it!" - Unlabeled
  - "Terrible service, very disappointed." - Unlabeled
  - "It's okay, nothing special." - Unlabeled
- Click task → labeling interface:
  - Text: "Great product, love it!"
  - Labels: [Positive] [Neutral] [Negative]
  - Notes: textarea for comments
  - Submit button
- After submit: next task auto-loads
- Review mode:
  - Show labeled items
  - Annotator: User A, Label: Positive, Confidence: High
  - Approve/Reject buttons
  - If reject: reason + reassign
- Export:
  - Format: CSV, JSON, JSONL
  - Filter: approved only, by label
  - Download button → labeled-data.jsonl
- Tests: label 3 items → review → approve → export → verify file
```

---

## Fase 13: ML/AI Platform (053-058)

### 53. D11 – Feature Engineering Patterns

**Doel**
Herbruikbare feature engineering patterns en transformations voor ML pipelines.

**Waarom agnostisch**
Feature engineering is universal: transformations, aggregations, encodings.

**Wat moet er gebeuren**
- **Feature definitions**: Reusable feature transformations
- **Transformation library**: Common patterns (normalization, one-hot encoding, aggregations)
- **Feature store**: Cache computed features
- **Versioning**: Track feature definitions and versions
- **Monitoring**: Feature drift detection

**Demo Requirements**:
- 🔧 **Feature Engineering Page** in demo-shell:
  - Feature library: list reusable features
  - Create feature: define transformation
  - Apply to dataset → see results
  - Feature drift monitor
  - Tests: create feature → apply → verify output

**Specify Prompt**

```
/spec-kitty.specify feature=D11-feature-engineering-patterns

[feature summary]
Provide reusable feature engineering patterns with versioning and drift detection for ML pipelines.

[goals and non-goals]
Goals:
- Define reusable feature transformations
- Feature store for caching
- Versioning and tracking
- Drift detection and monitoring

Non-goals:
- Replace enterprise feature stores (Feast, Tecton)
- Real-time feature serving (<1ms)
- Complex graph-based features

[key user stories]
- As a data scientist, I define reusable features
- As an ML engineer, I version features with models
- As an operator, I monitor feature drift
- As a developer, I fetch features for inference

[constraints and assumptions]
- Integrates with D02 (ETL) for feature computation
- Uses D01 (storage) for feature caching
- Simple transformations (complex logic via custom code)
- Tenant-scoped features

[demo requirements]
Demo page: /demo/features
- Feature library:
  - "user_age_normalized" - Normalize age (0-1 scale)
  - "email_domain" - Extract domain from email
  - "purchase_frequency_30d" - Count purchases in last 30 days
- Create feature:
  - Name: "user_tenure_days"
  - Source: users table, created_at column
  - Transformation: days_since(created_at)
  - Save button
- Apply feature to dataset:
  - Select dataset: "Users v1.2.0"
  - Select features: check 3 features
  - Apply button → runs D02 pipeline → shows preview
- Feature drift monitor:
  - Chart: feature distribution over time
  - Alert: "user_age_normalized drift detected: mean shifted from 0.45 to 0.62"
- Tests: create feature → apply to test dataset → verify output values
```

---

### 54. D12 – Model Registry

**Doel**
Registry voor ML models met versioning, stage transitions (dev/staging/prod), metadata.

**Waarom agnostisch**
Model management is universal for any ML project.

**Wat moet er gebeuren**
- **Model model**: Name, version, stage (dev/staging/prod), artifact location (D01)
- **Stage transitions**: Promote model through stages with approval
- **Metadata**: Framework, metrics, training params, evaluation results
- **Rollback**: Revert to previous version
- **API**: Get current production model, list all versions

**Demo Requirements**:
- 🤖 **Model Registry Page** in demo-shell:
  - List models: "sentiment-classifier", "recommendation-engine"
  - Model versions with stages
  - Promote button (dev → staging → prod)
  - Rollback button
  - Tests: register model → promote → rollback

**Specify Prompt**

```
/spec-kitty.specify feature=D12-model-registry

[feature summary]
Provide ML model registry with versioning, stage management, and promotion workflows.

[goals and non-goals]
Goals:
- Register models with versions and metadata
- Stage transitions with approvals (dev/staging/prod)
- Rollback to previous versions
- Integration with D09 evaluations for quality gates

Non-goals:
- Model serving infrastructure (separate service)
- Auto-retraining (separate module)
- Complex deployment strategies (blue-green, canary)

[key user stories]
- As an ML engineer, I register models with metadata
- As a tech lead, I approve production promotions
- As a developer, I fetch the current production model
- As an operator, I rollback bad deployments

[constraints and assumptions]
- Uses D01 for model artifact storage
- Integrates with D09 for evaluation checks
- Quality gates must pass before promotion
- Tenant-scoped models

[demo requirements]
Demo page: /demo/models
- Model list:
  - "sentiment-classifier" - v1.2.0 (prod), v1.3.0 (staging)
  - "recommendation-engine" - v2.0.0 (prod)
- Click "sentiment-classifier" → detail:
  - Versions:
    - v1.3.0 - Staging - Created 2025-12-14 - Accuracy: 0.89
    - v1.2.0 - Production - Created 2025-12-01 - Accuracy: 0.87
    - v1.1.0 - Archived - Created 2025-11-15 - Accuracy: 0.85
  - Metadata:
    - Framework: scikit-learn 1.3.0
    - Training data: sentiment-dataset v2.0.0
    - Evaluation: sentiment-eval-suite (passed ✅)
  - Actions:
    - Promote v1.3.0 to Production button (requires approval)
    - Rollback to v1.1.0 button
- Promote workflow:
  - Click Promote → modal:
    - Evaluation results: Accuracy 0.89 ✅, Latency 280ms ✅
    - Approval: Requires ML lead approval
    - Request Approval button
  - ML lead approves → v1.3.0 promoted to prod
- Rollback:
  - Click Rollback to v1.1.0 → confirmation → creates new prod version
- Tests: register v1.4.0 → run evaluation → promote to staging → promote to prod
```

---

### 55. D13 – Prompt Template Library

**Doel**
Library van herbruikbare prompt templates met versioning en variable substitution.

**Waarom agnostisch**
Prompt management is universal for any LLM-based application.

**Wat moet er gebeuren**
- **PromptTemplate model**: Name, template text, variables, version
- **Variable substitution**: Jinja2-style templating
- **Versioning**: Track template changes with commit messages
- **Testing**: Test prompts with example inputs (uses D08)
- **Usage tracking**: Which agents use which templates

**Demo Requirements**:
- 📝 **Prompt Library Page** in demo-shell:
  - List templates: "email-subject-generator", "code-reviewer"
  - Create/edit template with variables
  - Test template with inputs
  - Version history
  - Tests: create template → test → save version

**Specify Prompt**

```
/spec-kitty.specify feature=D13-prompt-template-library

[feature summary]
Provide prompt template library with versioning, testing, and variable substitution for LLM applications.

[goals and non-goals]
Goals:
- Centralized prompt template management
- Version control for prompts
- Test templates before deployment
- Variable substitution (Jinja2-style)

Non-goals:
- Auto-optimize prompts (see D08 for experimentation)
- Complex conditional logic (keep templates simple)
- Real-time A/B testing

[key user stories]
- As a developer, I create reusable prompt templates
- As a product owner, I review and approve prompt changes
- As an ML engineer, I version prompts with models
- As a tester, I test prompts before deployment

[constraints and assumptions]
- Jinja2 templating for variables
- Integrates with D08 (experiments), D14 (agent operations)
- Tenant-scoped templates (optional per-tenant overrides)
- Integrates with B09 audit logging

[demo requirements]
Demo page: /demo/prompts
- Template list:
  - "email-subject-generator" - v1.2.0 (prod) - Used by: Sales Agent
  - "code-reviewer" - v1.0.0 (prod) - Used by: Code Assistant
- Click "email-subject-generator" → detail:
  - Template editor:
    ```
    You are a helpful assistant. Generate a catchy email subject for:

    Product: {{ product_name }}
    Audience: {{ target_audience }}
    Tone: {{ tone }}

    The subject should be under 50 characters.
    ```
  - Variables: product_name, target_audience, tone
  - Test section:
    - Inputs: product_name="Premium Plan", target_audience="Small Business", tone="Professional"
    - Test button → calls LLM → shows output: "Unlock Premium: Built for Small Business"
  - Version history:
    - v1.2.0 - 2025-12-10 - "Added tone parameter"
    - v1.1.0 - 2025-12-01 - "Refined instructions"
    - v1.0.0 - 2025-11-20 - "Initial version"
- Create new template button → editor with syntax highlighting
- Save new version: commit message required
- Tests: edit template → test → save → verify new version created
```

---

### 56. D14 – Agent Operations & Orchestration

**Doel**
Control plane voor AI agents: runs, tool calls, policies, rate limiting.

**Waarom agnostisch**
Agent orchestration is universal for any multi-agent or LLM system.

**Wat moet er gebeuren**
- **Agent models**: Agent, AgentRun, AgentSession
- **Tool registry**: Available tools per agent (with permissions)
- **Policy engine**: What agents can/can't do (per tenant/role)
- **Rate limiting**: Token budgets, call limits per time window
- **Monitoring**: Success rate, token usage, tool call stats

**Demo Requirements**:
- 🤖 **Agent Console** in demo-shell:
  - List agents: "Sales Assistant", "Code Helper", "Data Analyst"
  - Agent detail: tools, policies, recent runs
  - Run agent: input → see agent work → see tool calls → see result
  - Monitor: token usage, success rate
  - Tests: run agent → see tool calls in D07 → verify result

**Specify Prompt**

```
/spec-kitty.specify feature=D14-agent-operations-orchestration

[feature summary]
Provide agent operations control plane with tool registry, policies, and monitoring for multi-agent systems.

[goals and non-goals]
Goals:
- Register agents with tools and capabilities
- Policy engine for agent permissions
- Run tracking with tool call logs (D07)
- Rate limiting and token budgets
- Monitoring and alerts

Non-goals:
- Build proprietary agent framework (vendor-agnostic)
- Real-time collaborative agents
- Complex multi-agent negotiations

[key user stories]
- As security, I control which tools agents can access
- As a developer, I run agents with inputs and get outputs
- As an operator, I monitor agent token usage and costs
- As a product owner, I see which agents are most useful

[constraints and assumptions]
- Integrates with D07 (tool call logging)
- Uses D13 (prompt templates) for agent prompts
- Tenant-scoped agents with per-tenant policies
- Supports any LLM provider (OpenAI, Anthropic, etc.)

[demo requirements]
Demo page: /demo/agents
- Agent list:
  - "Sales Assistant" - Status: Active - Runs today: 45 - Success: 97%
  - "Code Helper" - Status: Active - Runs today: 12 - Success: 100%
  - "Data Analyst" - Status: Active - Runs today: 8 - Success: 87%
- Click "Sales Assistant" → detail:
  - Description: "Helps sales team with customer inquiries and lead qualification"
  - Tools: send_email, query_crm, schedule_meeting
  - Policies:
    - Max tokens per run: 2,000
    - Max runs per hour: 100
    - Allowed tools: send_email, query_crm (schedule_meeting disabled for this tenant)
  - Prompt template: "email-assistant-v1.2.0"
  - Recent runs: list with status, duration, token usage
- Run agent:
  - Input: "Find all leads from last week and send them a follow-up email"
  - Run button → agent starts → real-time updates:
    - "Thinking..." (using LLM)
    - "Calling tool: query_crm (leads, date_range=last_week)"
    - "Found 15 leads"
    - "Calling tool: send_email (to=lead1@example.com, subject=...)"
    - "Sent 15 emails"
    - "Done ✅"
  - Result: "Successfully sent follow-up emails to 15 leads"
  - Token usage: 1,234 tokens
  - Duration: 12.3s
  - Tool calls: 16 (1x query_crm, 15x send_email)
- Monitor dashboard:
  - Token usage chart (last 7 days)
  - Success rate by agent
  - Most used tools
  - Cost estimate: $45.67 this month
- Tests: run agent → verify tool calls in D07 log → verify result
```

---

### 57. D15 – Vector Search & Retrieval Adapter

**Doel**
Adapter voor vector embeddings en similarity search (RAG, semantic search).

**Waarom agnostisch**
Vector search is universal for RAG, recommendations, semantic search.

**Wat moet er gebeuren**
- **Vector adapter interface**: embed(text), index(vector, metadata), search(query, top_k)
- **Implementations**: PostgreSQL pgvector (default), Pinecone/Weaviate (optional)
- **Tenant namespaces**: Isolate vectors per org/project
- **Metadata filtering**: Filter search by tags, tenant, date
- **Monitoring**: Search latency, index size, query volume

**Demo Requirements**:
- 🔍 **Semantic Search Demo** in demo-shell:
  - Index documents (via B22 files)
  - Search by semantic meaning (not keywords)
  - See similarity scores
  - RAG demo: query → retrieve docs → generate answer
  - Tests: index docs → semantic search → verify relevant results

**Specify Prompt**

```
/spec-kitty.specify feature=D15-vector-search-retrieval-adapter

[feature summary]
Provide vector search adapter for embeddings and similarity search with tenant isolation.

[goals and non-goals]
Goals:
- Vendor-agnostic vector search interface
- Tenant namespace isolation
- Integration with D03 (datasets), B22 (files)
- Metadata filtering for search
- RAG support (retrieval for LLM context)

Non-goals:
- Bundle specific vector database (adapter pattern)
- Complex re-ranking algorithms (phase 2)
- Real-time vector updates (<1ms)

[key user stories]
- As a developer, I switch vector backends without code changes
- As a user, I search semantically (by meaning, not keywords)
- As an ML engineer, I build RAG applications
- As security, I ensure tenant vector isolation

[constraints and assumptions]
- PostgreSQL pgvector as default (simple setup)
- Optional adapters: Pinecone, Weaviate, Qdrant
- Embeddings via OpenAI, Cohere, or custom models
- Tenant-scoped search (no cross-tenant leakage)

[demo requirements]
Demo page: /demo/vector-search
- Index documents:
  - Upload files or paste text
  - Index button → embeds + stores vectors
  - Progress: "Indexed 5 documents, 1,234 chunks"
- Search interface:
  - Query input: "How do I reset my password?"
  - Search button → finds semantically similar docs
  - Results (top 5):
    - Score: 0.87 - "Password Reset Guide" (doc #12, chunk #3)
    - Score: 0.82 - "Account Security FAQ" (doc #8, chunk #1)
    - Score: 0.78 - "Troubleshooting Login Issues" (doc #15, chunk #5)
  - Click result → shows full context
- RAG demo:
  - Query: "What are the payment options?"
  - RAG button → retrieves docs + generates answer via LLM:
    - Retrieved docs: "Pricing Page", "Payment FAQ"
    - Generated answer: "We accept credit cards, PayPal, and bank transfers. Enterprise customers can also use invoicing."
    - Sources: links to retrieved docs
- Metadata filters:
  - Filter by: org, project, document type, date
  - Example: search within "sales-docs" project only
- Tests:
  - Index 10 docs about different topics
  - Search "refund policy" → verify correct docs returned
  - Verify tenant isolation: org1 can't search org2 docs
```

---

### 58. D16 – Model Monitoring & Feedback Loop

**Doel**
Production monitoring voor ML models: quality drift, feedback collection, retraining triggers.

**Waarom agnostisch**
Model monitoring is universal for any production ML system.

**Wat moet er gebeuren**
- **Monitoring models**: PredictionLog, FeedbackEvent, DriftAlert
- **Drift detection**: Distribution shift, data drift, concept drift
- **Feedback collection**: User feedback (thumbs up/down), ground truth labels
- **Retraining triggers**: Auto-trigger retraining when drift detected
- **Dashboards**: Quality metrics over time, feedback trends

**Demo Requirements**:
- 📊 **Model Monitor Dashboard** in demo-shell:
  - Model health: quality score, drift status
  - Feedback: thumbs up/down ratio
  - Drift alerts
  - Retraining recommendations
  - Tests: simulate drift → see alert → trigger retraining

**Specify Prompt**

```
/spec-kitty.specify feature=D16-model-monitoring-feedback-loop

[feature summary]
Provide production model monitoring with drift detection, feedback collection, and retraining triggers.

[goals and non-goals]
Goals:
- Monitor model quality in production
- Detect data and concept drift
- Collect user feedback
- Trigger retraining when needed
- Integration with D12 (model registry)

Non-goals:
- Auto-retrain without human approval
- Complex statistical drift tests (keep simple)
- Real-time monitoring (<1s latency)

[key user stories]
- As an ML engineer, I monitor model health in production
- As a user, I provide feedback on predictions
- As an operator, I get alerted when model drifts
- As a product owner, I see model performance trends

[constraints and assumptions]
- Integrates with D12 (model registry) for version tracking
- Uses D09 (evaluations) for quality checks
- Feedback collected via API or UI
- Drift detection runs daily (batch)

[demo requirements]
Demo page: /demo/monitoring/models
- Model: "sentiment-classifier v1.2.0"
- Health dashboard:
  - Quality score: 0.87 (target: >=0.85) ✅
  - Predictions today: 1,234
  - Avg latency: 280ms
  - Feedback: 👍 92% (45/49 users)
- Drift monitor:
  - Data drift: ⚠️ Warning - Input distribution shifted (95% confidence)
  - Concept drift: ✅ OK
  - Alert: "Input data changed significantly on 2025-12-14"
  - Graph: feature distributions over time (shows shift)
- Feedback collection:
  - Recent predictions with feedback:
    - "Great product!" → Predicted: Positive ✅ → User: 👍
    - "Terrible service" → Predicted: Negative ✅ → User: 👍
    - "It's okay" → Predicted: Negative ❌ → User: 👎 (should be Neutral)
  - Misclassification rate: 4% (2/49)
- Retraining recommendation:
  - "Drift detected. Recommend retraining with recent data."
  - Last training: 2 weeks ago (2025-12-01)
  - New data available: 1,500 labeled samples
  - Trigger Retraining button → creates D02 pipeline run
- Tests:
  - Simulate 100 predictions with shifted input distribution
  - Run drift detection → verify alert appears
  - Collect feedback → verify stored
  - Trigger retraining → verify pipeline starts
```

---

*Modules 059-066 (Platform Quality Gates, Integration, Operations) volgen als laatste fase...*

**Volgende stap: Wil je dat ik nu de laatste 8 modules (059-066) ook uitwerk?**
