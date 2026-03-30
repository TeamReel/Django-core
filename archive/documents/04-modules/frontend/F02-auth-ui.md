# F02: Auth UI

## 1. Purpose & Responsibility
The **Auth UI** package provides pre-built React components for authentication flows: Login, Register, Password Reset, Email Verification.

**Responsibilities:**
*   **Login/Register Forms:** Validation and submission.
*   **Session Management:** Stores auth state (e.g., in Context).
*   **API Integration:** Calls Backend API (`/api/auth/login/`).

## 2. Domain-Agnostic Rationale
Auth is boring but necessary. This package wraps the complexity so apps only need to import `<LoginForm />` and get a working auth flow.

## 3. Key Concepts

### 3.1 Components (`src/components/`)
*   `LoginForm`: Email/password login.
*   `RegisterForm`: Sign-up with email verification flow.
*   `PasswordResetForm`: Request reset link.
*   `VerifyEmailView`: Handles token verification.

### 3.2 Hooks (`src/hooks/`)
*   `useAuth()`: Returns `{ user, isAuthenticated, login, logout }`.

## 4. Public Interfaces (Exports)

**Package:** `@django-core/auth-ui`

```typescript
import { LoginForm, useAuth } from '@django-core/auth-ui';
const { user, login } = useAuth();
```

## 5. Integrations & Dependencies
*   **Backend API:** Calls B05 Accounts endpoints.
*   **Design System (F01):** Uses `<Button />`, `<Input />` from `@django-core/design-system`.
*   **API Client:** Uses `@django-core/api-client` for requests.

## 6. Status & Phase History
*   **Phase:** 6 (Frontend Foundations)
*   **Status:** ✅ Complete
*   **Source Code:** `packages/auth/`
