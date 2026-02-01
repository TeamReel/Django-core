# Current Mode: Modular Development & TeamReel Integration

**Goal:** Build the TeamReel web application (SaaS Boilerplate + Football Logic) iteratively, module by module.
**Principle:** 80/20 Rule. Build the core foundation (80% value) first. Avoid premature optimization.

## Workflow: Module-by-Module
1.  **Select Module:** Pick the next domain (e.g., Competition, Match, Player) based on the Roadmap.
2.  **Specify:** Define pure requirements in `documents/`. Use "Spec-Kitty" logic to clarify 80/20 boundaries.
3.  **Build (Core-App):** Implement Models, API, and Business Logic in Django.
    *   *Constraint:* Must be product-agnostic (Core), extensible via B10 Feature Flags.
4.  **Integrate (Frontend):** Build/Update React components in `demo/` to consume the new API.
5.  **Test:**
    *   Unit Tests (Backend + Frontend).
    *   Manual verification in Browser.
6.  **Deploy:** Validate against Railway (Production DB safety is paramount).
7.  **Document:** Update state in `documents/` (reflecting reality).

## Architecture & Integration
*   **Backend:** Django REST Framework (Railway Service: `backend`).
*   **Frontend:** React/Vite (Vercel/Netlify).
*   **Database:** PostgreSQL (Railway). **NEVER DROP TABLES.** Use safe migrations (`update_or_create`).
*   **Code Quality:** PEP8, Type Hints, clean imports.

## Decision Support Protocol (Spec-Kitty)
When clarifying requirements or choosing architectural paths:
1.  **Options:** Present 2-3 distinct options.
2.  **Trade-offs:** Analyze Pros/Cons for each.
3.  **Context:** Evaluate against **80/20 Principle** and **Production Safety**.
4.  **Recommendation:** Explicitly recommend the option that best fits the Core-App foundation.

## Sources of Truth
1.  `documents/` - Active documentation.
2.  **Codebase** - The implementation.
3.  **Railway/Production** - The real-world data state.

## Active Modules Context

### B34 Generative Pipelines (src/generative/) 🚧 IN DEVELOPMENT
**Status**: Phase 1 - Design & Contracts Complete
**Branch**: 043-ai-generation-pipeline
**Purpose**: AI content generation factory with template-based job lifecycle management

**Architecture**:
- **3 Core Models**: GenerationTemplate (versioned templates), GenerationRequest (async job tracking), GenerationOutput (result storage)
- **2 Pipeline Providers**:
  - `openai` (direct OpenAI API for simple completions, 80% use case)
  - `langgraph` (LangGraph SDK for complex stateful workflows, 20% use case)
- **Executor Pattern**: `BasePipelineExecutor` ABC with provider-specific implementations
- **Graph Registry**: Decorator-based registration for custom LangGraph workflows

**Key Integration Points**:
- **B07 Projects**: Template/request scoped to projects, membership checks
- **B08 Authentication**: User context for ownership
- **B11 Credits**: Reserve credits on submit, settle on completion
- **B15 Background Tasks**: Celery async processing (`process_generation_request` task)
- **B22/B35 File Storage**: Output file management (presigned URLs, expiration)
- **B23 WebSocket**: Real-time status updates (optional)
- **B33 Brand Identity**: Template context injection (optional)

**Extension Points for TeamReel**:
1. Custom LangGraph graphs in `teamreel/graphs/` (e.g., `match_analysis_v2`)
2. Product-specific templates (e.g., "Highlight Video Description Generator")
3. Custom executors for third-party providers (e.g., Anthropic)

**Design Decisions** (from research.md):
- LangGraph SDK (local execution) over Cloud API → no vendor lock-in, full control, GDPR-safe
- True versioning pattern → immutable templates, parent_template FK, is_latest flag
- Per-template retention policy → retention_days field (NULL=forever), daily cleanup cron
- Hybrid cost estimation → manual seed + monthly auto-update from actual usage
- 80/20 provider split → OpenAI for speed, LangGraph for complexity

**API Endpoints** (8 total):
- `POST /templates/` - Create template (project admin only)
- `GET /templates/` - List templates (project-filtered, pagination)
- `GET /templates/{id}/` - Template details
- `PATCH /templates/{id}/` - Update template (metadata only, immutable core)
- `DELETE /templates/{id}/` - Soft-delete template
- `POST /templates/{id}/clone/` - Create new version
- `POST /requests/` - Submit generation request (async via Celery)
- `GET /requests/{id}/` - Request status + output reference
- `POST /requests/{id}/cancel/` - Cancel pending request (refund credits)
- `GET /outputs/{id}/` - Retrieve output (text/JSON/files with presigned URLs)

**Testing Requirements**:
- Unit tests: >85% coverage (models >90%, API >85%, executors >80%)
- Integration tests: End-to-end workflow (submit → process → output)
- Mocked provider tests (no real OpenAI/LangGraph calls in CI)

**Files**:
- Spec: `kitty-specs/043-ai-generation-pipeline/spec.md`
- Plan: `kitty-specs/043-ai-generation-pipeline/plan.md`
- Research: `kitty-specs/043-ai-generation-pipeline/research.md`
- Data Model: `kitty-specs/043-ai-generation-pipeline/data-model.md`
- API Contract: `kitty-specs/043-ai-generation-pipeline/contracts/openapi.yaml`
- Quickstart: `kitty-specs/043-ai-generation-pipeline/quickstart.md`

**Next Implementation Phase**: Phase 2 - Core Models & API (migrations, serializers, ViewSets)
