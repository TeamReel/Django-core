# Work Package WP08: Validation & Success Criteria

**Status**: Planned  
**Priority**: P2 (Nice to Have - Validation)  
**Feature**: 001-core-project-skeleton  
**User Stories**: US-001, US-003 (Validation)

---

## Goal

Validate the complete skeleton meets all success criteria and constitutional requirements. This work package runs comprehensive checks and verifies the skeleton is production-ready.

---

## Constitutional Alignment

- **Principle III (Code Quality)**: All tools run clean
- **Principle IV (Testing)**: All tests pass
- **Principle V (Security)**: Deployment checks pass
- **Principle VIII (Developer Experience)**: Setup time meets target

---

## Subtasks

### T042: Run Django system check
**Description**: Run `python manage.py check` and fix any issues

**Implementation Guidance**:
- Set environment: `$env:DJANGO_SETTINGS_MODULE = "config.settings.local"`
- Set SECRET_KEY: `$env:SECRET_KEY = "test-secret-key"`
- Run: `python manage.py check`
- Expected: No errors, no warnings
- Fix any issues that appear

**Definition of Done**:
- [ ] `python manage.py check` exits with code 0
- [ ] No errors reported
- [ ] No warnings reported
- [ ] All environments tested (local, staging, production)

---

### T043: Run Django deployment check
**Description**: Run `python manage.py check --deploy` and fix warnings

**Implementation Guidance**:
- Set environment: `$env:DJANGO_SETTINGS_MODULE = "config.settings.production"`
- Set required environment variables (SECRET_KEY, ALLOWED_HOSTS, DATABASE_URL)
- Run: `python manage.py check --deploy`
- Expected: No critical errors (some warnings acceptable for skeleton)
- Fix any critical issues

**Definition of Done**:
- [ ] `python manage.py check --deploy` exits with code 0
- [ ] No critical security errors
- [ ] Production settings pass deployment checks
- [ ] Document any acceptable warnings

---

### T044: Run Black and verify [PARALLEL]
**Description**: Run Black on all code and verify formatting

**Implementation Guidance**:
- Run: `black --check src/ tests/`
- Expected: "All done! ✨ 🍰 ✨"
- If failures: Run `black src/ tests/` to format, commit changes

**Definition of Done**:
- [ ] `black --check src/ tests/` passes
- [ ] All Python files formatted consistently
- [ ] No formatting violations

---

### T045: Run Ruff and fix violations [PARALLEL]
**Description**: Run Ruff on all code and fix any violations

**Implementation Guidance**:
- Run: `ruff check src/ tests/`
- Expected: No violations
- If violations: Run `ruff check --fix src/ tests/` to auto-fix
- Manually fix remaining violations

**Definition of Done**:
- [ ] `ruff check src/ tests/` passes
- [ ] No lint violations
- [ ] Code follows all enabled rules

---

### T046: Run mypy and fix errors [PARALLEL]
**Description**: Run mypy on src/config/ and fix type errors

**Implementation Guidance**:
- Run: `mypy src/config/`
- Expected: "Success: no issues found"
- Fix any type errors (add type hints, use type: ignore sparingly)

**Definition of Done**:
- [ ] `mypy src/config/` passes
- [ ] No type errors
- [ ] Type hints present where needed

---

### T047: Run pytest and verify pass [PARALLEL]
**Description**: Run pytest and verify all tests pass

**Implementation Guidance**:
- Run: `pytest --cov=src --cov-report=html --cov-report=term`
- Expected: All tests pass, coverage > 80%
- Fix any test failures

**Definition of Done**:
- [ ] `pytest` exits with code 0
- [ ] All tests pass
- [ ] Test execution < 5 seconds (SC-008)
- [ ] Coverage > 80% (SC-010)

---

### T048: Install and verify pre-commit hooks
**Description**: Install pre-commit hooks and verify they run correctly

**Implementation Guidance**:
- Run: `pre-commit install`
- Run: `pre-commit run --all-files`
- Expected: All hooks pass
- Fix any issues

**Definition of Done**:
- [ ] `pre-commit install` succeeds
- [ ] `pre-commit run --all-files` passes
- [ ] All hooks execute without errors
- [ ] Hooks match CI configuration

---

### T049: Verify setup time < 10 minutes [PARALLEL]
**Description**: Time a fresh clone setup to verify SC-001

**Implementation Guidance**:
- Create fresh clone in new directory
- Time the entire setup process:
  1. Clone repository
  2. Create virtual environment
  3. Install dependencies (`make install`)
  4. Copy .env.example to .env
  5. Edit .env with SECRET_KEY
  6. Run migrations
  7. Start server
  8. Verify health check
- Target: < 10 minutes total

**Definition of Done**:
- [ ] Fresh clone setup completes
- [ ] Total time < 10 minutes
- [ ] All steps documented
- [ ] No blockers encountered

**Timing Breakdown**:
- Clone: < 30 seconds
- Venv creation: < 30 seconds
- Dependency install: < 5 minutes
- Configuration: < 1 minute
- Migrations: < 30 seconds
- Server start + verify: < 1 minute
- **Total**: < 8 minutes (buffer for slower systems)

---

### T050: Verify health check < 100ms [PARALLEL]
**Description**: Measure health check response time to verify SC-004

**Implementation Guidance**:
- Start server: `python manage.py runserver`
- Measure response time:
  ```powershell
  Measure-Command { 
      Invoke-WebRequest -Uri "http://localhost:8000/health/" 
  } | Select-Object TotalMilliseconds
  ```
- Expected: < 100ms
- Run multiple times to get average
- If too slow, optimize health check implementation

**Definition of Done**:
- [ ] Health check responds
- [ ] Average response time < 100ms
- [ ] Consistent across multiple requests
- [ ] No performance bottlenecks

---

## Independent Test

**Test Name**: Complete validation suite

**Test Steps**:
1. Django checks:
   ```powershell
   python manage.py check
   python manage.py check --deploy
   ```

2. Code quality:
   ```powershell
   black --check src/ tests/
   ruff check src/ tests/
   mypy src/config/
   ```

3. Tests:
   ```powershell
   pytest --cov=src --cov-report=term
   ```

4. Pre-commit:
   ```powershell
   pre-commit run --all-files
   ```

5. Fresh setup:
   - Clone to new directory
   - Time complete setup
   - Verify < 10 minutes

6. Performance:
   - Start server
   - Measure health check response time
   - Verify < 100ms

**Expected Results**:
- All Django checks pass
- All quality tools pass
- All tests pass
- Pre-commit hooks work
- Setup time < 10 minutes
- Health check < 100ms

---

## Implementation Notes

### Validation Strategy
- Run all checks in sequence
- Fix issues immediately (don't accumulate)
- Document any acceptable warnings
- Measure actual metrics (don't estimate)

### Performance Validation
- Setup time: Measure on average hardware (not optimized dev machine)
- Health check: Average multiple requests (first request may be slower)
- Test speed: Use --reuse-db for realistic timing

### Success Criteria Checklist
All 10 success criteria must pass:
- [ ] SC-001: Setup < 10 minutes
- [ ] SC-002: DRF preconfigured
- [ ] SC-003: No secrets in code
- [ ] SC-004: Health check < 100ms
- [ ] SC-005: Environment-based settings
- [ ] SC-006: Python 3.12+
- [ ] SC-007: Django 5.1+
- [ ] SC-008: Tests < 5 seconds
- [ ] SC-009: Secure defaults
- [ ] SC-010: Coverage > 80%

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Unexpected errors discovered | Medium | Fix immediately, update earlier WPs if architectural |
| Setup time exceeds 10 minutes | High | Identify bottleneck (usually dependencies), optimize |
| Health check too slow | Medium | Review implementation, remove unnecessary processing |
| Coverage below 80% | Medium | Add smoke tests for uncovered modules |
| Type errors in Django code | Low | Use type: ignore for Django internals if needed |

---

## Reviewer Guidance

### Code Review Checklist
- [ ] All Django checks pass
- [ ] All quality tools (Black, Ruff, mypy) pass
- [ ] All tests pass
- [ ] Pre-commit hooks installed and working
- [ ] No security warnings in deployment check
- [ ] Code is consistently formatted

### Validation Checklist
- [ ] Fresh clone setup timed and documented
- [ ] Setup time < 10 minutes verified
- [ ] Health check response time measured
- [ ] Health check < 100ms verified
- [ ] All success criteria checked
- [ ] All constitutional principles validated

### Manual Validation Commands
```powershell
# Django checks
$env:DJANGO_SETTINGS_MODULE = "config.settings.local"
$env:SECRET_KEY = "test-secret-key"
python manage.py check

# Deployment check
$env:DJANGO_SETTINGS_MODULE = "config.settings.production"
$env:ALLOWED_HOSTS = "example.com"
$env:DATABASE_URL = "sqlite:///test.db"
python manage.py check --deploy

# Quality checks
black --check src/ tests/
ruff check src/ tests/
mypy src/config/

# Tests
pytest --cov=src --cov-report=term -v

# Pre-commit
pre-commit run --all-files

# Performance
Measure-Command { 
    Invoke-WebRequest -Uri "http://localhost:8000/health/" 
} | Select-Object TotalMilliseconds
```

---

## Success Criteria Mapping

This work package validates ALL success criteria:

- **SC-001**: Setup < 10 minutes → T049
- **SC-002**: DRF preconfigured → T024 (test_settings validates)
- **SC-003**: No secrets in code → T042 (system check would fail)
- **SC-004**: Health check < 100ms → T050
- **SC-005**: Environment-based settings → T042, T043
- **SC-006**: Python 3.12+ → T046 (mypy enforces)
- **SC-007**: Django 5.1+ → T047 (tests would fail)
- **SC-008**: Tests < 5 seconds → T047
- **SC-009**: Secure defaults → T043 (deployment check)
- **SC-010**: Coverage > 80% → T047

---

## Dependencies

**Prerequisites**: WP01-WP07 (all implementation complete)

**Enables**:
- Feature branch merge (all validations pass)
- Production deployment (security verified)
- User adoption (quality guaranteed)

---

## Completion Report Template

After validation, create completion report:

```markdown
# Feature 001 Validation Report

**Date**: [DATE]
**Validator**: [NAME]
**Status**: [PASS/FAIL]

## Success Criteria Results

- [ ] SC-001: Setup time [X] minutes (target < 10)
- [ ] SC-002: DRF configured ✓
- [ ] SC-003: No secrets ✓
- [ ] SC-004: Health check [X]ms (target < 100)
- [ ] SC-005: Environment settings ✓
- [ ] SC-006: Python 3.12+ ✓
- [ ] SC-007: Django 5.1+ ✓
- [ ] SC-008: Tests [X]s (target < 5)
- [ ] SC-009: Secure defaults ✓
- [ ] SC-010: Coverage [X]% (target > 80)

## Tool Results

- Django check: [PASS/FAIL]
- Django deploy check: [PASS/FAIL]
- Black: [PASS/FAIL]
- Ruff: [PASS/FAIL]
- mypy: [PASS/FAIL]
- pytest: [PASS/FAIL] ([X] passed)
- pre-commit: [PASS/FAIL]

## Performance Metrics

- Setup time: [X] minutes
- Health check: [X]ms average
- Test execution: [X]s
- Coverage: [X]%

## Issues Found

[List any issues discovered, with issue numbers if filed]

## Sign-off

Ready for merge: [YES/NO]
Reason: [Brief explanation]
```

---

> This work package ensures skeleton meets all requirements. No compromise on quality, security, or performance.
