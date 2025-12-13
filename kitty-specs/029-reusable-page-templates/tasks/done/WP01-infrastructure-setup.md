---
work_package_id: WP01
title: Infrastructure Setup
lane: "done"
subtasks:
  - T001
  - T002
  - T003
  - T004
  - T005
  - T006
priority: P0
depends_on: []
assignee: "github-copilot"
agent: "github-copilot-reviewer"
shell_pid: "7216"
reviewed_by: "github-copilot-reviewer"
review_status: "approved without changes"
history:
  - date: 2025-12-13
    action: created
    by: spec-kitty.tasks
  - date: 2025-12-13T21:34:00Z
    action: moved_to_doing
    by: github-copilot
    shell_pid: "7216"
    note: "Started MVP implementation (Infrastructure Setup)"
  - date: 2025-12-13T21:36:00Z
    action: completed_implementation
    by: github-copilot
    shell_pid: "7216"
    note: "Completed all infrastructure setup tasks (T001-T006)"
  - date: 2025-12-13T21:45:00Z
    action: approved
    by: github-copilot-reviewer
    shell_pid: "7216"
    note: "Approved: All configuration files present and correct, structure matches specification"
---

# Work Package: Infrastructure Setup

**ID**: WP01
**Priority**: P0 (Blocking)
**Lane**: Doing

## Objective

Create the foundational package structure, build tooling, and testing infrastructure for `@django-core/page-templates`. This work package establishes the development environment that all subsequent work packages depend on.

## Context

This is the first work package and must be completed before any template implementation can begin. We're creating a new frontend component library package within the existing monorepo that will house 4 reusable page templates (Dashboard, List-Detail, Wizard, Settings) plus shared utilities.

**Key Requirements**:
- TypeScript 5.x strict mode
- React 18.x peer dependency
- Vite for build tooling
- Vitest + React Testing Library for testing
- Storybook 8.x for documentation
- Integration with existing F01/F06/F07 packages

## Subtasks

### T001: Create package directory structure

**Goal**: Establish folder layout for `packages/page-templates/`

**Steps**:
1. Create `packages/page-templates/` directory in monorepo root
2. Create subdirectories:
   ```
   packages/page-templates/
   ├── src/
   │   ├── components/
   │   ├── hooks/
   │   ├── types/
   │   └── index.ts
   ├── tests/
   │   └── integration/
   ├── stories/
   ├── .storybook/
   └── dist/ (git-ignored)
   ```
3. Add to `.gitignore`: `packages/page-templates/dist/`, `packages/page-templates/node_modules/`
4. Update monorepo `pnpm-workspace.yaml` to include `packages/page-templates`

**Validation**:
- Directory structure matches plan.md "Project Structure" section
- `pnpm install` from monorepo root discovers the new package

---

### T002: Initialize package.json

**Goal**: Configure package metadata, dependencies, and scripts

**Steps**:
1. Create `packages/page-templates/package.json`:
   ```json
   {
     "name": "@django-core/page-templates",
     "version": "0.1.0",
     "description": "Reusable page templates for common SaaS patterns",
     "type": "module",
     "main": "./dist/index.cjs",
     "module": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "import": "./dist/index.js",
         "require": "./dist/index.cjs",
         "types": "./dist/index.d.ts"
       }
     },
     "files": ["dist"],
     "scripts": {
       "build": "vite build && tsc --emitDeclarationOnly",
       "dev": "vite build --watch",
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage",
       "typecheck": "tsc --noEmit",
       "lint": "eslint src --ext .ts,.tsx",
       "lint:fix": "eslint src --ext .ts,.tsx --fix",
       "format": "prettier --write 'src/**/*.{ts,tsx}'",
       "storybook": "storybook dev -p 6006",
       "build-storybook": "storybook build"
     },
     "peerDependencies": {
       "@django-core/design-system": "workspace:*",
       "@django-core/layouts": "workspace:*",
       "react": "^18.0.0",
       "react-dom": "^18.0.0"
     },
     "devDependencies": {
       "@storybook/addon-essentials": "^8.3.5",
       "@storybook/addon-interactions": "^8.3.5",
       "@storybook/addon-links": "^8.3.5",
       "@storybook/react": "^8.3.5",
       "@storybook/react-vite": "^8.3.5",
       "@testing-library/jest-dom": "^6.1.5",
       "@testing-library/react": "^14.1.2",
       "@testing-library/user-event": "^14.5.1",
       "@types/react": "^18.2.45",
       "@types/react-dom": "^18.2.18",
       "@typescript-eslint/eslint-plugin": "^6.15.0",
       "@typescript-eslint/parser": "^6.15.0",
       "@vitejs/plugin-react": "^4.2.1",
       "@vitest/coverage-v8": "^1.0.4",
       "eslint": "^8.56.0",
       "eslint-plugin-react": "^7.33.2",
       "eslint-plugin-react-hooks": "^4.6.0",
       "jsdom": "^23.0.1",
       "prettier": "^3.1.1",
       "storybook": "^8.3.5",
       "typescript": "^5.3.3",
       "vite": "^5.0.8",
       "vitest": "^1.0.4"
     },
     "keywords": [
       "react",
       "templates",
       "components",
       "dashboard",
       "wizard",
       "ui"
     ]
   }
   ```
2. Run `pnpm install` from monorepo root to install dependencies

**Validation**:
- `pnpm list @django-core/page-templates` shows package in workspace
- All peer dependencies resolve correctly
- No version conflicts with monorepo dependencies

---

### T003: Configure TypeScript

**Goal**: Set up TypeScript with strict mode and React JSX support

**Steps**:
1. Create `packages/page-templates/tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "moduleResolution": "bundler",
       "jsx": "react-jsx",
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "outDir": "./dist",
       "strict": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true,
       "noFallthroughCasesInSwitch": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "types": ["vitest/globals", "@testing-library/jest-dom"]
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
   }
   ```
2. Create placeholder `src/index.ts`:
   ```typescript
   // @django-core/page-templates public API
   export const version = '0.1.0';
   ```
3. Run `pnpm typecheck` to verify configuration

**Validation**:
- `pnpm typecheck` passes with no errors
- TypeScript strict mode is enabled
- JSX transforms work (test with placeholder React component)

---

### T004: Configure Vite build

**Goal**: Set up Vite for library mode with proper externals

**Steps**:
1. Create `packages/page-templates/vite.config.ts`:
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import { resolve } from 'path';

   export default defineConfig({
     plugins: [react()],
     build: {
       lib: {
         entry: resolve(__dirname, 'src/index.ts'),
         name: 'DjangoCore PageTemplates',
         formats: ['es', 'cjs'],
         fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
       },
       rollupOptions: {
         external: [
           'react',
           'react-dom',
           'react/jsx-runtime',
           '@django-core/design-system',
           '@django-core/layouts',
           '@django-core/theme-system',
         ],
         output: {
           globals: {
             react: 'React',
             'react-dom': 'ReactDOM',
           },
         },
       },
       sourcemap: true,
       minify: 'terser',
     },
   });
   ```
2. Run `pnpm build` to test build process
3. Verify `dist/` contains `index.js`, `index.cjs`, `index.d.ts`

**Validation**:
- Build completes without errors
- Bundle size is reasonable (<5KB for placeholder)
- TypeScript declarations generated correctly

---

### T005: Configure Vitest

**Goal**: Set up Vitest with React Testing Library for component testing

**Steps**:
1. Create `packages/page-templates/vitest.config.ts`:
   ```typescript
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';
   import { resolve } from 'path';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: './tests/setup.ts',
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         exclude: [
           'node_modules/',
           'tests/',
           '**/*.d.ts',
           '**/*.config.*',
           '**/dist/**',
           '**/.storybook/**',
           '**/stories/**',
         ],
       },
     },
     resolve: {
       alias: {
         '@': resolve(__dirname, './src'),
       },
     },
   });
   ```
2. Create `packages/page-templates/tests/setup.ts`:
   ```typescript
   import '@testing-library/jest-dom';
   ```
3. Create placeholder test `src/index.test.ts`:
   ```typescript
   import { describe, it, expect } from 'vitest';
   import { version } from './index';

   describe('Package exports', () => {
     it('exports version', () => {
       expect(version).toBe('0.1.0');
     });
   });
   ```
4. Run `pnpm test` to verify test setup

**Validation**:
- `pnpm test` discovers and runs test files
- React Testing Library utilities available
- Coverage reports generate correctly

---

### T006: Configure Storybook 8

**Goal**: Set up Storybook for interactive component documentation

**Steps**:
1. Create `packages/page-templates/.storybook/main.ts`:
   ```typescript
   import type { StorybookConfig } from '@storybook/react-vite';
   import { mergeConfig } from 'vite';

   const config: StorybookConfig = {
     stories: ['../src/**/*.stories.tsx', '../stories/**/*.stories.tsx'],
     addons: [
       '@storybook/addon-links',
       '@storybook/addon-essentials',
       '@storybook/addon-interactions',
     ],
     framework: {
       name: '@storybook/react-vite',
       options: {},
     },
     docs: {
       autodocs: 'tag',
     },
     async viteFinal(config) {
       return mergeConfig(config, {
         resolve: {
           alias: {
             '@django-core/design-system': require.resolve('@django-core/design-system'),
             '@django-core/layouts': require.resolve('@django-core/layouts'),
           },
         },
       });
     },
   };

   export default config;
   ```
2. Create `packages/page-templates/.storybook/preview.ts`:
   ```typescript
   import type { Preview } from '@storybook/react';

   const preview: Preview = {
     parameters: {
       actions: { argTypesRegex: '^on[A-Z].*' },
       controls: {
         matchers: {
           color: /(background|color)$/i,
           date: /Date$/,
         },
       },
       layout: 'fullscreen', // Templates need full viewport
     },
   };

   export default preview;
   ```
3. Create placeholder story `stories/Placeholder.stories.tsx`:
   ```tsx
   import type { Meta, StoryObj } from '@storybook/react';

   const Placeholder = () => (
     <div style={{ padding: '2rem' }}>
       <h1>@django-core/page-templates</h1>
       <p>Storybook is configured correctly!</p>
     </div>
   );

   const meta: Meta<typeof Placeholder> = {
     title: 'Setup/Placeholder',
     component: Placeholder,
   };

   export default meta;
   type Story = StoryObj<typeof Placeholder>;

   export const Basic: Story = {};
   ```
4. Run `pnpm storybook` to verify Storybook starts

**Validation**:
- Storybook starts on http://localhost:6006
- Placeholder story renders correctly
- F01/F06 packages can be imported in stories (verify with test import)

---

## Definition of Done

- [ ] Package structure created and matches plan.md
- [ ] `pnpm install` from monorepo root succeeds
- [ ] `pnpm build` generates dist/ with ESM + CJS + types
- [ ] `pnpm typecheck` passes with TypeScript strict mode
- [ ] `pnpm test` runs and passes placeholder test
- [ ] `pnpm lint` runs without errors
- [ ] `pnpm storybook` starts and displays placeholder story
- [ ] All configuration files (tsconfig.json, vite.config.ts, vitest.config.ts, .storybook/) are in place
- [ ] Git ignores dist/, node_modules/, coverage/ directories

## Risks & Mitigations

**Risk**: Storybook 8 config conflicts with monorepo setup
- **Mitigation**: Test F01/F06 imports in placeholder story immediately

**Risk**: Peer dependency version mismatches
- **Mitigation**: Lock versions to existing F01/F06/F07 versions in monorepo

**Risk**: Build output doesn't tree-shake properly
- **Mitigation**: Test bundle size early, adjust Rollup config if needed

## Reviewer Checklist

- [ ] Directory structure matches plan.md exactly
- [ ] TypeScript strict mode is enabled
- [ ] All package.json scripts work (`build`, `test`, `lint`, `storybook`)
- [ ] No unexpected dependencies added
- [ ] Placeholder test and story demonstrate infrastructure works
- [ ] Git ignores correct directories
- [ ] Documentation exists for running each script

## Next Steps

After completing WP01:
1. Mark all subtasks complete in `tasks.md`
2. Move this prompt to `tasks/done/WP01-infrastructure-setup.md`
3. Proceed to WP02 (Common Utilities & State Components)
4. Suggested command: `/spec-kitty.implement WP02`

## Activity Log

- 2025-12-13T20:35:58Z – github-copilot – shell_pid=7216 – lane=doing – Started MVP implementation (Infrastructure Setup)
- 2025-12-13T21:45:00Z – github-copilot-reviewer – shell_pid=7216 – lane=done – Approved: All configuration files present and correct, structure matches specification
