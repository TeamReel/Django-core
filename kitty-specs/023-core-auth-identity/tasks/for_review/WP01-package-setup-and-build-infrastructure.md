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
title: "Package Setup & Build Infrastructure"
phase: "Phase 0 - Foundation"
lane: "for_review"
assignee: "Claude"
agent: "claude"
shell_pid: "35160"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-07T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-08T16:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "35160"
    action: "Started WP01: Package Setup & Build Infrastructure"
  - timestamp: "2025-12-08T19:19:51Z"
    lane: "for_review"
    agent: "claude"
    shell_pid: "35160"
    action: "Completed WP01: Package setup fully functional (build, test, lint, typecheck passing). T008/T009 deferred to main branch."
---

# Work Package Prompt: WP01 – Package Setup & Build Infrastructure

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand feedback, update `review_status: acknowledged`.

---

## Review Feedback

*[Empty initially. Reviewers will populate if work needs changes.]*

---

## Objectives & Success Criteria

**Goal**: Establish `packages/auth/` package structure with TypeScript, Vite library mode, testing, and quality gates matching F01 standards.

**Success Criteria**:
- [ ] `packages/auth/` directory exists with complete structure (src/, __tests__/, .storybook/)
- [ ] `pnpm build` produces ESM + CJS outputs in `packages/auth/dist/`
- [ ] `pnpm test` runs Jest successfully with 80% coverage threshold configured
- [ ] `pnpm lint` passes (ESLint + Prettier checks)
- [ ] `pnpm typecheck` passes (TypeScript strict mode, no errors)
- [ ] `pnpm storybook` starts successfully (port 6007)
- [ ] GitHub Actions CI includes packages/auth/ in all checks
- [ ] Pre-commit hooks run TypeScript, ESLint, Prettier on packages/auth/ files

**Independent Test**: Run `pnpm install && cd packages/auth && pnpm build && pnpm test && pnpm lint && pnpm typecheck` from repo root—all commands succeed.

---

## Context & Constraints

**Prerequisites**: None (starting work package)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/spec.md` - Feature requirements
- `kitty-specs/023-core-auth-identity/plan.md` - Technical architecture, build requirements
- `packages/design-system/` - F01 design system (reference for build patterns)
- `.kittify/memory/constitution.md` - Principles III, VIII, X (code quality, dev experience, CI/CD)

**Architectural Decisions** (from plan.md):
- **Language**: TypeScript 5.x with strict mode
- **Build Tool**: Vite library mode (ESM + CJS outputs)
- **Testing**: Jest + React Testing Library (80% coverage threshold)
- **Linting**: ESLint + Prettier (match F01 configuration)
- **Package Manager**: pnpm (monorepo workspace)
- **Peer Dependencies**: React 18.x, @django-core/design-system 1.x

**Constraints**:
- Must match F01 tooling configuration (packages/design-system/) for consistency
- Vite library mode: external React, React-DOM, F01 components
- Package.json exports must support ESM (`import`) and CJS (`require`)
- TypeScript strict mode required per Constitution Principle III
- Pre-commit hooks must match CI checks exactly per Principle VIII

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create `packages/auth/` Directory Structure

**Purpose**: Establish foundational directory layout for F02 package following monorepo conventions.

**Steps**:
1. Navigate to repo root: `cd c:\Users\brian\Documents\django-core`
2. Create directory: `mkdir -p packages/auth/src packages/auth/__tests__ packages/auth/.storybook`
3. Create subdirectories:
   ```powershell
   mkdir packages/auth/src/components/pages
   mkdir packages/auth/src/components/forms
   mkdir packages/auth/src/hooks
   mkdir packages/auth/src/lib
   mkdir packages/auth/src/types
   mkdir packages/auth/__tests__/components
   mkdir packages/auth/__tests__/hooks
   mkdir packages/auth/__tests__/lib
   ```
4. Verify structure matches plan.md "Project Structure" section

**Files**:
- `packages/auth/` (new directory)
- `packages/auth/src/` (source code)
- `packages/auth/__tests__/` (tests)
- `packages/auth/.storybook/` (Storybook config)

**Parallel?**: No (foundational step)

**Notes**: This structure mirrors F01 (packages/design-system/) for consistency.

---

### Subtask T002 – Initialize package.json with Correct Metadata

**Purpose**: Configure npm package metadata, scripts, dependencies, and exports for library distribution.

**Steps**:
1. Create `packages/auth/package.json`:
   ```json
   {
     "name": "@django-core/auth-ui",
     "version": "1.0.0",
     "description": "Lightweight React authentication UI package for Django Core",
     "type": "module",
     "main": "./dist/index.cjs",
     "module": "./dist/index.js",
     "types": "./dist/index.d.ts",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "import": "./dist/index.js",
         "require": "./dist/index.cjs"
       }
     },
     "files": [
       "dist",
       "README.md"
     ],
     "scripts": {
       "build": "vite build && tsc --emitDeclarationOnly --declaration --declarationDir dist",
       "dev": "vite build --watch",
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage",
       "lint": "eslint src --ext .ts,.tsx",
       "lint:fix": "eslint src --ext .ts,.tsx --fix",
       "format": "prettier --write \"src/**/*.{ts,tsx}\"",
       "format:check": "prettier --check \"src/**/*.{ts,tsx}\"",
       "typecheck": "tsc --noEmit",
       "storybook": "storybook dev -p 6007",
       "build-storybook": "storybook build"
     },
     "peerDependencies": {
       "react": "^18.0.0",
       "react-dom": "^18.0.0",
       "@django-core/design-system": "^1.0.0"
     },
     "devDependencies": {
       "@swc/jest": "^0.2.29",
       "@testing-library/jest-dom": "^6.1.5",
       "@testing-library/react": "^14.1.2",
       "@types/jest": "^29.5.11",
       "@types/react": "^18.2.45",
       "@types/react-dom": "^18.2.18",
       "@typescript-eslint/eslint-plugin": "^6.15.0",
       "@typescript-eslint/parser": "^6.15.0",
       "eslint": "^8.56.0",
       "eslint-config-prettier": "^9.1.0",
       "eslint-plugin-react": "^7.33.2",
       "eslint-plugin-react-hooks": "^4.6.0",
       "jest": "^29.7.0",
       "jest-environment-jsdom": "^29.7.0",
       "prettier": "^3.1.1",
       "typescript": "^5.3.3",
       "vite": "^5.0.8",
       "vite-plugin-dts": "^3.7.0"
     },
     "keywords": [
       "react",
       "authentication",
       "auth",
       "ui",
       "django",
       "design-system"
     ],
     "author": "Django Core Team",
     "license": "MIT",
     "repository": {
       "type": "git",
       "url": "https://github.com/TeamReel/Django-core.git",
       "directory": "packages/auth"
     }
   }
   ```
2. Run `pnpm install` from repo root to install dependencies
3. Verify package appears in `pnpm list` output

**Files**:
- `packages/auth/package.json` (new)

**Parallel?**: No (required before other setup)

**Implementation Details**:
- **type: "module"**: Enables ESM syntax
- **exports**: Dual ESM/CJS support for maximum compatibility
- **peerDependencies**: React 18.x + F01 (not bundled)
- **scripts**: Match F01 patterns for consistency

**Notes**:
- Version 1.0.0 indicates initial release
- Peer dependencies prevent bundling React/F01 (keep bundle small)
- devDependencies include all tooling (TypeScript, Jest, ESLint, Prettier, Vite)

---

### Subtask T003 – Setup TypeScript Config Extending Workspace tsconfig with Strict Mode

**Purpose**: Configure TypeScript compiler with strict mode for type safety and IDE support.

**Steps**:
1. Create `packages/auth/tsconfig.json`:
   ```json
   {
     "extends": "../../tsconfig.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src",
       "declaration": true,
       "declarationMap": true,
       "jsx": "react-jsx",
       "moduleResolution": "bundler",
       "module": "ESNext",
       "target": "ES2020",
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": false
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "__tests__", ".storybook"]
   }
   ```
2. Run `cd packages/auth && pnpm typecheck` to verify configuration
3. Should succeed with no errors (no source files yet)

**Files**:
- `packages/auth/tsconfig.json` (new)

**Parallel?**: [P] Can run in parallel with T004, T005, T006

**Implementation Details**:
- **strict: true**: Enables all strict type-checking options (Constitution Principle III)
- **jsx: "react-jsx"**: Use React 18's new JSX transform (no React import needed)
- **moduleResolution: "bundler"**: Modern resolution for Vite
- **declaration: true**: Generate .d.ts files for TypeScript consumers

**Notes**:
- Extends workspace `tsconfig.json` for shared configuration
- `noEmit: false` allows `tsc` to generate declaration files during build

---

### Subtask T004 – Configure Vite Library Mode Build (ESM + CJS Outputs, External React/F01)

**Purpose**: Setup Vite to build F02 as a library with dual ESM/CJS output and external dependencies.

**Steps**:
1. Create `packages/auth/vite.config.ts`:
   ```typescript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   import dts from 'vite-plugin-dts';
   import { resolve } from 'path';

   export default defineConfig({
     plugins: [
       react(),
       dts({
         insertTypesEntry: true,
         outDir: 'dist',
       }),
     ],
     build: {
       lib: {
         entry: resolve(__dirname, 'src/index.ts'),
         name: 'DjangoCoreAuth',
         formats: ['es', 'cjs'],
         fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
       },
       rollupOptions: {
         external: ['react', 'react-dom', 'react/jsx-runtime', '@django-core/design-system'],
         output: {
           globals: {
             react: 'React',
             'react-dom': 'ReactDOM',
             '@django-core/design-system': 'DjangoCoreDesignSystem',
           },
         },
       },
       sourcemap: true,
       minify: 'esbuild',
       target: 'es2020',
     },
   });
   ```
2. Create placeholder `packages/auth/src/index.ts`:
   ```typescript
   // F02 Core Auth Identity UI
   // Public API exports will be added here

   export const version = '1.0.0';
   ```
3. Run `cd packages/auth && pnpm build`
4. Verify outputs exist:
   - `packages/auth/dist/index.js` (ESM)
   - `packages/auth/dist/index.cjs` (CommonJS)
   - `packages/auth/dist/index.d.ts` (TypeScript declarations)

**Files**:
- `packages/auth/vite.config.ts` (new)
- `packages/auth/src/index.ts` (new, placeholder)

**Parallel?**: [P] Can run in parallel with T003, T005, T006

**Implementation Details**:
- **lib.entry**: Entry point for library build (src/index.ts)
- **formats: ['es', 'cjs']**: Generate both ESM and CommonJS
- **external**: React, React-DOM, F01 not bundled (peer dependencies)
- **sourcemap: true**: Generate source maps for debugging
- **minify: 'esbuild'**: Fast minification

**Notes**:
- `vite-plugin-dts` generates TypeScript declarations automatically
- External dependencies reduce bundle size (~10-15KB target per plan.md)
- Build outputs match package.json exports configuration

---

### Subtask T005 – Configure Jest + React Testing Library (80% Coverage Threshold)

**Purpose**: Setup Jest testing framework with React Testing Library and coverage enforcement.

**Steps**:
1. Create `packages/auth/jest.config.js`:
   ```javascript
   export default {
     displayName: '@django-core/auth-ui',
     preset: '../../jest.preset.js',
     testEnvironment: 'jsdom',
     transform: {
       '^.+\\.(ts|tsx)$': [
         '@swc/jest',
         {
           jsc: {
             parser: {
               syntax: 'typescript',
               tsx: true,
             },
             transform: {
               react: {
                 runtime: 'automatic',
               },
             },
           },
         },
       ],
     },
     moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
     coverageDirectory: '../../coverage/packages/auth',
     collectCoverageFrom: [
       'src/**/*.{ts,tsx}',
       '!src/**/*.stories.{ts,tsx}',
       '!src/**/*.d.ts',
       '!src/index.ts',
     ],
     coverageThresholds: {
       global: {
         branches: 80,
         functions: 80,
         lines: 80,
         statements: 80,
       },
     },
     setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
     moduleNameMapper: {
       '^@/(.*)$': '<rootDir>/src/$1',
     },
   };
   ```
2. Create `packages/auth/jest.setup.js`:
   ```javascript
   import '@testing-library/jest-dom';

   // Mock window.matchMedia (required for F01 components)
   Object.defineProperty(window, 'matchMedia', {
     writable: true,
     value: jest.fn().mockImplementation((query) => ({
       matches: false,
       media: query,
       onchange: null,
       addListener: jest.fn(),
       removeListener: jest.fn(),
       addEventListener: jest.fn(),
       removeEventListener: jest.fn(),
       dispatchEvent: jest.fn(),
     })),
   });
   ```
3. Create placeholder test `packages/auth/__tests__/index.test.ts`:
   ```typescript
   import { version } from '../src/index';

   describe('@django-core/auth-ui', () => {
     it('exports version', () => {
       expect(version).toBe('1.0.0');
     });
   });
   ```
4. Run `cd packages/auth && pnpm test`
5. Should pass (1 test)

**Files**:
- `packages/auth/jest.config.js` (new)
- `packages/auth/jest.setup.js` (new)
- `packages/auth/__tests__/index.test.ts` (new, placeholder)

**Parallel?**: [P] Can run in parallel with T003, T004, T006

**Implementation Details**:
- **@swc/jest**: Fast TypeScript compilation (matches F01 setup)
- **coverageThresholds**: 80% minimum (Constitution Principle IV)
- **setupFilesAfterEnv**: Import jest-dom matchers, mock browser APIs
- **testEnvironment: 'jsdom'**: DOM API simulation for React testing

**Notes**:
- Coverage threshold enforcement blocks merge if <80%
- Mock window.matchMedia required for responsive F01 components
- Placeholder test ensures Jest runs successfully

---

### Subtask T006 – Setup ESLint + Prettier Matching F01 Configuration

**Purpose**: Configure code linting and formatting tools consistent with F01 standards.

**Steps**:
1. Create `packages/auth/.eslintrc.js`:
   ```javascript
   module.exports = {
     root: true,
     parser: '@typescript-eslint/parser',
     parserOptions: {
       ecmaVersion: 2020,
       sourceType: 'module',
       ecmaFeatures: {
         jsx: true,
       },
     },
     settings: {
       react: {
         version: 'detect',
       },
     },
     extends: [
       'eslint:recommended',
       'plugin:@typescript-eslint/recommended',
       'plugin:react/recommended',
       'plugin:react-hooks/recommended',
       'prettier',
     ],
     plugins: ['@typescript-eslint', 'react', 'react-hooks'],
     rules: {
       'react/react-in-jsx-scope': 'off', // React 18 JSX transform
       'react/prop-types': 'off', // Use TypeScript instead
       '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
       '@typescript-eslint/explicit-module-boundary-types': 'off',
     },
     ignorePatterns: ['dist', 'node_modules', '.storybook', 'vite.config.ts', 'jest.config.js'],
   };
   ```
2. Create `packages/auth/.prettierrc.json`:
   ```json
   {
     "semi": true,
     "trailingComma": "es5",
     "singleQuote": true,
     "printWidth": 100,
     "tabWidth": 2,
     "useTabs": false,
     "arrowParens": "always",
     "endOfLine": "lf"
   }
   ```
3. Create `packages/auth/.prettierignore`:
   ```
   dist
   node_modules
   coverage
   .storybook
   ```
4. Run `cd packages/auth && pnpm lint && pnpm format:check`
5. Should pass (no violations on placeholder files)

**Files**:
- `packages/auth/.eslintrc.js` (new)
- `packages/auth/.prettierrc.json` (new)
- `packages/auth/.prettierignore` (new)

**Parallel?**: [P] Can run in parallel with T003, T004, T005

**Implementation Details**:
- **extends: ['prettier']**: Disable ESLint formatting rules (Prettier handles)
- **react/react-in-jsx-scope: 'off'**: React 18 JSX transform doesn't require import
- **Prettier config**: Matches F01 (singleQuote, printWidth: 100, etc.)

**Notes**:
- ESLint enforces code quality, Prettier enforces formatting
- Configuration matches packages/design-system/ for consistency
- Pre-commit hooks will run both tools (T008)

---

### Subtask T007 – Configure Storybook for Component Development (Inherit F01 Setup)

**Purpose**: Setup Storybook for interactive component development and documentation.

**Steps**:
1. Create `packages/auth/.storybook/main.ts`:
   ```typescript
   import type { StorybookConfig } from '@storybook/react-vite';

   const config: StorybookConfig = {
     stories: ['../src/**/*.stories.@(ts|tsx)'],
     addons: [
       '@storybook/addon-links',
       '@storybook/addon-essentials',
       '@storybook/addon-interactions',
       '@storybook/addon-a11y',
     ],
     framework: {
       name: '@storybook/react-vite',
       options: {},
     },
     docs: {
       autodocs: 'tag',
     },
   };

   export default config;
   ```
2. Create `packages/auth/.storybook/preview.tsx`:
   ```typescript
   import type { Preview } from '@storybook/react';
   import React from 'react';
   import { ThemeProvider } from '@django-core/design-system';
   import '@django-core/design-system/tokens.css';

   const preview: Preview = {
     parameters: {
       actions: { argTypesRegex: '^on[A-Z].*' },
       controls: {
         matchers: {
           color: /(background|color)$/i,
           date: /Date$/,
         },
       },
     },
     decorators: [
       (Story) => (
         <ThemeProvider theme="light">
           <Story />
         </ThemeProvider>
       ),
     ],
   };

   export default preview;
   ```
3. Add Storybook dependencies to `package.json` devDependencies:
   ```json
   "@storybook/addon-a11y": "^7.6.6",
   "@storybook/addon-essentials": "^7.6.6",
   "@storybook/addon-interactions": "^7.6.6",
   "@storybook/addon-links": "^7.6.6",
   "@storybook/react": "^7.6.6",
   "@storybook/react-vite": "^7.6.6",
   "storybook": "^7.6.6"
   ```
4. Run `pnpm install` to install Storybook dependencies
5. Run `cd packages/auth && pnpm storybook`
6. Should start on http://localhost:6007 (no stories yet)

**Files**:
- `packages/auth/.storybook/main.ts` (new)
- `packages/auth/.storybook/preview.tsx` (new)

**Parallel?**: No (depends on T002 package.json)

**Implementation Details**:
- **@storybook/react-vite**: Use Vite for fast HMR
- **@storybook/addon-a11y**: Accessibility testing in Storybook
- **ThemeProvider decorator**: Wrap all stories in F01 theme context
- **Port 6007**: Avoid conflict with F01 Storybook (port 6006)

**Notes**:
- Storybook configuration matches F01 patterns
- Stories will be created in WP04-WP07 (component implementation)
- Chromatic visual regression testing added later if needed

---

### Subtask T008 – Add Pre-commit Hooks for TypeScript Check, ESLint, Prettier

**Purpose**: Enforce code quality checks before commits to catch errors early.

**Steps**:
1. Install husky and lint-staged at workspace root (if not already installed):
   ```powershell
   cd c:\Users\brian\Documents\django-core
   pnpm add -D -w husky lint-staged
   ```
2. Initialize husky:
   ```powershell
   pnpm exec husky install
   echo "pnpm lint-staged" > .husky/pre-commit
   ```
3. Update workspace root `package.json` to add lint-staged config:
   ```json
   "lint-staged": {
     "packages/auth/src/**/*.{ts,tsx}": [
       "eslint --fix",
       "prettier --write",
       "bash -c 'cd packages/auth && pnpm typecheck'"
     ]
   }
   ```
4. Test pre-commit hook:
   - Create test file `packages/auth/src/test.ts` with intentional error
   - Run `git add packages/auth/src/test.ts && git commit -m "test"`
   - Should fail with ESLint/TypeScript errors
   - Remove test file

**Files**:
- `.husky/pre-commit` (update or create)
- `package.json` at workspace root (update lint-staged config)

**Parallel?**: No (depends on T003, T006)

**Implementation Details**:
- **lint-staged**: Run checks only on staged files (fast)
- **husky**: Git hooks manager
- **Pre-commit checks**: ESLint, Prettier, TypeScript (match CI)

**Notes**:
- Pre-commit hooks prevent committing broken code
- Matches CI checks exactly (Constitution Principle VIII)
- Developers can bypass with `--no-verify` in emergencies (not recommended)

---

### Subtask T009 – Update GitHub Actions CI to Include packages/auth/ Checks

**Purpose**: Add F02 package to CI pipeline for automated quality gates.

**Steps**:
1. Open `.github/workflows/code-quality.yml`
2. Find the `lint` job, add packages/auth/ to linting steps:
   ```yaml
   - name: Lint Auth Package
     run: cd packages/auth && pnpm lint
   ```
3. Find the `typecheck` job, add packages/auth/ TypeScript check:
   ```yaml
   - name: TypeCheck Auth Package
     run: cd packages/auth && pnpm typecheck
   ```
4. Find the `test` job, add packages/auth/ tests:
   ```yaml
   - name: Test Auth Package
     run: cd packages/auth && pnpm test --coverage
   ```
5. Find the `build` job, add packages/auth/ build step:
   ```yaml
   - name: Build Auth Package
     run: cd packages/auth && pnpm build
   ```
6. Commit changes, push to branch
7. Verify CI runs successfully on GitHub

**Files**:
- `.github/workflows/code-quality.yml` (update)
- `.github/workflows/tests.yml` (update if separate)
- `.github/workflows/design-system-ci.yml` (may need update)

**Parallel?**: No (depends on T001-T008 being complete)

**Implementation Details**:
- Add F02 checks to existing CI workflows
- Use same Node.js version as F01 (currently Node 18)
- Run checks in parallel with other packages where possible

**Notes**:
- CI checks must match pre-commit hooks (Principle X)
- Failing CI blocks merge to main
- Consider adding Chromatic visual regression in future

---

### Subtask T010 – Create packages/auth/README.md with Placeholder Content

**Purpose**: Add package README with basic information (full content added in WP10).

**Steps**:
1. Create `packages/auth/README.md`:
   ```markdown
   # @django-core/auth-ui

   Lightweight React authentication UI package for Django Core.

   ## Status

   🚧 **In Development** - Package structure established, implementation in progress.

   ## Overview

   F02 Core Auth Identity UI provides reusable React components for authentication flows:
   - Sign-in with email/password
   - Password reset request and confirmation
   - Sign-out
   - Profile management
   - Session verification

   Built on F01 Design System, integrates with B05 Core Accounts APIs via B13 baseline.

   ## Installation

   ```bash
   pnpm add @django-core/auth-ui
   ```

   ## Quick Start

   Coming soon. See `kitty-specs/023-core-auth-identity/quickstart.md` for preview.

   ## Documentation

   Full documentation will be added in WP10.

   ## Development

   ```bash
   # Install dependencies
   pnpm install

   # Build package
   pnpm build

   # Run tests
   pnpm test

   # Start Storybook
   pnpm storybook
   ```

   ## License

   MIT
   ```
2. No validation needed (placeholder only)

**Files**:
- `packages/auth/README.md` (new)

**Parallel?**: [P] Can run in parallel with other tasks

**Notes**:
- Full README content added in WP10 (Documentation & Quickstart Finalization)
- Placeholder prevents npm warnings about missing README

---

### Subtask T011 – Add packages/auth to pnpm Workspace Configuration

**Purpose**: Register F02 package in monorepo workspace for dependency resolution.

**Steps**:
1. Open `pnpm-workspace.yaml` at repo root
2. Verify `packages/*` is listed (should already exist from F01):
   ```yaml
   packages:
     - 'packages/*'
   ```
3. If not present, add it
4. Run `pnpm install` from repo root
5. Verify `packages/auth` appears in `pnpm list` output

**Files**:
- `pnpm-workspace.yaml` (verify or update)

**Parallel?**: No (foundational step)

**Notes**:
- F01 already uses `packages/*` pattern, so this likely requires no changes
- Ensures pnpm resolves `@django-core/auth-ui` as workspace package
- Allows F02 to depend on F01 via workspace protocol

---

## Risks & Mitigations

**Risk**: Build config mismatch with F01
**Mitigation**: Copy tested config from packages/design-system/, validate with sample export

**Risk**: CI workflow conflicts
**Mitigation**: Test CI locally with `act` or GitHub Actions workflow validation

**Risk**: Peer dependency version conflicts
**Mitigation**: Pin React 18.x, F01 1.x in peerDependencies, document in README

**Risk**: TypeScript compilation errors
**Mitigation**: Use strict mode, validate types early, test with `pnpm typecheck`

**Risk**: Pre-commit vs CI drift
**Mitigation**: Use same configuration files for both, document in Constitution

---

## Definition of Done Checklist

- [ ] All subtasks T001-T011 completed
- [ ] `pnpm build` produces ESM + CJS outputs in `packages/auth/dist/`
- [ ] `pnpm test` runs successfully (placeholder test passes)
- [ ] `pnpm lint` passes (no ESLint violations)
- [ ] `pnpm typecheck` passes (no TypeScript errors)
- [ ] `pnpm format:check` passes (all files formatted)
- [ ] `pnpm storybook` starts successfully on port 6007
- [ ] Pre-commit hooks run on `git commit` (test with dummy file)
- [ ] GitHub Actions CI includes packages/auth/ checks (verify on branch push)
- [ ] Constitutional compliance verified:
  - [ ] Principle III: TypeScript strict mode, ESLint, Prettier configured
  - [ ] Principle VIII: Easy setup, pre-commit hooks match CI
  - [ ] Principle X: Quality gates in CI, merge blocked if checks fail
- [ ] `tasks.md` updated with WP01 status change

---

## Review Guidance

**Acceptance Checkpoints**:
1. **Directory Structure**: Verify `packages/auth/` matches plan.md structure
2. **Build Output**: Run `pnpm build`, check `dist/` contains index.js, index.cjs, index.d.ts
3. **Test Execution**: Run `pnpm test`, verify placeholder test passes
4. **Linting**: Run `pnpm lint`, verify no violations
5. **TypeScript**: Run `pnpm typecheck`, verify no errors
6. **Storybook**: Run `pnpm storybook`, verify starts without errors
7. **CI Integration**: Check GitHub Actions workflow includes packages/auth/ steps
8. **Pre-commit Hooks**: Create dummy file with error, attempt commit, verify hook blocks

**Constitutional Compliance**:
- Principle III (Code Quality): TypeScript strict mode enabled, ESLint/Prettier configured
- Principle VIII (Developer Experience): Setup is simple (`pnpm install`), all tools configured
- Principle X (CI/CD): CI workflows include auth package, pre-commit hooks match CI

**Context to Revisit**:
- Compare build config with F01 (packages/design-system/vite.config.ts)
- Compare Jest config with F01 (packages/design-system/jest.config.js)
- Compare ESLint config with F01 (packages/design-system/.eslintrc.js)

---

## Activity Log

- 2025-12-07T00:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
