---
work_package_id: "WP04"
subtasks:
  - "T029"
  - "T030"
  - "T031"
  - "T032"
  - "T033"
  - "T034"
  - "T035"
  - "T036"
  - "T037"
  - "T038"
title: "Storage Adapters (Cookie, LocalStorage, B12)"
phase: "Phase 1 - Core Theme System"
lane: "done"
assignee: ""
agent: "claude-reviewer"
shell_pid: "$PID"
review_status: "approved without changes"
reviewed_by: "claude-reviewer"
history:
  - timestamp: "2025-12-13T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP04 – Storage Adapters (Cookie, LocalStorage, B12)

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: ✅ **APPROVED WITHOUT CHANGES**
- **Reviewed by**: claude-reviewer on 2025-12-13
- **Status**: Implementation complete and meets all quality standards

---

## Review Feedback

**Status**: ✅ **APPROVED WITHOUT CHANGES**

**Reviewed by**: claude-reviewer
**Review date**: 2025-12-13T14:41:00Z

**Summary**: Excellent implementation. All storage adapters meet specification requirements with comprehensive test coverage and proper SSR safety measures.

**What Was Done Well**:
- ✅ All 4 storage adapters implemented correctly (Cookie, LocalStorage, B12, Composed)
- ✅ SSR safety properly handled (no client APIs in constructors, typeof checks in methods)
- ✅ CookieStorage sets SameSite=lax and Secure=true by default
- ✅ LocalStorageAdapter handles quota exceeded gracefully with console warnings
- ✅ B12Adapter implements offline-first pattern (returns null on errors)
- ✅ ComposedStorage uses Promise.allSettled for resilient parallel writes
- ✅ Comprehensive test coverage: 89 tests passing (49 new storage tests)
  - CookieStorage: 10 tests (persistence, config, special chars, SSR)
  - LocalStorageAdapter: 12 tests (persistence, errors, SSR, data integrity)
  - B12Adapter: 12 tests (API ops, offline-first, auth errors)
  - ComposedStorage: 15 tests (read/write patterns, adapter failures)
- ✅ All quality gates passing: typecheck ✅, lint ✅, test ✅ (89/89), build ✅
- ✅ Proper exports in storage/index.ts and main index.ts
- ✅ Excellent documentation with JSDoc comments and usage examples
- ✅ Error handling follows offline-first principles

**Quality Validation Results**:
```
✅ TypeCheck: Clean (no errors)
✅ Lint: Clean (no warnings)
✅ Tests: 89/89 passing
✅ Build: Successful (dist/storage.js generated)
```

**No changes required** - Implementation is production-ready.

---

## Objectives & Success Criteria

**Goal**: Implement pluggable ThemeStorage interface with Cookie, LocalStorage, and B12 API adapters.

**Success Criteria**:
- ✅ ThemeStorage interface implemented per `contracts/theme-storage.ts`
- ✅ CookieStorage adapter with configurable expiry and SameSite
- ✅ LocalStorageAdapter with JSON serialization
- ✅ B12Adapter using `@django-core/api-client` (optional integration)
- ✅ ComposedStorage for multi-strategy persistence
- ✅ All adapters SSR-safe (no client-only APIs in constructors)
- ✅ Tests validate storage contract compliance

---

## Context & Constraints

**Prerequisites**:
- WP01 complete (package scaffold)
- WP02 complete (theme contracts, ThemeConfiguration type)
- `@django-core/api-client` available (optional peer dependency)

**References**:
- `contracts/theme-storage.ts` - Interface specification
- `contracts/b12-api.yaml` - Backend API contract
- `research.md` Q5 - B12 integration strategy (decoupled, optional)
- `data-model.md` - ThemePreference entity

**Constraints**:
- SSR-safe: No localStorage/document access in constructors
- Cookie must support server-side reads (Next.js `cookies()` compatible)
- B12 adapter gracefully handles unavailable backend (offline-first)

---

## Subtasks & Detailed Guidance

### Subtask T029 – Define ThemeStorage interface

**Purpose**: Contract for all storage implementations

**Steps**:
1. Create `src/storage/types.ts`:
   ```typescript
   import type { ThemeMode, BrandVariant } from '../types';

   export interface ThemePreference {
     mode: ThemeMode;
     brand: BrandVariant;
   }

   export interface ThemeStorage {
     getTheme(): Promise<ThemePreference | null>;
     setTheme(preference: ThemePreference): Promise<void>;
     clearTheme(): Promise<void>;
   }
   ```

**Files**: `src/storage/types.ts`

**Parallel?**: No (foundation for T030-T034)

---

### Subtask T030 – Implement CookieStorage adapter

**Purpose**: SSR-compatible cookie-based persistence

**Steps**:
1. Create `src/storage/CookieStorage.ts`:
   ```typescript
   import type { ThemeStorage, ThemePreference } from './types';

   export interface CookieStorageOptions {
     cookieName?: string;
     maxAge?: number; // seconds
     path?: string;
     sameSite?: 'strict' | 'lax' | 'none';
     secure?: boolean;
   }

   export class CookieStorage implements ThemeStorage {
     private options: Required<CookieStorageOptions>;

     constructor(options: CookieStorageOptions = {}) {
       this.options = {
         cookieName: options.cookieName ?? 'django_theme_pref',
         maxAge: options.maxAge ?? 31536000, // 1 year
         path: options.path ?? '/',
         sameSite: options.sameSite ?? 'lax',
         secure: options.secure ?? true
       };
     }

     async getTheme(): Promise<ThemePreference | null> {
       if (typeof document === 'undefined') {
         return null; // SSR: cannot read cookies client-side
       }

       const match = document.cookie.match(
         new RegExp(`(^| )${this.options.cookieName}=([^;]+)`)
       );
       if (!match) return null;

       try {
         return JSON.parse(decodeURIComponent(match[2]));
       } catch {
         return null;
       }
     }

     async setTheme(preference: ThemePreference): Promise<void> {
       if (typeof document === 'undefined') {
         return; // SSR: no-op
       }

       const value = encodeURIComponent(JSON.stringify(preference));
       const expires = new Date(Date.now() + this.options.maxAge * 1000).toUTCString();

       document.cookie = [
         `${this.options.cookieName}=${value}`,
         `expires=${expires}`,
         `path=${this.options.path}`,
         `samesite=${this.options.sameSite}`,
         this.options.secure ? 'secure' : ''
       ]
         .filter(Boolean)
         .join('; ');
     }

     async clearTheme(): Promise<void> {
       if (typeof document === 'undefined') {
         return;
       }

       document.cookie = `${this.options.cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${this.options.path};`;
     }
   }
   ```

**Files**: `src/storage/CookieStorage.ts`

**Parallel?**: Can proceed with T031 after T029

---

### Subtask T031 – Implement LocalStorageAdapter

**Purpose**: Client-only persistence for SPAs

**Steps**:
1. Create `src/storage/LocalStorageAdapter.ts`:
   ```typescript
   import type { ThemeStorage, ThemePreference } from './types';

   export class LocalStorageAdapter implements ThemeStorage {
     private storageKey: string;

     constructor(storageKey = 'django_theme_pref') {
       this.storageKey = storageKey;
     }

     async getTheme(): Promise<ThemePreference | null> {
       if (typeof window === 'undefined' || !window.localStorage) {
         return null; // SSR or unavailable
       }

       try {
         const stored = localStorage.getItem(this.storageKey);
         return stored ? JSON.parse(stored) : null;
       } catch {
         return null;
       }
     }

     async setTheme(preference: ThemePreference): Promise<void> {
       if (typeof window === 'undefined' || !window.localStorage) {
         return;
       }

       try {
         localStorage.setItem(this.storageKey, JSON.stringify(preference));
       } catch (error) {
         console.warn('Failed to persist theme preference:', error);
       }
     }

     async clearTheme(): Promise<void> {
       if (typeof window === 'undefined' || !window.localStorage) {
         return;
       }

       localStorage.removeItem(this.storageKey);
     }
   }
   ```

**Files**: `src/storage/LocalStorageAdapter.ts`

**Parallel?**: Can proceed with T032 after T029

---

### Subtask T032 – Implement B12Adapter

**Purpose**: Backend integration via B12 User Preferences API

**Steps**:
1. Create `src/storage/B12Adapter.ts`:
   ```typescript
   import type { ThemeStorage, ThemePreference } from './types';

   export interface B12AdapterOptions {
     apiClient: {
       get: <T>(url: string) => Promise<T>;
       post: <T>(url: string, body: unknown) => Promise<T>;
     };
     endpoint?: string;
   }

   export class B12Adapter implements ThemeStorage {
     private apiClient: B12AdapterOptions['apiClient'];
     private endpoint: string;

     constructor(options: B12AdapterOptions) {
       this.apiClient = options.apiClient;
       this.endpoint = options.endpoint ?? '/api/preferences/theme';
     }

     async getTheme(): Promise<ThemePreference | null> {
       try {
         const response = await this.apiClient.get<{ mode: string; brand: string }>(
           this.endpoint
         );
         return {
           mode: response.mode as ThemePreference['mode'],
           brand: response.brand as ThemePreference['brand']
         };
       } catch (error) {
         console.warn('Failed to fetch theme preference from B12:', error);
         return null; // Offline-first: fallback to local storage
       }
     }

     async setTheme(preference: ThemePreference): Promise<void> {
       try {
         await this.apiClient.post(this.endpoint, preference);
       } catch (error) {
         console.warn('Failed to save theme preference to B12:', error);
         // Fail silently, local storage will persist
       }
     }

     async clearTheme(): Promise<void> {
       try {
         await this.apiClient.post(this.endpoint, { mode: 'system', brand: 'default' });
       } catch (error) {
         console.warn('Failed to clear theme preference in B12:', error);
       }
     }
   }
   ```

**Files**: `src/storage/B12Adapter.ts`

**Parallel?**: Can proceed with T033 after T029

**Notes**: Requires `@django-core/api-client` as peer dependency (optional)

---

### Subtask T033 – Implement ComposedStorage

**Purpose**: Multi-strategy persistence (e.g., localStorage + B12)

**Steps**:
1. Create `src/storage/ComposedStorage.ts`:
   ```typescript
   import type { ThemeStorage, ThemePreference } from './types';

   export class ComposedStorage implements ThemeStorage {
     private adapters: ThemeStorage[];

     constructor(adapters: ThemeStorage[]) {
       if (adapters.length === 0) {
         throw new Error('ComposedStorage requires at least one adapter');
       }
       this.adapters = adapters;
     }

     async getTheme(): Promise<ThemePreference | null> {
       // Read from first adapter that returns a value
       for (const adapter of this.adapters) {
         const theme = await adapter.getTheme();
         if (theme) return theme;
       }
       return null;
     }

     async setTheme(preference: ThemePreference): Promise<void> {
       // Write to all adapters in parallel
       await Promise.allSettled(
         this.adapters.map((adapter) => adapter.setTheme(preference))
       );
     }

     async clearTheme(): Promise<void> {
       await Promise.allSettled(
         this.adapters.map((adapter) => adapter.clearTheme())
       );
     }
   }
   ```

**Files**: `src/storage/ComposedStorage.ts`

**Parallel?**: After T030-T032

---

### Subtask T034 – Export storage API

**Purpose**: Public API for storage adapters

**Steps**:
1. Create `src/storage/index.ts`:
   ```typescript
   export type { ThemeStorage, ThemePreference } from './types';
   export { CookieStorage } from './CookieStorage';
   export type { CookieStorageOptions } from './CookieStorage';
   export { LocalStorageAdapter } from './LocalStorageAdapter';
   export { B12Adapter } from './B12Adapter';
   export type { B12AdapterOptions } from './B12Adapter';
   export { ComposedStorage } from './ComposedStorage';
   ```

**Files**: `src/storage/index.ts`

**Parallel?**: After T030-T033

---

### Subtask T035 [P] – Write CookieStorage tests

**Purpose**: Validate cookie adapter behavior

**Steps**:
1. Create `tests/unit/storage/CookieStorage.test.ts`:
   ```typescript
   import { describe, it, expect, beforeEach, vi } from 'vitest';
   import { CookieStorage } from '../../../src/storage/CookieStorage';

   describe('CookieStorage', () => {
     let storage: CookieStorage;

     beforeEach(() => {
       storage = new CookieStorage();
       // Mock document.cookie
       Object.defineProperty(document, 'cookie', {
         writable: true,
         value: ''
       });
     });

     it('should set and get theme preference', async () => {
       await storage.setTheme({ mode: 'dark', brand: 'acme' });
       const theme = await storage.getTheme();

       expect(theme).toEqual({ mode: 'dark', brand: 'acme' });
     });

     it('should return null when cookie not set', async () => {
       const theme = await storage.getTheme();
       expect(theme).toBeNull();
     });

     it('should clear theme preference', async () => {
       await storage.setTheme({ mode: 'light', brand: 'default' });
       await storage.clearTheme();

       const theme = await storage.getTheme();
       expect(theme).toBeNull();
     });
   });
   ```

**Files**: `tests/unit/storage/CookieStorage.test.ts`

**Parallel?**: Yes (after T030)

---

### Subtask T036 [P] – Write LocalStorageAdapter tests

**Purpose**: Validate localStorage adapter

**Steps**:
1. Create `tests/unit/storage/LocalStorageAdapter.test.ts`:
   ```typescript
   import { describe, it, expect, beforeEach } from 'vitest';
   import { LocalStorageAdapter } from '../../../src/storage/LocalStorageAdapter';

   describe('LocalStorageAdapter', () => {
     let storage: LocalStorageAdapter;

     beforeEach(() => {
       storage = new LocalStorageAdapter();
       localStorage.clear();
     });

     it('should persist theme preference', async () => {
       await storage.setTheme({ mode: 'dark', brand: 'globex' });
       const theme = await storage.getTheme();

       expect(theme).toEqual({ mode: 'dark', brand: 'globex' });
     });

     it('should handle invalid JSON gracefully', async () => {
       localStorage.setItem('django_theme_pref', 'invalid-json');
       const theme = await storage.getTheme();

       expect(theme).toBeNull();
     });
   });
   ```

**Files**: `tests/unit/storage/LocalStorageAdapter.test.ts`

**Parallel?**: Yes (after T031)

---

### Subtask T037 [P] – Write B12Adapter tests

**Purpose**: Validate backend integration

**Steps**:
1. Create `tests/unit/storage/B12Adapter.test.ts`:
   ```typescript
   import { describe, it, expect, vi } from 'vitest';
   import { B12Adapter } from '../../../src/storage/B12Adapter';

   describe('B12Adapter', () => {
     it('should fetch theme from API', async () => {
       const apiClient = {
         get: vi.fn().mockResolvedValue({ mode: 'dark', brand: 'acme' }),
         post: vi.fn()
       };
       const storage = new B12Adapter({ apiClient });

       const theme = await storage.getTheme();
       expect(theme).toEqual({ mode: 'dark', brand: 'acme' });
       expect(apiClient.get).toHaveBeenCalledWith('/api/preferences/theme');
     });

     it('should return null on API error', async () => {
       const apiClient = {
         get: vi.fn().mockRejectedValue(new Error('Network error')),
         post: vi.fn()
       };
       const storage = new B12Adapter({ apiClient });

       const theme = await storage.getTheme();
       expect(theme).toBeNull();
     });

     it('should post theme to API', async () => {
       const apiClient = {
         get: vi.fn(),
         post: vi.fn().mockResolvedValue({})
       };
       const storage = new B12Adapter({ apiClient });

       await storage.setTheme({ mode: 'light', brand: 'default' });
       expect(apiClient.post).toHaveBeenCalledWith('/api/preferences/theme', {
         mode: 'light',
         brand: 'default'
       });
     });
   });
   ```

**Files**: `tests/unit/storage/B12Adapter.test.ts`

**Parallel?**: Yes (after T032)

---

### Subtask T038 [P] – Write ComposedStorage tests

**Purpose**: Validate multi-adapter composition

**Steps**:
1. Create `tests/unit/storage/ComposedStorage.test.ts`:
   ```typescript
   import { describe, it, expect, vi } from 'vitest';
   import { ComposedStorage } from '../../../src/storage/ComposedStorage';
   import type { ThemeStorage } from '../../../src/storage/types';

   describe('ComposedStorage', () => {
     it('should read from first adapter with data', async () => {
       const adapter1: ThemeStorage = {
         getTheme: vi.fn().mockResolvedValue(null),
         setTheme: vi.fn(),
         clearTheme: vi.fn()
       };
       const adapter2: ThemeStorage = {
         getTheme: vi.fn().mockResolvedValue({ mode: 'dark', brand: 'acme' }),
         setTheme: vi.fn(),
         clearTheme: vi.fn()
       };

       const storage = new ComposedStorage([adapter1, adapter2]);
       const theme = await storage.getTheme();

       expect(theme).toEqual({ mode: 'dark', brand: 'acme' });
       expect(adapter1.getTheme).toHaveBeenCalled();
       expect(adapter2.getTheme).toHaveBeenCalled();
     });

     it('should write to all adapters', async () => {
       const adapter1: ThemeStorage = {
         getTheme: vi.fn(),
         setTheme: vi.fn().mockResolvedValue(undefined),
         clearTheme: vi.fn()
       };
       const adapter2: ThemeStorage = {
         getTheme: vi.fn(),
         setTheme: vi.fn().mockResolvedValue(undefined),
         clearTheme: vi.fn()
       };

       const storage = new ComposedStorage([adapter1, adapter2]);
       await storage.setTheme({ mode: 'light', brand: 'default' });

       expect(adapter1.setTheme).toHaveBeenCalledWith({ mode: 'light', brand: 'default' });
       expect(adapter2.setTheme).toHaveBeenCalledWith({ mode: 'light', brand: 'default' });
     });
   });
   ```

**Files**: `tests/unit/storage/ComposedStorage.test.ts`

**Parallel?**: Yes (after T033)

---

## Test Strategy

**Unit Tests**:
- Each adapter tested in isolation (T035-T038)
- Mock browser APIs (document.cookie, localStorage)
- Mock API client for B12Adapter

**Integration Tests** (WP03):
- ThemeProvider with CookieStorage
- Persistence across page reloads

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSR cookie hydration mismatch | High | Read cookie server-side in WP05, inject initial state |
| localStorage quota exceeded | Low | Graceful error handling, console warnings |
| B12 API unavailable | Medium | Offline-first with ComposedStorage fallback |
| Cookie size limits | Low | Minimal JSON payload (<1KB) |

---

## Definition of Done Checklist

- [ ] All T029-T038 subtasks completed
- [ ] ThemeStorage interface defined
- [ ] All 4 adapters implemented (Cookie, LocalStorage, B12, Composed)
- [ ] Adapters are SSR-safe (no client-only APIs in constructors)
- [ ] Tests pass (`pnpm test`)
- [ ] B12Adapter integrated with `@django-core/api-client` (optional peer dep)
- [ ] `tasks.md` updated: WP04 checked off

---

## Review Guidance

**Key Checkpoints**:
1. Verify CookieStorage sets SameSite=Lax and Secure flags
2. Confirm LocalStorageAdapter handles quota exceeded gracefully
3. Test B12Adapter offline behavior (returns null, no crashes)
4. Validate ComposedStorage writes to all adapters in parallel
5. Check SSR compatibility: No `window` or `document` access in constructors

---

## Activity Log

- 2025-12-13T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
- 2025-12-13T13:31:31Z – claude – shell_pid=19776 – lane=doing – Started WP04 implementation: Storage adapters
- 2025-12-13T14:38:50Z – claude – shell_pid=19776 – lane=doing – Completed T029-T038: All storage adapters implemented with 89 passing tests. Quality gates: typecheck ✅, lint ✅, test ✅ (89/89), build ✅
- 2025-12-13T13:39:26Z – claude – shell_pid=19776 – lane=for_review – Ready for review: Storage adapters complete (89 tests passing)
- 2025-12-13T14:41:00Z – claude-reviewer – shell_pid=$PID – lane=done – Code review complete: Approved without changes. All adapters meet spec, comprehensive tests (89 passing), SSR-safe implementation.
