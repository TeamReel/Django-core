# Quickstart: F02 Core Auth Identity UI
*Feature Branch: 023-core-auth-identity*

**Package**: `@django-core/auth-ui`
**Version**: 1.0.0 (initial release)
**Dependencies**: React 18.x, @django-core/design-system

---

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage (SPA)](#basic-usage-spa)
3. [Django Integration](#django-integration)
4. [Customization](#customization)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites

- React 18.x or higher
- @django-core/design-system 1.x (F01)
- TypeScript 5.x (recommended)

### Install Package

```bash
# Using pnpm (recommended for monorepo)
pnpm add @django-core/auth-ui

# Using npm
npm install @django-core/auth-ui

# Using yarn
yarn add @django-core/auth-ui
```

### Peer Dependencies

Ensure these are installed in your project:

```bash
pnpm add react@^18.0.0 react-dom@^18.0.0 @django-core/design-system
```

---

## Basic Usage (SPA)

### 1. Configure AuthProvider

Wrap your app with `<AuthProvider>` at the root level:

```typescript
// App.tsx
import React from 'react';
import { AuthProvider } from '@django-core/auth-ui';
import { ThemeProvider } from '@django-core/design-system';
import '@django-core/design-system/tokens.css';

const authConfig = {
  apiBaseUrl: '/api/v1',
  endpoints: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    requestPasswordReset: '/auth/password-reset',
    confirmPasswordReset: '/auth/password-reset-confirm',
    me: '/auth/me',
    updateProfile: '/auth/profile',
  },
  routes: {
    login: '/auth/login',
    defaultAfterLogin: '/dashboard',
    afterLogout: '/',
  },
  security: {
    enableSessionPolling: true,
    sessionPollingInterval: 300000, // 5 minutes
  },
};

function App() {
  return (
    <ThemeProvider theme="light">
      <AuthProvider config={authConfig}>
        <Router>
          {/* Your app routes */}
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
```

---

### 2. Add Sign-In Page

Use the pre-built `<SignInPage>` component:

```typescript
// pages/SignInPage.tsx
import React from 'react';
import { SignInPage } from '@django-core/auth-ui';
import { Container } from '@django-core/design-system';

export default function SignIn() {
  return (
    <Container maxWidth="sm">
      <SignInPage />
    </Container>
  );
}
```

**With React Router**:

```typescript
// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SignInPage from './pages/SignInPage';
import Dashboard from './pages/Dashboard';
import { useAuth } from '@django-core/auth-ui';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return <Spinner label="Loading..." />;
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/auth/login" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider config={authConfig}>
        <Routes>
          <Route path="/auth/login" element={<SignInPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

### 3. Access Auth State

Use the `useAuth()` hook to access authentication state:

```typescript
// components/UserMenu.tsx
import React from 'react';
import { useAuth } from '@django-core/auth-ui';
import { Button, Text } from '@django-core/design-system';

function UserMenu() {
  const { user, status, signOut } = useAuth();

  if (status === 'loading') {
    return <Spinner size="sm" />;
  }

  if (status === 'unauthenticated') {
    return <Button href="/auth/login">Sign In</Button>;
  }

  return (
    <div>
      <Text>Welcome, {user?.first_name}!</Text>
      <Button variant="secondary" onClick={signOut}>
        Sign Out
      </Button>
    </div>
  );
}
```

---

### 4. Add Password Reset Pages

**Request Password Reset**:

```typescript
// pages/RequestPasswordResetPage.tsx
import React from 'react';
import { RequestPasswordResetPage } from '@django-core/auth-ui';
import { Container } from '@django-core/design-system';

export default function RequestPasswordReset() {
  return (
    <Container maxWidth="sm">
      <RequestPasswordResetPage />
    </Container>
  );
}
```

**Confirm Password Reset** (from email link):

```typescript
// pages/ConfirmPasswordResetPage.tsx
import React from 'react';
import { ConfirmPasswordResetPage } from '@django-core/auth-ui';
import { Container } from '@django-core/design-system';

export default function ConfirmPasswordReset() {
  return (
    <Container maxWidth="sm">
      <ConfirmPasswordResetPage />
    </Container>
  );
}
```

**Add routes**:

```typescript
<Routes>
  <Route path="/auth/login" element={<SignInPage />} />
  <Route path="/auth/password-reset" element={<RequestPasswordResetPage />} />
  <Route path="/auth/password-reset-confirm" element={<ConfirmPasswordResetPage />} />
</Routes>
```

---

### 5. Add Profile Page

```typescript
// pages/ProfilePage.tsx
import React from 'react';
import { ProfilePage } from '@django-core/auth-ui';
import { Container } from '@django-core/design-system';

export default function Profile() {
  return (
    <Container maxWidth="md">
      <ProfilePage />
    </Container>
  );
}
```

**Protected route**:

```typescript
<Route
  path="/profile"
  element={
    <PrivateRoute>
      <ProfilePage />
    </PrivateRoute>
  }
/>
```

---

## Django Integration

### Setup Overview

F02 Auth UI works seamlessly with Django-rendered templates by mounting React per-page. Django handles routing, F02 handles UI.

---

### 1. Configure Django Settings

**Install Django CORS headers** (if frontend is separate domain):

```bash
pip install django-cors-headers
```

**Update `settings.py`**:

```python
# src/config/settings/base.py

INSTALLED_APPS = [
    # ... existing apps
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add near top
    # ... existing middleware
]

# CORS Configuration (if needed)
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',  # React dev server
]
CORS_ALLOW_CREDENTIALS = True  # Required for cookies

# CSRF Configuration
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to read CSRF token
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = ['http://localhost:3000']

# Session Configuration (already set)
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
```

---

### 2. Create Django Template

**Template**: `templates/auth/login.html`

```django
{% load static %}
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign In</title>

  <!-- F01 Design System CSS -->
  <link rel="stylesheet" href="{% static 'design-system/tokens.css' %}">

  <!-- F02 Auth UI CSS (if separate) -->
  <link rel="stylesheet" href="{% static 'auth-ui/auth-ui.css' %}">
</head>
<body>
  <!-- React mount point with configuration data -->
  <div
    id="auth-root"
    data-api-base-url="/api/v1"
    data-sign-in-endpoint="/auth/login"
    data-sign-out-endpoint="/auth/logout"
    data-me-endpoint="/auth/me"
    data-login-route="/auth/login"
    data-after-login-route="/app"
    data-after-logout-route="/"
  ></div>

  <!-- React bundle -->
  <script src="{% static 'auth-ui/auth-ui.js' %}"></script>
  <script>
    // Extract config from data attributes
    const root = document.getElementById('auth-root');
    const config = {
      apiBaseUrl: root.dataset.apiBaseUrl,
      endpoints: {
        signIn: root.dataset.signInEndpoint,
        signOut: root.dataset.signOutEndpoint,
        me: root.dataset.meEndpoint,
        requestPasswordReset: '/auth/password-reset',
        confirmPasswordReset: '/auth/password-reset-confirm',
        updateProfile: '/auth/profile',
      },
      routes: {
        login: root.dataset.loginRoute,
        defaultAfterLogin: root.dataset.afterLoginRoute,
        afterLogout: root.dataset.afterLogoutRoute,
      },
    };

    // Mount React component
    window.AuthUI.renderSignInPage(root, config);
  </script>
</body>
</html>
```

---

### 3. Django View

**View**: `src/accounts/views.py`

```python
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie

@ensure_csrf_cookie
def login_view(request):
    """
    Render sign-in page with React component.
    @ensure_csrf_cookie sets CSRF token cookie for frontend to read.
    """
    return render(request, 'auth/login.html')
```

**URL Routing**: `src/accounts/urls.py`

```python
from django.urls import path
from . import views

urlpatterns = [
    path('auth/login', views.login_view, name='login'),
    path('auth/password-reset', views.password_reset_view, name='password-reset'),
    path('auth/password-reset-confirm', views.password_reset_confirm_view, name='password-reset-confirm'),
    path('profile', views.profile_view, name='profile'),
]
```

---

### 4. Handle CSRF Token

**Extract CSRF token in JavaScript**:

```javascript
// Automatically handled by F02 Auth UI internal apiClient
// But if you need to access it manually:

function getCsrfToken() {
  const cookies = document.cookie.split(';');
  const csrfCookie = cookies.find(c => c.trim().startsWith('csrftoken='));
  return csrfCookie ? csrfCookie.split('=')[1] : '';
}

// Include in fetch requests
fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCsrfToken(),
  },
  credentials: 'include', // Send cookies
  body: JSON.stringify({ email, password }),
});
```

---

### 5. Inject Config via Django Context

**Alternative to data attributes**: Use inline script with Django template variables.

```django
<script>
  window.AUTH_CONFIG = {
    apiBaseUrl: '{{ api_base_url }}',
    endpoints: {
      signIn: '{{ sign_in_endpoint }}',
      signOut: '{{ sign_out_endpoint }}',
      me: '{{ me_endpoint }}',
    },
    routes: {
      login: '{{ login_route }}',
      defaultAfterLogin: '{{ after_login_route }}',
      afterLogout: '{{ after_logout_route }}',
    },
  };
</script>
<script src="{% static 'auth-ui/auth-ui.js' %}"></script>
<script>
  const root = document.getElementById('auth-root');
  window.AuthUI.renderSignInPage(root, window.AUTH_CONFIG);
</script>
```

**Django view**:

```python
def login_view(request):
    context = {
        'api_base_url': '/api/v1',
        'sign_in_endpoint': '/auth/login',
        'sign_out_endpoint': '/auth/logout',
        'me_endpoint': '/auth/me',
        'login_route': '/auth/login',
        'after_login_route': '/app',
        'after_logout_route': '/',
    }
    return render(request, 'auth/login.html', context)
```

---

## Customization

### Using Form Primitives

For custom layouts, use form primitives instead of page components:

```typescript
// Custom sign-in page with custom layout
import React from 'react';
import { SignInForm, useSignIn } from '@django-core/auth-ui';
import { Card, Heading, Text, Stack } from '@django-core/design-system';

function CustomSignInPage() {
  const { mutate: signIn, isLoading, error } = useSignIn();

  async function handleSignIn(credentials: { email: string; password: string }) {
    await signIn(credentials);
    // Custom success handling
    window.location.href = '/custom-dashboard';
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <Stack gap="lg">
        <Heading level={1}>Welcome Back</Heading>
        <Text color="secondary">Sign in to continue to your account</Text>

        <Card variant="elevated" padding="lg">
          <SignInForm
            onSubmit={handleSignIn}
            isLoading={isLoading}
            error={error}
          />
        </Card>

        <Text size="sm" color="tertiary">
          Don't have an account? <a href="/signup">Sign up</a>
        </Text>
      </Stack>
    </div>
  );
}
```

---

### Custom Validation

Override default validation with custom logic:

```typescript
import React, { useState } from 'react';
import { Button, Input, Alert } from '@django-core/design-system';
import { useSignIn } from '@django-core/auth-ui';

function CustomSignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { mutate: signIn, isLoading, error } = useSignIn();

  function validateEmail(email: string): string | null {
    if (!email) return 'Email is required';
    if (!email.endsWith('@company.com')) {
      return 'Only @company.com emails are allowed';
    }
    return null;
  }

  function validatePassword(password: string): string | null {
    if (!password) return 'Password is required';
    if (password.length < 12) {
      return 'Password must be at least 12 characters';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Custom validation
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    setErrors({});
    await signIn({ email, password });
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert variant="error">{error.message}</Alert>}

      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        required
      />

      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        required
      />

      <Button type="submit" loading={isLoading} fullWidth>
        Sign In
      </Button>
    </form>
  );
}
```

---

### Custom Redirect Behavior

Override default redirect logic:

```typescript
import { useSignIn, useAuth } from '@django-core/auth-ui';
import { useNavigate, useSearchParams } from 'react-router-dom';

function SignInPageWithCustomRedirect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutate: signIn } = useSignIn();

  async function handleSignIn(credentials) {
    await signIn(credentials);

    // Custom redirect logic
    const nextUrl = searchParams.get('next');

    if (nextUrl) {
      // Redirect to requested page
      navigate(nextUrl);
    } else if (user.role === 'admin') {
      // Admins go to admin dashboard
      navigate('/admin/dashboard');
    } else {
      // Regular users go to user dashboard
      navigate('/dashboard');
    }
  }

  return <SignInForm onSubmit={handleSignIn} />;
}
```

---

### Styling Customization

F02 Auth UI uses F01 Design System tokens. Customize by overriding CSS variables:

```css
/* custom-theme.css */
:root {
  /* Override F01 design tokens */
  --color-primary: #0066cc;
  --color-primary-hover: #0052a3;
  --font-family-base: 'Inter', sans-serif;
  --border-radius-md: 8px;
}

/* Custom auth page styles */
.auth-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## API Reference

### Components

#### `<AuthProvider>`

Provides authentication context to child components.

**Props**:

```typescript
interface AuthProviderProps {
  config: AuthConfig;       // Required: Auth configuration
  children: React.ReactNode; // Required: Child components
}
```

**Example**:

```typescript
<AuthProvider config={authConfig}>
  <App />
</AuthProvider>
```

---

#### `<SignInPage>`

Pre-built sign-in page with form, validation, error handling.

**Props**: None (uses AuthProvider config)

**Example**:

```typescript
<SignInPage />
```

---

#### `<RequestPasswordResetPage>`

Pre-built password reset request page.

**Props**: None (uses AuthProvider config)

**Example**:

```typescript
<RequestPasswordResetPage />
```

---

#### `<ConfirmPasswordResetPage>`

Pre-built password reset confirmation page (from email link).

**Props**: None (uses AuthProvider config, reads URL params)

**Example**:

```typescript
<ConfirmPasswordResetPage />
```

---

#### `<ProfilePage>`

Pre-built profile management page.

**Props**: None (uses AuthProvider config)

**Example**:

```typescript
<ProfilePage />
```

---

### Hooks

#### `useAuth()`

Access global authentication state.

**Returns**:

```typescript
interface UseAuthResult {
  user: User | null;
  status: 'authenticated' | 'unauthenticated' | 'loading' | 'error';
  isLoading: boolean;
  error: ApiError | null;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Example**:

```typescript
const { user, status, signOut } = useAuth();

if (status === 'authenticated') {
  console.log('Logged in as:', user.email);
}
```

---

#### `useAuthStatus()`

Lightweight hook for checking authentication status only.

**Returns**:

```typescript
type AuthStatus = 'authenticated' | 'unauthenticated' | 'loading' | 'error';
```

**Example**:

```typescript
const status = useAuthStatus();

if (status === 'authenticated') {
  return <Dashboard />;
}
```

---

#### `useCurrentUser()`

Get current user profile (null if not authenticated).

**Returns**:

```typescript
User | null
```

**Example**:

```typescript
const user = useCurrentUser();

return <Text>Welcome, {user?.first_name}!</Text>;
```

---

#### `useSignIn()`

Hook for signing in users.

**Returns**:

```typescript
interface UseSignInResult {
  mutate: (credentials: { email: string; password: string }) => Promise<User>;
  isLoading: boolean;
  error: ApiError | null;
  data: User | null;
  reset: () => void;
}
```

**Example**:

```typescript
const { mutate: signIn, isLoading, error } = useSignIn();

async function handleSubmit() {
  await signIn({ email: 'user@example.com', password: 'Password123!' });
  // User is now authenticated
}
```

---

#### `useSignOut()`

Hook for signing out users.

**Returns**:

```typescript
interface UseSignOutResult {
  mutate: () => Promise<void>;
  isLoading: boolean;
  error: ApiError | null;
}
```

**Example**:

```typescript
const { mutate: signOut, isLoading } = useSignOut();

<Button onClick={signOut} loading={isLoading}>
  Sign Out
</Button>
```

---

#### `useRequestPasswordReset()`

Hook for requesting password reset email.

**Returns**:

```typescript
interface UseRequestPasswordResetResult {
  mutate: (data: { email: string }) => Promise<{ message: string }>;
  isLoading: boolean;
  error: ApiError | null;
  data: { message: string } | null;
  reset: () => void;
}
```

**Example**:

```typescript
const { mutate: requestReset, isLoading, error } = useRequestPasswordReset();

await requestReset({ email: 'user@example.com' });
// Reset email sent (or generic success message)
```

---

#### `useConfirmPasswordReset()`

Hook for confirming password reset with token.

**Returns**:

```typescript
interface UseConfirmPasswordResetResult {
  mutate: (data: {
    uidb64: string;
    token: string;
    new_password: string;
  }) => Promise<{ message: string }>;
  isLoading: boolean;
  error: ApiError | null;
  data: { message: string } | null;
  reset: () => void;
}
```

**Example**:

```typescript
const { mutate: confirmReset, isLoading, error } = useConfirmPasswordReset();

await confirmReset({
  uidb64: 'MTIz',
  token: 'a1b2c3',
  new_password: 'NewPassword123!',
});
// Password reset, redirect to login
```

---

#### `useUpdateProfile()`

Hook for updating user profile.

**Returns**:

```typescript
interface UseUpdateProfileResult {
  mutate: (data: {
    first_name?: string;
    last_name?: string;
  }) => Promise<User>;
  isLoading: boolean;
  error: ApiError | null;
  data: User | null;
  reset: () => void;
}
```

**Example**:

```typescript
const { mutate: updateProfile, isLoading } = useUpdateProfile();

await updateProfile({
  first_name: 'Jane',
  last_name: 'Smith',
});
// Profile updated, user state refreshed
```

---

## Troubleshooting

### CSRF Token Errors

**Symptom**: 403 Forbidden on POST requests with message "CSRF token missing or incorrect".

**Solution**:

1. Ensure `@ensure_csrf_cookie` decorator on Django view
2. Check CSRF cookie is set: `document.cookie` should include `csrftoken=...`
3. Verify `X-CSRFToken` header is included in requests
4. Ensure `credentials: 'include'` in fetch options

**Debug**:

```javascript
// Check CSRF cookie
console.log('CSRF token:', getCsrfToken());

// Check request headers
fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCsrfToken(),
  },
  credentials: 'include',
  body: JSON.stringify({ email, password }),
}).then(res => {
  console.log('Response status:', res.status);
  return res.json();
}).then(data => {
  console.log('Response data:', data);
});
```

---

### Session Not Persisting

**Symptom**: User logs in successfully but is immediately logged out on page refresh.

**Causes**:
1. Session cookie not being sent with requests
2. Session cookie not set due to CORS/SameSite issues
3. Session expired (24hr inactivity timeout)

**Solution**:

1. Ensure `credentials: 'include'` in all fetch requests
2. Check `SESSION_COOKIE_SAMESITE = 'Lax'` in Django settings
3. Verify `CORS_ALLOW_CREDENTIALS = True` if using CORS
4. Check session cookie in browser DevTools: Application > Cookies

---

### 401 Errors on /auth/me

**Symptom**: `/auth/me` returns 401 even after successful login.

**Causes**:
1. Session cookie not sent with request
2. Session expired
3. Middleware not configured correctly

**Debug**:

```javascript
// Check session cookie
console.log('Cookies:', document.cookie);

// Test /auth/me directly
fetch('/api/v1/auth/me', {
  credentials: 'include',
}).then(res => {
  console.log('Status:', res.status);
  return res.json();
}).then(data => {
  console.log('User data:', data);
});
```

---

### Password Validation Errors

**Symptom**: Password meets client-side requirements but backend returns validation error.

**Cause**: Client-side validation doesn't match Django validators.

**Solution**: Ensure client-side validation matches Django password validators (see [data-model.md](./data-model.md#password-complexity-rules)).

---

### Redirect Loop on Login

**Symptom**: After login, page redirects to login again (infinite loop).

**Causes**:
1. AuthProvider not wrapping routes correctly
2. Protected route checking auth state before it's loaded

**Solution**:

```typescript
// Ensure AuthProvider wraps routes
<AuthProvider config={authConfig}>
  <Routes>
    {/* routes */}
  </Routes>
</AuthProvider>

// Check loading state in PrivateRoute
function PrivateRoute({ children }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return <Spinner />; // Don't redirect while loading
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/auth/login" />;
  }

  return children;
}
```

---

## Next Steps

- **Full Documentation**: See [README.md](../README.md) for complete API reference
- **Component Props**: See [API Documentation](./api.md) for detailed prop types
- **Backend Contracts**: See [contracts/](./contracts/) for API endpoint specifications
- **Data Models**: See [data-model.md](./data-model.md) for TypeScript type definitions

---

## Support

- **Issues**: Report bugs at [GitHub Issues](https://github.com/TeamReel/django-core/issues)
- **Discussions**: Ask questions in [GitHub Discussions](https://github.com/TeamReel/django-core/discussions)
- **Docs**: Full documentation at [docs.django-core.dev](https://docs.django-core.dev)

---

## Version History

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0.0   | 2025-12-07 | Initial quickstart documentation (F02 Phase 1) |
