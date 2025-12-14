# Frontend-Backend Integration Guides - Quick Start

> **Feature**: F09-frontend-backend-integration-guides
> **Package**: `examples/integration-guides`
> **Documentation**: `docs/integration-guides/`

## Overview

This feature provides comprehensive integration guides showing how to connect frontend modules (F01–F08) with Core-App backend APIs and core modules. The guides demonstrate repeatable patterns for authentication, context propagation, and data fetching.

## 📋 Guide Index

### Priority Guides (Implemented First)

1. **[Authentication & API Calls](./docs/integration-guides/auth-api.md)** ⭐
   How to integrate F02 Auth UI with backend authentication, handle sessions, and make authenticated API calls.
   - Login/logout flows
   - CSRF token handling
   - Session management
   - Token refresh patterns

2. **[Context Propagation](./docs/integration-guides/context-propagation.md)** ⭐
   How to integrate F03 Context Switcher with multi-tenancy backend, propagate org/project context via headers.
   - Organization/project selection
   - Context persistence
   - Header injection
   - Context validation

3. **[Data Fetching Patterns](./docs/integration-guides/data-fetching.md)** ⭐
   List→detail navigation, pagination, filtering, caching strategies for resource endpoints.
   - List views with pagination
   - Detail view navigation
   - Loading states
   - Error handling
   - Cache invalidation

### Additional Guides

4. **[Error Handling & Notifications](./docs/integration-guides/error-handling.md)**
   Global error handling, user-facing error messages, notification integration.

5. **[Form Validation & Submission](./docs/integration-guides/form-validation.md)**
   Frontend validation patterns, backend error mapping, optimistic updates.

6. **[Real-time Updates](./docs/integration-guides/realtime.md)**
   WebSocket integration, polling patterns, optimistic UI updates.

7. **[File Uploads](./docs/integration-guides/file-uploads.md)**
   Multipart form data, progress tracking, chunked uploads.

8. **[Theming Integration](./docs/integration-guides/theming.md)**
   F07 theme system with backend preferences, SSR considerations.

## 🧩 TypeScript Contracts

All interface patterns are defined as TypeScript contracts in [`contracts/`](./contracts/):

```typescript
import type {
  AuthProvider,
  ContextProvider,
  ApiClient,
  CachePolicy,
  RequestState,
} from './contracts';
```

**Key Interfaces**:
- `AuthProvider` - Authentication state management
- `ContextProvider` - Organization/project context
- `ApiClient` - HTTP client with CSRF, auth, context headers
- `CachePolicy` - Client-side caching decisions
- `RequestState<T>` - Async operation state (idle | loading | success | error)

See [contracts/index.ts](./contracts/index.ts) for full interface definitions.

## 🚀 Quick Start Examples

### 1. Authentication Flow

```typescript
import { useAuth } from './auth-context';

function LoginPage() {
  const auth = useAuth();

  const handleLogin = async (email: string, password: string) => {
    try {
      await auth.login({ email, password });
      navigate('/dashboard');
    } catch (error) {
      showError('Invalid credentials');
    }
  };

  return <LoginForm onSubmit={handleLogin} />;
}
```

### 2. Context-Aware API Call

```typescript
import { useApiClient } from './api-context';
import { useContext } from './context-provider';

function ProjectList() {
  const apiClient = useApiClient();
  const context = useContext();

  // Automatically includes X-Organization-ID header
  const { data, error } = useSWR(
    context.currentOrganization ? '/api/projects' : null,
    (url) => apiClient.get(url)
  );

  if (!context.currentOrganization) {
    return <SelectOrganization />;
  }

  return <List items={data} />;
}
```

### 3. Data Fetching with Cache

```typescript
import { useApiClient } from './api-context';
import { useCachePolicy } from './cache-provider';

function useProjects() {
  const apiClient = useApiClient();
  const cachePolicy = useCachePolicy();

  return useSWR('/api/projects', {
    fetcher: (url) => apiClient.get(url),
    dedupingInterval: cachePolicy.getCacheDuration('/api/projects'),
    revalidateOnFocus: true,
  });
}
```

## 📦 Example Implementations

Working examples are provided in [`examples/integration-guides/`](../../examples/integration-guides/):

```
examples/integration-guides/
├── auth-example/          # React Context-based AuthProvider
├── context-example/       # React Context-based ContextProvider
├── api-client-example/    # Fetch-based ApiClient with interceptors
└── cache-example/         # SWR-based CachePolicy
```

Each example includes:
- Full TypeScript implementation
- Unit tests
- Integration tests
- Usage documentation

## 🛠️ Integration Checklist

Before deploying, verify:

- [ ] Authentication works (login, logout, session refresh)
- [ ] CSRF tokens are injected in all mutating requests
- [ ] Context headers propagate correctly (X-Organization-ID, X-Project-ID)
- [ ] Error handling covers all error types (4xx, 5xx, network)
- [ ] Loading states are displayed for async operations
- [ ] Cache invalidation occurs after mutations
- [ ] TypeScript types match backend response schemas
- [ ] API client has request/response logging (dev mode only)

Full checklist: [docs/integration-guides/checklist.md](./docs/integration-guides/checklist.md)

## 📚 Additional Resources

- **[Architecture Decision Records](./docs/integration-guides/decisions.md)** - Why we chose these patterns
- **[Anti-patterns](./docs/integration-guides/anti-patterns.md)** - Common mistakes to avoid
- **[Troubleshooting](./docs/integration-guides/troubleshooting.md)** - Debug common integration issues
- **[API Reference](https://api-docs.django-core.example.com)** - Full backend API documentation

## 🔗 Related Features

- **F01**: Design System - UI components used in examples
- **F02**: Auth UI - Authentication components
- **F03**: Context Switcher - Organization/project selection
- **F06**: Page Templates - Layout components
- **F07**: Theme System - Theming integration

## 🤝 Contributing

When adding new integration guides:

1. Follow the template in [`docs/integration-guides/_template.md`](./docs/integration-guides/_template.md)
2. Create corresponding example in `examples/integration-guides/`
3. Add tests (unit + integration)
4. Update this quickstart with navigation links
5. Run validation: `pnpm lint && pnpm type-check && pnpm test`

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for full contribution guidelines.

## 📞 Support

- **Documentation**: [https://docs.django-core.example.com](https://docs.django-core.example.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/django-core/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/django-core/discussions)

---

**Last Updated**: 2025-12-14
**Authors**: Platform Team
**Maintainers**: Feature teams (see Constitution Principle 10)
