# Data Model: Multi-Tenancy Context Switcher
*Path: kitty-specs/024-multi-tenancy-context/data-model.md*

**Feature**: F03 Multi-Tenancy Context Switcher
**Date**: 2025-12-09
**Phase**: Phase 1 - Design & Contracts

## Overview

This document defines the TypeScript types and interfaces for the context switcher package. All types represent client-side data structures; backend models (B06/B07) are the source of truth.

---

## Core Entities

### Organisation

Represents a tenant/client/account in the multi-tenancy system.

```typescript
interface Organisation {
  /** Unique identifier (backend primary key) */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** URL-safe slug for routing (e.g., "acme-corp") */
  slug: string;

  /** Optional logo/avatar URL */
  logo?: string;

  /** Optional metadata for sorting/filtering */
  metadata?: {
    isPinned?: boolean;
    lastVisitedAt?: string; // ISO 8601 timestamp
    [key: string]: unknown;
  };
}
```

**Validation Rules** (enforced by backend):
- `id` must be unique across all organisations
- `slug` must be unique, URL-safe, lowercase, no spaces
- `name` required, non-empty
- `logo` if provided, must be valid URL

**Relationships**:
- One organisation has many projects
- One user has many organisations (via B08 role assignments)

---

### Project / Workspace

Represents a sub-context within an organisation (optional, depending on product usage).

```typescript
interface Project {
  /** Unique identifier (backend primary key) */
  id: string;

  /** Display name shown in UI */
  name: string;

  /** URL-safe slug for routing (e.g., "website-redesign") */
  slug: string;

  /** Parent organisation ID */
  organisationId: string;

  /** Optional metadata */
  metadata?: {
    isArchived?: boolean;
    lastVisitedAt?: string; // ISO 8601 timestamp
    [key: string]: unknown;
  };
}
```

**Validation Rules** (enforced by backend):
- `id` must be unique across all projects
- `slug` must be unique within organisation scope, URL-safe
- `name` required, non-empty
- `organisationId` must reference valid organisation

**Relationships**:
- One project belongs to one organisation
- One user has many projects (via B08 role assignments scoped to projects)

---

### User Context

Represents the user's current active organisation and project selection.

```typescript
interface UserContext {
  /** Current active organisation (null if no context selected) */
  organisation: Organisation | null;

  /** Current active project (null if org-only context or no context) */
  project: Project | null;

  /** Loading state (true while fetching context from backend) */
  isLoading: boolean;

  /** Error state (populated if context fetch/validation fails) */
  error: ContextError | null;
}

interface ContextError {
  /** Error code (401, 403, 404, 500) */
  code: number;

  /** User-facing error message */
  message: string;

  /** Additional error details for debugging */
  details?: unknown;
}
```

**State Transitions**:
1. Initial: `{ organisation: null, project: null, isLoading: true, error: null }`
2. URL context loaded: `{ organisation: {...}, project: {...}?, isLoading: false, error: null }`
3. Context switch initiated: `isLoading = true`
4. Context switch complete: `{ organisation: {...}, project: {...}?, isLoading: false, error: null }`
5. Context error: `{ organisation: null, project: null, isLoading: false, error: {...} }`

---

## Configuration Types

### RouterAdapter

Interface for routing integration (injected by host application).

```typescript
interface RouterAdapter {
  /**
   * Get the current URL path.
   * Used to initialize context from URL.
   *
   * @returns Current path (e.g., "/acme-corp/tasks")
   */
  getCurrentPath(): string;

  /**
   * Navigate to a new path.
   * Called on context switch.
   *
   * @param path - Target path (e.g., "/beta-inc/dashboard")
   */
  navigateTo(path: string): void;

  /**
   * Build URL path for a given context.
   * Implements path preservation logic from clarifications.
   *
   * @param ctx - Target organisation and project
   * @param options - Path building options
   * @returns Constructed path
   */
  buildPathForContext(
    ctx: { orgSlug: string; projectSlug?: string },
    options?: {
      /** If true, attempt to preserve current page path */
      preservePath?: boolean;
      /** Fallback path if preserve fails or not requested */
      fallbackPath?: string;
    }
  ): string;
}
```

**Example Implementations**:

```typescript
// React Router adapter
const reactRouterAdapter: RouterAdapter = {
  getCurrentPath: () => location.pathname,
  navigateTo: (path) => navigate(path),
  buildPathForContext: (ctx, options) => {
    const basePath = ctx.projectSlug
      ? `/${ctx.orgSlug}/${ctx.projectSlug}`
      : `/${ctx.orgSlug}`;

    if (options?.preservePath) {
      const currentPath = location.pathname;
      const pathSegments = currentPath.split('/').slice(3); // Remove org/project
      return pathSegments.length > 0
        ? `${basePath}/${pathSegments.join('/')}`
        : basePath;
    }

    return options?.fallbackPath || `${basePath}/dashboard`;
  }
};

// Next.js adapter
const nextJsAdapter: RouterAdapter = {
  getCurrentPath: () => router.asPath,
  navigateTo: (path) => router.push(path),
  buildPathForContext: (ctx, options) => {
    // Similar to React Router implementation
    // ...
  }
};
```

---

### ContextSwitcherConfig

Configuration object passed to `<ContextSwitcherProvider>`.

```typescript
interface ContextSwitcherConfig {
  /** Router adapter for navigation integration */
  routerAdapter: RouterAdapter;

  /** Base URL for backend API (e.g., "/api" or "https://api.example.com") */
  apiBaseUrl?: string;

  /** Keyboard shortcut to open context switcher (default: "Ctrl+K" / "Cmd+K") */
  keyboardShortcut?: string;

  /** Disable keyboard shortcut entirely */
  disableKeyboardShortcut?: boolean;

  /** Custom labels for organisations/projects (i18n support) */
  labels?: {
    organisationLabel?: string; // Default: "Organisation"
    projectLabel?: string; // Default: "Project"
    searchPlaceholder?: string; // Default: "Search..."
    noOrganisations?: string; // Default: "No organisations available"
    noProjects?: string; // Default: "No projects available"
  };

  /** Callback invoked before context switch (for unsaved changes confirmation) */
  onBeforeContextChange?: (
    from: UserContext,
    to: { organisation: Organisation; project?: Project }
  ) => boolean | Promise<boolean>;

  /** Callback invoked after successful context switch */
  onContextChanged?: (context: UserContext) => void;

  /** Callback invoked on context switch error */
  onContextError?: (error: ContextError) => void;
}
```

---

## API Response Types

### Backend API Contracts (B13)

```typescript
// GET /api/organisations/
interface OrganisationsResponse {
  organisations: Organisation[];
}

// GET /api/organisations/{org_id}/projects/
interface ProjectsResponse {
  projects: Project[];
}

// GET /api/context/current/ (optional endpoint)
interface CurrentContextResponse {
  organisationId?: string;
  projectId?: string;
}

// POST /api/context/set/ (optional endpoint)
interface SetContextRequest {
  organisationId: string;
  projectId?: string;
}

interface SetContextResponse {
  success: boolean;
}

// Error response format (B13 standard)
interface ApiErrorResponse {
  error: {
    code: number;
    message: string;
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
}
```

---

## Hook Return Types

### useCurrentContext

```typescript
interface UseCurrentContextReturn {
  /** Current context (org + project) */
  context: UserContext;

  /** Refresh context from backend */
  refresh: () => Promise<void>;
}
```

### useAvailableContexts

```typescript
interface UseAvailableContextsReturn {
  /** List of accessible organisations */
  organisations: Organisation[];

  /** List of projects in current organisation (empty if no org selected) */
  projects: Project[];

  /** Loading state for organisations list */
  organisationsLoading: boolean;

  /** Loading state for projects list */
  projectsLoading: boolean;

  /** Error fetching organisations */
  organisationsError: ContextError | null;

  /** Error fetching projects */
  projectsError: ContextError | null;

  /** Refresh organisations list */
  refreshOrganisations: () => Promise<void>;

  /** Refresh projects list for current org */
  refreshProjects: () => Promise<void>;
}
```

### useContextSwitcher

```typescript
interface UseContextSwitcherReturn {
  /** Switch to a different organisation (and optionally project) */
  switchContext: (
    organisation: Organisation,
    project?: Project
  ) => Promise<void>;

  /** Switch to a different project within current organisation */
  switchProject: (project: Project) => Promise<void>;

  /** Is a context switch in progress? */
  isSwitching: boolean;

  /** Error from last switch attempt */
  switchError: ContextError | null;

  /** Get last-visited project for a given organisation */
  getLastVisitedProject: (organisationId: string) => Project | null;
}
```

---

## Component Props Types

### ContextSwitcher

```typescript
interface ContextSwitcherProps {
  /** Placement variant: header (compact), sidebar, standalone */
  variant?: 'header' | 'sidebar' | 'standalone';

  /** Show org logo/avatar if available */
  showLogo?: boolean;

  /** Custom CSS class (for layout integration) */
  className?: string;

  /** Additional ARIA labels for accessibility */
  ariaLabels?: {
    openPicker?: string;
    organisationPicker?: string;
    projectPicker?: string;
  };
}
```

### OrganisationPicker / ProjectPicker

```typescript
interface PickerProps {
  /** Is the picker currently open? */
  isOpen: boolean;

  /** Close the picker */
  onClose: () => void;

  /** Handle selection of an item */
  onSelect: (item: Organisation | Project) => void;

  /** Search filter state */
  searchQuery?: string;

  /** Handle search input change */
  onSearchChange?: (query: string) => void;
}
```

---

## Utility Types

### Context Memory

```typescript
interface ContextMemory {
  /** Map of organisation ID to last-visited project ID */
  lastVisitedProjects: Record<string, string>;

  /** Last updated timestamp */
  lastUpdated: string; // ISO 8601
}
```

### Path Building

```typescript
interface ContextPath {
  /** Organisation slug */
  orgSlug: string;

  /** Project slug (optional) */
  projectSlug?: string;

  /** Page path (optional, for preservation) */
  pagePath?: string;
}
```

---

## Type Guards

```typescript
/** Check if an object is a valid Organisation */
function isOrganisation(obj: unknown): obj is Organisation {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'slug' in obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.slug === 'string'
  );
}

/** Check if an object is a valid Project */
function isProject(obj: unknown): obj is Project {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'slug' in obj &&
    'organisationId' in obj &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.organisationId === 'string'
  );
}
```

---

## Persistence Strategy

### Client-Side Memory (Optional)

Context memory (last-visited project per org) can be stored in:

1. **Backend (preferred)**: `POST /api/context/set/` persists server-side
2. **localStorage (fallback)**: If backend endpoint unavailable

```typescript
// localStorage schema
interface StoredContextMemory {
  version: string; // Schema version (e.g., "1.0.0")
  userId: string; // Current user ID (invalidate if user changes)
  memory: ContextMemory;
}

// Key: `@django-core/context-switcher:memory`
```

**Note**: localStorage is NOT used for authorization decisions, only UX improvement (remembering last project). Backend always authorizes every request.

---

## Summary

This data model provides:
- ✅ Clear type definitions for all entities (Organisation, Project, UserContext)
- ✅ Router integration via adapter interface
- ✅ Configuration types for host app integration
- ✅ API contract types matching B13 standards
- ✅ Hook return types for public API
- ✅ Component prop types for React integration
- ✅ Type guards for runtime validation

All types prioritize:
- **Type safety**: Strict TypeScript, no `any` types
- **Clarity**: Self-documenting with TSDoc comments
- **Flexibility**: Config/adapter patterns support multiple routing/backend setups
- **Security**: No sensitive data, backend is source of truth
