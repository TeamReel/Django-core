---
lane: "planned"
agent: "claude-reviewer"
shell_pid: "31232"
review_status: "has_feedback"
reviewed_by: "claude-reviewer"
---

## Review Feedback

**Status**: ❌ **Needs Changes**

**Date**: 2025-12-17
**Reviewer**: claude-reviewer
**Severity**: BLOCKING - Test script has syntax errors preventing execution

### Critical Issues

**1. PowerShell Script Has Syntax Errors** (BLOCKING)
- **Location**: [scripts/test-sqlite-fallback.ps1](scripts/test-sqlite-fallback.ps1) lines 65-67, 111, 113
- **Problem**: Python code in shell commands is not properly quoted, causing PowerShell parser errors
- **Current Code**:
  ```powershell
  $orgs = & $pythonCmd $manageCmd shell -c "from organisations.models import Organisation; print(Organisation.objects.count())"
  ```
- **Error**: PowerShell interprets `count()` parentheses as PowerShell syntax, not Python
- **Impact**: Script cannot execute on Windows - fails immediately with parse errors
- **Fix Required**: Use proper escaping for nested quotes:
  ```powershell
  $orgs = & $pythonCmd $manageCmd shell -c 'from organisations.models import Organisation; print(Organisation.objects.count())'
  ```
  OR use backtick escaping for double quotes:
  ```powershell
  $orgs = & $pythonCmd $manageCmd shell -c `"from organisations.models import Organisation; print(Organisation.objects.count())`"
  ```
- **Validation**: Run `.\scripts\test-sqlite-fallback.ps1` from worktree root to verify no parse errors

**2. Emoji Encoding Issues in PowerShell** (MINOR)
- **Location**: Lines 10, 20, 26, 34, etc. (emoji characters throughout)
- **Problem**: While displayed correctly in the code, some emoji characters may cause issues depending on PowerShell console encoding
- **Impact**: May display incorrectly in some terminals, but not blocking functionality
- **Recommendation**: Consider adding `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8` at script start

### What Was Done Well

✅ **Comprehensive test coverage**: 6-step validation (migrate, seed, validate, reset, counts, idempotency)
✅ **Excellent documentation**: Clear SQLite setup in quickstart.md and docs/demos/README.md
✅ **Good comparison table**: SQLite vs PostgreSQL feature matrix helps users choose
✅ **Proper contracts update**: Database compatibility guarantee documented
✅ **ORM-only verification**: Confirmed no raw SQL in seed/validate commands
✅ **Bash script works**: Linux/macOS script has correct quoting and structure
✅ **Existing code already compatible**: validate_demo_data.py already had SQLite support

### Action Items (Must Complete Before Re-Review)

- [ ] Fix PowerShell quoting in lines 65-67 (shell -c commands for count verification)
- [ ] Fix PowerShell quoting in lines 93-95 (shell -c commands for post-reset counts)
- [ ] Test the corrected PowerShell script executes without parse errors
- [ ] Verify all 6 test steps complete successfully on Windows with SQLite
- [ ] Optional: Add UTF-8 encoding declaration at script start for emoji support

### Test Plan for Re-Review

1. Run `.\scripts\test-sqlite-fallback.ps1` on Windows - must execute without parse errors
2. Verify all 6 steps pass (migrate, seed, validate, counts, reset, idempotency)
3. Confirm entity counts match expected (5 orgs, 20 users, 80 projects)
4. Check idempotency message detection works correctly

# WP04: SQLite Fallback Compatibility

## Objective
Ensure demo seed/validate/reset commands operate correctly on SQLite fallback (DEMO_DATABASE=sqlite) without schema changes.

## Inputs
- spec.md, plan.md
- WP01 seed data helpers (must be ORM-only)
- WP02 command behaviors

## Tasks Covered
- T013 SQLite fallback compatibility (switching, smoke tests)

## Deliverables
- Configuration/guardrails to run seed/validate/reset against SQLite (dev/CI smoke)
- Adjustments to commands/helpers to avoid PostgreSQL-specific features
- Simple smoke script or doc note for running on SQLite

## Acceptance / Checks
- `DEMO_DATABASE=sqlite python manage.py migrate && python manage.py seed_demo_data` succeeds
- `validate_demo_data` and `reset_demo_data` succeed on SQLite with same counts

## Constraints
- No schema changes; keep code paths portable across PostgreSQL/SQLite

## Notes
- Coordinate with WP02 to reuse validation/reset without branching logic.

## Activity Log

- 2025-12-17T13:00:34Z – claude – shell_pid=31232 – lane=doing – Started SQLite fallback implementation
- 2025-12-17T14:00:00Z – claude – shell_pid=31232 – lane=doing – Completed SQLite compatibility implementation with automated test scripts and comprehensive documentation
- 2025-12-17T13:04:36Z – claude – shell_pid=31232 – lane=for_review – SQLite compatibility complete
- 2025-12-17T14:30:00Z – claude-reviewer – shell_pid=$PID – lane=for_review – Code review: PowerShell script has syntax errors (quoting issues in shell -c commands). Bash script works correctly. Documentation and ORM-only implementation verified. Needs fix before approval.
- 2025-12-17T13:12:31Z – claude-reviewer – shell_pid=31232 – lane=planned – Code review complete: PowerShell script has syntax errors in shell command quoting
