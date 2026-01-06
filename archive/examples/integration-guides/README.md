# Integration Guides Examples

TypeScript interface contracts and example implementations for frontend-backend integration patterns with Django Core-App.

This package provides the stable, framework-agnostic interface definitions that guide how downstream products should implement authentication, context propagation, API clients, and caching strategies when integrating with Core-App.

## Quick Start

See [`../../docs/integration-guides/`](../../docs/integration-guides/) for comprehensive guides including:
- Authentication API integration (Priority 1)
- Context propagation (Org/Project headers)
- Data fetching patterns with caching
- Error handling and form validation
- Anti-patterns to avoid

## Package Contents

- **`contracts/`** - TypeScript interface definitions (stable API)
  - `types.ts` - Core types (RequestState, User, Organization, etc.)
  - `auth.ts` - AuthProvider interface
  - `context.ts` - ContextProvider interface
  - `api-client.ts` - ApiClient interface
  - `cache.ts` - CachePolicy interface
  - `index.ts` - Barrel export

- **Example implementations** (in progress)
  - `auth-example/` - React Context-based authentication
  - `context-example/` - Multi-tenancy context provider
  - `api-client-example/` - Fetch-based HTTP client
  - `cache-example/` - SWR-based caching

## Validation

```bash
# Type-check contracts
pnpm type-check

# Lint contracts
pnpm lint

# Format code
pnpm format
```
