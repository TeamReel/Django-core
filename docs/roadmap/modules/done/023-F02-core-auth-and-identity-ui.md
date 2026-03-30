# F02: Core Auth & Identity UI

**Phase:** 6
**Status:** ✅ Done
**Module ID:** 023
**Category:** Frontend

## Links
*
*   [Source Code](../../../../src) (If applicable)

## Description

## 23. F02 – Core Auth & Identity UI

**Doel**: Auth flows: login, signup, password reset, profile management.

**Status**: ✅ Complete

**Key Features**:
- Login/logout UI components
- Signup flow with validation
- Password reset flow (email-based)
- Profile management page
- Session management
- CSRF-protected forms
- Integration with B05 backend

**Package**: `@django-core/auth`

---
## Notes
<!-- Add progress notes here -->


## Detailed Specification (from Kitty)

# Feature Specification: Core Auth Identity UI
*Path: [kitty-specs/023-core-auth-identity/spec.md](../../../../kitty-specs/023-core-auth-identity/spec.md)*

**Feature Branch**: `023-core-auth-identity`
**Created**: 2025-12-07
**Status**: Draft
**Input**: Define brand-agnostic frontend authentication and identity flows (sign-in, sign-out, password reset, basic profile) built on top of the F01 frontend design system. The flows should use F01 components, tokens and theming as the primary building blocks and integrate with the backend Core Accounts APIs.

## User Scenarios & Testing

### User Story 1 - Sign In with Email/Password (Priority: P1)

As a user, I need to log into the application using my email and password so I can access protected features and my personal data.

**Why this priority**: Authentication is the foundation of all other identity features. Without sign-in capability, users cannot access the application or any authenticated features.

**Independent Test**: User can navigate to the sign-in page, enter valid credentials, and be redirected to the appropriate authenticated destination. This delivers immediate value by enabling basic application access.

**Acceptance Scenarios**:

1. **Given** an unauthenticated user visits the sign-in page, **When** they enter valid email and password and submit, **Then** they are authenticated and redirected to the appropriate destination (default or `?next=` parameter)
2. **Given** an unauthenticated user visits the sign-in page, **When** they enter invalid credentials and submit, **Then** a generic error message "Invalid email or password" is displayed without revealing which field is incorrect
3. **Given** an authenticated user navigates to a protected page, **When** their session expires (401/403 response), **Then** they are redirected to sign-in with `?next=` pointing to the original page
4. **Given** a user is on the sign-in page, **When** they submit with empty required fields, **Then** client-side validation shows field-level inline errors immediately
5. **Given** a user enters an invalid email format, **When** they blur the email field or submit, **Then** an inline error "Please enter a valid email address" is shown

---

### User Story 2 - Password Reset Flow (Priority: P1)

As a user who forgot my password, I need to reset it securely via email so I can regain access to my account without contacting support.

**Why this priority**: Password reset is critical for account recovery and reduces support burden. Without it, users who forget passwords cannot access their accounts.

**Independent Test**: User can initiate password reset from sign-in page, receive reset link via email, and set a new password successfully. This delivers value independently of other features.

**Acceptance Scenarios**:

1. **Given** a user is on the sign-in page, **When** they click "Forgot password?" and enter their email, **Then** a generic success message is shown ("If this email exists, we've sent a reset link") without revealing whether the email is registered
2. **Given** a user receives a valid password reset link, **When** they click it and enter a new password meeting complexity requirements, **Then** their password is updated and they see a success message with a link to sign in
3. **Given** a user is on the password reset form, **When** they click a reset link that has expired or been used, **Then** they see a clear error message "This reset link is invalid or has expired" with an option to request a new one
4. **Given** a user is setting a new password, **When** they enter a password that fails client-side validation (too short, no special characters), **Then** inline errors appear immediately without submitting to the server
5. **Given** a user successfully resets their password, **When** they sign in with the new password, **Then** authentication succeeds and they access their account

---

### User Story 3 - Sign Out (Priority: P1)

As an authenticated user, I need to log out securely so that my session is terminated and no one else can access my account on this device.

**Why this priority**: Secure logout is essential for security, especially on shared devices. Users must be able to end their session confidently.

**Independent Test**: Authenticated user can click sign-out from any page and be redirected to a public page with session cleared. This works independently and delivers immediate security value.

**Acceptance Scenarios**:

1. **Given** an authenticated user clicks "Sign out", **When** the logout completes successfully, **Then** their session is terminated and they are redirected to a safe public page (e.g., sign-in page)
2. **Given** an authenticated user signs out, **When** they attempt to access a protected page without signing in again, **Then** they are redirected to the sign-in page with `?next=` parameter
3. **Given** a user signs out, **When** they click the browser back button, **Then** they cannot access previously viewed authenticated pages and are redirected to sign-in

---

### User Story 4 - View and Update Profile (Priority: P2)

As an authenticated user, I need to view and update my basic profile information (name, email, password) so I can keep my account information accurate and secure.

**Why this priority**: Profile management enables users to maintain their account independently. While less critical than authentication flows, it's essential for account maintenance and user autonomy.

**Independent Test**: Authenticated user can navigate to profile page, view current information, update name/email/password, and see changes reflected. This can be tested independently of other features.

**Acceptance Scenarios**:

1. **Given** an authenticated user navigates to their profile page, **When** the page loads, **Then** their current display name and email are shown (email is non-editable until verification)
2. **Given** a user updates their display name and submits, **When** validation passes, **Then** the name is updated immediately and a success message is shown
3. **Given** a user enters a new email address with their current password, **When** they submit, **Then** a generic success message "If this email is valid, we've sent a confirmation link" is shown and the email change is pending verification
4. **Given** a user receives an email verification link, **When** they click it, **Then** their email is updated and they see a confirmation message
5. **Given** a user wants to change their password, **When** they enter their current password, new password, and confirmation (all valid), **Then** their password is updated, a success message is shown, and they remain signed in
6. **Given** a user enters an incorrect current password when changing password, **When** they submit, **Then** a generic error "Unable to update password" is shown without specifying the current password was wrong

---

### User Story 5 - Session State Verification (Priority: P2)

As a user, I need the application to automatically verify my session is still valid so I don't encounter unexpected errors when my session expires.

**Why this priority**: Automatic session verification improves UX by proactively detecting expired sessions. While important, it's secondary to core authentication flows.

**Independent Test**: Application calls `/auth/me` on initialization and periodically, handles expired sessions gracefully, and redirects to sign-in when necessary. This can be tested independently of specific features.

**Acceptance Scenarios**:

1. **Given** a user loads the application, **When** initialization occurs, **Then** `/auth/me` is called to verify session validity and retrieve minimal profile data (id, name, email)
2. **Given** a user's session is valid, **When** `/auth/me` returns 200 OK, **Then** auth state is populated with user profile data and protected routes remain accessible
3. **Given** a user's session has expired, **When** `/auth/me` returns 401, **Then** auth state is cleared and they are redirected to sign-in with `?next=` to current location
4. **Given** a user makes an authenticated API request, **When** the response is 401/403, **Then** auth state is cleared and they are redirected to sign-in with an optional message "Your session has expired, please sign in again"
5. **Given** a user successfully signs in, **When** auth state is initialized, **Then** minimal profile data (id, name, email) is stored in memory and available to the UI

---

### Edge Cases

- **Invalid token format in password reset URL**: Display generic "This reset link is invalid or has expired" message without exposing specific validation errors
- **Email verification link clicked multiple times**: Second and subsequent clicks show "This link has already been used" or redirect to profile with success message if already confirmed
- **Concurrent password changes**: If a password is changed while a reset link is pending, the reset link should become invalid (backend enforced)
- **Session invalidation after password change**: Backend may invalidate other sessions after password change; frontend handles this by detecting 401 on next request and redirecting to sign-in
- **Network failures during authentication**: Show generic error "Unable to connect. Please check your connection and try again" with retry option
- **CSRF token expiry**: If CSRF validation fails, show generic error and suggest refreshing the page
- **Extremely long names or emails**: Client-side validation enforces reasonable length limits (e.g., name ≤100 chars, email ≤254 chars per RFC)
- **Email case sensitivity**: Backend determines email matching rules (typically case-insensitive); frontend submits email as entered
- **Redirect loop prevention**: If `?next=` parameter points to sign-in page or logout, use default authenticated landing page instead
- **XSS in redirect URLs**: Validate `?next=` parameter is same-origin before using; reject absolute URLs or suspicious patterns

## Requirements

### Functional Requirements

#### Authentication Flows

- **FR-001**: System MUST provide a sign-in form accepting email/username and password with client-side validation for required fields and email format
- **FR-002**: System MUST show generic error message "Invalid email or password" for authentication failures without revealing which credential was incorrect
- **FR-003**: System MUST support `?next=/some/path` query parameter for post-login redirects, deferring final redirect decision to backend response
- **FR-004**: System MUST redirect to a default authenticated landing page `/app` when no `?next=` parameter or backend `redirect_url` is provided; this default is configurable via `config.routes.defaultAfterLogin`
- **FR-005**: System MUST provide a "Forgot password?" link on sign-in page that navigates to password reset flow

#### Session Management

- **FR-006**: System MUST use HTTP-only, Secure cookies for session management with `credentials: 'include'` on all authenticated API requests
- **FR-007**: System MUST call `/auth/me` endpoint on application initialization to verify session validity and retrieve minimal user profile (id, name, email)
- **FR-008**: System MUST store minimal profile data in frontend state (memory only) after successful authentication or `/auth/me` response
- **FR-009**: System MUST clear auth state and redirect to sign-in with `?next=` parameter when receiving 401/403 responses from any API call
- **FR-010**: System MUST show generic message "Your session has expired, please sign in again" when detecting session expiry IF config option `showSessionExpiryMessage` is set to true (default: false)

#### Password Reset

- **FR-011**: System MUST provide a password reset request form accepting email address with client-side validation for required field and email format
- **FR-012**: System MUST show generic success message "If this email exists, we've sent a reset link" without revealing whether the email is registered
- **FR-013**: System MUST provide a password reset completion form accepting token (from URL), new password, and password confirmation
- **FR-014**: System MUST perform client-side validation on new password (length, complexity) before submitting to backend
- **FR-015**: System MUST show generic error "This reset link is invalid or has expired" for invalid, expired, or already-used tokens
- **FR-016**: System MUST provide "Request new reset link" option when token validation fails

#### Sign Out

- **FR-017**: System MUST provide sign-out functionality accessible from any authenticated page
- **FR-018**: System MUST clear auth state and redirect to sign-in page (or other safe public page) after successful logout
- **FR-019**: System MUST prevent access to authenticated pages after logout by redirecting to sign-in with `?next=` parameter

#### Profile Management

- **FR-020**: System MUST provide a profile page showing current first name, last name, and email for authenticated users
- **FR-021**: System MUST allow users to update first name and last name with immediate effect after validation
- **FR-021a**: System MUST display email as read-only with informational message "Email updates require verification - coming soon"
- **FR-021b**: System MUST display password change as unavailable with informational message "To change your password, use the 'Forgot password?' link on the sign-in page"

#### Validation & Error Handling

- **FR-028**: System MUST perform client-side validation for required fields, email format, and password complexity with immediate inline feedback; however, authoritative validation MUST always defer to backend (client-side is for UX only)
- **FR-029**: System MUST display field-level inline errors using F01 components (Input with error state) for validation failures
- **FR-030**: System MUST display form-level errors using F01 Alert component for authentication/authorization failures
- **FR-032**: System MUST enforce length limits client-side: first_name ≤100 chars, last_name ≤100 chars, email ≤254 chars, password ≥8 chars

#### UI/UX & Accessibility

- **FR-033**: System MUST build all authentication and profile screens using only F01 design system components (Button, Input, Alert, Card, layout primitives)
- **FR-034**: System MUST use F01 tokens and theming (light/dark) for all visual styling without custom CSS
- **FR-035**: System MUST ensure all forms are keyboard-accessible and screen-reader-friendly per WCAG 2.1 AA standards
- **FR-036**: System MUST show loading states using F01 Spinner or Button disabled state during async operations
- **FR-037**: System MUST provide clear focus indicators and logical tab order across all forms

#### Configuration & Integration

- **FR-038**: System MUST allow configuration of API endpoints (login, logout, password-reset, `/auth/me`, profile) via environment variables or config file
- **FR-039**: System MUST work in both "embedded in Django templates" and "standalone SPA" deployment patterns without code changes
- **FR-040**: System MUST integrate with B05 Core Accounts APIs via B13 API baseline conventions (error response shapes, status codes)

### Key Entities

- **User Session**: Represents authenticated state; contains minimal profile data (id, name, email) retrieved from `/auth/me`; stored in frontend memory only (not localStorage)
- **Authentication Request**: Sign-in payload containing email/username, password, optional `next` redirect parameter; sent to backend login endpoint
- **Password Reset Request**: Payload containing email address; triggers backend to send reset link if email exists
- **Password Reset Completion**: Payload containing reset token (from URL), new password, password confirmation; sent to backend to complete password change
- **Profile Update**: Payload for updating user profile; may contain display name, new email (with current password), or password change (current + new + confirmation)
- **Email Verification Token**: URL parameter received in verification link; sent to backend to confirm email change

## Constitution Alignment

### Product-Agnostic Constraint (Principle I)
- [x] This feature contains NO product-specific logic, pricing, workflows, or UI flows
- [x] All functionality is reusable across multiple downstream products
- [x] Extension points are clearly documented: API endpoints configurable, redirect URLs determined by backend, visual styling via F01 theming

### Architecture & Modularity (Principle II)
- [x] Feature respects clear layering: frontend package consuming F01 design system, integrating with B05/B13 backend contracts
- [x] No circular dependencies: F02 depends on F01 (design system) and B05/B13 (backend APIs) but is otherwise standalone
- [x] Extension points are stable: API endpoint configuration, custom redirect logic via backend response, theme customization via F01

### Code Quality (Principle III)
- [x] TypeScript 5.x baseline for type safety and developer experience
- [x] Type hints used throughout (TypeScript interfaces for API contracts, component props)
- [x] Code formatted with Prettier and linted with ESLint per F01 standards

### Testing (Principle IV)
- [x] Test plan includes Jest + React Testing Library for component tests
- [x] Coverage targets: 80% minimum for auth flows, form validation, session handling
- [x] Integration tests planned for end-to-end flows: sign-in → redirect, password reset → completion, profile updates

### Security & Privacy (Principle V)
- [x] Secure defaults: HTTP-only cookies, generic error messages to prevent enumeration, CSRF handled by backend
- [x] No secrets in code: API endpoints configured via environment variables
- [x] Authentication/authorization handled through B05/B13 backend contracts with session validation via `/auth/me`
- [x] No sensitive data logged: passwords never logged, tokens only present in URL during reset (backend responsibility)

### Performance & Reliability (Principle VI)
- [x] No N+1 queries (N/A for frontend; all data fetched via single API calls)
- [x] Pagination not applicable (auth flows are single-entity operations)
- [x] Graceful degradation: network failures show retry options, session expiry redirects with `?next=` for seamless re-login
- [x] Loading states shown using F01 components (Spinner, disabled buttons) during async operations

### API Design (Principle VII)
- [x] Follows B13 API baseline standards for request/response shapes, error formats, status codes
- [x] API responses handled consistently: 200 OK for success, 401 for auth failure, 403 for forbidden, generic client-side error handling
- [x] Breaking changes managed via backend versioning; frontend adapts to backend contracts
- [x] Validation occurs at boundary: client-side for UX, server-side for truth

### Documentation (Principle XI)
- [x] Feature documentation plan: integration guide for consuming F02 in products, API endpoint configuration reference, theming customization via F01
- [x] Extension guide updates: how to override redirect logic, customize error messages, add custom profile fields
- [x] ADR not required: follows established patterns from F01 and B05/B13

**Violations Requiring Justification**: None

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete sign-in flow (navigate to page, enter credentials, reach authenticated destination) in under 15 seconds for valid credentials
- **SC-002**: Users can initiate password reset and set new password in under 2 minutes (excluding email delivery time)
- **SC-003**: 95% of form validation errors are caught client-side and shown instantly (within 100ms) without server round-trip
- **SC-004**: Session expiry is detected and handled gracefully within 500ms of 401/403 response, redirecting user to sign-in with appropriate `?next=` parameter
- **SC-005**: All authentication forms are keyboard-accessible with logical tab order and pass automated WCAG 2.1 AA accessibility checks
- **SC-006**: Zero sensitive information leakage in error messages (100% of auth failures show generic "Invalid email or password" message)
- **SC-007**: Profile updates (name change, password change) complete successfully in under 5 seconds for valid inputs
- **SC-008**: Email verification flow completes successfully for 98% of valid verification links within 30 seconds of clicking link
- **SC-009**: Authentication package can be integrated into new products with ≤10 lines of configuration (API endpoint URLs, redirect defaults)
- **SC-010**: All UI components render consistently in light and dark themes as defined by F01 design system

## Assumptions

1. **Backend API Contracts**: B05 Core Accounts and B13 API baseline provide stable contracts for `/auth/login`, `/auth/logout`, `/auth/password-reset`, `/auth/me`, and `/auth/profile` endpoints with documented request/response shapes
2. **Session Management**: Backend uses HTTP-only, Secure cookies with appropriate `SameSite` attribute; frontend never needs to read or manipulate tokens directly
3. **CSRF Protection**: Backend handles CSRF token validation; frontend includes CSRF token in requests per Django conventions (via cookie or header)
4. **Error Response Format**: Backend returns consistent error format (B13 standard) with `message` field and appropriate HTTP status codes
5. **Email Delivery**: Email service (SMTP or third-party provider) is configured and operational for password reset and email verification flows
6. **F01 Design System Stability**: F01 components, tokens, and theming contracts are stable; breaking changes follow versioning/deprecation paths
7. **Browser Support**: Modern evergreen browsers (Chrome, Firefox, Safari, Edge) with ES2020+ support; no IE11 compatibility required
8. **Deployment Patterns**: Both "Django template embedding" and "standalone SPA" patterns are supported via build tooling (e.g., Vite library mode for Django, standard SPA build for standalone)
9. **Default Redirect**: Backend can return `redirect_url` in login response; if not provided, frontend uses configured default (e.g., `/app`)
10. **Password Complexity**: Backend enforces password complexity rules; frontend validates same rules client-side for UX but defers final validation to backend

## Out of Scope

- **Multi-Factor Authentication (MFA)**: Two-factor authentication, authenticator apps, SMS verification, backup codes
- **Social Login**: OAuth, SAML, OpenID Connect, third-party identity providers (Google, GitHub, Microsoft, etc.)
- **Advanced Session Management**: Session management dashboards, active session listing, remote session termination, device management
- **Account Lifecycle Management**: User registration/signup, account activation, invitation flows, organization switching, account deletion
- **Email Change Flow**: Email update with verification workflow - requires backend verification system, deferred to Phase 2 or separate feature
- **Password Change in Profile**: In-profile password change form - deferred to Phase 2 or separate feature (users can use password reset flow instead)
- **Advanced Profile Features**: Avatar/photo upload, timezone selection, language preferences, notification settings, privacy controls
- **Admin/Organization Features**: User management by admins, role assignment UI, organization-level settings, bulk operations
- **Audit & Security Dashboards**: Login history, security event logs, suspicious activity alerts, breach notifications
- **Accessibility Beyond WCAG 2.1 AA**: Enhanced accessibility features, screen reader optimizations beyond basic compliance
- **Offline Support**: Service workers, offline authentication, cached credentials
- **Biometric Authentication**: Face ID, Touch ID, Windows Hello integration

## Dependencies

### Internal Dependencies
- **F01 - Frontend Design System** (022-frontend-design-system): Required for all UI components (Button, Input, Alert, Card, Spinner, layout primitives), tokens, and theming
- **B05 - Core Accounts & Authentication** (005-core-accounts-authentication): Backend APIs for login, logout, password reset, session verification, profile management
- **B13 - API Foundation & Standards** (013-api-foundation-standards): API contracts, error response formats, status code conventions, CORS/CSRF handling

### External Dependencies
- **React 18.x**: UI framework (peer dependency from F01)
- **TypeScript 5.x**: Type safety and developer experience
- **React Router** (or similar): Client-side routing for sign-in, password-reset, profile pages
- **Fetch API / Axios**: HTTP client for backend API calls with `credentials: 'include'`

### Assumptions About Dependencies
- F01 components are stable and follow semantic versioning; breaking changes are communicated in advance
- B05/B13 backend APIs follow RESTful conventions with consistent error handling and status codes
- Authentication tokens/sessions use HTTP-only cookies; no token management required in frontend JavaScript
- CSRF protection is handled by backend; frontend includes CSRF token via standard mechanisms (cookie or header)

## Open Questions

- **Default Authenticated Landing Page**: Should the default post-login redirect be configurable per deployment, or hardcoded to a specific path (e.g., `/app`, `/dashboard`)? Current assumption: configurable via environment variable or config file.
- **Rate Limiting Feedback**: If backend rate-limits authentication attempts, what error message and UI feedback should frontend show? Current assumption: generic "Too many attempts. Please try again later" message.
- **Email Verification Expiry**: How long should email verification links remain valid? Current assumption: backend determines expiry (e.g., 24 hours); frontend only displays generic error for expired links.
- **Session Timeout Behavior**: Should frontend proactively show session timeout warnings (e.g., "Your session will expire in 5 minutes"), or only react to 401 responses? Current assumption: reactive only; no proactive warnings in v1.

## Notes

- **Consuming Package Design**: F02 is a "consuming package" built entirely on F01 primitives; it introduces no custom styling or component variants. All visual customization happens via F01 theming.
- **Deployment Flexibility**: Same codebase supports both Django template integration (via Vite library mode or UMD bundle) and standalone SPA deployment. Configuration (API URLs, redirect defaults) is injected at build or runtime.
- **Security-First Error Messages**: All authentication-related errors use generic messaging to prevent user enumeration and information disclosure. Detailed errors are logged server-side only.
- **Progressive Enhancement**: Forms work without JavaScript (submit to backend), but JavaScript enhances UX with client-side validation, loading states, and session management.
- **Testing Strategy**: Component tests verify F01 integration and validation logic; integration tests cover end-to-end flows; contract tests ensure B05/B13 API compatibility.
