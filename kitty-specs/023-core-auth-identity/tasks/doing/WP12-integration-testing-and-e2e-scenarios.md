---
work_package_id: "WP12"
subtasks:
  - "T134"
  - "T135"
  - "T136"
  - "T137"
  - "T138"
  - "T139"
  - "T140"
  - "T141"
  - "T142"
  - "T143"
title: "Integration Testing & E2E Scenarios"
phase: "Phase 3 - Quality & Polish"
priority: "P3"
lane: "doing"
assignee: "claude-implementer"
agent: "claude-implementer"
shell_pid: "35160"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-09T17:05:00Z"
    lane: "doing"
    agent: "claude-implementer"
    shell_pid: "35160"
    action: "Started implementation - Integration testing and E2E scenarios"
  - timestamp: "2025-12-09T14:56:49Z"
    lane: "doing"
    agent: "system"
    shell_pid: ""
    action: "Moved to doing"
  - timestamp: "2025-12-08T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP12 – Integration Testing & E2E Scenarios

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand feedback, update `review_status: acknowledged`.

---

## Review Feedback

*[Empty initially. Reviewers will populate if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Write comprehensive integration tests covering all user stories end-to-end, validate cross-feature interactions.

**Success Criteria**:
- [ ] Integration test environment setup (MSW for API mocking, React Testing Library)
- [ ] All major user journeys covered by integration tests
- [ ] Tests use realistic data (no "test@test.com")
- [ ] Tests cover success paths and error paths
- [ ] Tests validate cross-feature interactions (sign-in → profile → sign-out)
- [ ] Tests include keyboard navigation and accessibility checks
- [ ] All integration tests pass
- [ ] Integration tests run in CI
- [ ] Test coverage ≥80% for all integration scenarios

**Independent Test**: Run `pnpm test:integration` → all tests pass. CI runs integration tests after unit tests → all pass.

---

## Context & Constraints

**Prerequisites**:
- WP04-WP08 completed (all features implemented)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/spec.md` - User stories (US01-US05)
- `kitty-specs/023-core-auth-identity/plan.md` - Test strategy
- `.kittify/memory/constitution.md` - Principle IV (Testing), X (CI/CD)

**Architectural Decisions**:
- **Test Framework**: Jest + React Testing Library
- **API Mocking**: MSW (Mock Service Worker) for realistic network mocking
- **Test Environment**: jsdom (browser environment)
- **Test Data**: Realistic user profiles, emails, passwords
- **Coverage**: All user stories (US01-US05) covered by integration tests

**Constraints**:
- Tests must be deterministic (no flakiness)
- Use realistic data (no placeholders like "test@test.com")
- Mock all backend API calls (no real backend required)
- Tests should run quickly (<10 seconds per test)

---

## Subtasks & Detailed Guidance

### Subtask T134 – Setup Integration Test Environment

**Purpose**: Configure MSW and test utilities for integration tests.

**Steps**:
1. Install MSW:
   ```bash
   pnpm add -D msw
   ```
2. Create MSW handlers:
   ```typescript
   // src/__tests__/mocks/handlers.ts
   import { rest } from 'msw';

   export const handlers = [
     rest.post('/api/v1/auth/login', (req, res, ctx) => {
       const { email, password } = req.body as any;
       if (email === 'user@example.com' && password === 'SecurePass123!') {
         return res(ctx.json({ user: { id: 1, email, first_name: 'John', last_name: 'Doe' } }));
       }
       return res(ctx.status(400), ctx.json({ success: false, errors: { __all__: ['Invalid credentials'] } }));
     }),

     rest.get('/api/v1/auth/me', (req, res, ctx) => {
       // Mock session check
       return res(ctx.json({ user: { id: 1, email: 'user@example.com', first_name: 'John', last_name: 'Doe' } }));
     }),

     // ... other handlers
   ];
   ```
3. Create MSW server:
   ```typescript
   // src/__tests__/mocks/server.ts
   import { setupServer } from 'msw/node';
   import { handlers } from './handlers';

   export const server = setupServer(...handlers);
   ```
4. Setup in Jest:
   ```typescript
   // src/__tests__/setup.ts
   import { server } from './mocks/server';

   beforeAll(() => server.listen());
   afterEach(() => server.resetHandlers());
   afterAll(() => server.close());
   ```
5. Update Jest config to include setup file:
   ```javascript
   // jest.config.js
   module.exports = {
     setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
   };
   ```

**Validation**:
- MSW server starts and stops correctly
- API calls are intercepted by MSW handlers

**Files Modified**:
- `package.json` (add MSW dependency)
- `src/__tests__/mocks/handlers.ts` (new)
- `src/__tests__/mocks/server.ts` (new)
- `src/__tests__/setup.ts` (new)
- `jest.config.js` (update setupFilesAfterEnv)

---

### Subtask T135 – Write Integration Test: Sign-In → Dashboard → Profile → Sign-Out

**Purpose**: Test complete authenticated user journey.

**Steps**:
1. Create `src/__tests__/integration/completeAuthFlow.test.tsx`
2. Test scenario:
   - Render app with SignInPage
   - Fill email and password
   - Submit form
   - Verify redirect to dashboard
   - Navigate to profile page
   - Verify profile data displayed
   - Trigger sign-out
   - Verify redirect to home
   - Verify AuthContext cleared
3. Example test:
   ```typescript
   import { render, fireEvent, waitFor, screen } from '@testing-library/react';
   import { AuthProvider } from '@/components/AuthProvider';
   import { MemoryRouter, Routes, Route } from 'react-router-dom';
   import { SignInPage, ProfilePage } from '@/components/pages';

   describe('Complete Auth Flow', () => {
     it('completes full user journey', async () => {
       const { getByLabelText, getByText } = render(
         <AuthProvider config={testConfig}>
           <MemoryRouter initialEntries={['/auth/login']}>
             <Routes>
               <Route path="/auth/login" element={<SignInPage />} />
               <Route path="/dashboard" element={<div>Dashboard</div>} />
               <Route path="/profile" element={<ProfilePage />} />
               <Route path="/" element={<div>Home</div>} />
             </Routes>
           </MemoryRouter>
         </AuthProvider>
       );

       // Sign in
       fireEvent.change(getByLabelText('Email'), { target: { value: 'user@example.com' } });
       fireEvent.change(getByLabelText('Password'), { target: { value: 'SecurePass123!' } });
       fireEvent.click(getByText('Sign In'));

       // Verify redirect to dashboard
       await waitFor(() => {
         expect(screen.getByText('Dashboard')).toBeInTheDocument();
       });

       // Navigate to profile
       window.history.pushState({}, '', '/profile');
       expect(screen.getByText(/Profile/i)).toBeInTheDocument();

       // Sign out
       fireEvent.click(getByText('Sign Out'));

       // Verify redirect to home
       await waitFor(() => {
         expect(screen.getByText('Home')).toBeInTheDocument();
       });
     });
   });
   ```

**Validation**:
- Test passes
- Covers full authenticated journey

**Files Modified**:
- `src/__tests__/integration/completeAuthFlow.test.tsx` (new)

---

### Subtask T136 – Write Integration Test: Password Reset Request → Email Link → Set New Password → Sign In

**Purpose**: Test complete password reset flow.

**Steps**:
1. Create `src/__tests__/integration/passwordResetFlow.test.tsx`
2. Test scenario:
   - Render RequestPasswordResetPage
   - Submit email
   - See generic success message
   - Navigate to ConfirmPasswordResetPage with token
   - Submit new password
   - See success message
   - Navigate to SignInPage
   - Sign in with new password
3. Mock handlers:
   ```typescript
   server.use(
     rest.post('/api/v1/auth/password-reset', (req, res, ctx) => {
       return res(ctx.status(200)); // Always success (no email enumeration)
     }),
     rest.post('/api/v1/auth/password-reset-confirm', (req, res, ctx) => {
       const { uidb64, token, new_password } = req.body as any;
       if (token === 'valid-token') {
         return res(ctx.status(200));
       }
       return res(ctx.status(400), ctx.json({ success: false, errors: { __all__: ['Invalid token'] } }));
     })
   );
   ```

**Validation**:
- Test passes
- Covers full password reset flow

**Files Modified**:
- `src/__tests__/integration/passwordResetFlow.test.tsx` (new)

---

### Subtask T137 – Write Integration Test: Session Expiry (401 Response) → Redirect to Login with ?next=

**Purpose**: Test session expiry handling.

**Steps**:
1. Create `src/__tests__/integration/sessionExpiry.test.tsx`
2. Test scenario:
   - Render app with authenticated user
   - User navigates to profile page
   - Mock /auth/me returns 401 (session expired)
   - Verify AuthContext cleared
   - Verify redirect to /auth/login?next=/profile
3. Mock handler:
   ```typescript
   server.use(
     rest.get('/api/v1/auth/me', (req, res, ctx) => {
       return res(ctx.status(401)); // Session expired
     })
   );
   ```

**Validation**:
- Test passes
- 401 triggers redirect correctly

**Files Modified**:
- `src/__tests__/integration/sessionExpiry.test.tsx` (new)

---

### Subtask T138 – Write Integration Test: Profile Update → Success Message → User Data Updated

**Purpose**: Test profile management flow.

**Steps**:
1. Create `src/__tests__/integration/profileUpdate.test.tsx`
2. Test scenario:
   - Render ProfilePage with authenticated user
   - Verify form pre-populated with user data
   - Change first_name
   - Enter current_password
   - Submit form
   - See success message
   - Verify AuthContext.user updated with new first_name
3. Mock handler:
   ```typescript
   server.use(
     rest.patch('/api/v1/auth/profile', (req, res, ctx) => {
       const { first_name, last_name, current_password } = req.body as any;
       if (current_password === 'SecurePass123!') {
         return res(ctx.json({ user: { id: 1, email: 'user@example.com', first_name, last_name } }));
       }
       return res(ctx.status(400), ctx.json({ success: false, errors: { current_password: ['Incorrect password'] } }));
     })
   );
   ```

**Validation**:
- Test passes
- Profile update updates AuthContext

**Files Modified**:
- `src/__tests__/integration/profileUpdate.test.tsx` (new)

---

### Subtask T139 – Write Integration Test: Validation Errors → Display Errors → Fix → Success

**Purpose**: Test error handling and recovery.

**Steps**:
1. Create `src/__tests__/integration/validationErrors.test.tsx`
2. Test scenario:
   - Render SignInPage
   - Submit empty form
   - Verify client-side validation errors displayed
   - Fill email with invalid format
   - Verify "Invalid email format" error
   - Fill valid email and password
   - Submit form with incorrect password (server error)
   - Verify server error displayed
   - Enter correct password
   - Submit form
   - Verify success (redirect to dashboard)

**Validation**:
- Test passes
- Covers client-side and server-side validation

**Files Modified**:
- `src/__tests__/integration/validationErrors.test.tsx` (new)

---

### Subtask T140 – Write Integration Test: Keyboard Navigation → Submit with Enter

**Purpose**: Test keyboard accessibility.

**Steps**:
1. Create `src/__tests__/integration/keyboardNavigation.test.tsx`
2. Test scenario:
   - Render SignInPage
   - Tab through form fields (email → password → button)
   - Verify focus visible on each element
   - Press Enter in password field
   - Verify form submitted
   - Verify redirect to dashboard
3. Use `userEvent` from @testing-library/user-event for realistic keyboard interactions

**Validation**:
- Test passes
- Enter key submits form

**Files Modified**:
- `src/__tests__/integration/keyboardNavigation.test.tsx` (new)

---

### Subtask T141 – Write Integration Test: Network Error → Generic Error → Retry → Success

**Purpose**: Test network error handling.

**Steps**:
1. Create `src/__tests__/integration/networkError.test.tsx`
2. Test scenario:
   - Render SignInPage
   - Submit form with network error (MSW returns 500)
   - Verify generic error message displayed
   - Retry submission (MSW returns 200)
   - Verify success (redirect to dashboard)
3. Mock handlers:
   ```typescript
   server.use(
     rest.post('/api/v1/auth/login', (req, res, ctx) => {
       return res.once(ctx.status(500)); // First call fails
     }),
     rest.post('/api/v1/auth/login', (req, res, ctx) => {
       return res(ctx.json({ user: { id: 1, email: 'user@example.com' } })); // Second call succeeds
     })
   );
   ```

**Validation**:
- Test passes
- Network error handling works correctly

**Files Modified**:
- `src/__tests__/integration/networkError.test.tsx` (new)

---

### Subtask T142 – Ensure All Integration Tests Use Realistic Data

**Purpose**: Make tests representative of real usage.

**Steps**:
1. Audit all integration tests
2. Replace placeholder data:
   - ❌ `test@test.com` → ✅ `john.doe@example.com`
   - ❌ `password` → ✅ `SecurePass123!`
   - ❌ `Test User` → ✅ `John Doe`
3. Use realistic uidb64/token values in password reset tests
4. Ensure email formats are valid
5. Ensure passwords meet validation rules

**Validation**:
- No placeholder data in tests
- All data is realistic and representative

---

### Subtask T143 – Add Integration Tests to CI Pipeline

**Purpose**: Automate integration test execution.

**Steps**:
1. Update GitHub Actions workflow:
   ```yaml
   # .github/workflows/ci.yml
   - name: Run unit tests
     run: |
       cd packages/auth
       pnpm test

   - name: Run integration tests
     run: |
       cd packages/auth
       pnpm test:integration
   ```
2. Separate integration tests from unit tests:
   ```json
   // package.json
   {
     "scripts": {
       "test": "jest --testPathIgnorePatterns=integration",
       "test:integration": "jest --testPathPattern=integration",
       "test:all": "jest"
     }
   }
   ```
3. Ensure integration tests run after unit tests pass

**Validation**:
- CI runs integration tests
- CI fails if integration tests fail

**Files Modified**:
- `.github/workflows/ci.yml` (add integration test job)
- `package.json` (add integration test script)

---

## Parallel Execution Strategy

**Parallel Group 1** (all integration tests can be written in parallel after T134):
- T135 (complete auth flow)
- T136 (password reset flow)
- T137 (session expiry)
- T138 (profile update)
- T139 (validation errors)
- T140 (keyboard navigation)
- T141 (network error)

**Sequential**:
- T134 (setup) → T135-T141 (tests) → T142 (realistic data) → T143 (CI)

---

## Testing & Validation Checklist

**Integration Tests**:
- [ ] Complete auth flow (T135)
- [ ] Password reset flow (T136)
- [ ] Session expiry (T137)
- [ ] Profile update (T138)
- [ ] Validation errors (T139)
- [ ] Keyboard navigation (T140)
- [ ] Network error (T141)
- [ ] All tests use realistic data (T142)

**CI**:
- [ ] Integration tests run in CI (T143)
- [ ] CI fails if integration tests fail

**Coverage**:
- [ ] Coverage ≥80% for integration scenarios

---

## Definition of Done

- [ ] All subtasks (T134-T143) completed
- [ ] All integration tests pass
- [ ] Tests use realistic data
- [ ] Integration tests run in CI
- [ ] Coverage ≥80%
- [ ] Code reviewed
- [ ] Merged to feature branch

---

## Risk Mitigation

**Risk**: Test flakiness
**Mitigation**: Use deterministic data, mock timers, avoid race conditions, use `waitFor` for async operations

**Risk**: Slow tests
**Mitigation**: Optimize MSW setup, use parallel test execution, keep tests focused

**Risk**: Brittle tests
**Mitigation**: Test user behavior (not implementation details), use semantic queries (`getByRole`, `getByLabelText`)

**Risk**: Tests pass but feature broken
**Mitigation**: Test realistic scenarios, use real component trees (not mocked components)

---

## Notes for Implementer

- **MSW**: Essential for realistic API mocking—don't mock fetch directly
- **Realistic data**: Critical for test quality—no "test@test.com"
- **Test behavior**: Test what user sees/does, not internal component state
- **Deterministic**: Avoid random data, timestamps, race conditions

**Common Pitfalls**:
- Using placeholder data like "test@test.com" (not representative)
- Mocking too much (lose integration test value)
- Testing implementation details instead of user behavior
- Not using `waitFor` for async operations (flaky tests)
- Over-engineering tests (keep them simple and focused)

---

## Constitutional Compliance

**Principle IV (Testing)**:
- Comprehensive integration test coverage
- Realistic scenarios
- All user stories covered

**Principle X (CI/CD)**:
- Integration tests in CI
- Block merge on failures

---

## Handoff to Next Work Package

**Output Artifacts**:
- Complete integration test suite (T135-T141)
- MSW setup for API mocking
- CI workflow with integration tests

**This is the final work package**—all features implemented, tested, documented, and optimized.

---

**Prompt Version**: 1.0
**Last Updated**: 2025-12-08
**Maintainer**: F02 Implementation Team

## Activity Log

- 2025-12-09T14:56:49Z – system – shell_pid= – lane=doing – Moved to doing
