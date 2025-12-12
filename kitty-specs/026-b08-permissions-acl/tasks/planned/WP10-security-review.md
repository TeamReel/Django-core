---
work_package_id: WP10
title: Security Review & CI Validation
lane: planned
subtasks:
  - T060
  - T061
  - T062
  - T063
history:
  - date: 2025-12-12
    action: created
    by: spec-kitty-tasks
---

# WP10: Security Review & CI Validation

## Objective

Conduct comprehensive security review with manual penetration testing, validate test coverage targets, and ensure all CI checks pass before merging to main branch.

## Context

**User Story**: Story 1 (Security Engineer: Audit Permission Decisions - P0)

**Why This Matters**:
- Security refactor must close ALL ACL bypasses (zero-tolerance for vulnerabilities)
- Manual pen testing catches edge cases automated tests miss
- CI validation ensures no regressions or quality degradation

**Success Criteria**:
- SC-006: Security tests confirm zero ACL bypasses
- SC-004: B08 audit.py achieves 90%+ coverage
- SC-005: Frontend package achieves 85%+ coverage
- SC-010: All CI checks pass (linting, typing, tests)

**Dependencies**: WP01-WP09 (requires all implementation and testing complete)

---

## Subtasks

### T060: Conduct Manual Security Review (Pen Test Checklist)

**What to Do**:
1. Create security review checklist:

**Bypass Attempts**:
```markdown
### B11 Transaction/Credit APIs
- [ ] Attempt to view balance of organization user does not belong to
- [ ] Attempt to view balance with expired/invalid token
- [ ] Attempt to view balance with org-scoped permission for different org
- [ ] Verify B09 audit event created for each attempt

### B16 Notification APIs
- [ ] Enumerate notification IDs from different organization
- [ ] Attempt to retrieve notification with project permission but no org access
- [ ] List notifications without authentication
- [ ] Verify queryset filtering prevents cross-org leaks

### B17 Routing Service
- [ ] Trigger routing for organization user does not belong to
- [ ] Verify no direct database queries bypass ACL (source code audit)
- [ ] Check B06/B07 service functions called with correct user context

### Settings APIs
- [ ] View settings for different organization
- [ ] Edit settings with view-only permission
- [ ] Escalate from org-scoped to global-scoped settings
- [ ] Verify permission checks enforce scope boundaries
```

2. Execute each test case manually:
   - Use tools: Postman, curl, browser DevTools
   - Document results in checklist (PASS/FAIL)
   - For FAIL: create security issue, block merge

3. Review source code for residual bypasses:
```bash
# Search for direct queries (should be replaced with service layer)
grep -r "Organization.objects" src/routing/ src/notifications/
grep -r "Project.objects" src/routing/

# Search for AllowAny permission classes (should be replaced)
grep -r "AllowAny" src/transactions/ src/notifications/

# Search for raw permission checks (should use evaluate_permission())
grep -r "user.has_perm" src/permissions/ --exclude=audit.py
```

**Acceptance Criteria**:
- All checklist items PASS (zero bypass attempts succeed)
- Source code audit confirms no residual bypasses
- B09 audit events created for all permission checks (including denials)
- SC-006 satisfied (zero bypasses)

---

### T061: Run Full Backend Test Suite (Verify 90%+ B08 Coverage)

**What to Do**:
1. Run pytest with coverage:
```bash
cd src
pytest --cov=permissions --cov-report=html --cov-report=term
```

2. Review coverage report:
```
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
permissions/
 audit.py      |   92.3  |   89.1   |   95.0  |   93.2  | 67-69
 models.py     |   88.5  |   85.2   |   90.0  |   89.1  |
 api/views.py  |   85.7  |   82.3   |   87.5  |   86.4  |
 api/permissions.py | 91.2 | 88.6   |   92.0  |   91.8  |
---------------|---------|----------|---------|---------|-------------------
TOTAL          |   91.4  |   88.3   |   92.1  |   91.7  |
```

3. If `audit.py` coverage <90%, add missing tests:
   - Review "Uncovered Line #s" column
   - Write targeted tests for uncovered branches
   - Focus on error handling, edge cases, fallback logic

4. Verify all critical tests pass:
```bash
# Run security tests specifically
pytest tests/security/ -v

# Run integration tests
pytest tests/integration/test_b11_acl.py tests/integration/test_b16_acl.py tests/integration/test_b17_routing.py tests/integration/test_settings_acl.py -v
```

**Acceptance Criteria**:
- B08 `audit.py` module achieves ≥90% line coverage
- All security tests pass (zero failures)
- All integration tests pass
- SC-004 satisfied

---

### T062: Run Full Frontend Test Suite (Verify 85%+ Permissions Package Coverage)

**What to Do**:
1. Run Jest with coverage:
```bash
cd packages/permissions
npm run test:coverage
```

2. Review coverage report:
```
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |   87.5  |   85.2   |   90.1  |   88.3  |
 checkPermission.ts | 95.2 | 92.1  | 100    |   95.8  | 45-47
 cache.ts       |   88.7  |   85.4   |   85.7  |   89.2  | 23, 56-58
 PermissionGate.tsx | 82.1 | 78.3  |   87.5  |   83.4  | 34, 67-69
 usePermissions.ts | 90.3 | 88.6  |   92.1  |   91.2  | 12
 PermissionsProvider.tsx | 85.9 | 83.7 | 88.0 | 86.5 | 89-92
---------------|---------|----------|---------|---------|-------------------
```

3. If any file <85%, add missing tests:
   - Focus on uncovered lines
   - Add tests for error states, loading states, edge cases

4. Verify all tests pass:
```bash
npm test
```

**Acceptance Criteria**:
- Frontend package achieves ≥85% line and branch coverage
- All Jest tests pass (zero failures, zero warnings)
- SC-005 satisfied

---

### T063: Verify All CI Checks Pass (Black, Ruff, mypy, pytest, Jest)

**What to Do**:
1. Run Python formatting and linting:
```bash
# Black (code formatter)
black --check src/ tests/

# Ruff (linter)
ruff check src/ tests/

# mypy (type checker)
mypy src/permissions/ --strict
```

2. Fix any violations:
   - Black: run `black src/ tests/` to auto-format
   - Ruff: fix reported issues manually
   - mypy: add missing type hints or adjust strict settings

3. Run frontend linting:
```bash
cd packages/permissions
npm run lint
```

4. Verify CI pipeline passes:
   - Push branch to GitHub
   - Wait for CI checks (GitHub Actions or equivalent)
   - Verify all checks green (build, test, lint, type-check)

5. Create CI summary:
```markdown
## CI Validation Report

### Backend
- ✅ Black formatting: PASS
- ✅ Ruff linting: PASS (0 violations)
- ✅ mypy type checking: PASS (strict mode)
- ✅ pytest: PASS (350 tests, 0 failures)
- ✅ Coverage: 91.4% (target: 90%)

### Frontend
- ✅ ESLint: PASS (0 warnings)
- ✅ TypeScript: PASS (strict mode)
- ✅ Jest: PASS (85 tests, 0 failures)
- ✅ Coverage: 87.5% (target: 85%)

### Deployment
- ✅ Build: SUCCESS
- ✅ Docker image: SUCCESS
- ✅ Integration tests: PASS
```

**Acceptance Criteria**:
- All CI checks pass (no red X's in GitHub UI)
- Zero linting violations
- Zero type checking errors
- All tests pass (backend + frontend)
- SC-010 satisfied (all CI checks pass)

---

## Definition of Done

- [ ] Manual security review checklist complete (all items PASS)
- [ ] Source code audit confirms no residual bypasses
- [ ] B08 `audit.py` coverage ≥90% (SC-004)
- [ ] Frontend package coverage ≥85% (SC-005)
- [ ] All security tests pass (SC-006)
- [ ] All integration tests pass
- [ ] All CI checks pass (Black, Ruff, mypy, pytest, Jest, ESLint, TypeScript)
- [ ] CI summary report created
- [ ] Code reviewed and approved for merge

---

## Risks & Mitigations

**Risk**: Manual pen test misses edge cases
**Mitigation**: Comprehensive checklist covering all endpoints, automated security test suite supplements manual testing

**Risk**: Coverage targets block merge despite functional correctness
**Mitigation**: Pragmatic approach - focus on critical paths, allow <90%/85% if uncovered lines are trivial (with justification)

**Risk**: CI failures due to environment issues (not code issues)
**Mitigation**: Retry failed checks, verify local tests pass before blaming CI

**Risk**: Merge blocked by unrelated CI failures (e.g., flaky tests in other modules)
**Mitigation**: Isolate B08 changes, ensure B08-specific tests pass independently

---

## Reviewer Guidance

**What to Verify**:
1. Security checklist completed with all PASS results
2. Coverage reports show ≥90% (backend) and ≥85% (frontend)
3. No `AllowAny` permission classes remain in B11/B16/B17/settings
4. No direct `Organization.objects` or `Project.objects` queries in B17
5. All `PermissionDenied` raises use structured format
6. CI pipeline shows all green checks
7. B09 audit events created for all permission checks (sample verification)

**Manual Validation**:
1. Clone branch locally
2. Run backend tests: `pytest --cov=permissions --cov-report=term`
3. Run frontend tests: `cd packages/permissions; npm test`
4. Run security tests: `pytest tests/security/ -v`
5. Attempt manual bypass (e.g., curl unauthorized endpoint) → Expect 403
6. Check B09 audit events: `AuditEvent.objects.filter(event_type__startswith="permission.").count()`

**Deployment Readiness**:
- [ ] All success criteria met (SC-001 through SC-010)
- [ ] No security vulnerabilities found
- [ ] Documentation complete and validated
- [ ] Stakeholders notified of impending deployment
- [ ] Rollback plan documented (if critical issues found post-merge)

---

## Next Steps After WP10

1. **Merge to Main**: Create pull request, get final approval, merge
2. **Deploy to Staging**: Test in staging environment with production-like data
3. **Monitor Metrics**: Track 403 error rates, permission check latency, B09 audit event volume
4. **Production Deployment**: Gradual rollout, monitor for regressions
5. **Post-Deployment Review**: Validate zero bypasses in production, collect developer feedback
