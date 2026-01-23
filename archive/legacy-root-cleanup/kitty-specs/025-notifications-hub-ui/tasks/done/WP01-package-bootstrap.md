---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
title: "Package Bootstrap & Configuration"
phase: "Phase 0 - Setup & Foundation"
lane: "done"
assignee: "GitHub Copilot (Claude)"
agent: "claude-reviewer"
shell_pid: "21096"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-11T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP01 – Package Bootstrap & Configuration

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately (right below this notice).
- **You must address all feedback** before your work is complete. Feedback items are your implementation TODO list.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

> **Populated by `/spec-kitty.review`** – Reviewers add detailed feedback here when work needs changes. Implementation must address every item listed below before returning for re-review.

*[This section is empty initially. Reviewers will populate it if the work is returned from review. If you see feedback here, treat each item as a must-do before completion.]*

---

## Objectives & Success Criteria

Initialize the `@django-core/notifications-hub` package with all necessary configuration files, dependencies, and project structure to enable subsequent development work.

**Success Criteria**:
- Package structure matches `plan.md` specification under `packages/notifications-hub/`
- `pnpm install` (or `npm install`) succeeds without errors
- `pnpm test` runs successfully (even with no tests yet)
- TypeScript compilation succeeds with strict mode enabled
- All peer dependencies documented in `package.json`
- ESLint configuration functional
- Jest + React Testing Library configured with jsdom environment

---

## Context & Constraints

**Prerequisites**:
- None (this is the foundational work package)

**Related Documents**:
- [plan.md](../plan.md) - Project structure and technical context
- [spec.md](../spec.md) - Feature requirements
- [data-model.md](../data-model.md) - Type definitions reference
- [.kittify/memory/constitution.md](../../../../../.kittify/memory/constitution.md) - Quality standards

**Key Constraints**:
- Must use TypeScript 5.x with strict mode
- Must integrate into pnpm monorepo workspace
- Must configure Jest with React Testing Library + MSW
- Must follow existing F01/F02/F03 package patterns
- Zero custom CSS (F01 design system only)

**Dependencies**:
- F01: `@django-core/design-system` (UI components)
- F02: `@django-core/auth` (authentication context)
- F03: `@django-core/context-switcher` (multi-tenancy context)
- `@django-core/api-client` (CSRF-protected fetch wrapper)
- `react-window` or `@tanstack/react-virtual` (list virtualization)
- `date-fns` or `dayjs` (date formatting)
- MSW v2.x (API mocking for tests)

---

## Subtasks & Detailed Guidance

### Subtask T001 – Initialize package structure with config files

**Purpose**: Create the base directory structure and configuration files required for a TypeScript React package in the monorepo.

**Steps**:
1. Create directory: `packages/notifications-hub/`
2. Create `package.json`:
   ```json
   {
     "name": "@django-core/notifications-hub",
     "version": "1.0.0",
     "description": "In-app notification display and management UI",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "files": ["dist"],
     "scripts": {
       "build": "tsc",
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage",
       "lint": "eslint src --ext .ts,.tsx",
       "lint:fix": "eslint src --ext .ts,.tsx --fix",
       "typecheck": "tsc --noEmit"
     },
     "peerDependencies": {
       "react": "^18.0.0",
       "react-dom": "^18.0.0",
       "@django-core/design-system": "^1.0.0",
       "@django-core/auth": "^1.0.0",
       "@django-core/context-switcher": "^1.0.0",
       "@django-core/api-client": "^1.0.0"
     },
     "dependencies": {
       "react-window": "^1.8.10",
       "date-fns": "^3.0.0"
     },
     "devDependencies": {
       "@types/react": "^18.2.0",
       "@types/react-dom": "^18.2.0",
       "@types/react-window": "^1.8.8",
       "@testing-library/react": "^14.0.0",
       "@testing-library/jest-dom": "^6.0.0",
       "@testing-library/user-event": "^14.0.0",
       "msw": "^2.0.0",
       "jest": "^29.0.0",
       "jest-environment-jsdom": "^29.0.0",
       "ts-jest": "^29.0.0",
       "typescript": "^5.0.0",
       "eslint": "^8.0.0",
       "@typescript-eslint/eslint-plugin": "^6.0.0",
       "@typescript-eslint/parser": "^6.0.0"
     }
   }
   ```

3. Create basic directory structure:
   ```
   packages/notifications-hub/
   ├── src/
   │   ├── components/
   │   ├── context/
   │   ├── hooks/
   │   ├── config/
   │   ├── utils/
   │   ├── types/
   │   └── index.ts
   ├── __tests__/
   │   ├── integration/
   │   └── setup/
   ├── package.json
   ├── tsconfig.json
   ├── jest.config.js
   ├── .eslintrc.js
   └── README.md
   ```

**Files**:
- `packages/notifications-hub/package.json`
- `packages/notifications-hub/README.md` (placeholder)

**Parallel?**: No (foundational)

**Notes**:
- Verify pnpm workspace configuration includes `packages/*` pattern
- Use exact versions matching F01/F02/F03 for consistency

---

### Subtask T002 – Set up TypeScript strict mode and path aliases

**Purpose**: Configure TypeScript with strict type checking and path aliases for clean imports.

**Steps**:
1. Create `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "moduleResolution": "node",
       "jsx": "react-jsx",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "outDir": "./dist",
       "baseUrl": "./src",
       "paths": {
         "@/*": ["./*"]
       }
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "__tests__"]
   }
   ```

2. Verify strict mode flags are enabled:
   - `strict: true` enables all strict checks
   - `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes` all enabled

3. Test path aliases work by creating a test import

**Files**:
- `packages/notifications-hub/tsconfig.json`

**Parallel?**: No (required for T004)

**Notes**:
- Strict mode may reveal issues in peer dependencies (use `skipLibCheck: true` to suppress)
- Path aliases (`@/*`) enable cleaner imports: `import { Notification } from '@/types'`

---

### Subtask T003 – Install dependencies

**Purpose**: Install all peer dependencies, runtime dependencies, and dev dependencies.

**Steps**:
1. Navigate to repo root
2. Run `pnpm install` to install all dependencies (pnpm workspace will handle peer deps)
3. Verify no errors or warnings
4. Check `packages/notifications-hub/node_modules/` for peer dependencies:
   - `react`, `react-dom`
   - `@django-core/design-system`
   - `@django-core/auth`
   - `@django-core/context-switcher`
   - `@django-core/api-client`
5. Check runtime dependencies installed:
   - `react-window`
   - `date-fns`
6. Check dev dependencies installed:
   - Jest, Testing Library, MSW, TypeScript, ESLint

**Files**:
- `packages/notifications-hub/node_modules/` (generated)
- `pnpm-lock.yaml` (updated)

**Parallel?**: No (blocks subsequent work)

**Notes**:
- If peer dependencies missing, ensure F01/F02/F03 packages exist in monorepo
- Use `pnpm why <package>` to debug dependency resolution issues

---

### Subtask T004 – Create type definitions

**Purpose**: Define TypeScript interfaces for core entities matching `data-model.md`.

**Steps**:
1. Create `src/types/notification.ts`:
   ```typescript
   export type NotificationSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';

   export interface NotificationAction {
     label: string;
     type: 'navigate' | 'api';
     target: string;
     method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
     body?: Record<string, any>;
   }

   export interface Notification {
     id: string;
     type: string;
     severity: NotificationSeverity;
     category?: string;
     title: string;
     message: string;
     timestamp: string;
     read: boolean;
     org_id: string;
     project_id?: string | null;
     metadata?: Record<string, any>;
     action?: NotificationAction;
   }
   ```

2. Create `src/types/config.ts`:
   ```typescript
   import { NotificationSeverity, NotificationAction } from './notification';

   export interface NotificationDisplayConfig {
     severity?: NotificationSeverity;
     toastVariant?: 'info' | 'success' | 'warning' | 'error';
     toastDuration?: number | null;
     showInToast?: boolean;
     showInInbox?: boolean;
     action?: NotificationAction;
     icon?: string;
   }

   export interface NotificationTypeMapping {
     [notificationType: string]: NotificationDisplayConfig;
   }

   export interface NotificationsConfig {
     apiBaseUrl: string;
     pollingInterval?: number;
     maxToasts?: number;
     pageSize?: number;
     toastPosition?: {
       desktop: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
       mobile: 'top-center' | 'bottom-center';
     };
     debug?: boolean;
   }
   ```

3. Create `src/types/index.ts` barrel export:
   ```typescript
   export * from './notification';
   export * from './config';
   ```

**Files**:
- `src/types/notification.ts`
- `src/types/config.ts`
- `src/types/index.ts`

**Parallel?**: No (required by T006)

**Notes**:
- Types match `data-model.md` specification exactly
- Use string literal types for enums (more flexible than TypeScript enums)

---

### Subtask T005 – Set up Jest + RTL + MSW test infrastructure

**Purpose**: Configure Jest with React Testing Library and Mock Service Worker for unit and integration testing.

**Steps**:
1. Create `jest.config.js`:
   ```javascript
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'jsdom',
     roots: ['<rootDir>/src', '<rootDir>/__tests__'],
     testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/*.test.ts?(x)'],
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1',
     },
     setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.ts'],
     collectCoverageFrom: [
       'src/**/*.{ts,tsx}',
       '!src/**/*.d.ts',
       '!src/types/**',
       '!src/index.ts',
     ],
     coverageThresholds: {
       global: {
         branches: 85,
         functions: 85,
         lines: 85,
         statements: 85,
       },
     },
   };
   ```

2. Create `__tests__/setup/jest.setup.ts`:
   ```typescript
   import '@testing-library/jest-dom';
   import { server } from './msw-server';

   beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
   afterEach(() => server.resetHandlers());
   afterAll(() => server.close());
   ```

3. Create placeholder `__tests__/setup/msw-server.ts`:
   ```typescript
   import { setupServer } from 'msw/node';
   import { handlers } from './msw-handlers';

   export const server = setupServer(...handlers);
   ```

4. Create placeholder `__tests__/setup/msw-handlers.ts`:
   ```typescript
   import { http, HttpResponse } from 'msw';

   export const handlers = [
     // Placeholder - will be populated in WP02
   ];
   ```

5. Run `pnpm test` to verify setup (should pass with 0 tests)

**Files**:
- `jest.config.js`
- `__tests__/setup/jest.setup.ts`
- `__tests__/setup/msw-server.ts`
- `__tests__/setup/msw-handlers.ts`

**Parallel?**: No (required for all testing)

**Notes**:
- MSW v2.x uses `http` instead of `rest` (breaking change from v1.x)
- jsdom environment required for React component testing
- Coverage thresholds set to 85% per spec

---

### Subtask T006 – Create default notification type mappings configuration

**Purpose**: Provide sensible default mappings for common notification types.

**Steps**:
1. Create `src/config/defaultNotificationMappings.ts`:
   ```typescript
   import { NotificationTypeMapping } from '@/types';

   export const defaultNotificationMappings: NotificationTypeMapping = {
     'job.completed': {
       severity: 'SUCCESS',
       toastVariant: 'success',
       toastDuration: 5000,
       showInToast: true,
       showInInbox: true,
       icon: 'CheckCircle',
     },
     'job.failed': {
       severity: 'ERROR',
       toastVariant: 'error',
       toastDuration: null, // Manual dismiss only
       showInToast: true,
       showInInbox: true,
       icon: 'XCircle',
     },
     'access.granted': {
       severity: 'SUCCESS',
       toastVariant: 'success',
       toastDuration: 6000,
       showInToast: true,
       showInInbox: true,
       icon: 'CheckCircle',
     },
     'access.revoked': {
       severity: 'WARNING',
       toastVariant: 'warning',
       toastDuration: 10000,
       showInToast: true,
       showInInbox: true,
       icon: 'AlertTriangle',
     },
     'system.error': {
       severity: 'ERROR',
       toastVariant: 'error',
       toastDuration: null,
       showInToast: true,
       showInInbox: true,
       icon: 'XCircle',
     },
     'system.info': {
       severity: 'INFO',
       toastVariant: 'info',
       toastDuration: 5000,
       showInToast: true,
       showInInbox: true,
       icon: 'Info',
     },
   };
   ```

2. Create `src/config/types.ts` for config exports:
   ```typescript
   export { defaultNotificationMappings } from './defaultNotificationMappings';
   ```

**Files**:
- `src/config/defaultNotificationMappings.ts`
- `src/config/types.ts`

**Parallel?**: Yes (independent of other subtasks)

**Notes**:
- Default mappings can be overridden by consuming applications via `NotificationsProvider` props
- Icon names reference F01 design system icon set
- Duration null = manual dismiss only (ERROR/CRITICAL)

---

## Test Strategy

**Unit Tests** (not required for WP01):
- No tests required for this bootstrap work package
- Tests will be added in subsequent WPs for actual functionality

**Integration Tests** (not required for WP01):
- N/A

**Validation**:
- Run `pnpm install` - should succeed
- Run `pnpm test` - should run with 0 tests, no errors
- Run `pnpm run typecheck` - should compile without errors
- Run `pnpm run lint` - should pass (or only flag placeholder TODOs)

---

## Risks & Mitigations

**Risk**: Dependency version conflicts with existing F01/F02/F03 packages
**Mitigation**: Use exact versions matching other frontend packages. Check `pnpm why <package>` to debug conflicts. Consider using `overrides` in root `package.json` if needed.

**Risk**: TypeScript strict mode reveals issues in peer dependencies
**Mitigation**: Enable `skipLibCheck: true` in tsconfig.json to suppress errors in node_modules. Only our code needs to pass strict checks.

**Risk**: MSW v2.x breaking changes from v1.x
**Mitigation**: Use `http` instead of `rest` API. Refer to MSW migration guide: https://mswjs.io/docs/migrations/1.x-to-2.x/

**Risk**: Jest + ESM compatibility issues
**Mitigation**: Use `ts-jest` preset. If issues persist, add `transformIgnorePatterns` to jest.config.js to transpile ESM-only packages.

---

## Definition of Done Checklist

- [ ] Package structure created under `packages/notifications-hub/`
- [ ] `package.json` includes all dependencies and scripts
- [ ] TypeScript compiles without errors (`pnpm run typecheck`)
- [ ] Jest runs successfully (`pnpm test`)
- [ ] ESLint configured and passing (`pnpm run lint`)
- [ ] All type definitions created in `src/types/`
- [ ] Default type mappings configuration created
- [ ] README.md placeholder created
- [ ] All files committed to feature branch
- [ ] `tasks.md` updated with WP01 completion status

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. Package structure matches `plan.md` specification
2. All configuration files present and functional
3. TypeScript strict mode enabled
4. Jest + RTL + MSW configured correctly
5. Dependencies installed without errors
6. No TypeScript compilation errors
7. Type definitions match `data-model.md`

**Reviewer should verify**:
- Run `pnpm install` from repo root
- Run `pnpm run typecheck` from `packages/notifications-hub/`
- Run `pnpm test` from `packages/notifications-hub/`
- Check `tsconfig.json` has `strict: true`
- Check type definitions in `src/types/` match spec

---

## Activity Log

- 2025-12-11T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-11T15:59:22Z – claude – shell_pid=21096 – lane=doing – Started implementation
- 2025-12-11T16:06:40Z – claude – shell_pid=21096 – lane=doing – Completed all subtasks (T001-T006): package structure, TypeScript config, dependencies, type definitions, test infrastructure, default mappings. All validation passing.
- 2025-12-11T16:06:40Z – claude – shell_pid=21096 – lane=for_review – Ready for review
- 2025-12-11T16:13:10Z – claude-reviewer – shell_pid=21096 – lane=done – ✅ APPROVED: All validation checks passing, implementation complete and excellent

---

### Updating Metadata When Changing Lanes

1. Capture your shell PID: `$PID` in PowerShell
2. Update frontmatter (`lane`, `assignee`, `agent`, `shell_pid`)
3. Add an entry to the **Activity Log** describing the transition
4. Run `.kittify/scripts/powershell/tasks-move-to-lane.ps1 025-notifications-hub-ui WP01 <lane>` to move the prompt, update metadata, and append history in one step
5. Commit or stage the change, preserving history
