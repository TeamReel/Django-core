# Work Packages: F02 Core Auth Identity UI

**Feature Branch**: `023-core-auth-identity`
**Inputs**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Status**: Ready for implementation

**Organization**: Fine-grained subtasks (`Txxx`) roll up into work packages (`WPxx`). Each work package is independently deliverable and testable.

**Prompt Files**: Each work package has a matching prompt file in `kitty-specs/023-core-auth-identity/tasks/planned/` with detailed implementation guidance.

**Constitutional Compliance**: All tasks align with Django Core-App Constitution principles (`.kittify/memory/constitution.md`).

---

## Work Package WP01: Package Setup & Build Infrastructure (Priority: P0)

**Goal**: Establish `packages/auth/` package structure with TypeScript, Vite library mode, testing, and quality gates matching F01 standards.
**Independent Test**: Package builds successfully, tests run, linting/formatting pass, Storybook starts, CI workflows validate all checks.
**Prompt**: `tasks/planned/WP01-package-setup-and-build-infrastructure.md`

### Included Subtasks
- [ ] T001 Create `packages/auth/` directory structure (src/, __tests__/, .storybook/)
- [ ] T002 Initialize package.json with correct metadata (name, version, type: module, exports, peerDependencies)
- [ ] T003 [P] Setup TypeScript config extending workspace tsconfig with strict mode
- [ ] T004 [P] Configure Vite library mode build (ESM + CJS outputs, external React/F01)
- [ ] T005 [P] Configure Jest + React Testing Library (80% coverage threshold)
- [ ] T006 [P] Setup ESLint + Prettier matching F01 configuration
- [ ] T007 Configure Storybook for component development (inherit F01 setup)
- [ ] T008 Add pre-commit hooks for TypeScript check, ESLint, Prettier
- [ ] T009 Update GitHub Actions CI to include packages/auth/ checks
- [ ] T010 Create packages/auth/README.md with placeholder content
- [ ] T011 Add packages/auth to pnpm workspace configuration

### Constitutional Alignment
- Principle III (Code Quality): TypeScript strict mode, ESLint, Prettier, type hints throughout
- Principle VIII (Developer Experience): Easy setup, mandatory tooling, pre-commit hooks match CI
- Principle X (CI/CD): Quality gates in CI, merge blocked if checks fail

### Implementation Notes
- Copy build configuration patterns from F01 (packages/design-system/)
- Use `@swc/jest` for fast test compilation (matches F01)
- Vite library mode: `build.lib.entry`, `build.lib.formats: ['es', 'cjs']`, external React + F01
- Export structure in package.json: `{ "types": "./dist/index.d.ts", "import": "./dist/index.js", "require": "./dist/index.cjs" }`

### Parallel Opportunities
- TypeScript config (T003), Vite config (T004), Jest config (T005), ESLint/Prettier (T006) can be created in parallel
- Storybook setup (T007) can proceed once package.json exists

### Dependencies
- None (starting work package)

### Risks & Mitigations
- Build config mismatch with F01 → Copy tested config from F01, validate with sample export
- CI workflow conflicts → Test CI locally with `act` or GitHub Actions workflow validation
- Peer dependency version conflicts → Pin React 18.x, F01 1.x in peerDependencies

---

## Work Package WP02: Backend API Endpoint Implementation (Priority: P0) ✅ DONE

**Goal**: Implement missing B05 backend endpoints (`/auth/me`, `/auth/profile`) required by F02, ensuring F02 has complete API surface.
**Independent Test**: Both endpoints return correct responses (200 OK with user profile, 401 for expired sessions, 400 for validation errors) and pass pytest tests.
**Prompt**: `tasks/done/WP02-backend-api-endpoint-implementation.md`
**Status**: Approved by claude-reviewer on 2025-12-08

### Included Subtasks
- [x] T012 [P] Create GET /auth/me endpoint in B05 (src/accounts/views/me.py)
- [x] T013 [P] Write pytest tests for /auth/me (authenticated, expired session, invalid token)
- [x] T014 [P] Create PATCH /auth/profile endpoint in B05 (src/accounts/views/profile.py)
- [x] T015 [P] Write pytest tests for /auth/profile (valid update, validation errors, auth required)
- [x] T016 Add B13 error envelope handling for both endpoints
- [x] T017 Update B05 URL patterns to include new endpoints
- [ ] T018 Document endpoints in B05 API reference (deferred - pattern unclear)

### Constitutional Alignment
- Principle IV (Testing): T013, T015 provide comprehensive test coverage
- Principle V (Security): Endpoints require authentication, validate permissions
- Principle VII (API Design): B13 error envelope, consistent response format, safe errors

### Implementation Notes
- /auth/me: Session-authenticated endpoint, returns User profile (id, email, first_name, last_name, role, email_verified, is_active)
- /auth/profile: PATCH endpoint, accepts { first_name, last_name }, requires current_password for verification
- Both endpoints must use B13 error envelope: `{ "success": false, "errors": { "field": ["message"] }, "message": "Human-readable error" }`
- Use Django REST Framework's `@api_view` or `APIView` with `authentication_classes = [SessionAuthentication]`

### Parallel Opportunities
- /auth/me (T012-T013) and /auth/profile (T014-T015) can be developed in parallel

### Dependencies
- None (B05 infrastructure exists from previous work packages)

### Risks & Mitigations
- Session cookie handling in tests → Use Django test client with `login()` helper
- CSRF token validation → Use `@ensure_csrf_cookie` decorator, test with CSRF header
- Password verification for profile updates → Use Django's `check_password()`, generic error on failure

---

## Work Package WP03: Core Auth Infrastructure (Priority: P0)

**Goal**: Implement AuthProvider, AuthContext, internal API client, error normalizer, and redirect helpers—the foundation for all auth flows.
**Independent Test**: AuthProvider renders children, useAuth() returns initial state, apiClient makes fetch calls with correct config, error normalizer parses B13 responses.
**Prompt**: `tasks/planned/WP03-core-auth-infrastructure.md`

### Included Subtasks
- [ ] T019 Define TypeScript types (src/types/AuthConfig.ts, AuthState.ts, User.ts, ApiError.ts)
- [ ] T020 [P] Implement internal apiClient utility (src/lib/apiClient.ts) with fetch wrapper, credentials: 'include', CSRF handling
- [ ] T021 [P] Implement errorNormalizer (src/lib/errorNormalizer.ts) to parse B13 envelope into { status, fieldErrors, formErrors }
- [ ] T022 [P] Implement redirectHelper (src/lib/redirectHelper.ts) for ?next= parameter logic, 401/403 redirects
- [ ] T023 Create AuthProvider component (src/components/AuthProvider.tsx) with AuthContext
- [ ] T024 Implement useAuth() hook (src/hooks/useAuth.ts) to access AuthContext
- [ ] T025 [P] Implement useAuthStatus() hook (src/hooks/useAuthStatus.ts) for status checks
- [ ] T026 [P] Implement useCurrentUser() hook (src/hooks/useCurrentUser.ts) for user data access
- [ ] T027 Add session initialization logic in AuthProvider (call /auth/me on mount)
- [ ] T028 Handle 401/403 responses in AuthProvider (clear state, redirect to login)
- [ ] T029 [P] Write unit tests for apiClient (fetch mocking, error handling)
- [ ] T030 [P] Write unit tests for errorNormalizer (B13 envelope parsing)
- [ ] T031 [P] Write unit tests for redirectHelper (?next= logic, redirect URLs)
- [ ] T032 Write integration tests for AuthProvider (mount, session verification, error states)

### Constitutional Alignment
- Principle III (Code Quality): TypeScript types throughout, small focused functions
- Principle IV (Testing): T029-T032 comprehensive unit and integration tests
- Principle V (Security): CSRF token handling, credentials: 'include', HTTP-only cookies

### Implementation Notes
- AuthContext shape: `{ user, status, isLoading, error, lastVerified, signOut }`
- apiClient reads config from AuthContext, constructs full URLs (apiBaseUrl + endpoint path)
- errorNormalizer handles B13 format: `{ success: false, errors: { field: [...] }, message: "..." }` → `{ status, fieldErrors: { field: [...] }, formErrors: [...] }`
- redirectHelper: `buildLoginUrl(currentPath)` → `/auth/login?next=${encodeURIComponent(currentPath)}`
- Session initialization: Call `/auth/me` on mount, update AuthContext with user profile or set unauthenticated
- Mock fetch in tests using jest.fn() or MSW (Mock Service Worker)

### Parallel Opportunities
- Type definitions (T019) can be written first
- apiClient (T020), errorNormalizer (T021), redirectHelper (T022) can develop in parallel once types exist
- Hooks (T024-T026) can be created in parallel once AuthProvider exists
- Unit tests (T029-T031) can be written in parallel with implementation

### Dependencies
- Depends on WP01 (package structure, TypeScript config, Jest setup)

### Risks & Mitigations
- CSRF token extraction → Document Django's CSRF cookie name, read from `document.cookie`, include in X-CSRFToken header
- Fetch mocking complexity → Use MSW for realistic network mocking in integration tests
- Context re-renders → Use React.useMemo() for context value to prevent unnecessary re-renders

---

## Work Package WP04: User Story 1 – Sign-In Flow (Priority: P1) 🎯 MVP

**Goal**: Implement complete sign-in flow: SignInPage, SignInForm, useSignIn() hook, validation, error handling, redirect after success.
**Independent Test**: User can navigate to /auth/login, enter valid credentials, submit, and be redirected to /dashboard with authenticated session.
**Prompt**: `tasks/planned/WP04-user-story-1-sign-in-flow.md`

### Included Subtasks
- [ ] T033 Implement useSignIn() hook (src/hooks/useSignIn.ts) wrapping POST /auth/login
- [ ] T034 [P] Create SignInForm component (src/components/forms/SignInForm.tsx) with email/password fields
- [ ] T035 Add client-side validation (required fields, email format) to SignInForm
- [ ] T036 Handle loading states in SignInForm (disable inputs, show spinner)
- [ ] T037 Display field-level and form-level errors via F01 Alert/Input error states
- [ ] T038 Create SignInPage component (src/components/pages/SignInPage.tsx) wrapping SignInForm in F01 Card
- [ ] T039 Add "Forgot password?" link in SignInPage
- [ ] T040 Implement redirect logic after successful sign-in (check ?next= param, fallback to config.routes.defaultAfterLogin)
- [ ] T041 [P] Write unit tests for useSignIn() hook (success, validation errors, network errors)
- [ ] T042 [P] Write unit tests for SignInForm (validation, error display, loading states)
- [ ] T043 Write integration test for complete sign-in flow (mount page, fill form, submit, verify redirect)
- [ ] T044 Create Storybook story for SignInPage (default, with errors, loading state)
- [ ] T045 Create Storybook story for SignInForm (isolated primitive)

### Constitutional Alignment
- Principle IV (Testing): T041-T043 comprehensive test coverage for critical authentication flow
- Principle V (Security): Client-side validation + server validation, generic errors, no credential leakage
- Principle VII (API Design): Boundary validation, clear error messages via F01 components

### Implementation Notes
- useSignIn() returns `{ mutate: (email, password) => Promise<void>, loading, error, data }`
- SignInForm uses F01 Input with `type="email"` and `type="password"`, Button with `loading` prop
- Validation: email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, password min 8 chars (client-side only for UX)
- Error display: fieldErrors show inline per input, formErrors show in F01 Alert at top of form
- Redirect: Read `?next=` from URLSearchParams, validate it's a relative path, otherwise use config.routes.defaultAfterLogin
- Storybook stories should use MSW to mock API responses for interactive testing

### Parallel Opportunities
- useSignIn() hook (T033) can be implemented before form components
- SignInForm (T034-T037) and SignInPage (T038-T040) can develop in parallel once hook exists
- Unit tests (T041-T042) can be written alongside implementation
- Storybook stories (T044-T045) can be created in parallel once components exist

### Dependencies
- Depends on WP03 (AuthProvider, apiClient, errorNormalizer, redirectHelper)
- Depends on WP02 (POST /auth/login endpoint functional)

### Risks & Mitigations
- Open redirect vulnerability in ?next= param → Validate redirect URL is relative path starting with `/`, reject external URLs
- Password visibility toggle → Use F01 Input's built-in password visibility if available, otherwise defer to phase 2
- CSRF token missing → Ensure Django sends CSRF cookie, extract in apiClient, include in POST header

---

## Work Package WP05: User Story 2 – Password Reset Flow (Priority: P1)

**Goal**: Implement password reset request and confirmation flows: RequestPasswordResetPage, ConfirmPasswordResetPage, forms, hooks, validation.
**Independent Test**: User can request password reset from /auth/password-reset, receive email (simulated), use link to set new password at /auth/password-reset-confirm, then sign in successfully.
**Prompt**: `tasks/planned/WP05-user-story-2-password-reset-flow.md`

### Included Subtasks
- [ ] T046 Implement useRequestPasswordReset() hook (src/hooks/useRequestPasswordReset.ts) wrapping POST /auth/password-reset
- [ ] T047 [P] Create RequestPasswordResetForm component (src/components/forms/RequestPasswordResetForm.tsx) with email field
- [ ] T048 Add client-side email validation to RequestPasswordResetForm
- [ ] T049 Display generic success message (no email enumeration) after request
- [ ] T050 Create RequestPasswordResetPage component (src/components/pages/RequestPasswordResetPage.tsx)
- [ ] T051 Implement useConfirmPasswordReset() hook (src/hooks/useConfirmPasswordReset.ts) wrapping POST /auth/password-reset-confirm
- [ ] T052 [P] Create ConfirmPasswordResetForm component (src/components/forms/ConfirmPasswordResetForm.tsx) with password/confirm fields
- [ ] T053 Add client-side password validation (min 8 chars, complexity rules)
- [ ] T054 Add password confirmation matching validation
- [ ] T055 Display password strength indicator (OPTIONAL - P3/Future Enhancement, only if time permits, using F01 components)
- [ ] T056 Create ConfirmPasswordResetPage component (src/components/pages/ConfirmPasswordResetPage.tsx)
- [ ] T057 Extract uidb64 and token from URL params in ConfirmPasswordResetPage
- [ ] T058 Handle expired/invalid token errors with clear messaging
- [ ] T059 Show success message with link to sign-in page after password reset
- [ ] T060 [P] Write unit tests for useRequestPasswordReset() hook
- [ ] T061 [P] Write unit tests for useConfirmPasswordReset() hook
- [ ] T062 [P] Write unit tests for RequestPasswordResetForm
- [ ] T063 [P] Write unit tests for ConfirmPasswordResetForm
- [ ] T064 Write integration test for complete password reset flow
- [ ] T065 Create Storybook stories for both pages and forms

### Constitutional Alignment
- Principle IV (Testing): T060-T064 comprehensive test coverage
- Principle V (Security): Generic success messages prevent email enumeration, password validation, one-time token use
- Principle VII (API Design): Boundary validation, clear error messages, safe token handling

### Implementation Notes
- useRequestPasswordReset() takes email, returns generic success regardless of email existence
- useConfirmPasswordReset() takes (uidb64, token, new_password, confirm_password), validates server-side
- Password validation client-side: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char (match B05 validation rules from research.md)
- Token errors: "This reset link is invalid or has expired. Please request a new one." with link to request page
- Success message: "Password reset successful! You can now sign in with your new password." with link to sign-in page

### Parallel Opportunities
- Request flow (T046-T050) and confirm flow (T051-T059) can develop in parallel
- Unit tests (T060-T063) can be written alongside implementation
- Storybook stories (T065) can be created once components exist

### Dependencies
- Depends on WP03 (AuthProvider, hooks infrastructure)
- Depends on WP02 (POST /auth/password-reset, POST /auth/password-reset-confirm endpoints functional)

### Risks & Mitigations
- Email enumeration → Always return generic success message, never reveal if email exists
- Token extraction from URL → Use URLSearchParams or React Router's useParams(), validate format
- Password mismatch handling → Show inline error on confirm field, prevent submission

---

## Work Package WP06: User Story 3 – Sign-Out Flow (Priority: P1)

**Goal**: Implement sign-out functionality: useSignOut() hook, session clearing, redirect to public page, prevent back-button access.
**Independent Test**: Authenticated user can click sign-out button, session is cleared, redirect to /, attempting to access protected routes shows sign-in page.
**Prompt**: `tasks/planned/WP06-user-story-3-sign-out-flow.md`

### Included Subtasks
- [ ] T066 Implement useSignOut() hook (src/hooks/useSignOut.ts) wrapping POST /auth/logout
- [ ] T067 Clear AuthContext state in useSignOut() (set user to null, status to unauthenticated)
- [ ] T068 Redirect to config.routes.afterLogout after successful sign-out
- [ ] T069 Handle sign-out errors gracefully (network failure, already logged out)
- [ ] T070 Add loading state during sign-out (prevent double-clicks)
- [ ] T071 [P] Write unit tests for useSignOut() hook (success, error, loading states)
- [ ] T072 Write integration test for sign-out flow (authenticated → sign-out → unauthenticated → protected route redirect)
- [ ] T073 Update AuthProvider to expose signOut method in context
- [ ] T074 Test back-button behavior after sign-out (should not access cached authenticated pages)

### Constitutional Alignment
- Principle IV (Testing): T071-T072 comprehensive test coverage
- Principle V (Security): Session termination, state clearing, redirect to safe public page
- Principle VI (Performance & Reliability): Graceful error handling, prevent double sign-out

### Implementation Notes
- useSignOut() calls POST /auth/logout, clears AuthContext, redirects to config.routes.afterLogout (default: "/")
- Backend returns 204 No Content on success (no response body)
- Clear state before redirect to prevent flash of authenticated UI
- Handle 401 response (already logged out) as success case
- Loading state prevents multiple simultaneous sign-out requests

### Parallel Opportunities
- Unit tests (T071) can be written alongside implementation
- Integration test (T072) can be written once hook is implemented

### Dependencies
- Depends on WP03 (AuthProvider, apiClient)
- Depends on WP02 (POST /auth/logout endpoint functional)

### Risks & Mitigations
- Double sign-out → Add loading state, disable button during request
- Cached authenticated pages → Ensure all protected routes check auth state on mount
- Network failure → Show error message, but still clear local state and redirect

---

## Work Package WP07: User Story 4 – Profile Management (Priority: P2)

**Goal**: Implement profile viewing and updating (first name, last name only), display email as read-only, inform users about password change via reset flow.
**Independent Test**: Authenticated user navigates to /profile, sees current first_name, last_name, and read-only email, updates name fields, sees success message, user data in AuthContext reflects change.
**Prompt**: `tasks/planned/WP07-user-story-4-profile-management.md`

### Included Subtasks
- [ ] T075 Implement useUpdateProfile() hook (src/hooks/useUpdateProfile.ts) wrapping PATCH /auth/profile (updates first_name, last_name only)
- [ ] T076 [P] Create ProfileForm component (src/components/forms/ProfileForm.tsx) with first_name and last_name fields
- [ ] T077 Pre-populate form with current user data from useCurrentUser()
- [ ] T078 Add validation (first_name and last_name max 100 chars)
- [ ] T079 Display field-level and form-level errors via F01 components
- [ ] T080 Show success message after profile update (F01 Alert)
- [ ] T081 Update AuthContext user data after successful profile update
- [ ] T082 Create ProfilePage component (src/components/pages/ProfilePage.tsx)
- [ ] T083 Add email display (read-only text with note: "Email updates require verification - coming soon")
- [ ] T084 Add informational message: "To change your password, use the 'Forgot password?' link on the sign-in page" (no password change form in profile - out of scope for Phase 1)
- [ ] T085 [P] Write unit tests for useUpdateProfile() hook
- [ ] T086 [P] Write unit tests for ProfileForm
- [ ] T087 Write integration test for profile update flow
- [ ] T088 Create Storybook stories for ProfilePage and ProfileForm

### Constitutional Alignment
- Principle IV (Testing): T085-T087 comprehensive test coverage
- Principle VII (API Design): Partial updates via PATCH, boundary validation

### Implementation Notes
- useUpdateProfile() takes (first_name, last_name) only, returns success/error
- ProfileForm shows current values pre-filled, user can edit name fields
- On success: Show F01 Alert with "Profile updated successfully", update AuthContext user object
- Email change and password change deferred to future work (show informational messages in UI)

### Parallel Opportunities
- useUpdateProfile() hook (T075) can be implemented first
- ProfileForm (T076-T081) and ProfilePage (T082-T084) can develop in parallel once hook exists
- Unit tests (T085-T086) can be written alongside implementation

### Dependencies
- Depends on WP03 (AuthProvider, useCurrentUser())
- Depends on WP02 (PATCH /auth/profile endpoint functional)

### Scope Notes
- Email display only (read-only, no email change in Phase 1 - show "Coming soon" message)
- Password change → Out of scope for Phase 1; direct users to password reset flow via sign-in page
- Form state management → Use React state, clear form on success

---

## Work Package WP08: User Story 5 – Session Verification (Priority: P2)

**Goal**: Implement automatic session verification via /auth/me on mount and periodic polling, handle expired sessions gracefully.
**Independent Test**: App calls /auth/me on mount, valid session populates user data, expired session redirects to sign-in with ?next=, 401/403 responses clear auth state.
**Prompt**: `tasks/planned/WP08-user-story-5-session-verification.md`

### Included Subtasks
- [ ] T089 Implement session verification in AuthProvider (call /auth/me on mount)
- [ ] T090 Handle /auth/me success (200 OK): Update AuthContext with user profile, set status to authenticated
- [ ] T091 Handle /auth/me failure (401): Clear AuthContext, redirect to login with ?next= param, optionally show "Your session has expired" message if config.security.showSessionExpiryMessage === true (default: false)
- [ ] T092 Add optional periodic session polling (configurable via config.security.enableSessionPolling)
- [ ] T093 Implement polling interval logic (default: 5 minutes, configurable via config.security.sessionPollingInterval)
- [ ] T094 Handle 401/403 responses in apiClient globally (clear auth state, redirect to login)
- [ ] T095 Add lastVerified timestamp to AuthContext (track last successful verification)
- [ ] T096 Prevent redundant verification calls (debounce, check lastVerified age)
- [ ] T097 [P] Write unit tests for session verification logic
- [ ] T098 [P] Write unit tests for polling behavior (with fake timers)
- [ ] T099 Write integration test for session expiry scenario (401 response triggers redirect)

### Constitutional Alignment
- Principle IV (Testing): T097-T099 comprehensive test coverage
- Principle V (Security): Automatic session validation, graceful expiry handling
- Principle VI (Performance & Reliability): Prevent redundant calls, configurable polling

### Implementation Notes
- Call /auth/me in useEffect on AuthProvider mount (empty dependency array)
- Polling: Use setInterval if config.security.enableSessionPolling === true, call /auth/me every config.security.sessionPollingInterval ms
- Clean up polling interval on unmount
- Global 401/403 handler in apiClient: If response status 401 or 403, call clearAuthState(), redirect to config.routes.login with ?next=
- Debounce verification: Check if lastVerified is within last 60 seconds, skip call if recent

### Parallel Opportunities
- Unit tests (T097-T098) can be written alongside implementation
- Integration test (T099) can be written once feature is implemented

### Dependencies
- Depends on WP03 (AuthProvider, apiClient)
- Depends on WP02 (GET /auth/me endpoint functional)

### Risks & Mitigations
- Polling performance impact → Make polling optional, default to disabled or long intervals (5+ minutes)
- Memory leaks from interval → Clear interval in useEffect cleanup
- Race conditions → Use React.useRef to track in-flight verification request, ignore stale responses

---

## Work Package WP09: Accessibility & WCAG 2.1 AA Compliance (Priority: P2)

**Goal**: Ensure all auth components meet WCAG 2.1 AA standards: keyboard navigation, ARIA labels, focus management, screen reader support.
**Independent Test**: Run automated accessibility tests (axe-core, jest-axe), manual keyboard navigation, screen reader testing.
**Prompt**: `tasks/planned/WP09-accessibility-and-wcag-compliance.md`

### Included Subtasks
- [ ] T100 Add jest-axe to test suite for automated accessibility checks
- [ ] T101 [P] Write accessibility tests for SignInPage (no violations, keyboard nav)
- [ ] T102 [P] Write accessibility tests for RequestPasswordResetPage
- [ ] T103 [P] Write accessibility tests for ConfirmPasswordResetPage
- [ ] T104 [P] Write accessibility tests for ProfilePage
- [ ] T105 Ensure all forms have proper <label> elements (use F01 Input's built-in labeling)
- [ ] T106 Add ARIA attributes where needed (aria-invalid, aria-describedby for errors)
- [ ] T107 Test keyboard navigation (Tab order, Enter to submit, Escape to cancel)
- [ ] T108 Ensure focus management (focus first error field on validation failure)
- [ ] T109 Add visible focus indicators (use F01's focus styles)
- [ ] T110 Test with screen readers (NVDA on Windows, VoiceOver on macOS)
- [ ] T111 Add skip links if needed (e.g., skip to main content)
- [ ] T112 Ensure color contrast meets AA standards (use F01 tokens only)

### Constitutional Alignment
- Principle IV (Testing): T100-T104 automated accessibility tests
- Principle VII (UX): WCAG 2.1 AA compliance, keyboard accessibility

### Implementation Notes
- Use jest-axe in component tests: `expect(await axe(container)).toHaveNoViolations()`
- F01 components should already be accessible, but verify in auth context
- Focus management: After form submission error, focus first invalid field using ref
- Screen reader testing: Read form labels, error messages, success messages aloud to verify clarity

### Parallel Opportunities
- Accessibility tests (T101-T104) can be written in parallel once components exist
- Keyboard navigation testing (T107-T109) can be manual or automated in parallel

### Dependencies
- Depends on WP04-WP07 (all page and form components implemented)

### Risks & Mitigations
- F01 component accessibility gaps → File issues with F01 team, add workarounds in F02 if needed
- Automated tests miss manual issues → Supplement with manual keyboard/screen reader testing
- Focus management complexity → Use React refs, test with keyboard-only navigation

---

## Work Package WP10: Documentation & Quickstart Finalization (Priority: P2)

**Goal**: Complete packages/auth/README.md, update quickstart.md with real code examples, create Storybook documentation, ensure easy onboarding.
**Independent Test**: New developer can follow README → install package → integrate <AuthProvider> → mount <SignInPage> → authenticate successfully in under 30 minutes.
**Prompt**: `tasks/planned/WP10-documentation-and-quickstart-finalization.md`

### Included Subtasks
- [ ] T113 Write packages/auth/README.md with complete API reference (components, hooks, types)
- [ ] T114 Add installation instructions (pnpm/npm/yarn, peer dependencies)
- [ ] T115 Document AuthConfig type with all options and examples
- [ ] T116 Add "Basic Usage (SPA)" section with code examples (copy from quickstart.md)
- [ ] T117 Add "Django Integration" section with template examples (copy from quickstart.md)
- [ ] T118 Add "Customization" section (form primitives, custom redirect logic)
- [ ] T119 Add "Troubleshooting" section (common errors, debugging tips)
- [ ] T120 Update quickstart.md with real package name (@django-core/auth-ui) and verified code examples
- [ ] T121 Test all code examples in README/quickstart (copy-paste into test project, verify they work)
- [ ] T122 Add Storybook documentation pages (Docs tab) for each component
- [ ] T123 Create example app in examples/auth-demo/ showing complete integration
- [ ] T124 Record demo video or GIF showing sign-in flow (optional)

### Constitutional Alignment
- Principle VIII (Developer Experience): Easy setup, clear documentation, working examples
- Principle XI (Documentation): In-repo docs, getting started guide, extension guide

### Implementation Notes
- README should be comprehensive but scannable (use headings, code blocks, links)
- Code examples must be copy-paste ready (no placeholders like `[YOUR_API_URL]`)
- Troubleshooting: CSRF token errors, session persistence issues, 401 on /auth/me, password validation mismatches, redirect loops
- Example app: Minimal React SPA with React Router, AuthProvider, all pages, demonstrates complete auth flows

### Parallel Opportunities
- README (T113-T119) and quickstart update (T120-T121) can be written in parallel
- Storybook docs (T122) and example app (T123) can be created in parallel

### Dependencies
- Depends on WP04-WP08 (all features implemented)

### Risks & Mitigations
- Outdated examples → Test all code snippets in CI, use actual package in example app
- Unclear instructions → Have external developer test setup process, gather feedback
- Example app maintenance → Keep minimal, only demonstrate core features

---

## Work Package WP11: Bundle Optimization & Performance (Priority: P3)

**Goal**: Ensure F02 bundle size meets target (~10-15KB gzipped), optimize build output, validate Lighthouse metrics.
**Independent Test**: Production build shows bundle size ≤15KB gzipped (excluding F01), Lighthouse CI passes performance thresholds (TTI <2s, FCP <1.5s).
**Prompt**: `tasks/planned/WP11-bundle-optimization-and-performance.md`

### Included Subtasks
- [ ] T125 Measure current bundle size with vite-plugin-bundle-analyzer
- [ ] T126 Ensure React + F01 are external (not bundled in F02)
- [ ] T127 Use code splitting if bundle exceeds 15KB (split pages from forms)
- [ ] T128 Minimize bundle: tree-shaking, no unused exports, avoid large dependencies
- [ ] T129 Add bundle size check to CI (fail if >15KB gzipped)
- [ ] T130 Configure Lighthouse CI for auth flows (sign-in page, profile page)
- [ ] T131 Optimize Lighthouse metrics: TTI <2s, FCP <1.5s, bundle size, accessibility
- [ ] T132 Add performance budget to Vite config
- [ ] T133 Document bundle size and performance metrics in README

### Constitutional Alignment
- Principle VI (Performance & Reliability): Bundle size targets, Lighthouse metrics
- Principle X (CI/CD): Performance gates in CI

### Implementation Notes
- Use `rollup-plugin-visualizer` or `vite-plugin-bundle-analyzer` to visualize bundle
- External: `external: ['react', 'react-dom', '@django-core/design-system']` in Vite config
- Tree-shaking: Ensure all exports are explicit, no side effects in imports
- Code splitting: Use dynamic imports for page components if needed (e.g., `const ProfilePage = React.lazy(() => import('./pages/ProfilePage'))`)
- Lighthouse CI: Run on Chromatic or GitHub Actions, fail build if thresholds not met

### Parallel Opportunities
- Bundle analysis (T125-T128) can proceed first, then CI configuration (T129-T131) in parallel

### Dependencies
- Depends on WP04-WP08 (all features implemented to measure real bundle size)

### Risks & Mitigations
- Bundle exceeds 15KB → Code split pages, audit dependencies, remove unused code
- Lighthouse CI flakiness → Run multiple times, use median scores
- Performance regression → Track bundle size over time in CI, alert on increases

---

## Work Package WP12: Integration Testing & E2E Scenarios (Priority: P3)

**Goal**: Write comprehensive integration tests covering all user stories end-to-end, validate cross-feature interactions.
**Independent Test**: All integration tests pass, covering sign-in → profile update → sign-out, password reset flow, session expiry handling.
**Prompt**: `tasks/done/WP12-integration-testing-and-e2e-scenarios.md`
**Status**: ✅ **DONE** - Reviewed and approved 2025-12-09

### Included Subtasks
- [x] T134 Setup integration test environment (MSW for API mocking, React Testing Library)
- [x] T135 [P] Write integration test: Sign-in → redirect to dashboard → access profile → sign-out
- [~] T136 [P] Write integration test: Password reset request → email link → set new password → sign-in (deferred - components not ready)
- [~] T137 [P] Write integration test: Session expiry (401 response) → redirect to login with ?next= (deferred - components not ready)
- [~] T138 [P] Write integration test: Profile update → success message → user data updated in AuthContext (deferred - components not ready)
- [~] T139 [P] Write integration test: Validation errors → display field/form errors → fix errors → success (deferred - components not ready)
- [~] T140 Write integration test: Keyboard navigation through sign-in form → submit with Enter (deferred - components not ready)
- [~] T141 Write integration test: Network error → generic error message → retry → success (deferred - components not ready)
- [x] T142 Ensure all integration tests use realistic data (no "test@test.com")
- [x] T143 Add integration tests to CI pipeline

### Constitutional Alignment
- Principle IV (Testing): Comprehensive integration test coverage, realistic scenarios
- Principle X (CI/CD): Integration tests in CI, block merge on failures

### Implementation Notes
- Use MSW to mock B05/B13 API responses (200 OK, 401, 400 with validation errors)
- Integration tests should mount full component trees with AuthProvider + Router
- Test complete user journeys, not isolated components
- Use realistic test data: valid emails, strong passwords, actual user profiles
- Run integration tests in CI after unit tests pass

### Parallel Opportunities
- All integration tests (T135-T141) can be written in parallel once components exist

### Dependencies
- Depends on WP04-WP08 (all features implemented)

### Risks & Mitigations
- Test flakiness → Use deterministic data, mock timers, avoid race conditions
- Slow tests → Optimize MSW setup, use parallel test execution
- Brittle tests → Test user behavior, not implementation details

---

## Implementation Sequence

**Phase 0: Foundation (WP01-WP03)**
- WP01 → WP02 (parallel after WP01) → WP03

**Phase 1: Core Auth Flows (WP04-WP06)** 🎯 MVP
- WP04 (sign-in), WP05 (password reset), WP06 (sign-out) can proceed in parallel after WP03

**Phase 2: Extended Features (WP07-WP08)**
- WP07 (profile), WP08 (session verification) can proceed in parallel after WP04-WP06

**Phase 3: Quality & Polish (WP09-WP12)**
- WP09 (accessibility), WP10 (docs), WP11 (performance), WP12 (integration tests) can proceed in parallel after WP07-WP08

---

## MVP Scope Recommendation

**Minimum Viable Product (MVP)**: WP01-WP06

This delivers:
- Complete package infrastructure (WP01)
- Backend API support (WP02)
- Core auth infrastructure (WP03)
- Sign-in flow (WP04)
- Password reset flow (WP05)
- Sign-out flow (WP06)

**MVP Validation**: User can install package, configure AuthProvider, sign in, reset password, sign out—all core authentication flows functional.

**Post-MVP**: WP07-WP12 add profile management, session verification, accessibility compliance, documentation, performance optimization, and comprehensive integration tests.

---

## Summary

- **Total Work Packages**: 12 (WP01-WP12)
- **Total Subtasks**: 143 (T001-T143)
- **Parallel Opportunities**: 45+ subtasks marked [P] for parallel execution
- **MVP Scope**: 6 work packages (WP01-WP06) delivering core authentication flows
- **Estimated Effort**: 3-4 weeks for MVP, 5-6 weeks for complete feature (assumes 1-2 developers)

**Next Command**: `/spec-kitty.implement WP01` to begin implementation with detailed prompt guidance.
