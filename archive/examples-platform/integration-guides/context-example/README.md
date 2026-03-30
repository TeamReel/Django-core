# Context Example

Example implementations of the `ContextProvider` interface for multi-tenancy context management.

## Files

- **`vanilla.ts`**: Framework-agnostic TypeScript implementation of context provider. Use this in:
  - Non-React environments (Vanilla JS, Vue, Svelte, etc.)
  - As a base for custom framework integrations
  - For reference on the pattern

- **`react.tsx`**: React-specific wrapper and example components:
  - `ContextProviderComponent` - React provider component
  - `useContext()` - Hook to access context
  - `OrganizationSwitcher` - Example org selector
  - `ProjectSwitcher` - Example project selector
  - `ContextDisplay` - Debug display of current context
  - `ProtectedContextComponent` - Protected component requiring context

## Quick Start - React

```tsx
import { ContextProviderComponent, useContext } from './context-example/react';

function App() {
  return (
    <ContextProviderComponent baseURL="https://api.example.com">
      <Dashboard />
    </ContextProviderComponent>
  );
}

function Dashboard() {
  const context = useContext();

  return (
    <div>
      <h1>Organization: {context.currentOrganization?.name}</h1>

      <button
        onClick={async () => {
          const org = { id: 'org_123', name: 'Acme Corp', slug: 'acme' };
          await context.setOrganization(org);
        }}
      >
        Switch Organization
      </button>

      <p>API headers: {JSON.stringify(context.getContextHeaders())}</p>
    </div>
  );
}
```

## Quick Start - Vanilla TypeScript

```typescript
import { createContextProvider } from './context-example/vanilla';

// Create provider
const contextProvider = createContextProvider({
  baseURL: 'https://api.example.com',
  onContextChange: (context) => {
    console.log('Context changed:', context);
    // Persist to localStorage
    localStorage.setItem('org', context.currentOrganization?.id || '');
  },
});

// Switch organization
const acmeOrg = { id: 'org_123', name: 'Acme Corp', slug: 'acme' };
await contextProvider.setOrganization(acmeOrg);

// Use context headers
const headers = contextProvider.getContextHeaders();
// Returns: { 'X-Organization-ID': 'org_123' }
```

## Integration Notes

- Context headers (`X-Organization-ID`, `X-Project-ID`) are automatically included in validation API calls
- Use `getContextHeaders()` when building custom API clients
- Projects are scoped to organizations - switching org clears project context
- All context operations validate access via backend API calls
- Integrate with WP02 (Authentication) for complete auth + context solution
- See [Context Propagation Guide](../../docs/integration-guides/context-propagation.md) for complete documentation
