# Authentication Example: Quick Start

This directory contains complete working examples of the `AuthProvider` interface pattern.

## Files

- **`vanilla.ts`** - Pure TypeScript implementation, no framework dependencies
  - Use as reference for non-React applications
  - Or as a base layer to wrap in framework-specific solutions

- **`react.tsx`** - React Context wrapper around vanilla implementation
  - Drop-in component for React applications
  - Includes `useAuth` hook and `ProtectedRoute` component

## Quick Start: React

```tsx
import { AuthProviderComponent, useAuth } from './auth-example/react';

function App() {
  return (
    <AuthProviderComponent baseURL="/api">
      <MainContent />
    </AuthProviderComponent>
  );
}

function MainContent() {
  const auth = useAuth();

  if (!auth.isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div>
      <h1>Welcome {auth.user?.name}</h1>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}
```

## Quick Start: Vanilla TypeScript

```typescript
import { createAuthProvider } from './auth-example/vanilla';

const auth = createAuthProvider({ baseURL: '/api' });

// Login
await auth.login({ email: 'user@example.com', password: 'secret' });
console.log('Welcome:', auth.user?.name);

// Check permission
if (auth.hasPermission('projects.create')) {
  // Show create button
}

// Logout
await auth.logout();
```

## Implementation Notes

Both implementations:
- Extract CSRF token from HTML meta tag
- Include CSRF token in all mutating requests
- Use `credentials: 'include'` to send session cookies
- Support permission checks via `hasPermission()`
- Provide state callbacks for UI updates

See `/docs/integration-guides/auth-api.md` for complete guide with error handling, retry patterns, and anti-patterns.
