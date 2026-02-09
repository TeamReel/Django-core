---
work_package_id: "WP05"
subtasks: ["T042", "T043", "T044", "T045", "T046", "T047", "T048", "T049", "T050", "T051", "T052"]
title: "DRF Serializers"
phase: "Phase 1 - API"
lane: "planned"
agent: "system"
review_status: "has_feedback"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2026-02-09T18:18:50Z"
    lane: "planned"
    agent: "system"
    action: "Prompt generated"
---

# WP05 – DRF Serializers

## Review Feedback

**Review Date:** 2026-02-09
**Reviewer:** claude-reviewer
**Status:** Needs Changes

**Summary:** Implementation is functionally complete with all 21 tests passing and Django check clean. However, **coverage requirement (>85%) not met** for 3 of 5 serializer files.

**Coverage Analysis:**
```
File                                    Stmts   Miss  Coverage  Status
-------------------------------------------------------------------------
src/workflows/serializers/actions.py      65     65      0%    ❌ CRITICAL
src/workflows/serializers/history.py      40      2     91%    ✅ PASS
src/workflows/serializers/instance.py     14      1     88%    ✅ PASS
src/workflows/serializers/permissions.py  74     36     48%    ❌ FAIL
src/workflows/serializers/template.py     31     12     56%    ❌ FAIL
```

**Required Actions:**

1. **actions.py (0% → >85%)**
   - Issue: Zero coverage despite having 7 passing tests - likely class-level code or imports not exercised
   - Fix: Add tests that import and instantiate serializers at module level, or investigate coverage measurement

2. **template.py (56% → >85%)**
   - Missing: Edge cases for version validation (invalid semantic version formats)
   - Missing: Transition validation error paths (orphan states, circular transitions)
   - Missing: Definition validation error paths (empty states list, duplicate state names)
   - Add tests: `test_invalid_version_formats`, `test_orphan_states_in_transitions`, `test_duplicate_state_names`

3. **permissions.py (48% → >85%)**
   - Missing: Validation logic for action existence checks
   - Missing: Required roles validation error paths (empty list, invalid role types)
   - Add tests: `test_action_not_in_workflow`, `test_empty_required_roles`, `test_invalid_role_type`

**Quality Notes:**
- ✅ All 21 tests passing
- ✅ Django check: 0 critical issues (194 warnings are pre-existing)
- ✅ Type hints present in all files
- ✅ Validation rules correctly implemented
- ✅ Functional requirements met

**Next Steps:**
1. Add missing test cases to achieve >85% coverage for all 3 files
2. Re-run: `pytest tests/workflows/unit/test_serializers.py --cov=src/workflows/serializers --cov-report=term-missing`
3. Verify all files show >85% coverage
4. Move back to `for_review` lane when coverage requirement met

## Objective
Create serializers for all models with boundary validation.

## Key Serializers
1. **WorkflowTemplateSerializer** - Validates definition JSON schema
2. **WorkflowInstanceSerializer** - Validates context size (64KB), includes available_actions computed field
3. **TransitionHistorySerializer** - Read-only with actor details
4. **ProjectPermissionOverrideSerializer** - Validates action exists, roles valid
5. **TransitionExecuteSerializer** - Input for execute endpoint (action, comment, context_updates)
6. **AvailableActionsSerializer** - Output for available_actions endpoint

## Validation Rules
- Context JSON ≤ 64KB (use custom validator)
- Definition must have exactly 1 initial state
- Action names must exist in workflow
- Required roles must be valid membership roles

## Files
- `src/workflows/serializers/template.py`
- `src/workflows/serializers/instance.py`
- `src/workflows/serializers/history.py`
- `src/workflows/serializers/permissions.py`
- `src/workflows/serializers/__init__.py`

## Done Checklist
- [ ] All 6 serializers created
- [ ] Validation rules enforced
- [ ] Type hints present
- [ ] Unit tests >85% coverage

Activity Log: 2026-02-09T18:18:50Z – Created

## Activity Log

- 2026-02-09T18:17:28Z – system – shell_pid= – lane=doing – Started implementation of DRF Serializers
- 2026-02-09T18:27:19Z – system – shell_pid= – lane=for_review – Ready for review - all 21 tests passing, 0 Django issues
- 2026-02-09T18:45:31Z – system – shell_pid= – lane=planned – Code review feedback: Coverage requirement not met. 3 of 5 serializer files below 85% threshold. See Review Feedback section in prompt file for details.
