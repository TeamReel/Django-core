# ADR-002: State Management with React Context

**Status:** Accepted

**Date:** 2024-12-11

**Deciders:** @django-core/frontend-team

---

## Context

The context switcher needs to manage state for:
- Current organisation and project
- List of available organisations
- List of projects for the current organisation
- Loading states
- Error states
- Context switching operations

This state needs to be accessible across multiple components (indicator, pickers, custom components) without prop drilling.

We need to choose a state management approach that:
1. Provides global access to context state
2. Triggers re-renders when state changes
3. Integrates well with React
4. Minimizes bundle size and complexity
5. Works server-side (Next.js SSR/SSG)

## Decision

We will use **React Context API** with a custom hook (`useContextSwitcher`) for state management.

### Architecture

```typescript
// Provider manages state
<ContextSwitcherProvider config={config}>
  {children}
</ContextSwitcherProvider>

// Components consume state via hook
function MyComponent() {
  const { context, organisations, switchContext } = useContextSwitcher();
  // ...
}
```

### State Structure

```typescript
interface ContextSwitcherState {
  // Current context
  context: {
    organisation: Organisation | null;
    project: Project | null;
    isLoading: boolean;
    error: Error | null;
  };

  // Available options
  organisations: Organisation[];
  projects: Project[];

  // Operations
  switchContext: (org: Organisation, project?: Project | null) => Promise<void>;
  refresh: () => Promise<void>;
  isSwitching: boolean;
}
```

## Rationale

### Why React Context?

**Built-in Solution:**
- No external dependencies (Redux, MobX, Zustand, etc.)
- Zero bundle size overhead
- Native React API, familiar to all React developers

**Perfect Fit for This Use Case:**
- Context data is truly "global" application state
- Not frequently updated (switches happen infrequently)
- Read-heavy workload (many components read, few write)

**Server-Side Rendering:**
- Works seamlessly with Next.js SSR/SSG
- No hydration issues
- No special setup required

**Simplicity:**
- Single provider at app root
- One hook to access everything
- Easy to test and debug

### State Management Patterns

**1. Single Context Provider**

All state in one context prevents multiple providers:

```typescript
// ❌ Bad - multiple providers
<OrganisationProvider>
  <ProjectProvider>
    <ContextProvider>
      {children}
    </ContextProvider>
  </ProjectProvider>
</OrganisationProvider>

// ✅ Good - single provider
<ContextSwitcherProvider config={config}>
  {children}
</ContextSwitcherProvider>
```

**2. Custom Hook Encapsulation**

Hook provides clean API and validates usage:

```typescript
export function useContextSwitcher() {
  const context = useContext(ContextSwitcherContext);

  if (!context) {
    throw new Error(
      'useContextSwitcher must be used within a ContextSwitcherProvider'
    );
  }

  return context;
}
```

**3. Immutable State Updates**

All state updates use immutable patterns:

```typescript
// Update context
setContext((prev) => ({
  ...prev,
  organisation: newOrg,
  project: null, // Clear project when org changes
}));
```

## Implementation

### Provider Component

```typescript
export function ContextSwitcherProvider({
  config,
  children,
}: ContextSwitcherProviderProps) {
  // State
  const [context, setContext] = useState<UserContext>({
    organisation: null,
    project: null,
    isLoading: true,
    error: null,
  });

  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSwitching, setIsSwitching] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialContext();
  }, []);

  // Switch context function
  const switchContext = useCallback(
    async (org: Organisation, project?: Project | null) => {
      setIsSwitching(true);

      try {
        // Call lifecycle hook
        const shouldProceed = await config.onBeforeContextChange?.(context);
        if (shouldProceed === false) {
          return;
        }

        // Build new path
        const newPath = config.routerAdapter.buildPathForContext({
          orgSlug: org.slug,
          projectSlug: project?.slug,
        });

        // Navigate
        config.routerAdapter.navigateTo(newPath);

        // Update state
        setContext({
          organisation: org,
          project: project || null,
          isLoading: false,
          error: null,
        });

        // Call lifecycle hook
        config.onContextChanged?.({ organisation: org, project: project || null });
      } catch (error) {
        setContext((prev) => ({ ...prev, error }));
        config.onContextError?.(error);
      } finally {
        setIsSwitching(false);
      }
    },
    [config, context]
  );

  // Context value
  const value = useMemo(
    () => ({
      context,
      organisations,
      projects,
      switchContext,
      refresh: loadInitialContext,
      isSwitching,
    }),
    [context, organisations, projects, switchContext, isSwitching]
  );

  return (
    <ContextSwitcherContext.Provider value={value}>
      {children}
    </ContextSwitcherContext.Provider>
  );
}
```

## Consequences

### Positive

- **Zero dependencies**: No external state management library needed
- **Simple mental model**: Standard React patterns, easy to understand
- **SSR compatible**: Works out-of-box with Next.js and other SSR frameworks
- **Type-safe**: Full TypeScript support with inference
- **Testable**: Easy to mock provider in tests
- **Small bundle**: No extra bytes for state management

### Negative

- **Re-render scope**: All consumers re-render when any state changes (mitigated by using `useMemo` and splitting rarely-changing data)
- **No devtools**: No Redux DevTools or similar debugging tools
- **No time-travel**: Cannot replay state changes for debugging
- **Context limitations**: Context cannot be accessed outside React tree

### Mitigations

**Performance Optimization:**

```typescript
// Memoize context value to prevent unnecessary re-renders
const value = useMemo(
  () => ({
    context,
    organisations,
    projects,
    switchContext,
    refresh,
    isSwitching,
  }),
  [context, organisations, projects, switchContext, isSwitching]
);
```

**Debugging:**

```typescript
// Add development logging
if (process.env.NODE_ENV === 'development') {
  console.log('[ContextSwitcher] Context changed:', context);
}
```

**Testing:**

```typescript
// Easy to create test provider
function TestProvider({ children, overrides }) {
  return (
    <ContextSwitcherProvider
      config={{
        routerAdapter: mockAdapter,
        ...overrides,
      }}
    >
      {children}
    </ContextSwitcherProvider>
  );
}
```

## Alternatives Considered

### 1. Redux/Redux Toolkit

**Rejected because:**
- Overkill for this use case (infrequent updates, simple state)
- Adds ~30KB to bundle
- More boilerplate (actions, reducers, selectors)
- Harder to learn for newcomers
- Doesn't integrate as well with SSR

### 2. Zustand

**Rejected because:**
- External dependency (adds 3KB)
- Doesn't provide significant benefits over Context for this use case
- Less familiar to React developers than Context API
- Requires additional setup for SSR

### 3. MobX

**Rejected because:**
- External dependency (~20KB)
- Unfamiliar API (decorators, observables)
- More complex than needed
- SSR support requires extra configuration

### 4. Prop Drilling

**Rejected because:**
- Requires passing context through every component
- Refactoring nightmare when structure changes
- Hard to add context access to deeply nested components

### 5. Multiple Contexts (Split State)

```typescript
<OrganisationContext.Provider>
  <ProjectContext.Provider>
    {children}
  </ProjectContext.Provider>
</OrganisationContext.Provider>
```

**Rejected because:**
- More complex to coordinate state updates
- Harder to ensure consistency (org/project must match)
- Multiple hooks needed (`useOrganisation`, `useProject`)
- Doesn't reduce re-renders (consumers still update)

## Related ADRs

- [ADR-001: Router Adapter Pattern](./001-router-adapter-pattern.md) - How URLs are synchronized
- [ADR-004: API Integration](./004-api-integration.md) - How data is fetched

## References

- [React Context Documentation](https://react.dev/reference/react/useContext)
- [When to Use Context - Kent C. Dodds](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- [State Colocation - Kent C. Dodds](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)
