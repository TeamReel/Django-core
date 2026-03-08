# Q1 — Test Infrastructure

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** Vitest + React Testing Library setup

---

## Doel

Er zijn slechts 2 test files op 640 TS/TSX bestanden. Voordat we tests schrijven, moet de infrastructure kloppen.

## Setup

1. **Vitest** (al in Vite ecosystem — zero-config)
2. **React Testing Library** + `@testing-library/jest-dom`
3. **MSW (Mock Service Worker)** voor API mocking
4. **Test utilities:**
   - `renderWithProviders()` — wrapped in Auth, Season, Theme providers
   - `createMockApi()` — typed mock API responses
   - `createMockData()` — factory functions voor test data

## Configuratie

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

## Bestandsstructuur

```
src/test/
├── setup.ts              // jsdom setup, global mocks
├── renderWithProviders.tsx // wrapper voor component tests
├── mockApi.ts             // MSW handlers
├── factories/
│   ├── activity.ts        // createMockActivity()
│   ├── member.ts          // createMockMember()
│   ├── project.ts         // createMockProject()
│   └── index.ts
└── utils.ts               // waitForLoadingToFinish, etc.
```

## Verificatie

- [ ] `npx vitest run` werkt (0 failures)
- [ ] `renderWithProviders` rendert een simpel component
- [ ] MSW mock intercepteert API calls
- [ ] Factory functions genereren valid test data
