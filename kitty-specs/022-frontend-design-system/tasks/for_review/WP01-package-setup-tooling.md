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
title: "Package Setup & Tooling"
phase: "Phase 0 - Foundation"
lane: "for_review"
assignee: "GitHub Copilot"
agent: "claude"
shell_pid: "46272"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-05T12:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
  - timestamp: "2025-12-06T10:00:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "46272"
    action: "Started implementation of package setup and tooling"
  - timestamp: "2025-12-06T10:30:00Z"
    lane: "doing"
    agent: "claude"
    shell_pid: "46272"
    action: "Completed all 13 subtasks - package structure, tooling, and configuration files created"
---
*Path: [kitty-specs/022-frontend-design-system/tasks/planned/WP01-package-setup-tooling.md](kitty-specs/022-frontend-design-system/tasks/planned/WP01-package-setup-tooling.md)*

# Work Package Prompt: WP01 – Package Setup & Tooling

## ⚠️ IMPORTANT: Review Feedback Status

**Read this first if you are implementing this task!**

- **Has review feedback?**: Check the `review_status` field above. If it says `has_feedback`, scroll to the **Review Feedback** section immediately.
- **You must address all feedback** before your work is complete.
- **Mark as acknowledged**: When you understand the feedback, update `review_status: acknowledged` in the frontmatter.

---

## Review Feedback

*[This section is empty initially. Reviewers will populate it if the work is returned from review.]*

---

## Objectives & Success Criteria

### Objectives
1. Create the `packages/design-system/` directory structure as a pnpm workspace package
2. Configure Vite for library mode with vanilla-extract support
3. Initialize Storybook 8 for component documentation
4. Set up Jest + Testing Library + axe-core for testing
5. Configure quality tooling (ESLint, Prettier, TypeScript strict mode)
6. Establish pre-commit hooks for automated quality checks

### Success Criteria
- [ ] `pnpm install` succeeds in the monorepo root
- [ ] `pnpm --filter design-system build` produces ESM and CJS outputs
- [ ] `pnpm --filter design-system lint` runs ESLint without errors
- [ ] `pnpm --filter design-system typecheck` runs TypeScript without errors
- [ ] `pnpm --filter design-system test` runs Jest successfully
- [ ] `pnpm --filter design-system storybook` starts Storybook on localhost
- [ ] Pre-commit hooks run lint-staged on changed files

---

## Context & Constraints

### Reference Documents
- Constitution: `.kittify/memory/constitution.md` (Principles III, VIII, X)
- Spec: `kitty-specs/022-frontend-design-system/spec.md`
- Plan: `kitty-specs/022-frontend-design-system/plan.md`
- Research: `kitty-specs/022-frontend-design-system/research.md`

### Technical Constraints
- **Package Manager**: pnpm with workspaces
- **Build Tool**: Vite 5.x in library mode
- **Styling**: vanilla-extract (requires `@vanilla-extract/vite-plugin`)
- **TypeScript**: Strict mode, target ES2020
- **React**: 18.x as peer dependency
- **Storybook**: Version 8.x with vanilla-extract addon
- **Testing**: Jest + @testing-library/react + jest-axe

### Key Decisions (from research.md)
1. Monorepo workspace package at `packages/design-system/`
2. Vite for library bundling (ESM + CJS dual output)
3. vanilla-extract for zero-runtime CSS-in-TypeScript

---

## Subtasks & Detailed Guidance

### Subtask T001 – Create directory structure
- **Purpose**: Establish the folder hierarchy for the design system package
- **Steps**:
  1. Create `packages/design-system/` at repository root
  2. Create subdirectories: `src/`, `src/tokens/`, `src/components/`, `src/theme/`, `.storybook/`, `tests/`
  3. Ensure `pnpm-workspace.yaml` at root includes `packages/*`
- **Files**:
  - `packages/design-system/` (directory)
  - `pnpm-workspace.yaml` (update if needed)
- **Parallel?**: No (must complete first)

### Subtask T002 – Initialize package.json
- **Purpose**: Define package metadata, dependencies, and scripts
- **Steps**:
  1. Create `packages/design-system/package.json`
  2. Set `name: "@django-core/design-system"`
  3. Set `type: "module"` for ESM
  4. Define `main`, `module`, `types`, `exports` fields for dual ESM/CJS
  5. Add peer dependencies: `react`, `react-dom`
  6. Add dev dependencies: `vite`, `@vanilla-extract/vite-plugin`, `typescript`, `@types/react`, etc.
  7. Add scripts: `build`, `dev`, `lint`, `typecheck`, `test`, `storybook`, `build-storybook`
- **Files**:
  - `packages/design-system/package.json`
- **Parallel?**: No (foundation for other tasks)
- **Notes**: Use exact versions for reproducibility

```json
{
  "name": "@django-core/design-system",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./tokens.css": "./dist/tokens.css"
  },
  "files": ["dist"],
  "sideEffects": ["*.css"],
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "lint": "eslint src --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

### Subtask T003 – Configure tsconfig.json [P]
- **Purpose**: Enable strict TypeScript with vanilla-extract support
- **Steps**:
  1. Create `packages/design-system/tsconfig.json`
  2. Enable `strict: true`, `noEmit: true` (Vite handles emit)
  3. Set `target: "ES2020"`, `module: "ESNext"`, `moduleResolution: "bundler"`
  4. Include `src/**/*` and `tests/**/*`
- **Files**:
  - `packages/design-system/tsconfig.json`
- **Parallel?**: Yes

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationDir": "./dist",
    "outDir": "./dist"
  },
  "include": ["src/**/*", "tests/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Subtask T004 – Configure vite.config.ts [P]
- **Purpose**: Set up Vite for library mode with dual ESM/CJS output
- **Steps**:
  1. Create `packages/design-system/vite.config.ts`
  2. Configure `build.lib` with entry point and formats
  3. Externalize React and ReactDOM
  4. Enable CSS code splitting for tokens.css output
- **Files**:
  - `packages/design-system/vite.config.ts`
- **Parallel?**: Yes
- **Notes**: Requires T005 for vanilla-extract plugin

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DesignSystem',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    cssCodeSplit: false, // Single tokens.css output
  },
});
```

### Subtask T005 – Configure vanilla-extract plugin [P]
- **Purpose**: Enable vanilla-extract for zero-runtime CSS generation
- **Steps**:
  1. Install `@vanilla-extract/css` and `@vanilla-extract/vite-plugin`
  2. Add plugin to Vite config (covered in T004)
  3. Verify `.css.ts` files are processed correctly
- **Files**:
  - `packages/design-system/package.json` (add dependencies)
- **Parallel?**: Yes

### Subtask T006 – Configure ESLint [P]
- **Purpose**: Enforce code quality with TypeScript and React rules
- **Steps**:
  1. Create `packages/design-system/.eslintrc.cjs`
  2. Extend `eslint:recommended`, `@typescript-eslint/recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended`
  3. Configure parser for TypeScript
  4. Add rules for accessibility (`eslint-plugin-jsx-a11y`)
- **Files**:
  - `packages/design-system/.eslintrc.cjs`
- **Parallel?**: Yes

```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  settings: {
    react: { version: '18.2' },
  },
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
};
```

### Subtask T007 – Configure Prettier [P]
- **Purpose**: Consistent code formatting
- **Steps**:
  1. Create `packages/design-system/.prettierrc`
  2. Set standard options (semi, singleQuote, trailingComma, printWidth)
- **Files**:
  - `packages/design-system/.prettierrc`
- **Parallel?**: Yes

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### Subtask T008 – Initialize Storybook 8
- **Purpose**: Set up Storybook for component documentation
- **Steps**:
  1. Run `npx storybook@latest init` in `packages/design-system/`
  2. Configure for Vite builder and React framework
  3. Remove example stories
- **Files**:
  - `packages/design-system/.storybook/main.ts`
  - `packages/design-system/.storybook/preview.ts`
- **Parallel?**: No (requires T001-T002)

### Subtask T009 – Configure Storybook
- **Purpose**: Customize Storybook for vanilla-extract and theme switching
- **Steps**:
  1. Update `.storybook/main.ts` with vanilla-extract addon
  2. Configure `.storybook/preview.ts` with global decorators
  3. Create `.storybook/theme.ts` for Storybook UI theme (optional)
- **Files**:
  - `packages/design-system/.storybook/main.ts`
  - `packages/design-system/.storybook/preview.ts`
- **Parallel?**: No (depends on T008)

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
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

### Subtask T010 – Configure Jest [P]
- **Purpose**: Set up testing with React Testing Library and axe-core
- **Steps**:
  1. Create `packages/design-system/jest.config.js`
  2. Configure for TypeScript with ts-jest
  3. Set up jsdom environment
  4. Create `tests/setup.ts` with Testing Library and jest-axe imports
- **Files**:
  - `packages/design-system/jest.config.js`
  - `packages/design-system/tests/setup.ts`
- **Parallel?**: Yes

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
    '\\.css\\.ts$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.stories.tsx', '!src/**/index.ts'],
};
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
```

### Subtask T011 – Setup pre-commit hooks
- **Purpose**: Automate quality checks on commit
- **Steps**:
  1. Install `husky` and `lint-staged` as dev dependencies
  2. Configure `.husky/pre-commit` to run lint-staged
  3. Configure `lint-staged` in package.json
- **Files**:
  - `packages/design-system/.husky/pre-commit`
  - `packages/design-system/package.json` (add lint-staged config)
- **Parallel?**: No (final setup step)

### Subtask T012 – Create README.md
- **Purpose**: Document package purpose and setup
- **Steps**:
  1. Create `packages/design-system/README.md`
  2. Include installation, usage, development, and build instructions
- **Files**:
  - `packages/design-system/README.md`
- **Parallel?**: No

### Subtask T013 – Pin dependencies
- **Purpose**: Ensure reproducible builds
- **Steps**:
  1. Review all dependencies in package.json
  2. Use exact versions (no `^` or `~` prefixes)
  3. Run `pnpm install` to generate lockfile
- **Files**:
  - `packages/design-system/package.json`
  - `pnpm-lock.yaml`
- **Parallel?**: No (final step)

---

## Test Strategy

### Verification Commands
```bash
# From monorepo root
pnpm install
pnpm --filter design-system build
pnpm --filter design-system lint
pnpm --filter design-system typecheck
pnpm --filter design-system test
pnpm --filter design-system storybook
```

### Expected Outcomes
- Build produces `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts`
- ESLint reports no errors
- TypeScript reports no errors
- Jest runs (may have 0 tests initially)
- Storybook opens at http://localhost:6006

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| vanilla-extract + Vite compatibility | Use official `@vanilla-extract/vite-plugin`; test with simple .css.ts file |
| Storybook 8 + vanilla-extract | Verify addon compatibility; check Storybook vanilla-extract docs |
| pnpm workspace linking | Ensure `pnpm-workspace.yaml` is correct; test with `pnpm install` |
| ESM/CJS dual output | Test imports in both Node and browser environments |

---

## Definition of Done Checklist

- [ ] All subtasks T001-T013 completed
- [ ] `pnpm install` succeeds at monorepo root
- [ ] `pnpm --filter design-system build` produces dist/ with all outputs
- [ ] `pnpm --filter design-system lint` passes
- [ ] `pnpm --filter design-system typecheck` passes
- [ ] `pnpm --filter design-system storybook` starts successfully
- [ ] Pre-commit hooks run lint-staged
- [ ] README.md documents setup and usage
- [ ] All dependencies pinned to exact versions
- [ ] `tasks.md` updated with WP01 status

---

## Review Guidance

Reviewers should verify:
1. Package structure matches plan.md project structure
2. Vite config produces correct dual ESM/CJS outputs
3. TypeScript strict mode is enabled
4. ESLint includes accessibility rules (jsx-a11y)
5. Storybook starts without errors
6. Pre-commit hooks actually run on commit

---

## Activity Log

- 2025-12-05T12:00:00Z – system – lane=planned – Prompt created via /spec-kitty.tasks
