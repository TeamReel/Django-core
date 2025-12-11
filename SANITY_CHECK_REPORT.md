# Repository Sanity Check Report
**Date**: 2025-01-10
**Branch**: main (post-merge of F03: 024-multi-tenancy-context)
**Commit**: ae165f93

## Summary

**Overall Status**: ⚠️ **MIXED** - Critical test failures in context-switcher package

### Validation Results

| Command | Status | Details |
|---------|--------|---------|
| `pnpm lint` | ❌ **FAILED** | 40 errors, 8 warnings |
| `pnpm test` | ⚠️ **PARTIAL** | 3/4 packages passing |
| `pnpm build` | ⏸️ **SKIPPED** | (deferred) |

---

## Detailed Findings

### 1. Lint Results (`pnpm lint`)

#### ❌ **context-switcher** (40 errors, 3 warnings)
**Root Cause**: ESLint strict type checking flagging unsafe operations in API calls

**Files Affected**:
- `src/api/contextApi.ts` (20 errors)
- `src/api/organisationsApi.ts` (10 errors)
- `src/api/projectsApi.ts` (10 errors)
- `src/hooks/useDebouncedValue.ts` (1 warning)
- `src/hooks/useKeyboardShortcut.ts` (2 warnings)

**Error Pattern**:
```typescript
// Current (flagged as unsafe):
const response = await client.get<T>('/endpoint/');
if (response.error) { ... }
return response.data;

// Issue: ApiResponse<T> has optional data? and error?, but TypeScript
// can't guarantee safe access without explicit type guards
```

**ESLint Rules Triggered**:
- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-call`
- `@typescript-eslint/no-unsafe-member-access`
- `@typescript-eslint/no-unsafe-return`
- `@typescript-eslint/explicit-function-return-type`

**Recommended Fix**: Add type guards to api-client or refactor API response handling:
```typescript
function isApiError<T>(response: ApiResponse<T>): response is { error: ApiError } {
  return response.error !== undefined;
}

const response = await client.get<T>('/endpoint/');
if (isApiError(response)) {
  throw new Error(response.error.message);
}
// TypeScript now knows response.data exists
return response.data;
```

#### ⚠️ **design-system** (5 warnings, non-blocking)
- `Radio.stories.tsx`: 4× `@typescript-eslint/no-explicit-any` (Storybook args)
- `Tabs.tsx`: 1× `react-refresh/only-export-components` (TabType export)

**Impact**: Low (Storybook-only warnings, not production code)

#### ✅ **api-client** - PASS
#### ✅ **auth** - PASS

---

### 2. Test Results (`pnpm test`)

#### ❌ **context-switcher** (0/21 test suites passed)
**Root Cause**: MSW 2.x breaking changes

**Error 1 - Module Resolution**:
```
Cannot find module 'msw/node' from '__tests__/mocks/server.ts'
```
- MSW 2.x changed import paths (`msw/node` → different export structure)

**Error 2 - Type Incompatibility**:
```typescript
error TS2345: Argument of type 'HttpHandler' is not assignable
to parameter of type 'RequestHandler<...>'
Types have separate declarations of a private property '__kind'.
```
- MSW 1.x → 2.x: `http.get()`, `http.post()` return types changed
- `setupServer()` signature incompatible with MSW 2.x handlers

**Current Dependencies**:
- `context-switcher`: msw@2.12.4 (latest)
- `auth`: msw@1.3.2 (old, working)

**Recommended Fix Options**:
1. **Downgrade** context-switcher to MSW 1.x (align with auth package)
2. **Upgrade** auth to MSW 2.x (requires test refactoring)
3. **Isolate** MSW versions per package (pnpm allows this)

**Impact**: **CRITICAL** - All 21 test suites blocked

#### ✅ **api-client** (25/25 tests passed)
#### ✅ **design-system** (13/13 test suites passed)
- 1 warning: Invalid `className` prop on `<input>` (vanilla-extract issue, non-blocking)

#### ⚠️ **auth** (21/21 suites, 261/264 tests passed, 3 skipped)
**Warnings** (non-blocking):
- Multiple "not wrapped in act(...)" warnings in integration tests
- Expected behavior in async state updates, tests passing

---

### 3. Package Structure Review

#### Root Workspace
✅ **IMPROVED** - Added `package.json` with workspace-level scripts:
```json
{
  "name": "django-core",
  "private": true,
  "scripts": {
    "lint": "pnpm -r --parallel lint",
    "test": "pnpm -r --parallel test",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r --parallel typecheck",
    "format": "pnpm -r --parallel format",
    "dev": "pnpm -r --parallel dev",
    "storybook": "pnpm --filter @django-core/design-system storybook"
  }
}
```

#### Package Consistency

| Package | Scripts | TypeCheck | Dev | Storybook | Version |
|---------|---------|-----------|-----|-----------|---------|
| design-system | ✅ Full | ✅ | ✅ | ✅ | 0.0.1 |
| api-client | ⚠️ Minimal | ❌ | ❌ | ❌ | 0.1.0 |
| auth | ✅ Full | ✅ | ✅ | ✅ | 1.0.0 |
| context-switcher | ✅ Good | ✅ | ❌ | ❌ | 0.1.0 |

**Script Gaps**:
- **api-client**: Missing `typecheck`, `dev`, `storybook` (intentional? utility package)
- **context-switcher**: Missing `dev`, `storybook` (should have for component package)

---

### 4. Dependency Issues

#### Peer Dependency Warnings
```
⚠️ packages/auth
  msw@1.3.2 requires typescript@<=5.2.x, found 5.6.2

⚠️ packages/design-system
  eslint-plugin-storybook requires eslint@^8, found 9.12.0
```

**Impact**: Non-blocking (pnpm allows mismatches), but may cause type errors in future

---

## Critical Blockers

### 🔴 **BLOCKER 1: context-switcher tests completely broken**
- **Cause**: MSW 2.x incompatibility
- **Affected**: All 21 test suites (100% failure rate)
- **Severity**: **CRITICAL** - Package untestable
- **Effort**: **MEDIUM** (~2-3 hours to downgrade/refactor)

### 🟡 **ISSUE 2: context-switcher lint errors**
- **Cause**: Unsafe API response handling (ESLint strict mode)
- **Affected**: 3 API files, 40 errors
- **Severity**: **HIGH** - Blocks CI/CD if strict linting enforced
- **Effort**: **LOW** (~1 hour to add type guards)

---

## Recommended Actions

### Immediate (Before F04)
1. **Fix MSW version mismatch**:
   - Option A: Downgrade context-switcher to msw@1.3.2 (quick fix)
   - Option B: Create MSW 2.x adapter for auth package (future-proof)

2. **Add type guards to api-client**:
   ```typescript
   // packages/api-client/src/guards.ts
   export function isApiError<T>(response: ApiResponse<T>): response is { error: ApiError } {
     return response.error !== undefined;
   }

   export function isApiSuccess<T>(response: ApiResponse<T>): response is { data: T } {
     return response.data !== undefined && response.error === undefined;
   }
   ```

3. **Update context-switcher API files** to use type guards

### Short-Term (Post-F04)
4. **Normalize package.json scripts**:
   - Add `typecheck` to api-client (or document why skipped)
   - Add `dev` to context-switcher
   - Standardize script naming across packages

5. **Address peer dependency warnings**:
   - Lock TypeScript to 5.2.x or upgrade msw in auth
   - Lock ESLint to ^8 or update Storybook plugin

6. **Add ARCHITECTURE.md** at root documenting:
   - Package structure and responsibilities
   - Shared dependencies (api-client, design-system)
   - Testing patterns (MSW versions, Jest setup)

### Long-Term
7. **Unify MSW version** across packages (MSW 2.x preferred)
8. **Add pre-commit hooks** for lint/typecheck
9. **CI/CD integration** with these validation commands

---

## Structure Assessment

### ✅ Strengths
- Clear package separation (design-system, api-client, feature packages)
- Consistent folder structure (`src/`, `__tests__/`, `stories/`)
- Workspace-level scripts now centralized
- Good test coverage (where tests run)

### ⚠️ Weaknesses
- Inconsistent MSW versions (1.3.2 vs 2.12.4)
- Missing type guards for API responses
- Script inconsistencies across packages
- No root-level architecture documentation

---

## Conclusion

**Repository Health**: ⚠️ **ACCEPTABLE WITH CAVEATS**

**Safe to Proceed to F04?**: ✅ **YES**, but with awareness:
- context-switcher tests are broken (MSW issue)
- context-switcher lint will fail in strict CI/CD
- These issues are **localized to F03 package** and won't block F04 development

**Estimated Fix Effort**:
- MSW downgrade: 2-3 hours
- Type guard fixes: 1 hour
- **Total**: ~4 hours to full green status

**Recommendation**:
1. Proceed with F04 work (blockers are isolated)
2. Schedule separate fix session for context-switcher issues
3. Apply structural improvements (scripts, docs) incrementally
