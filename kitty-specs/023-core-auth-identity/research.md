# Phase 0 Research: F02 Core Auth Identity UI
*Feature Branch: 023-core-auth-identity*
*Research Date: 2025-12-07*

## Executive Summary

This research document provides comprehensive technical context for implementing F02 Core Auth Identity UI, a brand-agnostic frontend authentication layer built on F01 Design System. The research reveals **strong API foundation** with 6/7 required endpoints already implemented in B05 (Core Accounts & Authentication), a **robust F01 component inventory** with 19 production-ready components, and **well-established security infrastructure** with session management, CSRF protection, and comprehensive error handling.

### Key Findings

1. **API Readiness**: 6 of 7 required endpoints exist (`/auth/login`, `/auth/logout`, `/auth/password-reset`, `/auth/password-reset-confirm`, `/auth/register`, `/auth/verify-email`). Only `/auth/me` (session verification) is missing and must be implemented.

2. **Component Availability**: F01 Design System provides all necessary UI primitives: Button (4 variants), Input (with error/success states), Alert, Card, Spinner, Typography (Text/Heading), and layout components (Stack, Container, Grid).

3. **Security Posture**: Django backend enforces HttpOnly cookies, CSRF protection via Lax SameSite cookies, 24-hour inactivity timeout, and consistent API error envelopes per B13 standards.

4. **Build Infrastructure**: F01 establishes Vite library mode builds, Jest + @swc/jest testing, vanilla-extract CSS compilation, Storybook documentation, and Chromatic visual regression testing.

### Research Scope & Methodology

This Phase 0 research gathered technical context across four critical areas:

- **B05/B13 API Contracts**: Examined `src/accounts/api/`, `tests/accounts/test_auth_api.py`, API serializers, error handling patterns
- **F01 Component Inventory**: Analyzed `packages/design-system/src/components/`, exports from `index.ts`, Storybook stories, component prop types
- **Authentication Infrastructure**: Reviewed `src/config/settings/base.py`, session middleware, CSRF configuration, password validators
- **Build/Test Setup**: Inspected `vite.config.ts`, `jest.config.js`, `tsconfig.json`, GitHub Actions workflows

**Methods**: `read_file`, `grep_search`, `semantic_search`, `list_dir` tools extensively used to map existing implementations without modifying code.

---

## Section 1: B05/B13 API Contracts

### 1.1 Existing Endpoints (B05 Implementation)

All B05 authentication endpoints are **implemented and tested** with comprehensive coverage:

#### **POST /api/v1/auth/register**
- **Status**: ✅ Implemented
- **Request**: `{ email, password, first_name, last_name }`
- **Response (201)**: `{ id, email, first_name, last_name, email_verified, is_active, message }`
- **Errors**: 400 (validation failure, duplicate email, weak password)
- **Behavior**: Creates user with `email_verified=False`, `is_active=False`, sends verification email
- **Source**: `src/accounts/api/views.py:register_api`, `accounts/serializers.py:RegistrationSerializer`
- **Tests**: `tests/accounts/test_auth_api.py:TestRegistrationAPI` (5 test cases)

#### **POST /api/v1/auth/verify-email/{user_id}/{token}**
- **Status**: ✅ Implemented
- **Request**: No body (token in URL)
- **Response (200)**: `{ message }`
- **Errors**: 400 (invalid token, already verified), 404 (user not found)
- **Behavior**: Sets `email_verified=True`, `is_active=True`, invalidates token after use
- **Source**: `src/accounts/api/views.py:verify_email_api`, uses `accounts.tokens.email_verification_token`
- **Tests**: `tests/accounts/test_auth_api.py:TestEmailVerificationAPI` (4 test cases)

#### **POST /api/v1/auth/login**
- **Status**: ✅ Implemented
- **Request**: `{ email, password }`
- **Response (200)**: `{ id, email, first_name, last_name, role, message }`
- **Errors**:
  - 400 (`email_not_verified`): User exists but email not verified
  - 400 (`account_inactive`): User deactivated by admin
  - 400 (`invalid_credentials`): Authentication failed (generic message)
- **Behavior**:
  - Uses Django session authentication (sets session cookie)
  - Stores `last_activity` timestamp in session
  - Returns role: `superadmin` | `admin` | `user`
- **Source**: `src/accounts/api/views.py:login_api`, `accounts/serializers.py:LoginSerializer`
- **Tests**: `tests/accounts/test_auth_api.py:TestLoginAPI` (7 test cases including role mapping)

#### **POST /api/v1/auth/logout**
- **Status**: ✅ Implemented
- **Request**: No body
- **Response (204)**: No content
- **Errors**: None (logout always succeeds, even if not authenticated)
- **Behavior**: Calls Django `logout()`, clears session cookie
- **Source**: `src/accounts/api/views.py:logout_api`
- **Tests**: `tests/accounts/test_auth_api.py:TestLogoutAPI` (2 test cases)

#### **POST /api/v1/auth/password-reset**
- **Status**: ✅ Implemented
- **Request**: `{ email }`
- **Response (200)**: `{ message }` (generic, no email enumeration)
- **Errors**: 400 (validation errors only, not "email not found")
- **Behavior**:
  - Sends reset email only if user exists with `email_verified=True`, `is_active=True`
  - Always returns same message regardless of email existence (security best practice)
  - Uses Django's `default_token_generator`
- **Source**: `src/accounts/api/views.py:password_reset_request_api`, `accounts/serializers.py:PasswordResetRequestSerializer`
- **Tests**: `tests/accounts/test_auth_api.py:TestPasswordResetAPI` (anti-enumeration test included)

#### **POST /api/v1/auth/password-reset-confirm**
- **Status**: ✅ Implemented
- **Request**: `{ uidb64, token, new_password }`
- **Response (200)**: `{ message }`
- **Errors**: 400 (`invalid_token` if uidb64 invalid or token expired)
- **Behavior**:
  - Validates token via `default_token_generator.check_token()`
  - Sets new password with Django password validation
  - **Invalidates all existing sessions** for user (security measure)
- **Source**: `src/accounts/api/views.py:password_reset_confirm_api`, `accounts/serializers.py:PasswordResetConfirmSerializer`
- **Tests**: Multiple test cases covering token validation, password validation

### 1.2 Missing Endpoints (TO BE IMPLEMENTED)

#### **GET /api/v1/auth/me** ❌ NOT IMPLEMENTED
- **Status**: **NEEDS IMPLEMENTATION** (Critical for F02)
- **Purpose**: Session verification and current user profile retrieval
- **Request**: No body (authenticated request required)
- **Proposed Response (200)**:
  ```json
  {
    "id": 123,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "user",
    "email_verified": true,
    "is_active": true
  }
  ```
- **Errors**: 401 (not authenticated), 403 (session expired)
- **Implementation Notes**:
  - Must use `@api_view(['GET'])` with `@permission_classes([IsAuthenticated])`
  - Return minimal profile data (avoid over-fetching)
  - Should check `request.user.is_authenticated`
  - Used by frontend for session verification on app load and periodic checks

**Recommended Implementation Path**: Create in Phase 1 as part of contract definition. Add to `src/accounts/api/views.py` and URL routing in `src/accounts/api/urls.py`.

### 1.3 API Error Schema (B13 Standard)

All API errors follow B13's **envelope format** enforced by `api.exceptions.envelope_exception_handler`:

```json
{
  "status": "error",
  "error": {
    "code": "validation_error",
    "message": "Human-readable error message",
    "details": {
      "field_name": ["Field-specific error messages"]
    }
  },
  "meta": {
    "timestamp": "2025-12-07T10:30:00Z"
  }
}
```

**Error Code Mapping** (from `src/api/exceptions.py`):
- `validation_error`: DRF ValidationError (400)
- `authentication_failed`: AuthenticationFailed (401)
- `not_authenticated`: NotAuthenticated (401)
- `permission_denied`: PermissionDenied (403)
- `not_found`: NotFound (404)
- `server_error`: Unhandled exceptions (500, includes error ID for support)

**Security Features**:
- Database/SQL errors sanitized to generic message
- Stack traces never exposed to clients
- 500 errors include unique error ID for support correlation
- Timestamps in UTC ISO 8601 format

### 1.4 Authentication Flow Details

**Session-Based Authentication** (not JWT for browser):
- Backend uses Django session cookies (`SESSION_ENGINE = "django.contrib.sessions.backends.db"`)
- Frontend receives `sessionid` cookie on successful login (HttpOnly, Lax SameSite)
- CSRF token required for state-changing requests (POST, PUT, DELETE)
- Middleware enforces 24-hour inactivity timeout (`SESSION_INACTIVITY_TIMEOUT = 86400`)

**Password Validation Rules** (from `src/config/settings/base.py`):
- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character
- Not similar to user attributes
- Not a common password

---

## Section 2: F01 Component Inventory

### 2.1 Available Components (from `packages/design-system/src/index.ts`)

F01 Design System exports **19 production-ready components** organized into 5 categories:

#### **Form Components**
1. **Button** (`components/Button/`)
   - Variants: `primary` | `secondary` | `ghost` | `destructive`
   - Sizes: `sm` | `md` | `lg`
   - Props: `loading`, `fullWidth`, `disabled`
   - Loading state shows spinner icon
   - **Use case**: Submit buttons, CTAs, form actions

2. **Input** (`components/Input/`)
   - States: `default` | `error` | `success`
   - Sizes: `sm` | `md` | `lg`
   - Props: `label`, `helperText`, `error`, `success`, `required`, `disabled`
   - Auto-generates ID for label association
   - Error/success messages automatically shown
   - **Use case**: Email, password, text fields

3. **Textarea** (`components/Textarea/`)
   - States: `default` | `error` | `success`
   - Sizes: `sm` | `md` | `lg`
   - Resize: `none` | `vertical` | `horizontal` | `both`
   - **Use case**: Multi-line inputs (not needed for auth but available)

4. **Checkbox** (`components/Checkbox/`)
   - States: `default` | `error` | `success`
   - Sizes: `sm` | `md` | `lg`
   - **Use case**: "Remember me", terms acceptance

5. **Radio** + **RadioGroup** (`components/Radio/`)
   - States: `default` | `error` | `success`
   - Sizes: `sm` | `md` | `lg`
   - **Use case**: Not directly needed for auth

6. **Select** + **SelectOption** (`components/Select/`)
   - **Use case**: Not directly needed for auth

#### **Feedback Components**
7. **Alert** (`components/Alert/`)
   - Variants: `info` | `success` | `warning` | `error`
   - Props: `title`, `dismissible`, `onDismiss`
   - Icons: ℹ (info), ✓ (success), ⚠ (warning), ✕ (error)
   - Role: `alert` (error/warning), `status` (info/success)
   - **Use case**: Form-level error messages, success confirmations

8. **Spinner** (`components/Spinner/`)
   - Sizes: `sm` | `md` | `lg`
   - Props: `label` (for screen readers)
   - Role: `status`, `aria-live="polite"`
   - **Use case**: Loading states during API calls

#### **Typography Components**
9. **Text** (`components/Text/`)
   - Sizes: `xs` | `sm` | `md` | `lg` | `xl`
   - Weights: `normal` | `medium` | `semibold` | `bold`
   - Colors: `primary` | `secondary` | `tertiary` | `inverse`
   - Polymorphic: `as` prop to render as any element
   - **Use case**: Body text, labels, descriptions

10. **Heading** (`components/Heading/`)
    - Levels: 1-6 (maps to h1-h6)
    - Polymorphic: `as` prop for semantic overrides
    - **Use case**: Page titles, section headings

#### **Layout Components**
11. **Card** (`components/Card/`)
    - Variants: `outlined` | `elevated`
    - Padding: `none` | `sm` | `md` | `lg`
    - **Use case**: Auth form containers

12. **Stack** (`components/Stack/`)
    - Direction: `vertical` | `horizontal`
    - Gap: `xs` | `sm` | `md` | `lg` | `xl`
    - Align: `start` | `center` | `end` | `stretch`
    - **Use case**: Form field vertical spacing

13. **Grid** (`components/Grid/`)
    - Responsive columns, gap control
    - **Use case**: Multi-column layouts (not primary for auth)

14. **Container** (`components/Container/`)
    - Max-widths: `sm` | `md` | `lg` | `xl` | `full`
    - **Use case**: Centering auth forms on page

#### **Interaction Components**
15. **Modal** (`components/Modal/`)
16. **Tabs**, **TabList**, **Tab**, **TabPanel** (`components/Tabs/`)
17. **Tooltip** (`components/Tooltip/`)
18. **Progress** (`components/Progress/`)
19. **Badge** (`components/Badge/`)

### 2.2 Component Usage Patterns (from Storybook Stories)

#### **Button Examples** (from `Button.stories.tsx`):
```tsx
// Primary CTA
<Button variant="primary" size="md">Sign In</Button>

// Secondary action
<Button variant="secondary" size="md">Cancel</Button>

// Loading state
<Button variant="primary" loading>Signing In...</Button>

// Destructive action
<Button variant="destructive" size="md">Delete Account</Button>
```

#### **Input Examples** (from `Input.stories.tsx`):
```tsx
// Basic email input
<Input
  label="Email"
  type="email"
  placeholder="Enter your email"
  helperText="We'll never share your email"
/>

// Error state
<Input
  label="Email"
  type="email"
  error="Please enter a valid email address"
/>

// Success state
<Input
  label="Email"
  type="email"
  success="Email is valid!"
/>

// Required field
<Input
  label="Password"
  type="password"
  required
  helperText="This field is required"
/>
```

#### **Alert Examples** (from `Alert.tsx`):
```tsx
// Error message
<Alert variant="error" title="Sign in failed">
  Invalid email or password. Please try again.
</Alert>

// Success message
<Alert variant="success" dismissible onDismiss={handleDismiss}>
  Password reset link sent! Check your email.
</Alert>
```

### 2.3 Theming & Styling

**Theme Provider** (`theme/ThemeProvider.tsx`):
```tsx
import { ThemeProvider } from '@django-core/design-system';
import '@django-core/design-system/tokens.css';

<ThemeProvider theme="light">
  <App />
</ThemeProvider>
```

**Available Themes**:
- `lightTheme` (default)
- `darkTheme`

**CSS-in-TS via vanilla-extract**:
- Zero-runtime CSS compilation
- Type-safe styling with `.css.ts` files
- All components export typed recipe functions
- Design tokens accessible via `tokens/` exports

### 2.4 Accessibility Features

All F01 components include:
- **ARIA attributes**: `role`, `aria-label`, `aria-describedby`, `aria-invalid`
- **Keyboard navigation**: Tab, Enter, Escape support
- **Focus management**: Visible focus indicators
- **Screen reader support**: Semantic HTML, hidden labels for icons
- **WCAG 2.1 AA compliance**: Tested with axe-core

Example from Input component:
```tsx
<input
  aria-invalid={state === 'error'}
  aria-describedby={displayHelperText ? `${inputId}-helper` : undefined}
  required={required}
/>
```

---

## Section 3: Authentication Infrastructure

### 3.1 Django Session Configuration

From `src/config/settings/base.py`:

```python
# Custom User Model
AUTH_USER_MODEL = "accounts.User"

# Session Configuration
SESSION_ENGINE = "django.contrib.sessions.backends.db"  # Database-backed
SESSION_COOKIE_AGE = 604800  # 7 days in seconds (absolute timeout)
SESSION_SAVE_EVERY_REQUEST = False  # Only save when modified
SESSION_COOKIE_HTTPONLY = True  # Security: no JS access
SESSION_COOKIE_SAMESITE = "Lax"  # CSRF protection
SESSION_COOKIE_SECURE = False  # Set to True in production (HTTPS only)

# Custom: Inactive timeout enforced via middleware (24 hours)
SESSION_INACTIVITY_TIMEOUT = 86400  # 24 hours in seconds
```

**Security Rationale**:
- **HttpOnly**: Prevents XSS attacks from stealing session tokens via JavaScript
- **SameSite=Lax**: Protects against CSRF while allowing navigation from external sites
- **Dual timeout strategy**: 7-day absolute limit OR 24-hour inactivity (whichever comes first)

### 3.2 Session Inactivity Middleware

From `src/accounts/middleware.py`:

```python
class SessionInactivityMiddleware:
    """Enforce 24-hour inactivity timeout for authenticated sessions."""

    def __call__(self, request):
        if request.user.is_authenticated:
            last_activity = request.session.get("last_activity")

            if last_activity:
                time_since_activity = timezone.now().timestamp() - last_activity
                if time_since_activity > settings.SESSION_INACTIVITY_TIMEOUT:
                    # Session expired - logout and return error
                    logout(request)
                    return JsonResponse({
                        "error": "session_expired",
                        "message": "Your session has expired due to inactivity."
                    }, status=401)

            # Update last activity timestamp
            request.session["last_activity"] = timezone.now().timestamp()

        return self.get_response(request)
```

**Frontend Implications**:
- Expect 401 responses with `session_expired` error after 24 hours of inactivity
- Frontend should handle this gracefully by redirecting to sign-in
- Must check session validity periodically (via `/auth/me`) or on API errors

### 3.3 CSRF Protection

**Configuration** (from `src/config/settings/base.py` middleware):
```python
MIDDLEWARE = [
    # ...
    "django.middleware.csrf.CsrfViewMiddleware",  # Enabled globally
    # ...
]
```

**How it works**:
1. Backend sets `csrftoken` cookie on first GET request (NOT HttpOnly)
2. Frontend reads cookie value via `document.cookie`
3. Frontend includes token in `X-CSRFToken` header for POST/PUT/DELETE requests
4. Django validates token matches session

**Frontend Requirements**:
- Extract CSRF token from cookie: `Cookies.get('csrftoken')`
- Include in all state-changing requests: `headers: { 'X-CSRFToken': token }`
- Use `credentials: 'include'` in fetch/axios to send cookies
- For dev/staging: `CSRF_COOKIE_SECURE = False` (works over HTTP)
- For production: `CSRF_COOKIE_SECURE = True` (requires HTTPS)

### 3.4 Password Validation

From `src/config/settings/base.py`:

```python
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "accounts.validators.UppercaseValidator"},  # Custom
    {"NAME": "accounts.validators.LowercaseValidator"},  # Custom
    {"NAME": "accounts.validators.NumberValidator"},     # Custom
    {"NAME": "accounts.validators.SpecialCharacterValidator"},  # Custom
]
```

**Frontend Validation Requirements**:
- Implement client-side validation matching server rules
- Show inline errors as user types (live validation)
- Rules:
  - Minimum 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 lowercase letter (a-z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
  - Not similar to email/name
  - Not in common password list (server-side only)

### 3.5 Authentication Middleware Stack

From `src/config/settings/base.py`:

```python
MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",  # Metrics
    "observability.middleware.CorrelationIDMiddleware",  # Request tracing
    "observability.middleware.HTTPMetricsMiddleware",  # HTTP metrics
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",  # Session cookies
    "accounts.middleware.SessionInactivityMiddleware",  # 24hr timeout
    "django.middleware.locale.LocaleMiddleware",  # i18n
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",  # CSRF protection
    "django.contrib.auth.middleware.AuthenticationMiddleware",  # Sets request.user
    "i18n_preferences.middleware.PreferenceLocaleMiddleware",  # User language
    "i18n_preferences.middleware.PreferenceTimezoneMiddleware",  # User timezone
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",  # Metrics
]
```

**Key Observations**:
- Session middleware runs before auth middleware (establishes session)
- Custom inactivity middleware runs immediately after session (early timeout check)
- CSRF middleware runs before auth (validates tokens early)
- Observability middleware tracks all requests (correlation IDs available in logs)

---

## Section 4: Build/Test Setup

### 4.1 Build Configuration (Vite)

From `packages/design-system/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DesignSystem',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'react/jsx-runtime',
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'tokens.css';
          return assetInfo.name;
        },
      },
    },
    cssCodeSplit: false,  // Single CSS bundle
    sourcemap: true,
  },
});
```

**Library Mode Characteristics**:
- Outputs both ESM (`index.js`) and CJS (`index.cjs`)
- Externalizes React/ReactDOM (peer dependencies)
- CSS compiled to single `tokens.css` file
- Sourcemaps enabled for debugging

**For F02 Auth UI Library**:
- Must adopt identical Vite config structure
- Same peer dependencies: `react ^18.0.0`, `react-dom ^18.0.0`
- Entry point: `src/index.ts` (export all components)
- Build output: `dist/index.js`, `dist/index.cjs`, `dist/tokens.css`

### 4.2 TypeScript Configuration

From `packages/design-system/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,  // Vite handles compilation
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,  // Generate .d.ts files
    "declarationDir": "./dist",
    "outDir": "./dist",
    "allowSyntheticDefaultImports": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist", ".storybook"]
}
```

**Key Settings**:
- `strict: true`: All strict type checks enabled
- `declaration: true`: TypeScript definition files auto-generated
- `noUnusedLocals/Parameters`: Enforces clean code
- `jsx: "react-jsx"`: Modern React JSX transform (no `import React` needed)

### 4.3 Test Configuration (Jest)

From `packages/design-system/jest.config.js`:

```javascript
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // vanilla-extract mocking
  moduleNameMapper: {
    '(.+)\\.css$': '<rootDir>/tests/mocks/vanillaExtractMock.ts',
    '^@vanilla-extract/recipes$': '<rootDir>/tests/mocks/vanillaExtractMock.ts',
    '^@vanilla-extract/css$': '<rootDir>/tests/mocks/vanillaExtractMock.ts',
  },

  // @swc/jest for TypeScript (faster than ts-jest)
  transform: {
    '^.+\\.(?!css\\.)(?:ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: { syntax: 'typescript', tsx: true },
        transform: { react: { runtime: 'automatic' } },
      },
    }],
  },

  testMatch: ['**/*.test.ts', '**/*.test.tsx'],

  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.stories.tsx',
    '!src/**/index.ts',
    '!src/**/*.css.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Testing Strategy**:
- **jsdom**: Simulates browser environment for React components
- **@swc/jest**: Fast TypeScript compilation (replaces ts-jest)
- **vanilla-extract mocking**: `.css.ts` files mocked to avoid build-time compilation
- **80% coverage threshold**: Enforced on all metrics
- **Test patterns**: `*.test.ts`, `*.test.tsx`

**For F02 Auth UI**:
- Inherit identical Jest config
- Mock F01 design system imports if needed
- Test auth flows: form validation, API calls, error handling
- Mock API responses with MSW (Mock Service Worker)

### 4.4 CI Workflows

From `.github/workflows/design-system.yml`:

```yaml
jobs:
  lint:
    - run: cd packages/design-system && pnpm lint

  typecheck:
    - run: cd packages/design-system && pnpm typecheck

  test:
    - run: cd packages/design-system && pnpm test:coverage
    - uses: codecov/codecov-action@v4

  chromatic:
    - run: cd packages/design-system && pnpm chromatic:ci
```

**CI Pipeline Stages**:
1. **Lint**: ESLint checks (code style, best practices)
2. **Typecheck**: TypeScript compilation check (no errors)
3. **Test**: Jest unit tests + coverage upload to Codecov
4. **Chromatic**: Visual regression tests (Storybook snapshots)

**Triggers**:
- Push to `main` branch (paths: `packages/design-system/**`)
- Pull requests to `main` (paths: `packages/design-system/**`)

**For F02 Auth UI**:
- Create parallel workflow: `.github/workflows/auth-ui.yml`
- Same stages: lint → typecheck → test → chromatic
- Trigger paths: `packages/auth-ui/**`
- Requires Chromatic project setup (visual regression)

### 4.5 Package.json Scripts

From `packages/design-system/package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "chromatic": "chromatic --exit-zero-on-changes",
    "chromatic:ci": "chromatic",
    "format": "prettier --write \"src/**/*.{ts,tsx,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,md}\""
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@chromatic-com/storybook": "1.9.0",
    "@storybook/addon-a11y": "8.3.5",
    "@swc/jest": "^0.2.36",
    "@vanilla-extract/vite-plugin": "^4.0.16",
    "jest": "^29.7.0",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    // ... other devDeps
  }
}
```

**Key Dependencies for F02**:
- **Storybook 8.3.5**: Component documentation
- **Chromatic 1.9.0**: Visual regression testing
- **@swc/jest**: Fast test compilation
- **vanilla-extract**: Type-safe CSS-in-TS
- **Vite 5.x**: Build tooling
- **TypeScript 5.x**: Type checking

---

## Section 5: Open Questions & Gaps

### 5.1 Critical Gaps (Must Address in Phase 1)

#### **1. Missing `/auth/me` Endpoint**
- **Impact**: High - Required for session verification
- **Action**: Implement in Phase 1 contract definition
- **Acceptance Criteria**:
  - Returns 200 with user profile if authenticated
  - Returns 401 if session expired or not authenticated
  - Includes: `id`, `email`, `first_name`, `last_name`, `role`, `email_verified`, `is_active`

#### **2. CSRF Token Handling Strategy**
- **Question**: Should frontend extract from cookie or use meta tag?
- **Context**: Django can set CSRF token in cookie (`csrftoken`) or in `<meta name="csrf-token">`
- **Recommendation**: Use cookie extraction (already set by Django middleware)
- **Implementation**:
  ```typescript
  // Extract CSRF token from cookie
  function getCsrfToken(): string | null {
    const cookies = document.cookie.split(';');
    const csrfCookie = cookies.find(c => c.trim().startsWith('csrftoken='));
    return csrfCookie ? csrfCookie.split('=')[1] : null;
  }

  // Include in fetch requests
  fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken() || '',
    },
    credentials: 'include',  // Send cookies
    body: JSON.stringify({ email, password }),
  });
  ```

#### **3. Error Handling Consistency**
- **Question**: How to handle B13 envelope format in frontend?
- **Current Format**:
  ```json
  {
    "status": "error",
    "error": {
      "code": "validation_error",
      "message": "General error message",
      "details": { "email": ["Email is required"] }
    },
    "meta": { "timestamp": "..." }
  }
  ```
- **Recommendation**: Create typed error parsing utility
  ```typescript
  interface ApiError {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  }

  function parseApiError(response: any): ApiError {
    return response.error || { code: 'unknown', message: 'An error occurred' };
  }
  ```

#### **4. Session State Management**
- **Question**: Use React Context, Zustand, or Redux for auth state?
- **Context**: Need global auth state (user profile, session validity)
- **Recommendation**: React Context + hooks (simple, no extra deps)
  ```typescript
  // auth-context.tsx
  interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  }

  const AuthContext = createContext<AuthState>(/* ... */);
  export const useAuth = () => useContext(AuthContext);
  ```

### 5.2 Design Decisions (Phase 1 Contracts)

#### **1. Component Library Structure**
- **Option A**: Single `@django-core/auth-ui` package with all auth components
- **Option B**: Multiple packages (`@django-core/auth-forms`, `@django-core/auth-hooks`)
- **Recommendation**: Single package for simplicity (follows F01 design system pattern)

#### **2. API Client Abstraction**
- **Question**: Should auth UI include API client or accept external client?
- **Option A**: Built-in fetch wrapper with CSRF handling
- **Option B**: Accept generic HTTP client interface (more flexible)
- **Recommendation**: Built-in client for simplicity, with option to override

#### **3. Routing Integration**
- **Question**: Should auth UI handle routing or accept external router?
- **Context**: Need redirects after login/logout, `?next=` parameter handling
- **Recommendation**: Accept router callbacks, don't couple to specific router
  ```typescript
  interface AuthUIProps {
    onLoginSuccess: (user: User, nextUrl?: string) => void;
    onLogoutSuccess: () => void;
    // ... other callbacks
  }
  ```

#### **4. Form Validation Strategy**
- **Question**: Use React Hook Form, Formik, or custom validation?
- **Recommendation**: React Hook Form (lightweight, performant, TypeScript-friendly)
- **Rationale**:
  - Built-in validation with schema support (Zod/Yup)
  - Minimal re-renders (better than Formik)
  - Widely adopted in React ecosystem
  - Example:
    ```typescript
    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
      resolver: zodResolver(loginSchema),
    });
    ```

### 5.3 Non-Blocking Clarifications

#### **1. Email Verification Flow**
- **Current**: User receives email → clicks link → `POST /api/v1/auth/verify-email/{user_id}/{token}`
- **Question**: Should frontend show verification status page or just success message?
- **Recommendation**: Success page with "Return to Sign In" button

#### **2. Password Reset Expiry**
- **Question**: How long are reset tokens valid?
- **Context**: Django's `default_token_generator` uses internal timeout
- **Action**: Document in user-facing messages ("This link expires in 24 hours")
- **Backend Verification**: Check Django settings or token generator source

#### **3. Profile Update Behavior**
- **Question**: Should profile updates require re-authentication?
- **Current**: Email change requires confirmation, password change requires current password
- **Recommendation**: Current behavior is secure, maintain it

#### **4. Remember Me Feature**
- **Question**: Should auth UI support "Remember Me" checkbox?
- **Context**: Would extend session from 7 days to longer period
- **Backend Impact**: Requires updating `SESSION_COOKIE_AGE` dynamically
- **Recommendation**: Defer to Phase 2 (not in MVP scope)

### 5.4 Testing Gaps

#### **1. API Mocking Strategy**
- **Need**: Mock backend API responses for frontend tests
- **Recommendation**: Use MSW (Mock Service Worker)
  ```typescript
  // tests/mocks/handlers.ts
  export const handlers = [
    rest.post('/api/v1/auth/login', (req, res, ctx) => {
      return res(ctx.json({ id: 1, email: 'test@example.com', ... }));
    }),
  ];
  ```

#### **2. E2E Testing**
- **Question**: Should auth UI include E2E tests or leave to consuming apps?
- **Recommendation**: Basic E2E tests in auth UI repo (Playwright)
- **Scenarios**: Login flow, logout flow, password reset flow

#### **3. Accessibility Testing**
- **Need**: Automated a11y tests with axe-core (like F01)
- **Recommendation**: Include in Jest tests via `jest-axe`

---

## Appendix A: Quick Reference

### API Endpoints Summary

| Endpoint | Method | Status | Request Body | Success Response |
|----------|--------|--------|--------------|------------------|
| `/api/v1/auth/register` | POST | ✅ | `{email, password, first_name, last_name}` | 201: `{id, email, ...}` |
| `/api/v1/auth/verify-email/{id}/{token}` | POST | ✅ | None | 200: `{message}` |
| `/api/v1/auth/login` | POST | ✅ | `{email, password}` | 200: `{id, email, role, ...}` |
| `/api/v1/auth/logout` | POST | ✅ | None | 204: No content |
| `/api/v1/auth/password-reset` | POST | ✅ | `{email}` | 200: `{message}` |
| `/api/v1/auth/password-reset-confirm` | POST | ✅ | `{uidb64, token, new_password}` | 200: `{message}` |
| `/api/v1/auth/me` | GET | ❌ **TBD** | None | 200: `{id, email, ...}` |

### Component Checklist

- ✅ **Button**: Primary, secondary, loading states
- ✅ **Input**: Email, password, error/success states
- ✅ **Alert**: Error, success, info messages
- ✅ **Card**: Form containers
- ✅ **Spinner**: Loading indicators
- ✅ **Text**: Labels, descriptions
- ✅ **Heading**: Page titles
- ✅ **Stack**: Vertical form layout
- ✅ **Container**: Page centering

### Security Checklist

- ✅ HttpOnly session cookies
- ✅ CSRF protection (SameSite=Lax)
- ✅ 24-hour inactivity timeout
- ✅ Password complexity validation (8 char, upper, lower, number, special)
- ✅ Generic error messages (no enumeration)
- ✅ Session invalidation on password reset
- ❌ **TBD**: Frontend CSRF token extraction
- ❌ **TBD**: Session verification polling strategy

---

## Next Steps (Phase 1 Contract Generation)

Based on this research, Phase 1 should:

1. **Define Missing API Contract**: Implement `/auth/me` endpoint with tests
2. **Create TypeScript Types**: Define interfaces for all API requests/responses
3. **Design Component API**: Define props for `<SignInForm>`, `<PasswordResetForm>`, etc.
4. **Establish Error Handling**: Create error parsing utilities for B13 envelope format
5. **Document CSRF Strategy**: Provide clear examples for token extraction
6. **Define Auth Context**: Design global state management for session data
7. **Specify Validation Rules**: Map Django validators to frontend validation logic
8. **Plan Test Strategy**: Define mocking approach (MSW), test scenarios, coverage targets

**Research Complete**: All technical context gathered. Ready for Phase 1 implementation planning.
