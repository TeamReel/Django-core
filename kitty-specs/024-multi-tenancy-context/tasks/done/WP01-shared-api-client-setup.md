---
work_package_id: "WP01"
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
  - "T006"
  - "T007"
  - "T008"
  - "T009"
  - "T010"
  - "T011"
  - "T012"
  - "T013"
title: "Shared API Client Package Setup"
phase: "Phase 0 - Foundation"
lane: "done"
assignee: ""
agent: "claude-sonnet-4"
shell_pid: ""
review_status: "approved without changes"
reviewed_by: "claude-sonnet-4"
history:
  - timestamp: "2025-12-09T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-10T00:00:00Z"
    lane: "done"
    agent: "claude-sonnet-4"
    shell_pid: ""
    action: "Code review completed - approved without changes"
---

# Work Package Prompt: WP01 – Shared API Client Package Setup

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback and begin addressing it, update `review_status: acknowledged` in the frontmatter.
- **Report progress**: As you address each feedback item, update the Activity Log explaining what you changed.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

Create a standalone `@django-core/api-client` package that provides:
- CSRF-protected fetch wrapper for all API calls
- B13 error response normalization
- TypeScript strict mode with 90%+ test coverage
- Reusable across all frontend packages (F02, F03, future packages)

**Success Criteria**:
- ✅ Package builds successfully (`pnpm build` passes)
- ✅ Exports `createApiClient` factory and types
- ✅ CSRF token extracted from `csrftoken` cookie and injected in `X-CSRFToken` header
- ✅ B13 error envelopes parsed and normalized to user-friendly messages
- ✅ Unit tests cover all functions with 90%+ coverage
- ✅ Bundle size <10KB gzipped
- ✅ README documents installation and usage

---

## Context & Constraints

**Why this package exists**: F02 (auth) and F03 (context-switcher) both need CSRF-protected API calls and error handling. Rather than duplicate this logic, extract it into a shared package.

**Architecture Decision** (from research.md): Shared package pattern establishes reusable, framework-agnostic API utilities for all frontend features.

**References**:
- Constitution Principle II (Architecture): Reusable, single-purpose packages
- Constitution Principle V (Security): CSRF protection, safe error messages
- [plan.md](../plan.md) - Project structure shows `packages/api-client/`
- [research.md](../research.md) - Q3: Backend API Integration decision
- [contracts/api-contracts.md](../contracts/api-contracts.md) - CSRF requirements

**Constraints**:
- Must work with Django's CSRF token mechanism (csrftoken cookie)
- Must handle B13 JSON error envelopes (from contracts/api-contracts.md)
- Must not include any feature-specific logic (auth, context, etc.)
- Must be tree-shakeable for optimal bundle size

---

## Subtasks & Detailed Guidance

### T001 – Create package structure

**Purpose**: Bootstrap the package with standard TypeScript/Vite configuration.

**Steps**:
1. Create `packages/api-client/` directory
2. Create `package.json` with:
   ```json
   {
     "name": "@django-core/api-client",
     "version": "0.1.0",
     "type": "module",
     "main": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "files": ["dist"],
     "scripts": {
       "build": "vite build",
       "test": "jest",
       "test:coverage": "jest --coverage",
       "lint": "eslint src/",
       "format": "prettier --write src/"
     },
     "devDependencies": {
       "@types/jest": "^29.5.0",
       "jest": "^29.5.0",
       "vite": "^5.0.0",
       "typescript": "^5.0.0",
       "eslint": "^8.50.0",
       "prettier": "^3.0.0"
     }
   }
   ```
3. Create `tsconfig.json` with strict mode:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "lib": ["ES2020", "DOM"],
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "moduleResolution": "bundler",
       "resolveJsonModule": true,
       "declaration": true,
       "declarationMap": true,
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```
4. Create `vite.config.ts` for library build
5. Create `src/` directory

**Files**: `packages/api-client/package.json`, `tsconfig.json`, `vite.config.ts`

**Parallel?**: No (foundation for other tasks)

---

### T002 [P] – Configure TypeScript strict mode, ESLint, Prettier

**Purpose**: Ensure code quality standards match F01/F02 patterns.

**Steps**:
1. Create `.eslintrc.json` extending F01 config (if available) or standard TypeScript rules
2. Create `.prettierrc.json`:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "tabWidth": 2,
     "trailingComma": "es5"
   }
   ```
3. Verify `tsconfig.json` has `strict: true`
4. Run `pnpm install` to install dev dependencies

**Files**: `packages/api-client/.eslintrc.json`, `.prettierrc.json`

**Parallel?**: Yes (can proceed alongside T003, T004)

---

### T003 [P] – Setup Jest + @testing-library configuration

**Purpose**: Configure unit testing framework.

**Steps**:
1. Create `jest.config.js`:
   ```js
   export default {
     preset: 'ts-jest',
     testEnvironment: 'jsdom',
     collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
     coverageThresholds: {
       global: {
         statements: 90,
         branches: 90,
         functions: 90,
         lines: 90
       }
     }
   };
   ```
2. Install jest dependencies: `pnpm add -D jest ts-jest @types/jest jest-environment-jsdom`
3. Create `__tests__/setup.ts` for global test configuration

**Files**: `packages/api-client/jest.config.js`, `__tests__/setup.ts`

**Parallel?**: Yes (can proceed alongside T002, T004)

---

### T004 [P] – Create `src/types.ts`

**Purpose**: Define TypeScript interfaces for API client configuration and responses.

**Steps**:
1. Create `src/types.ts` with:
   ```typescript
   export interface ApiClientConfig {
     baseUrl?: string; // Default: ''
     headers?: Record<string, string>; // Additional headers
     credentials?: RequestCredentials; // Default: 'include'
   }

   export interface RequestOptions extends RequestInit {
     skipCsrf?: boolean; // Skip CSRF injection (for GET requests, optional)
   }

   export interface ApiResponse<T = unknown> {
     data?: T;
     error?: ApiError;
   }

   export interface ApiError {
     code: number; // HTTP status code
     message: string; // User-facing message
     details?: unknown; // Additional error details
     fieldErrors?: Record<string, string[]>; // B13 field validation errors
     formErrors?: string[]; // B13 form-level errors
   }
   ```

**Files**: `packages/api-client/src/types.ts`

**Parallel?**: Yes (can proceed alongside T002, T003)

**Notes**: These types match B13 error response format from contracts/api-contracts.md

---

### T005 – Implement CSRF token extractor

**Purpose**: Extract CSRF token from `csrftoken` cookie.

**Steps**:
1. Create `src/csrfToken.ts`:
   ```typescript
   /**
    * Extract CSRF token from csrftoken cookie.
    * @returns CSRF token string, or null if not found.
    */
   export function getCsrfToken(): string | null {
     const match = document.cookie.match(/csrftoken=([^;]+)/);
     return match ? match[1] : null;
   }
   ```

**Files**: `packages/api-client/src/csrfToken.ts`

**Parallel?**: No (simple, quick implementation)

**Notes**: Django sets `csrftoken` cookie on first page load. If missing, API calls will fail with 403 (expected behavior).

---

### T006 – Implement fetch wrapper with CSRF injection

**Purpose**: Create CSRF-protected fetch wrapper that adds `X-CSRFToken` header.

**Steps**:
1. Create `src/client.ts`:
   ```typescript
   import { getCsrfToken } from './csrfToken';
   import { normalizeError } from './errorNormalizer';
   import type { ApiClientConfig, RequestOptions, ApiResponse } from './types';

   export function createApiClient(config: ApiClientConfig = {}) {
     const baseUrl = config.baseUrl || '';
     const defaultHeaders = config.headers || {};
     const credentials = config.credentials || 'include';

     return {
       async request<T>(
         endpoint: string,
         options: RequestOptions = {}
       ): Promise<ApiResponse<T>> {
         const { skipCsrf = false, ...fetchOptions } = options;

         // Build headers
         const headers = new Headers(fetchOptions.headers);
         Object.entries(defaultHeaders).forEach(([key, value]) => {
           headers.set(key, value);
         });

         // Inject CSRF token for mutating requests
         const method = (fetchOptions.method || 'GET').toUpperCase();
         if (!skipCsrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
           const csrfToken = getCsrfToken();
           if (csrfToken) {
             headers.set('X-CSRFToken', csrfToken);
           }
         }

         // Make request
         try {
           const response = await fetch(`${baseUrl}${endpoint}`, {
             ...fetchOptions,
             headers,
             credentials,
           });

           // Parse response
           const contentType = response.headers.get('Content-Type') || '';
           const isJson = contentType.includes('application/json');
           const data = isJson ? await response.json() : await response.text();

           // Handle errors
           if (!response.ok) {
             const error = normalizeError(response.status, data);
             return { error };
           }

           return { data: data as T };
         } catch (err) {
           // Network error
           return {
             error: {
               code: 0,
               message: 'Network error. Please check your connection and try again.',
               details: err,
             },
           };
         }
       },

       // Convenience methods
       get<T>(endpoint: string, options?: RequestOptions) {
         return this.request<T>(endpoint, { ...options, method: 'GET' });
       },
       post<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
         return this.request<T>(endpoint, {
           ...options,
           method: 'POST',
           body: JSON.stringify(body),
           headers: { 'Content-Type': 'application/json', ...options?.headers },
         });
       },
       put<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
         return this.request<T>(endpoint, {
           ...options,
           method: 'PUT',
           body: JSON.stringify(body),
           headers: { 'Content-Type': 'application/json', ...options?.headers },
         });
       },
       patch<T>(endpoint: string, body?: unknown, options?: RequestOptions) {
         return this.request<T>(endpoint, {
           ...options,
           method: 'PATCH',
           body: JSON.stringify(body),
           headers: { 'Content-Type': 'application/json', ...options?.headers },
         });
       },
       delete<T>(endpoint: string, options?: RequestOptions) {
         return this.request<T>(endpoint, { ...options, method: 'DELETE' });
       },
     };
   }
   ```

**Files**: `packages/api-client/src/client.ts`

**Parallel?**: No (depends on T005, T007)

**Notes**:
- CSRF token only added to mutating requests (POST/PUT/PATCH/DELETE)
- Network errors return code: 0 (distinguishable from HTTP errors)
- Response body parsed as JSON if Content-Type is application/json

---

### T007 – Implement B13 error normalizer

**Purpose**: Parse B13 error envelopes and extract user-friendly messages.

**Steps**:
1. Create `src/errorNormalizer.ts`:
   ```typescript
   import type { ApiError } from './types';

   /**
    * Normalize B13 error response to ApiError format.
    * @param status HTTP status code
    * @param body Response body (parsed JSON or text)
    * @returns Normalized ApiError
    */
   export function normalizeError(status: number, body: unknown): ApiError {
     // B13 error envelope format: { error: { code, message, fieldErrors?, formErrors? } }
     if (
       typeof body === 'object' &&
       body !== null &&
       'error' in body &&
       typeof body.error === 'object' &&
       body.error !== null
     ) {
       const err = body.error as Record<string, unknown>;
       return {
         code: status,
         message: typeof err.message === 'string' ? err.message : getDefaultMessage(status),
         fieldErrors: isFieldErrors(err.fieldErrors) ? err.fieldErrors : undefined,
         formErrors: isFormErrors(err.formErrors) ? err.formErrors : undefined,
         details: body,
       };
     }

     // Fallback: Non-B13 error format
     return {
       code: status,
       message: getDefaultMessage(status),
       details: body,
     };
   }

   function getDefaultMessage(status: number): string {
     switch (status) {
       case 400:
         return 'Invalid request. Please check your input and try again.';
       case 401:
         return 'Authentication required. Please log in.';
       case 403:
         return 'You do not have permission to perform this action.';
       case 404:
         return 'The requested resource was not found.';
       case 429:
         return 'Too many requests. Please wait and try again.';
       case 500:
       case 502:
       case 503:
         return 'Server error. Please try again later.';
       default:
         return `An error occurred (status: ${status}). Please try again.`;
     }
   }

   function isFieldErrors(value: unknown): value is Record<string, string[]> {
     return (
       typeof value === 'object' &&
       value !== null &&
       Object.values(value).every((v) => Array.isArray(v) && v.every((s) => typeof s === 'string'))
     );
   }

   function isFormErrors(value: unknown): value is string[] {
     return Array.isArray(value) && value.every((s) => typeof s === 'string');
   }
   ```

**Files**: `packages/api-client/src/errorNormalizer.ts`

**Parallel?**: No (needed by T006)

**Notes**:
- B13 error format from contracts/api-contracts.md: `{ error: { code, message, fieldErrors?, formErrors? } }`
- Fallback messages for non-B13 responses (graceful degradation)
- Type guards ensure fieldErrors/formErrors are properly typed

---

### T008 – Create public API exports

**Purpose**: Define what the package exposes publicly.

**Steps**:
1. Create `src/index.ts`:
   ```typescript
   export { createApiClient } from './client';
   export { getCsrfToken } from './csrfToken';
   export { normalizeError } from './errorNormalizer';
   export type {
     ApiClientConfig,
     RequestOptions,
     ApiResponse,
     ApiError,
   } from './types';
   ```

**Files**: `packages/api-client/src/index.ts`

**Parallel?**: No (final integration step)

---

### T009 [P] – Write unit tests for CSRF token extraction

**Purpose**: Validate getCsrfToken handles cookie parsing correctly.

**Steps**:
1. Create `__tests__/csrfToken.test.ts`:
   ```typescript
   import { getCsrfToken } from '../src/csrfToken';

   describe('getCsrfToken', () => {
     beforeEach(() => {
       // Clear cookies before each test
       document.cookie = '';
     });

     it('extracts CSRF token from cookie', () => {
       document.cookie = 'csrftoken=abc123; path=/';
       expect(getCsrfToken()).toBe('abc123');
     });

     it('returns null if csrftoken cookie missing', () => {
       document.cookie = 'other=value; path=/';
       expect(getCsrfToken()).toBeNull();
     });

     it('handles multiple cookies', () => {
       document.cookie = 'sessionid=xyz; csrftoken=token456; other=value';
       expect(getCsrfToken()).toBe('token456');
     });

     it('returns null if cookie is empty', () => {
       expect(getCsrfToken()).toBeNull();
     });
   });
   ```

**Files**: `packages/api-client/__tests__/csrfToken.test.ts`

**Parallel?**: Yes (can write alongside T010, T011)

---

### T010 [P] – Write unit tests for fetch wrapper

**Purpose**: Validate fetch wrapper injects CSRF header and handles responses.

**Steps**:
1. Create `__tests__/client.test.ts`:
   ```typescript
   import { createApiClient } from '../src/client';

   // Mock global fetch
   global.fetch = jest.fn();

   describe('createApiClient', () => {
     beforeEach(() => {
       jest.clearAllMocks();
       document.cookie = 'csrftoken=test-token; path=/';
     });

     it('injects CSRF token on POST request', async () => {
       (global.fetch as jest.Mock).mockResolvedValue({
         ok: true,
         json: async () => ({ success: true }),
         headers: new Headers({ 'Content-Type': 'application/json' }),
       });

       const client = createApiClient();
       await client.post('/api/test', { data: 'value' });

       expect(global.fetch).toHaveBeenCalledWith(
         '/api/test',
         expect.objectContaining({
           method: 'POST',
           headers: expect.any(Headers),
         })
       );

       const call = (global.fetch as jest.Mock).mock.calls[0];
       const headers = call[1].headers as Headers;
       expect(headers.get('X-CSRFToken')).toBe('test-token');
     });

     it('does not inject CSRF token on GET request', async () => {
       (global.fetch as jest.Mock).mockResolvedValue({
         ok: true,
         json: async () => ({ data: [] }),
         headers: new Headers({ 'Content-Type': 'application/json' }),
       });

       const client = createApiClient();
       await client.get('/api/test');

       const call = (global.fetch as jest.Mock).mock.calls[0];
       const headers = call[1].headers as Headers;
       expect(headers.get('X-CSRFToken')).toBeNull();
     });

     it('returns error for 403 response', async () => {
       (global.fetch as jest.Mock).mockResolvedValue({
         ok: false,
         status: 403,
         json: async () => ({
           error: { code: 403, message: 'Forbidden' },
         }),
         headers: new Headers({ 'Content-Type': 'application/json' }),
       });

       const client = createApiClient();
       const result = await client.get('/api/test');

       expect(result.error).toEqual({
         code: 403,
         message: 'Forbidden',
         details: { error: { code: 403, message: 'Forbidden' } },
       });
     });

     it('handles network errors', async () => {
       (global.fetch as jest.Mock).mockRejectedValue(new Error('Network failure'));

       const client = createApiClient();
       const result = await client.get('/api/test');

       expect(result.error?.code).toBe(0);
       expect(result.error?.message).toContain('Network error');
     });
   });
   ```

**Files**: `packages/api-client/__tests__/client.test.ts`

**Parallel?**: Yes (can write alongside T009, T011)

**Notes**: Mock global fetch to avoid real network calls

---

### T011 [P] – Write unit tests for error normalizer

**Purpose**: Validate error normalizer handles all B13 error scenarios.

**Steps**:
1. Create `__tests__/errorNormalizer.test.ts`:
   ```typescript
   import { normalizeError } from '../src/errorNormalizer';

   describe('normalizeError', () => {
     it('parses B13 error envelope', () => {
       const body = {
         error: {
           code: 400,
           message: 'Invalid input',
           fieldErrors: { email: ['Invalid email format'] },
         },
       };

       const result = normalizeError(400, body);

       expect(result).toEqual({
         code: 400,
         message: 'Invalid input',
         fieldErrors: { email: ['Invalid email format'] },
         details: body,
       });
     });

     it('returns default message for non-B13 errors', () => {
       const body = 'Internal Server Error';

       const result = normalizeError(500, body);

       expect(result.code).toBe(500);
       expect(result.message).toContain('Server error');
       expect(result.details).toBe(body);
     });

     it('handles 401 Unauthorized', () => {
       const result = normalizeError(401, {});

       expect(result.message).toContain('Authentication required');
     });

     it('handles 403 Forbidden', () => {
       const result = normalizeError(403, {});

       expect(result.message).toContain('permission');
     });

     it('handles 404 Not Found', () => {
       const result = normalizeError(404, {});

       expect(result.message).toContain('not found');
     });
   });
   ```

**Files**: `packages/api-client/__tests__/errorNormalizer.test.ts`

**Parallel?**: Yes (can write alongside T009, T010)

---

### T012 – Create package README

**Purpose**: Document installation, usage, and API reference.

**Steps**:
1. Create `packages/api-client/README.md`:
   ````markdown
   # @django-core/api-client

   Shared API client for Django Core frontend packages. Provides CSRF-protected fetch wrapper and B13 error normalization.

   ## Installation

   ```bash
   pnpm add @django-core/api-client
   ```

   ## Usage

   ```typescript
   import { createApiClient } from '@django-core/api-client';

   const client = createApiClient({
     baseUrl: '/api',
     credentials: 'include', // Send cookies
   });

   // GET request
   const { data, error } = await client.get('/organisations/');
   if (error) {
     console.error(error.message);
   } else {
     console.log(data);
   }

   // POST request (CSRF token auto-injected)
   const result = await client.post('/context/set/', {
     organisationId: 'org_123',
     projectId: 'proj_456',
   });
   ```

   ## API Reference

   ### `createApiClient(config?: ApiClientConfig)`

   Creates an API client instance.

   **Config**:
   - `baseUrl?: string` - Base URL for all requests (default: '')
   - `headers?: Record<string, string>` - Additional headers
   - `credentials?: RequestCredentials` - Fetch credentials mode (default: 'include')

   **Returns**: API client with methods: `request`, `get`, `post`, `put`, `patch`, `delete`

   ### CSRF Protection

   CSRF tokens are automatically extracted from the `csrftoken` cookie and injected into `X-CSRFToken` header for POST/PUT/PATCH/DELETE requests.

   ### Error Handling

   All errors follow B13 standard format:

   ```typescript
   {
     code: number; // HTTP status code (0 for network errors)
     message: string; // User-friendly message
     fieldErrors?: Record<string, string[]>; // Validation errors
     formErrors?: string[]; // Form-level errors
     details?: unknown; // Raw response
   }
   ```

   ## Requirements

   - Django backend with CSRF middleware enabled
   - `csrftoken` cookie set by backend

   ## License

   MIT
   ````

**Files**: `packages/api-client/README.md`

**Parallel?**: No (documentation written after implementation)

---

### T013 – Verify bundle size <10KB gzipped

**Purpose**: Ensure package doesn't bloat consuming applications.

**Steps**:
1. Run `pnpm build`
2. Check output in `dist/` directory
3. Use tool to measure gzipped size: `gzip -c dist/index.js | wc -c`
4. Verify size is <10KB (10,240 bytes)
5. If over limit, analyze bundle and remove unnecessary code

**Files**: N/A (build verification)

**Parallel?**: No (done after implementation complete)

**Notes**: 10KB is generous for this simple package. Actual size should be ~2-4KB.

---

## Risks & Mitigations

**Risk**: CSRF token missing from cookie
**Mitigation**: Document backend requirements in README. Client returns helpful error if POST fails with 403.

**Risk**: Bundle size exceeds 10KB
**Mitigation**: No external dependencies. Use tree-shaking. Keep code minimal.

**Risk**: Type errors in consuming packages
**Mitigation**: Export all types. Use strict TypeScript. Generate .d.ts files.

**Risk**: Tests are flaky (cookie manipulation)
**Mitigation**: Reset `document.cookie` before each test. Use deterministic test data.

---

## Definition of Done Checklist

- [ ] Package structure created with all config files
- [ ] TypeScript strict mode enabled and passing
- [ ] ESLint and Prettier configured
- [ ] Jest configured with 90% coverage threshold
- [ ] All types defined in src/types.ts
- [ ] CSRF token extraction implemented and tested
- [ ] Fetch wrapper implemented with CSRF injection
- [ ] Error normalizer implemented for B13 format
- [ ] Public API exported in src/index.ts
- [ ] Unit tests written for all functions
- [ ] Test coverage reaches 90%+
- [ ] README documentation complete
- [ ] Bundle size verified <10KB gzipped
- [ ] Package builds successfully (`pnpm build` passes)
- [ ] All linting and formatting checks pass

---

## Review Guidance

**Key Acceptance Checkpoints**:
1. CSRF token correctly extracted from cookie (check test cases)
2. CSRF token injected only on mutating requests (POST/PUT/PATCH/DELETE)
3. B13 error envelope parsing handles all scenarios (check test cases)
4. No external dependencies (keep bundle small)
5. TypeScript strict mode with no `any` types
6. 90%+ test coverage (run `pnpm test:coverage`)
7. README is clear and includes usage examples

**What to verify**:
- Run `pnpm build` - should succeed
- Run `pnpm test` - all tests pass
- Run `pnpm test:coverage` - 90%+ coverage
- Run `pnpm lint` - no errors
- Check bundle size: `ls -lh dist/index.js`
- Read README - is it clear how to use the package?

---

## Activity Log

- 2025-12-09T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-09T20:56:44Z – claude – shell_pid=8396 – lane=doing – Started implementation
- 2025-12-09T21:45:00Z – claude – shell_pid=8396 – lane=doing – Completed all subtasks T001-T013. All DoD criteria met: ✅ Package structure created, ✅ TypeScript strict mode configured, ✅ ESLint/Prettier configured, ✅ Jest configured with 90%+ coverage threshold, ✅ All types defined (src/types.ts), ✅ CSRF token extraction implemented and tested (src/csrfToken.ts), ✅ Fetch wrapper with CSRF injection implemented (src/client.ts), ✅ B13 error normalizer implemented (src/errorNormalizer.ts), ✅ Public API exported (src/index.ts), ✅ 25 unit tests written covering all functions, ✅ Test coverage: 100% statements/functions/lines, 92% branches (exceeds 90% threshold), ✅ README complete with usage examples, ✅ Bundle size: 1.35 KB gzipped (<10KB target), ✅ pnpm build passes, ✅ pnpm lint passes (0 errors/warnings). Ready for review and WP02 integration.
