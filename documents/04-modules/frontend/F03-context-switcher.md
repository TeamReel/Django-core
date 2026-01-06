# F03: Context Switcher

## 1. Purpose & Responsibility
The **Context Switcher** is the navigation component that lets users switch between Organisations and Projects.

**Responsibilities:**
*   **Org/Project Dropdown:** Shows available contexts.
*   **Active Context:** Tracks which Org/Project is selected.
*   **Route Sync:** Updates URL when context changes.

## 2. Domain-Agnostic Rationale
In multi-tenant apps, users need to switch contexts frequently. This component standardizes that UX pattern.

## 3. Key Concepts

### 3.1 Context Provider
React Context that stores:
```typescript
{ activeOrganisation, activeProject, setContext }
```

### 3.2 Switcher UI
Dropdown menu that calls the Backend API to list available Orgs/Projects.

## 4. Public Interfaces (Exports)

**Package:** `@django-core/context-switcher`

```typescript
import { ContextSwitcher, useContext } from '@django-core/context-switcher';
```

## 5. Integrations & Dependencies
*   **Backend API:** Calls B06 Organisations and B07 Projects endpoints.
*   **Design System (F01):** Uses dropdown/menu components.

## 6. Status & Phase History
*   **Phase:** 6 (Frontend Foundations)
*   **Status:** ✅ Complete
*   **Source Code:** `packages/context-switcher/`
