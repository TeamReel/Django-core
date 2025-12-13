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
title: "Package Scaffold & Build Infrastructure"
phase: "Phase 0 - Foundation"
lane: "doing"
assignee: "Claude"
agent: "claude"
shell_pid: "29516"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-13T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-13T19:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "29516"
    action: "Started WP01 implementation: Package scaffold & build infrastructure"
---

# Work Package Prompt: WP01 – Package Scaffold & Build Infrastructure

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: Update `review_status: acknowledged` when addressing feedback.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Establish `@django-core/theme-system` package with build tooling, quality gates, and CI pipeline.

**Success Criteria**:
- ✅ `pnpm build` produces `dist/` with TypeScript types and CSS output
- ✅ `pnpm test` runs Vitest with zero tests passing (infrastructure ready)
- ✅ `pnpm lint` and `pnpm typecheck` pass with zero errors
- ✅ Package exports `{ ThemeProvider }` (empty stub, compilable)
- ✅ Storybook and Chromatic configured
- ✅ CI workflow validates lint, typecheck, test, build

---

## Context & Constraints

**Prerequisites**:
- Monorepo setup at `C:\Users\brian\Documents\django-core\.worktrees\028-theme-support-brand\`
- F01 design-system package available as dependency
- pnpm workspace configuration

**References**:
- `kitty-specs/028-theme-support-brand/plan.md` - Package structure, tech stack
- `kitty-specs/028-theme-support-brand/research.md` - vanilla-extract decision (Q1)
- F01/F05 packages - Reference for build configuration patterns

**Constraints**:
- TypeScript strict mode required (Constitution Principle III)
- ESLint/Prettier must match monorepo standards
- vanilla-extract Vite plugin required for CSS custom property generation
- Bundle size target: <10KB gzipped for core package

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create package directory structure

**Purpose**: Establish folder layout per plan.md

**Steps**:
1. Create `packages/theme-system/` directory
2. Create subdirectories:
   ```
   packages/theme-system/
   ├── src/
   │   ├── components/
   │   ├── hooks/
   │   ├── themes/
   │   ├── storage/
   │   ├── validation/
   │   ├── ssr/
   │   └── types/
   ├── tests/
   │   ├── unit/
   │   ├── integration/
   │   └── visual/
   ├── scripts/
   └── examples/
   ```

**Files**: All directories created

**Parallel?**: No (prerequisite for other tasks)

---

### Subtask T002 [P] – Initialize package.json

**Purpose**: Define package metadata, dependencies, and scripts

**Steps**:
1. Create `packages/theme-system/package.json`:
   ```json
   {
     "name": "@django-core/theme-system",
     "version": "0.1.0",
     "type": "module",
     "main": "./dist/index.js",
     "module": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "import": "./dist/index.js"
       },
       "./storage": {
         "types": "./dist/storage/index.d.ts",
         "import": "./dist/storage/index.js"
       },
       "./validation": {
         "types": "./dist/validation/index.d.ts",
         "import": "./dist/validation/index.js"
       },
       "./ssr": {
         "types": "./dist/ssr/index.d.ts",
         "import": "./dist/ssr/index.js"
       }
     },
     "scripts": {
       "build": "vite build",
       "dev": "vite build --watch",
       "test": "vitest",
       "test:coverage": "vitest --coverage",
       "lint": "eslint src",
       "typecheck": "tsc --noEmit",
       "storybook": "storybook dev -p 6006",
       "build-storybook": "storybook build"
     },
     "dependencies": {
       "@vanilla-extract/css": "^1.14.0"
     },
     "peerDependencies": {
       "react": "^18.0.0",
       "react-dom": "^18.0.0",
       "@django-core/design-system": "workspace:*"
     },
     "devDependencies": {
       "@testing-library/react": "^14.0.0",
       "@testing-library/user-event": "^14.5.1",
       "@vanilla-extract/vite-plugin": "^4.0.0",
       "@vitejs/plugin-react": "^4.2.0",
       "typescript": "^5.3.0",
       "vite": "^5.0.0",
       "vitest": "^1.0.0",
       "jsdom": "^23.0.0",
       "eslint": "^8.55.0",
       "prettier": "^3.1.0",
       "@storybook/react-vite": "^8.0.0",
       "@storybook/addon-essentials": "^8.0.0",
       "@storybook/addon-a11y": "^8.0.0",
       "chromatic": "^10.0.0"
     }
   }
   ```

**Files**: `packages/theme-system/package.json`

**Parallel?**: Yes (can proceed with T003-T006)

---

### Subtask T003 [P] – Configure TypeScript

**Purpose**: Enable strict mode, path aliases, and proper module resolution

**Steps**:
1. Create `packages/theme-system/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src",
       "declaration": true,
       "declarationMap": true,
       "strict": true,
       "jsx": "react-jsx",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "target": "ES2020",
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "skipLibCheck": true,
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": false
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
   }
   ```

**Files**: `packages/theme-system/tsconfig.json`

**Parallel?**: Yes

**Notes**: Extend from monorepo root `tsconfig.base.json` if available

---

### Subtask T004 [P] – Configure Vite build

**Purpose**: Setup library mode with vanilla-extract plugin

**Steps**:
1. Create `packages/theme-system/vite.config.ts`:
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
   import { resolve } from 'path';

   export default defineConfig({
     plugins: [react(), vanillaExtractPlugin()],
     build: {
       lib: {
         entry: {
           index: resolve(__dirname, 'src/index.ts'),
           storage: resolve(__dirname, 'src/storage/index.ts'),
           validation: resolve(__dirname, 'src/validation/index.ts'),
           ssr: resolve(__dirname, 'src/ssr/index.ts')
         },
         formats: ['es'],
         fileName: (format, entryName) => `${entryName}.js`
       },
       rollupOptions: {
         external: ['react', 'react-dom', '@django-core/design-system'],
         output: {
           preserveModules: false
         }
       },
       sourcemap: true
     }
   });
   ```

**Files**: `packages/theme-system/vite.config.ts`

**Parallel?**: Yes

---

### Subtask T005 [P] – Setup ESLint + Prettier

**Purpose**: Code quality and formatting standards

**Steps**:
1. Create `packages/theme-system/.eslintrc.json`:
   ```json
   {
     "extends": ["../../.eslintrc.json"],
     "parserOptions": {
       "project": "./tsconfig.json"
     }
   }
   ```
2. Create `packages/theme-system/.prettierrc.json`:
   ```json
   {
     "semi": true,
     "singleQuote": true,
     "trailingComma": "es5",
     "printWidth": 100
   }
   ```

**Files**: `.eslintrc.json`, `.prettierrc.json`

**Parallel?**: Yes

---

### Subtask T006 [P] – Configure Vitest

**Purpose**: Test infrastructure with React Testing Library

**Steps**:
1. Create `packages/theme-system/vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

   export default defineConfig({
     plugins: [react(), vanillaExtractPlugin()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: ['./tests/setup.ts'],
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         exclude: ['**/*.test.ts', '**/*.test.tsx', '**/index.ts']
       }
     }
   });
   ```
2. Create `packages/theme-system/tests/setup.ts`:
   ```typescript
   import '@testing-library/jest-dom';
   ```

**Files**: `vitest.config.ts`, `tests/setup.ts`

**Parallel?**: Yes

---

### Subtask T007 – Create src/index.ts

**Purpose**: Package entry point with empty exports

**Steps**:
1. Create `packages/theme-system/src/index.ts`:
   ```typescript
   // Core components
   export { ThemeProvider } from './components/ThemeProvider';
   export { ThemeToggle } from './components/ThemeToggle';

   // Hooks
   export { useTheme } from './hooks/useTheme';

   // Themes
   export { themeVars } from './themes';
   export type { ThemeConfiguration, ThemeMode } from './types/theme';
   ```
2. Create stub components (empty for now):
   - `src/components/ThemeProvider.tsx`: `export function ThemeProvider() { return null; }`
   - `src/components/ThemeToggle.tsx`: `export function ThemeToggle() { return null; }`
   - `src/hooks/useTheme.ts`: `export function useTheme() { return {}; }`
   - `src/themes/index.ts`: `export const themeVars = {};`
   - `src/types/theme.ts`: `export type ThemeConfiguration = {}; export type ThemeMode = 'light' | 'dark';`

**Files**: `src/index.ts`, stub files

**Parallel?**: No (after T001-T006)

---

### Subtask T008 – Create README.md stub

**Purpose**: Package documentation placeholder

**Steps**:
1. Create `packages/theme-system/README.md`:
   ```markdown
   # @django-core/theme-system

   Token-driven theming infrastructure for Django Core-App frontend.

   ## Status

   🚧 **Under Development** - WP01 in progress

   ## Features (Planned)

   - Light/dark mode theming
   - Semantic tokens mapped to F01 primitives
   - SSR-friendly with zero flash
   - Brand variant support
   - WCAG 2.1 AA accessibility compliance

   ## Installation

   ```bash
   pnpm add @django-core/theme-system
   ```

   ## Documentation

   Full documentation coming in WP08.
   ```

**Files**: `README.md`

**Parallel?**: No

---

### Subtask T009 – Setup Storybook 8.x

**Purpose**: Component documentation and visual testing

**Steps**:
1. Create `.storybook/main.ts`:
   ```typescript
   import type { StorybookConfig } from '@storybook/react-vite';
   import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';

   const config: StorybookConfig = {
     stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
     addons: [
       '@storybook/addon-essentials',
       '@storybook/addon-a11y'
     ],
     framework: '@storybook/react-vite',
     viteFinal: async (config) => {
       config.plugins?.push(vanillaExtractPlugin());
       return config;
     }
   };

   export default config;
   ```
2. Create `.storybook/preview.tsx`:
   ```tsx
   import type { Preview } from '@storybook/react';

   const preview: Preview = {
     parameters: {
       actions: { argTypesRegex: '^on[A-Z].*' },
       controls: { expanded: true }
     }
   };

   export default preview;
   ```

**Files**: `.storybook/main.ts`, `.storybook/preview.tsx`

**Parallel?**: After T007

---

### Subtask T010 – Configure Chromatic

**Purpose**: Visual regression testing

**Steps**:
1. Create `chromatic.config.json`:
   ```json
   {
     "projectToken": "CHROMATIC_TOKEN",
     "buildScriptName": "build-storybook"
   }
   ```
2. Add to `package.json` scripts:
   ```json
   "chromatic": "chromatic --exit-zero-on-changes"
   ```

**Files**: `chromatic.config.json`, update `package.json`

**Parallel?**: After T009

**Notes**: Token will be configured in CI secrets

---

### Subtask T011 – Add CI workflow

**Purpose**: Automate quality gates

**Steps**:
1. Create `.github/workflows/theme-system.yml` (or extend existing):
   ```yaml
   name: Theme System CI

   on:
     push:
       paths:
         - 'packages/theme-system/**'
     pull_request:
       paths:
         - 'packages/theme-system/**'

   jobs:
     quality:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v2
           with:
             version: 8
         - uses: actions/setup-node@v4
           with:
             node-version: '18'
             cache: 'pnpm'

         - run: pnpm install
         - run: pnpm --filter @django-core/theme-system lint
         - run: pnpm --filter @django-core/theme-system typecheck
         - run: pnpm --filter @django-core/theme-system test
         - run: pnpm --filter @django-core/theme-system build
   ```

**Files**: `.github/workflows/theme-system.yml` or extend existing workflow

**Parallel?**: After T001-T010

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| vanilla-extract plugin config errors | High | Reference F01/F05 working configs |
| Build output format incompatible | Medium | Test early with consuming package |
| Monorepo pnpm workspace issues | Medium | Use `workspace:*` protocol, verify with `pnpm install` |
| TypeScript strict mode errors | Low | Start with permissive, tighten incrementally |

---

## Definition of Done Checklist

- [ ] All T001-T011 subtasks completed
- [ ] `pnpm build` succeeds, generates `dist/` with types
- [ ] `pnpm test` runs (zero tests is OK for scaffold)
- [ ] `pnpm lint` and `pnpm typecheck` pass
- [ ] Package exports compilable stubs
- [ ] Storybook starts (`pnpm storybook`)
- [ ] CI workflow triggers on PR
- [ ] `tasks.md` updated: WP01 checked off

---

## Review Guidance

**Key Checkpoints**:
1. Verify `dist/` contains `.js`, `.d.ts`, and `.css` files after build
2. Confirm TypeScript strict mode enabled (`tsconfig.json`)
3. Check vanilla-extract plugin configured in `vite.config.ts`
4. Validate CI workflow includes all quality gates
5. Test package exports: `import { ThemeProvider } from '@django-core/theme-system'` compiles

---

## Activity Log

- 2025-12-13T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
