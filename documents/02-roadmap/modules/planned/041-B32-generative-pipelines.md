# B32: Generative Pipelines

**Phase:** 10
**Status:** 📋 Planned
**Module ID:** 041
**Category:** Backend

## Links
*   [Project Vision](../../../PROJECT_VISION.md)
*   [Source Code](../../../../src) (When implemented)

## Description

## 41. B32 – Generative Pipelines

**Doel**: AI content generation factory - manages generation requests (jobs), routes naar appropriate pipelines (LangGraph/n8n/OpenAI), handles async execution.

**Waarom agnostisch**: Content generation is universeel - images, videos, documents, reports. The "what" changes, the "how" (job lifecycle) stays consistent.

**Wat moet er gebeuren**:
- **GenerationTemplate model**: Defines content types
  - Fields: name, slug, version, input_schema (JSON Schema), pipeline_config (JSON)
  - Examples: "Match Report Instagram", "Invoice PDF", "Marketing Email"
  - Input schema: Validates required data (e.g., {"match_id": "integer", "mvp": "string"})
  - Pipeline config: {"provider": "langgraph", "flow_id": "match-story-v1"}
- **GenerationRequest model**: Job lifecycle
  - Fields: template (FK), status (pending/processing/completed/failed), input_data (JSON), requester (FK user), project (FK)
  - Timestamps: created_at, started_at, completed_at
  - Metadata: cost (tokens/credits), error_message
- **GenerationOutput model**: Results
  - Fields: request (FK), file (FK to B22/B33), text_content, metadata (JSON)
  - Types: image, video, text, json
- **Pipeline routing**: Select execution engine
  - LangGraph (complex agents)
  - n8n (workflow automation)
  - Direct OpenAI API (simple completions)
  - Local models (future)
- **Async execution**: B15 Celery integration
  - Submit job → queue task → process → store output
  - Real-time status updates (via B23 WebSocket)
- **Credit deduction**: B11 integration
  - Deduct credits on submit or completion
  - Refund on failure (configurable)
- **Integration**: B15 (tasks), B11 (credits), B31 (brand tokens), B33 (output storage)

**Demo Requirements**:
- 🤖 **AI Studio** (`/demo/pipelines`):
  - Template selector (dropdown: Match Report, Line-up Video, etc.)
  - Dynamic form builder (generates inputs from template.input_schema)
  - Generate button (submits GenerationRequest)
  - Job status tracker (pending → processing → completed with progress %)
  - Output preview (image/video player, text display)
  - Download button (when completed)
  - Job history (list of past generations with retry option)
  - Tests: select template → fill inputs → generate → track status → view output

**Status**: 🛫 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=B32-generative-pipelines

[feature summary]
AI content generation factory - job lifecycle management, pipeline routing, async execution.

[goals]
- GenerationTemplate model (defines content types, input schemas)
- GenerationRequest model (job lifecycle: pending → processing → completed/failed)
- GenerationOutput model (store results)
- Pipeline routing (LangGraph vs n8n vs OpenAI)
- Async execution (B15 Celery)
- Credit deduction (B11)
- Integration (B31 brand, B33 storage)

[demo requirements]
Demo page: /demo/pipelines
- Template selector
- Dynamic form (from input schema)
- Generate button
- Job status tracker (real-time)
- Output preview
- Job history with retry
- Tests: select → generate → track → view output
```
