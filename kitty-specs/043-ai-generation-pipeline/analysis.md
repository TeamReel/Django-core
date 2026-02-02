# B34 Generative Pipelines - Cross-Artifact Analysis Report

**Generated**: 2025-01-XX
**Artifacts Analyzed**: spec.md, plan.md, tasks.md, constitution.md
**Analysis Command**: `/spec-kitty.analyze`

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Total Functional Requirements | 30 (FR-001 to FR-030) |
| Total Non-Functional Requirements | 7 (NFR-001 to NFR-007) |
| Total User Stories | 6 |
| Total Tasks | 71 (T001 to T071) |
| Work Packages | 8 (WP01-WP08) |
| **CRITICAL Issues** | 0 (1 fixed) |
| **HIGH Issues** | 0 (2 fixed) |
| **MEDIUM Issues** | 4 |
| **LOW Issues** | 3 |

**Overall Assessment**: ✅ **Ready for implementation** - All CRITICAL and HIGH issues resolved. Remaining MEDIUM/LOW items are suggestions for improvement.

---

## Findings Table

| ID | Category | Severity | Location | Summary | Recommendation |
|----|----------|----------|----------|---------|----------------|
| F-001 | **INCONSISTENCY** | ✅ FIXED | spec.md L400, L795, L870 | **n8n provider removed** - All n8n references removed from spec.md to align with plan.md (2 providers only) | ~~Remove all n8n references~~ DONE |
| F-002 | **TERMINOLOGY** | ✅ FIXED | spec.md L400 | **flow_id → graph_id** - Standardized LangGraph terminology | ~~Replace flow_id with graph_id~~ DONE |
| F-003 | **TERMINOLOGY** | ✅ FIXED | spec.md L461 | **organisation_id → project_id** - Templates now project-scoped per plan.md | ~~Update FK~~ DONE |
| F-004 | **AMBIGUITY** | 🟡 MEDIUM | spec.md L897-915 | **Open Questions marked as "Still Open"** - Q4 (Template Versioning), Q5 (Output Retention), Q6 (Cost Estimation), Q7 (LangGraph priority) have recommendations but not confirmed decisions | Convert recommendations to decisions in spec.md or mark as "Decided" to prevent implementation ambiguity |
| F-005 | **UNDERSPEC** | 🟡 MEDIUM | tasks.md WP06 | **B35 FileStorageRecord not specified in tasks** - WP06 references file storage integration but no task explicitly covers presigned URL generation flow | Add explicit task for B35 presigned URL integration in WP06, or clarify it's inherited from B22 |
| F-006 | **DUPLICATION** | 🟡 MEDIUM | spec.md L555-750 vs tasks.md | **Implementation Plan duplicates tasks.md** - spec.md has "Phase 1-7" work packages that overlap with tasks.md WP01-WP08 | Consider removing Implementation Plan section from spec.md (tasks.md is source of truth) or add note "See tasks.md for current breakdown" |
| F-007 | **COVERAGE** | 🟡 MEDIUM | tasks.md | **NFR-004 (Logging) tasks incomplete** - NFR-004 requires structured logging but only T059 partially covers this in WP07 | Expand T059 scope or add dedicated logging tasks to ensure JSON structured logging per Constitution Article VI |
| F-008 | **TERMINOLOGY** | 🟢 LOW | spec.md, plan.md, tasks.md | **"Executor" vs "Pipeline Provider" vs "Provider"** - Terms used interchangeably | Establish glossary: "Provider" = external service (OpenAI, LangGraph), "Executor" = code class that calls provider |
| F-009 | **STYLE** | 🟢 LOW | spec.md | **Dutch examples in API responses** - "AJAX DOMINEERT!" in WebSocket example assumes TeamReel context | Replace with generic English examples for core-app product-agnosticism |
| F-010 | **COVERAGE** | 🟢 LOW | tasks.md vs spec.md | **Security Audit (FR-030) coverage weak** - FR-030 requires bandit + pip-audit but only T066 mentions this briefly | Expand T066 acceptance criteria to explicitly list: bandit scan, pip-audit, permission matrix verification |

---

## Coverage Mapping

### Functional Requirements → Tasks

| Requirement | Description | Covered? | Task IDs | Notes |
|-------------|-------------|----------|----------|-------|
| FR-001 | GenerationTemplate model | ✅ Yes | T001, T002 | |
| FR-002 | GenerationRequest model | ✅ Yes | T003, T004 | |
| FR-003 | GenerationOutput model | ✅ Yes | T005, T006 | |
| FR-004 | Template validation | ✅ Yes | T011, T012 | |
| FR-005 | Pipeline provider selection | ✅ Yes | T019, T020 | |
| FR-006 | OpenAI executor | ✅ Yes | T021, T022 | |
| FR-007 | LangGraph executor | ✅ Yes | T024, T025 | |
| FR-008 | Async Celery task | ✅ Yes | T028, T029 | |
| FR-009 | Status transitions | ✅ Yes | T030, T031 | |
| FR-010 | Credit reservation | ✅ Yes | T037, T038 | |
| FR-011 | Credit settlement | ✅ Yes | T039, T040 | |
| FR-012 | Credit refund | ✅ Yes | T041, T042 | |
| FR-013 | Insufficient credits (402) | ✅ Yes | T043 | |
| FR-014 | Error classification | ✅ Yes | T032, T033 | |
| FR-015 | Retry backoff | ✅ Yes | T034, T035 | |
| FR-016 | Max retries | ✅ Yes | T036 | |
| FR-017 | B33 brand context | ✅ Yes | T047, T048 | |
| FR-018 | B35 file storage | ⚠️ Partial | T050-T052 | Missing presigned URL detail |
| FR-019 | Template CRUD API | ✅ Yes | T010, T013-T015 | |
| FR-020 | Request API | ✅ Yes | T016-T018 | |
| FR-021 | Output retrieval API | ✅ Yes | T053 | |
| FR-022 | Retry endpoint | ✅ Yes | T018 | |
| FR-023 | WebSocket events | ✅ Yes | T054-T057 | |
| FR-024 | Admin interface | ✅ Yes | T060, T061 | |
| FR-025 | Permission checks | ✅ Yes | T013, T014 | |
| FR-026 | Input validation | ✅ Yes | T011, T012 | |
| FR-027 | Pagination | ✅ Yes | T016 | |
| FR-028 | Filtering | ✅ Yes | T016, T017 | |
| FR-029 | Provider config | ⚠️ Partial | T019, T020 | flow_id terminology issue |
| FR-030 | Security audit | ⚠️ Partial | T066 | Needs expansion |

### Non-Functional Requirements → Tasks

| Requirement | Description | Covered? | Task IDs | Notes |
|-------------|-------------|----------|----------|-------|
| NFR-001 | Response time <200ms | ✅ Yes | T064 | Performance tests |
| NFR-002 | 10k requests/day | ✅ Yes | T064 | Load testing |
| NFR-003 | Extension points | ✅ Yes | T019, T020 | Factory pattern |
| NFR-004 | Structured logging | ⚠️ Partial | T059 | Needs JSON format detail |
| NFR-005 | Cost optimization | ✅ Yes | T023, T027 | Token counting |
| NFR-006 | PEP8/type hints | ✅ Yes | T067 | Linting |
| NFR-007 | Test coverage >85% | ✅ Yes | T068, T069 | Coverage config |

### User Stories → Acceptance Criteria Coverage

| Story | Description | Criteria Count | Covered? | Notes |
|-------|-------------|----------------|----------|-------|
| US-001 | Template-based generation | 4 | ✅ Full | |
| US-002 | Credit management | 4 | ✅ Full | |
| US-003 | Intelligent retry | 3 | ✅ Full | |
| US-004 | Multi-provider routing | 3 | ⚠️ Partial | n8n inconsistency |
| US-005 | Brand context | 3 | ✅ Full | |
| US-006 | Real-time status | 3 | ✅ Full | |

---

## Constitution Alignment Issues

### Article I: Product-Agnostic Purpose
- ⚠️ **F-009**: Dutch examples in spec.md ("AJAX DOMINEERT!") leak TeamReel context
- **Verdict**: LOW - Easily fixed, examples should be generic

### Article II: Modular Architecture
- ✅ PASS: Factory pattern for executors maintains extensibility
- ✅ PASS: Clean separation between models, executors, API

### Article III: Code Quality
- ✅ PASS: T067 covers PEP8, type hints, isort

### Article IV: Testing Requirements
- ✅ PASS: T068 targets >85% coverage overall
- ✅ PASS: T007, T008, T009 cover model tests >90%
- ⚠️ **Threshold Check**: Constitution requires Models ≥90%, API ≥85%, Serializers ≥80%, Permissions ≥90%
  - tasks.md T068: "overall >85%" - should specify per-category targets

### Article V: Security
- ✅ PASS: No hardcoded secrets in spec
- ✅ PASS: Permission checks documented
- ⚠️ **F-010**: T066 security audit needs explicit bandit + pip-audit

### Article VI: Performance
- ✅ PASS: N+1 prevention mentioned in T064
- ✅ PASS: Pagination required in FR-027
- ⚠️ **F-007**: Structured logging (JSON format) not explicitly required in tasks

### Article VII-XII:
- ✅ PASS: API design follows DRF patterns
- ✅ PASS: Git workflow defined (043-ai-generation-pipeline branch)
- ✅ PASS: Documentation tasks in WP07

---

## Unmapped Tasks

All 71 tasks map to at least one functional or non-functional requirement. No orphan tasks detected.

---

## Detailed Issue Analysis

### F-001: n8n Provider Inconsistency (CRITICAL)

**Evidence**:
- spec.md L400: `n8n: POST {workflow_url} with webhook payload`
- spec.md L416-417: Error Classification Matrix includes n8n rows
- spec.md L795: Testing section mentions "n8n error mapping"
- plan.md: States "2 providers (OpenAI, LangGraph)" with no n8n mention
- tasks.md: No n8n-specific tasks

**Impact**: Implementers may build n8n support that's out of scope, or miss required n8n support if it was intended.

**Resolution Options**:
1. **Option A (Remove n8n)**: Delete all n8n references from spec.md. Update Error Classification Matrix. This aligns with plan.md "2 providers" statement.
2. **Option B (Add n8n)**: Add n8n as 3rd provider in plan.md, create WP for n8n executor (T072-T075). This expands scope.

**Recommendation**: Option A - Remove n8n. Plan.md explicitly scopes to 2 providers for MVP. n8n can be added in future iteration.

---

### F-002: flow_id vs graph_id (HIGH)

**Evidence**:
- spec.md L400: `POST https://langgraph-api/v1/flows/{flow_id}/run`
- data-model.md: Uses `graph_id` in pipeline_config example
- plan.md: Uses `graph_id` consistently

**Impact**: Terminology confusion may cause implementers to create wrong API paths or config keys.

**Resolution**: Find-replace in spec.md: `flow_id` → `graph_id`, `flows/` → `graphs/`

---

### F-003: organisation_id vs project_id Scope (HIGH)

**Evidence**:
- spec.md L461: Schema shows `organisation_id: bigint (FK → organisations_organisation)` on GenerationTemplate
- data-model.md: GenerationTemplate has `project_id` FK (project-scoped)
- Plan context: "B07 Projects: Template/request scoped to projects"

**Impact**: Wrong FK will break B07 integration and permission model.

**Resolution**: Update spec.md schema to use `project_id` FK instead of `organisation_id`. Templates should be project-scoped per plan.md.

---

## Recommendations

### Before Implementation (MUST DO)

1. **Resolve F-001**: Remove n8n references from spec.md sections:
   - L400 (Executor Invocation bullet 3)
   - L416-417 (Error Classification Matrix n8n rows)
   - L795 (Testing "n8n error mapping")
   - L870 (Dependencies "n8n optional")

2. **Resolve F-002**: Replace `flow_id` with `graph_id` in spec.md L400

3. **Resolve F-003**: Change `organisation_id` to `project_id` in spec.md schema (L461)

### Suggested Improvements (SHOULD DO)

4. **F-004**: Convert Open Questions (Q4-Q7) to explicit decisions with owner initials

5. **F-006**: Add note to spec.md Implementation Plan section: "For current task breakdown, see tasks.md"

6. **F-007**: Update T059 to explicitly require JSON structured logging format

7. **F-010**: Expand T066 acceptance criteria:
   ```
   - [ ] bandit scan passes (no high severity)
   - [ ] pip-audit passes (no critical CVEs)
   - [ ] Permission matrix documented and verified
   ```

### Nice to Have (COULD DO)

8. **F-008**: Add terminology glossary to spec.md defining Provider, Executor, Pipeline

9. **F-009**: Replace Dutch examples with generic English content

10. **F-005**: Add task for B35 presigned URL integration details

---

## Metrics Summary

| Category | Count | % of Total |
|----------|-------|------------|
| Requirements Fully Covered | 34/37 | 92% |
| Requirements Partially Covered | 3/37 | 8% |
| Requirements Not Covered | 0/37 | 0% |
| User Stories Fully Covered | 5/6 | 83% |
| Constitution Principles Aligned | 11/12 | 92% |
| CRITICAL Issues | 1 | - |
| HIGH Issues | 2 | - |
| MEDIUM Issues | 4 | - |
| LOW Issues | 3 | - |

---

## Next Actions

1. ✅ ~~**CRITICAL**: Resolve F-001, F-002, F-003~~ **DONE**
2. Proceed to `/spec-kitty.implement tasks/planned/WP01-core-models-database.md`

---

**Analysis Status**: ✅ Complete
**Recommendation**: ✅ All blocking issues fixed - ready for implementation
