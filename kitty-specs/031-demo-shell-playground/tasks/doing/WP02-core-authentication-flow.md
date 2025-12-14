---
work_package_id: WP02
title: Core Authentication Flow
lane: "doing"
subtasks:
  - T011
  - T012
  - T013
  - T014
  - T015
  - T016
  - T017
  - T018
priority: P1
dependencies:
  - WP01
story: "P1 Story 1 - Core Authentication Flow"
agent: "claude"
shell_pid: "36848"
history:
  - date: 2025-12-14
    action: created
    agent: copilot
    notes: MVP authentication implementation using F02 @django-core/auth
---

# WP02: Core Authentication Flow

## Objective

Implement P1 Story 1 (Core Authentication Flow) using F02 `@django-core/auth` package: user login with email/password, authenticated session management, logout, and protected route redirection. Includes creating React root with `AuthProvider`, login page, dashboard stub, and basic routing.

**Success Criterion**: User can log in with `alice@example.com`/`demo1234`, see authenticated dashboard with "Welcome, Alice!", and log out successfully. E2E test `auth-flow.spec.ts` passes.

---

## Context

**Feature**: F10 - Demo Shell & Playground Site (Module 031)
**User Story**: P1 Story 1 - Core Authentication Flow
**Phase**: 1 - MVP Core
**Priority**: P1 (Critical path for MVP)

**Why This Matters**:
- **MVP blocker**: Authentication is foundational for all other features (context, permissions, etc.)
- **Integration validation**: First test of F02 `@django-core/auth` package in real application
- **Pattern establishment**: AuthProvider pattern used in F09 integration guides as reference

**Design Documents**:
- `spec.md`: P1 Story 1 acceptance scenarios (AS-1.1 through AS-1.5)
- `contracts/auth.yaml`: OpenAPI spec for POST /auth/login/, GET /auth/me/, POST /auth/logout/
- `research.md`: F09 integration patterns (AuthProvider interface)
- `quickstart.md`: Flow 1 verification steps (login alice → dashboard → logout)

**Dependencies**:
- **WP01 Complete**: Requires scaffolding (src/, package.json, vite.config.ts) and seed data (alice@example.com user exists)
- **F02 Package**: Assumes `@django-core/auth` installed in WP01-T004

---

## Detailed Guidance

### T011: Create main.tsx React Root

**Goal**: Set up React root with `AuthProvider` from F02 package.

**Steps**:
1. Create `examples/demo-shell/src/main.tsx`:
   ```typescript
   import React from 'react';
   import ReactDOM from 'react-dom/client';
   import { AuthProvider } from '@django-core/auth';
   import App from './App';
   import './index.css'; // Optional global styles

   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <AuthProvider>
         <App />
       </AuthProvider>
     </React.StrictMode>
   );
   ```

**Key Decisions**:
- `AuthProvider` wraps entire app (makes `useAuth()` available everywhere)
- `React.StrictMode` enabled (catches dev-time issues)
- `index.css` optional (F01 design system provides styled components)

**Verification**: `pnpm dev` should compile without errors (App.tsx created in T012).

---

### T012: Create App.tsx Router Setup

**Goal**: Configure React Router with public/protected routes.

**Steps**:
1. Create `examples/demo-shell/src/App.tsx`:
   ```typescript
   import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
   import { useAuth } from '@django-core/auth';
   import LoginPage from './pages/LoginPage';
   import DashboardPage from './pages/DashboardPage';

   // Protected Route wrapper
   function ProtectedRoute({ children }: { children: React.ReactNode }) {
     const { user, isLoading } = useAuth();

     if (isLoading) {
       return <div>Loading...</div>;
     }

     if (!user) {
       return <Navigate to="/login" replace />;
     }

     return <>{children}</>;
   }

   export default function App() {
     const { user } = useAuth();

     return (
       <BrowserRouter>
         <Routes>
           {/* Redirect root based on auth state */}
           <Route
             path="/"
             element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
           />

           {/* Public routes */}
           <Route path="/login" element={<LoginPage />} />

           {/* Protected routes */}
           <Route
             path="/dashboard"
             element={
               <ProtectedRoute>
                 <DashboardPage />
               </ProtectedRoute>
             }
           />

           {/* Catch-all: redirect to dashboard or login */}
           <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
       </BrowserRouter>
     );
   }
   ```

**Key Patterns**:
- **ProtectedRoute**: Checks `useAuth()` state, redirects to `/login` if not authenticated
- **Root redirect logic**: `/` → `/dashboard` if logged in, `/login` if not
- **Loading state**: Shows loading indicator while auth state initializes (prevents flash of login page)
- **Catch-all route**: `*` → `/` ensures unknown paths redirect gracefully

**Acceptance Criteria** (AS-1.1, AS-1.3):
- ✅ Unauthenticated user accessing `/dashboard` → redirects to `/login`
- ✅ Authenticated user accessing `/login` → redirects to `/dashboard`

**Verification**: Navigate to `http://localhost:3000/dashboard` without logging in → should redirect to `/login`.

---

### T013: Create LoginPage Component

**Goal**: Build login form using F02 `LoginForm` or custom form with `useAuth().login()`.

**Steps**:
1. Create `examples/demo-shell/src/pages/LoginPage.tsx`:
   ```typescript
   import { useState } from 'react';
   import { useNavigate } from 'react-router-dom';
   import { useAuth } from '@django-core/auth';
   import { Button, Input, Alert } from '@django-core/design-system';

   export default function LoginPage() {
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const [error, setError] = useState<string | null>(null);
     const [isSubmitting, setIsSubmitting] = useState(false);

     const { login } = useAuth();
     const navigate = useNavigate();

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault();
       setError(null);
       setIsSubmitting(true);

       try {
         await login(email, password);
         navigate('/dashboard');
       } catch (err: any) {
         setError(err.message || 'Login failed. Please try again.');
       } finally {
         setIsSubmitting(false);
       }
     };

     return (
       <div style={{ maxWidth: '400px', margin: '100px auto' }}>
         <h1>Django Core-App Demo</h1>
         <p>Log in to access the demo shell</p>

         <form onSubmit={handleSubmit}>
           {error && <Alert variant="error">{error}</Alert>}

           <Input
             type="email"
             placeholder="Email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             required
             autoComplete="email"
           />

           <Input
             type="password"
             placeholder="Password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             required
             autoComplete="current-password"
           />

           <Button type="submit" disabled={isSubmitting}>
             {isSubmitting ? 'Logging in...' : 'Log In'}
           </Button>
         </form>

         <p style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
           Demo accounts: alice@example.com / demo1234
         </p>
       </div>
     );
   }
   ```

**Key Features**:
- **Error handling**: Catches `login()` errors, displays in alert (AS-1.5)
- **Loading state**: Disables button while submitting (prevents double-submit)
- **Demo hint**: Shows test account in UI (helpful for reviewers)

**Alternative** (if F02 provides `<LoginForm>` component):
```typescript
import { LoginForm } from '@django-core/auth';

export default function LoginPage() {
  return (
    <div style={{ maxWidth: '400px', margin: '100px auto' }}>
      <h1>Django Core-App Demo</h1>
      <LoginForm onSuccess={() => navigate('/dashboard')} />
    </div>
  );
}
```

**Acceptance Criteria** (AS-1.2, AS-1.4):
- ✅ Entering valid credentials (alice@example.com / demo1234) → redirects to dashboard (AS-1.2)
- ✅ Entering invalid credentials → shows error message (AS-1.4)

**Verification**:
1. Navigate to `http://localhost:3000/login`
2. Enter `alice@example.com` / `demo1234`
3. Click "Log In" → should redirect to `/dashboard`

---

### T014: Create DashboardPage Component

**Goal**: Simple authenticated landing page showing user name.

**Steps**:
1. Create `examples/demo-shell/src/pages/DashboardPage.tsx`:
   ```typescript
   import { useAuth } from '@django-core/auth';
   import { Button } from '@django-core/design-system';

   export default function DashboardPage() {
     const { user, logout } = useAuth();

     const handleLogout = async () => {
       await logout();
       // AuthProvider handles redirect to login page
     };

     return (
       <div>
         <header style={{ display: 'flex', justifyContent: 'space-between', padding: '20px' }}>
           <h1>Welcome, {user?.firstName || user?.email}!</h1>
           <Button onClick={handleLogout}>Log Out</Button>
         </header>

         <main style={{ padding: '20px' }}>
           <p>You are logged in to the Django Core-App Demo Shell.</p>
           <p>Explore features using the navigation (coming in WP03).</p>
         </main>
       </div>
     );
   }
   ```

**Key Features**:
- **User display**: Shows `firstName` (e.g., "Alice") or falls back to email
- **Logout button**: Calls `useAuth().logout()` → AuthProvider handles session cleanup

**Acceptance Criteria** (AS-1.1, AS-1.3):
- ✅ Authenticated user sees dashboard with personalized greeting (AS-1.1)
- ✅ Clicking "Log Out" → returns to login page (AS-1.3)

**Verification**:
1. Log in as alice@example.com
2. Dashboard shows "Welcome, Alice!"
3. Click "Log Out" → redirects to `/login`

---

### T015: Create API Client Wrapper (CSRF Handling)

**Goal**: Create `src/lib/api-client.ts` for CSRF-protected fetch calls.

**Steps**:
1. Create `examples/demo-shell/src/lib/api-client.ts`:
   ```typescript
   const API_BASE_URL = import.meta.env.VITE_API_URL || '/';

   // Get CSRF token from cookie
   function getCsrfToken(): string | null {
     const match = document.cookie.match(/csrftoken=([^;]+)/);
     return match ? match[1] : null;
   }

   export async function apiRequest<T>(
     endpoint: string,
     options: RequestInit = {}
   ): Promise<T> {
     const url = `${API_BASE_URL}${endpoint}`;
     const csrfToken = getCsrfToken();

     const headers: HeadersInit = {
       'Content-Type': 'application/json',
       ...options.headers,
     };

     if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method || 'GET')) {
       headers['X-CSRFToken'] = csrfToken;
     }

     const response = await fetch(url, {
       ...options,
       headers,
       credentials: 'include', // Include cookies in requests
     });

     if (!response.ok) {
       const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
       throw new Error(errorData.message || `HTTP ${response.status}`);
     }

     return response.json();
   }

   // Convenience methods
   export const api = {
     get: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'GET' }),
     post: <T>(endpoint: string, body?: any) =>
       apiRequest<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
     put: <T>(endpoint: string, body?: any) =>
       apiRequest<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
     delete: <T>(endpoint: string) => apiRequest<T>(endpoint, { method: 'DELETE' }),
   };
   ```

**Key Features**:
- **CSRF token**: Extracts from cookie, adds to mutating requests (POST/PUT/DELETE)
- **Credentials**: `credentials: 'include'` ensures cookies sent with requests
- **Error handling**: Throws with error message from backend or generic HTTP status

**Usage Example** (for WP03+):
```typescript
import { api } from '@/lib/api-client';

const orgs = await api.get('/api/organisations/');
```

**Verification**: Used in WP03 for API calls (no immediate test needed here).

---

### T016: Add Global Styles (Optional)

**Goal**: Create minimal global styles for demo (optional, F01 provides styled components).

**Steps**:
1. Create `examples/demo-shell/src/index.css`:
   ```css
   * {
     box-sizing: border-box;
     margin: 0;
     padding: 0;
   }

   body {
     font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
     line-height: 1.6;
     color: #333;
     background-color: #f5f5f5;
   }

   button {
     cursor: pointer;
   }

   input {
     font-size: 16px; /* Prevents iOS zoom on focus */
   }
   ```

**Note**: Minimal reset only. F01 design system components have built-in styling.

**Verification**: Page looks clean without default browser margins/padding.

---

### T017: Implement Error Boundary

**Goal**: Catch React errors, prevent white screen of death.

**Steps**:
1. Create `examples/demo-shell/src/components/ErrorBoundary.tsx`:
   ```typescript
   import React from 'react';
   import { Alert, Button } from '@django-core/design-system';

   interface Props {
     children: React.ReactNode;
   }

   interface State {
     hasError: boolean;
     error: Error | null;
   }

   export class ErrorBoundary extends React.Component<Props, State> {
     constructor(props: Props) {
       super(props);
       this.state = { hasError: false, error: null };
     }

     static getDerivedStateFromError(error: Error) {
       return { hasError: true, error };
     }

     componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
       console.error('ErrorBoundary caught error:', error, errorInfo);
     }

     handleReset = () => {
       this.setState({ hasError: false, error: null });
       window.location.href = '/'; // Reset to root
     };

     render() {
       if (this.state.hasError) {
         return (
           <div style={{ padding: '40px', textAlign: 'center' }}>
             <Alert variant="error">
               <h2>Something went wrong</h2>
               <p>{this.state.error?.message}</p>
             </Alert>
             <Button onClick={this.handleReset} style={{ marginTop: '20px' }}>
               Reload Application
             </Button>
           </div>
         );
       }

       return this.props.children;
     }
   }
   ```

2. Wrap `<App />` in `main.tsx`:
   ```typescript
   import { ErrorBoundary } from './components/ErrorBoundary';

   ReactDOM.createRoot(document.getElementById('root')!).render(
     <React.StrictMode>
       <ErrorBoundary>
         <AuthProvider>
           <App />
         </AuthProvider>
       </ErrorBoundary>
     </React.StrictMode>
   );
   ```

**Acceptance Criteria** (Edge Case 2: Frontend package unavailable):
- ✅ If F02 package missing → ErrorBoundary shows friendly error instead of blank page

**Verification**: Simulate error by throwing in `DashboardPage` → should show error UI.

---

### T018: Create E2E Test (auth-flow.spec.ts)

**Goal**: Playwright test for full authentication journey.

**Steps**:
1. Create `examples/demo-shell/tests/e2e/auth-flow.spec.ts`:
   ```typescript
   import { test, expect } from '@playwright/test';

   test.describe('Authentication Flow', () => {
     test.beforeEach(async ({ page }) => {
       // Ensure logged out
       await page.goto('http://localhost:3000/login');
       await page.evaluate(() => {
         document.cookie.split(';').forEach(c => {
           document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
         });
       });
     });

     test('AS-1.1: User can log in with valid credentials', async ({ page }) => {
       await page.goto('http://localhost:3000/login');

       await page.fill('input[type="email"]', 'alice@example.com');
       await page.fill('input[type="password"]', 'demo1234');
       await page.click('button[type="submit"]');

       // Should redirect to dashboard
       await expect(page).toHaveURL('http://localhost:3000/dashboard');

       // Should show personalized greeting
       await expect(page.locator('h1')).toContainText('Welcome, Alice');
     });

     test('AS-1.2: Dashboard is protected, redirects unauthenticated users', async ({ page }) => {
       await page.goto('http://localhost:3000/dashboard');

       // Should redirect to login
       await expect(page).toHaveURL('http://localhost:3000/login');
     });

     test('AS-1.3: User can log out', async ({ page }) => {
       // Log in first
       await page.goto('http://localhost:3000/login');
       await page.fill('input[type="email"]', 'alice@example.com');
       await page.fill('input[type="password"]', 'demo1234');
       await page.click('button[type="submit"]');

       await expect(page).toHaveURL('http://localhost:3000/dashboard');

       // Click logout
       await page.click('button:has-text("Log Out")');

       // Should redirect to login
       await expect(page).toHaveURL('http://localhost:3000/login');

       // Verify logged out: accessing dashboard redirects back
       await page.goto('http://localhost:3000/dashboard');
       await expect(page).toHaveURL('http://localhost:3000/login');
     });

     test('AS-1.4: Invalid credentials show error', async ({ page }) => {
       await page.goto('http://localhost:3000/login');

       await page.fill('input[type="email"]', 'wrong@example.com');
       await page.fill('input[type="password"]', 'wrongpassword');
       await page.click('button[type="submit"]');

       // Should show error alert
       await expect(page.locator('[role="alert"]')).toBeVisible();
       await expect(page.locator('[role="alert"]')).toContainText('Login failed');

       // Should still be on login page
       await expect(page).toHaveURL('http://localhost:3000/login');
     });

     test('AS-1.5: Session persists across page reloads', async ({ page }) => {
       // Log in
       await page.goto('http://localhost:3000/login');
       await page.fill('input[type="email"]', 'alice@example.com');
       await page.fill('input[type="password"]', 'demo1234');
       await page.click('button[type="submit"]');

       await expect(page).toHaveURL('http://localhost:3000/dashboard');

       // Reload page
       await page.reload();

       // Should still be authenticated
       await expect(page).toHaveURL('http://localhost:3000/dashboard');
       await expect(page.locator('h1')).toContainText('Welcome, Alice');
     });
   });
   ```

2. Configure Playwright: Create `examples/demo-shell/playwright.config.ts`:
   ```typescript
   import { defineConfig, devices } from '@playwright/test';

   export default defineConfig({
     testDir: './tests/e2e',
     fullyParallel: false, // Sequential for determinism
     forbidOnly: !!process.env.CI,
     retries: 0, // No retries (spec A-004)
     workers: 1, // Single worker for E2E tests
     reporter: 'html',
     use: {
       baseURL: 'http://localhost:3000',
       trace: 'retain-on-failure',
       screenshot: 'only-on-failure',
     },
     projects: [
       {
         name: 'chromium',
         use: { ...devices['Desktop Chrome'] },
       },
     ],
     webServer: {
       command: 'pnpm dev',
       url: 'http://localhost:3000',
       reuseExistingServer: !process.env.CI,
       timeout: 30 * 1000, // 30 seconds
     },
   });
   ```

**Key Configuration**:
- **No retries**: `retries: 0` per spec A-004 (determinism over flake masking)
- **Sequential**: `fullyParallel: false` prevents race conditions
- **webServer**: Starts `pnpm dev` automatically before tests
- **Trace**: Retained only on failure (debugging)

**Verification**:
```powershell
cd examples\demo-shell
pnpm test:e2e
```

Expected output:
```
Running 5 tests using 1 worker
✓ Authentication Flow › AS-1.1: User can log in with valid credentials (3s)
✓ Authentication Flow › AS-1.2: Dashboard is protected (1s)
✓ Authentication Flow › AS-1.3: User can log out (3s)
✓ Authentication Flow › AS-1.4: Invalid credentials show error (2s)
✓ Authentication Flow › AS-1.5: Session persists across page reloads (3s)

5 passed (12s)
```

---

## Parallel Opportunities

**Can Run Simultaneously**:
- T015 (API client), T016 (global styles), T017 (ErrorBoundary): All independent utilities

**Sequential Requirements**:
- T011 → T012: App.tsx depends on main.tsx (React root must exist)
- T012 → T013-T014: Pages depend on router setup
- T013-T014 → T018: E2E test requires pages implemented

**Suggested Order**:
1. **T011-T012** (sequential): React root → Router setup (30 min)
2. **T013-T014** (parallel): LoginPage + DashboardPage (45 min)
3. **T015-T017** (parallel): API client, styles, ErrorBoundary (30 min)
4. **T018**: E2E test (45 min)

**Time Estimate**: 2-3 hours solo, 1.5-2 hours if parallelized

---

## Definition of Done

- [ ] **T011-T012 Complete**: React root with AuthProvider, router with protected routes
- [ ] **T013-T014 Complete**: LoginPage and DashboardPage implemented
- [ ] **Manual verification**:
  - [ ] Navigate to `/` → redirects to `/login` (not logged in)
  - [ ] Log in with `alice@example.com` / `demo1234` → redirects to `/dashboard`
  - [ ] Dashboard shows "Welcome, Alice!"
  - [ ] Click "Log Out" → redirects to `/login`
  - [ ] Try invalid credentials → shows error alert
- [ ] **T015-T017 Complete**: API client, global styles, ErrorBoundary implemented
- [ ] **T018 Complete**: E2E test suite created and passing
- [ ] **pnpm test:e2e** runs successfully:
  - All 5 tests pass (AS-1.1 through AS-1.5)
  - Test duration <30 seconds
- [ ] **No TypeScript errors**: `pnpm type-check` passes
- [ ] **Code review**: Changes reviewed, approved

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| F02 API differs from assumption | Medium | Medium | Check F02 package docs, adapt interface |
| CSRF token missing (cookie config issue) | Low | High | Verify Django `CSRF_COOKIE_HTTPONLY=False` |
| Session not persisting across reloads | Low | Medium | Check `credentials: 'include'` in fetch |
| E2E tests flaky due to timing | Low | Low | Use Playwright auto-waiting, avoid arbitrary sleeps |

---

## Reviewer Guidance

**What to Check**:
1. **AuthProvider Integration**: Verify `main.tsx` wraps App with `<AuthProvider>` from F02
2. **Route Protection**: Test unauthenticated access to `/dashboard` → should redirect to `/login`
3. **Login Flow**:
   - Enter valid credentials → redirects to dashboard with personalized greeting
   - Enter invalid credentials → shows error alert, stays on login page
4. **Logout**: Click "Log Out" button → redirects to login page, accessing dashboard redirects back
5. **E2E Tests**: Run `pnpm test:e2e` → all 5 tests pass in <30 seconds
6. **Error Handling**: Verify ErrorBoundary shows friendly error (simulate by throwing error in component)

**Acceptance Criteria**:
- ✅ All P1 Story 1 acceptance scenarios (AS-1.1 through AS-1.5) verified manually and via E2E tests
- ✅ No hardcoded credentials in code (except demo hint in LoginPage UI)
- ✅ TypeScript strict mode passes (`pnpm type-check`)
- ✅ E2E tests pass with 0 retries (determinism requirement A-004)

**Next Work Package**: WP03 (Context Switching UI) - adds org/project selector using F03 package.

---

## Related Files

- **Spec**: `spec.md` P1 Story 1 (lines 30-60, acceptance scenarios AS-1.1 through AS-1.5)
- **Contracts**: `contracts/auth.yaml` (POST /auth/login/, GET /auth/me/, POST /auth/logout/)
- **Research**: `research.md` Q1 (Vite stack), F09 integration patterns (AuthProvider interface)
- **Quickstart**: `quickstart.md` Flow 1 (login verification steps)

---

**Status**: Ready for implementation (blocked by WP01)
**Lane**: `planned`
**Move to**: `doing` when WP01 complete, `for_review` when all DoD met, `done` after approval

## Activity Log

- 2025-12-14T12:39:13Z – claude – shell_pid=36848 – lane=doing – Started WP02 implementation
