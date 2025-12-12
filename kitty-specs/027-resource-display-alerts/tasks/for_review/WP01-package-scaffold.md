---
lane: "for_review"
agent: "claude"
shell_pid: "22128"
---
# WP01: Package Scaffold & Infrastructure

---
**work_package_id**: WP01
**status**: planned
**priority**: P0 (Setup - must complete first)
**subtasks**: [T001, T002, T003, T004, T005, T006, T007, T008]
**dependencies**: None
**history**:
  - 2025-12-12: Created task prompt from Phase 3 breakdown

---

## Objective

Establish the monorepo package structure for `@django-core/resource-alerts` with complete build tooling, testing infrastructure, and Storybook integration. This work package creates the foundation for all subsequent component development.

## Context

**Feature**: 027-resource-display-alerts (F05 Resource Display & Alerts)
**Package**: @django-core/resource-alerts
**Related Documents**:
- [spec.md](../../spec.md) - Full feature specification
- [plan.md](../../plan.md) - Project structure and phases
- [quickstart.md](../../quickstart.md) - Integration guide (for reference, will be validated post-implementation)

**Key Requirements**:
- Package must support ESM + CJS outputs for maximum compatibility
- TypeScript strict mode required for type safety
- Peer dependencies: React 18.x, @django-core/design-system (F01)
- Build output must include .d.ts type definitions
- Testing via Vitest with React Testing Library
- Storybook configured to reuse F01's shared configuration

**Success Criteria**:
- `pnpm build` generates clean dist/ output with ESM/CJS/types
- `pnpm test` runs Vitest successfully (even with no tests yet)
- `pnpm storybook` launches shared Storybook dev server
- TypeScript compiles with zero errors in strict mode

## Detailed Guidance

### T001: Create Package Directory Structure

**Task**: Create `packages/resource-display-alerts/` with standard React package structure.

**Steps**:
1. Navigate to repo root: `C:\Users\brian\Documents\django-core\`
2. Create directory: `packages/resource-display-alerts/`
3. Create subdirectories:
   ```
   packages/resource-display-alerts/
   ├── src/
   │   ├── components/
   │   ├── hooks/
   │   ├── types/
   │   ├── utils/
   │   └── index.ts
   ├── stories/
   └── tests/
   ```

**Validation**: Verify directory structure matches F01 (`packages/design-system/`)

---

### T002: Set Up package.json with Dependencies

**Task**: Create package.json with correct peer dependencies and devDependencies.

**Template**:
```json
{
  "name": "@django-core/resource-alerts",
  "version": "0.1.0",
  "description": "Resource usage display and alert components for django-core",
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
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "vite build && tsc --emitDeclarationOnly",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "lint": "eslint src --ext .ts,.tsx"
  },
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@django-core/design-system": "workspace:*"
  },
  "dependencies": {
    "@django-core/api-client": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@storybook/react": "^8.0.0",
    "@storybook/react-vite": "^8.0.0",
    "@axe-core/react": "^4.8.0"
  },
  "keywords": [
    "react",
    "components",
    "alerts",
    "resource-usage",
    "health-status",
    "django-core"
  ],
  "license": "MIT"
}
```

**Key Decisions**:
- Use workspace protocol for internal dependencies (@django-core/*)
- React 18 as peer dependency (not bundled)
- Vite for build, Vitest for tests (fast ecosystem)

**Validation**: Run `pnpm install` from package directory, verify node_modules/ created

---

### T003: Configure Vite for Library Mode

**Task**: Create vite.config.ts configured for library builds with externalized peer dependencies.

**Template** (adapt from F01):
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ResourceAlerts',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', '@django-core/design-system', '@django-core/api-client'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: true,
    minify: false, // Keep readable for debugging
  },
});
```

**Key Decisions**:
- Library mode (not SPA mode)
- External peer deps to avoid bundling React
- Sourcemaps for debugging
- No minification (consumers will minify)

**Validation**: Run `pnpm build`, verify dist/index.js and dist/index.cjs created

---

### T004: Set Up TypeScript (tsconfig.json)

**Task**: Create tsconfig.json with strict mode and React JSX support.

**Template**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.test.tsx"]
}
```

**Key Decisions**:
- Strict mode enabled (no implicit any, strict null checks)
- React JSX transform (new JSX runtime)
- Declaration files for TypeScript consumers
- Path aliases for cleaner imports

**Validation**: Run `tsc --noEmit`, verify zero errors

---

### T005: Configure Vitest + React Testing Library

**Task**: Create vitest.config.ts and setup testing environment.

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
      ],
    },
  },
});
```

**tests/setup.ts**:
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;
```

**Validation**: Run `pnpm test`, verify "No test files found" message (not error)

---

### T006: Set Up Storybook Configuration

**Task**: Configure Storybook to reuse F01's shared configuration.

**Steps**:
1. Create `.storybook/main.ts`:
```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y', // Accessibility testing
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

2. Create `.storybook/preview.ts`:
```typescript
import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true,
          },
        ],
      },
    },
  },
};

export default preview;
```

**Validation**: Run `pnpm storybook`, verify server starts on localhost:6006

---

### T007: Create src/index.ts with Barrel Exports

**Task**: Create main entry point with placeholder exports.

**src/index.ts**:
```typescript
// Component exports (will be populated in later work packages)
export { Alert } from './components/Alert';
export type { AlertProps } from './components/Alert';

// Hook exports (will be populated in WP02, WP06)
// export { useAlertDismissal } from './hooks/useAlertDismissal';
// export { useResourceUsage } from './hooks/useResourceUsage';
// export { useHealthStatus } from './hooks/useHealthStatus';

// Type exports
export type * from './types';

// Re-export from design system for convenience
export type { Severity } from '@django-core/design-system';
```

**Placeholder Components** (for build to succeed):
Create `src/components/Alert/index.ts`:
```typescript
// Placeholder - will implement in WP02
export interface AlertProps {
  title: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

export const Alert = ({ title }: AlertProps) => {
  return <div>{title}</div>;
};
```

Create `src/types/index.ts`:
```typescript
// Placeholder - will populate with actual types in WP02-WP06
export interface ResourceUsageData {
  value: number;
  max: number;
  unit?: string;
}
```

**Validation**: Run `pnpm build`, verify no errors

---

### T008: Add Package to Monorepo Workspace

**Task**: Ensure package is registered in pnpm-workspace.yaml.

**Steps**:
1. Open `pnpm-workspace.yaml` in repo root
2. Verify `packages/*` is included:
```yaml
packages:
  - 'packages/*'
  - 'examples/*'
```
3. Run `pnpm install` from repo root to link workspace packages

**Validation**: From repo root, run `pnpm list @django-core/resource-alerts`, verify package appears in workspace

---

## Test Strategy

### Unit Tests
- **T005 validation**: Run `pnpm test` with zero test files, verify Vitest runs without errors
- **Mock localStorage**: Verify tests/setup.ts correctly mocks localStorage globals

### Build Tests
- **T003 validation**: `pnpm build` generates dist/index.js, dist/index.cjs, dist/index.d.ts
- **Bundle size check**: Verify dist/index.js is <5KB (only placeholder components)
- **TypeScript check**: `tsc --noEmit` produces zero errors

### Integration Tests
- **Storybook launch**: `pnpm storybook` starts server on port 6006
- **Workspace linking**: Import `@django-core/resource-alerts` from another package (e.g., create test file in examples/)

## Definition of Done

**Must Complete**:
- [ ] Package directory created in `packages/resource-display-alerts/`
- [ ] package.json with all required dependencies (peerDeps: React 18, F01)
- [ ] vite.config.ts configured for library mode (ESM + CJS outputs)
- [ ] tsconfig.json with strict mode enabled
- [ ] vitest.config.ts with jsdom environment
- [ ] Storybook configured with a11y addon
- [ ] src/index.ts with placeholder exports
- [ ] `pnpm build` succeeds and generates dist/ with types
- [ ] `pnpm test` runs successfully (even with no tests)
- [ ] `pnpm storybook` launches on localhost:6006
- [ ] TypeScript compiles with zero errors (tsc --noEmit)

**Quality Gates**:
- [ ] All commands listed above run without errors
- [ ] Package appears in `pnpm list` output from monorepo root
- [ ] dist/ output includes .js, .cjs, and .d.ts files

**Documentation**:
- [ ] README.md created with installation and build instructions (basic version)
- [ ] package.json scripts documented in README

## Risks & Mitigation

**Risk 1**: Vite library mode config complexity
- **Likelihood**: Medium
- **Impact**: High (blocks all builds)
- **Mitigation**: Copy proven config from F01 design-system package, test incrementally

**Risk 2**: Peer dependency version conflicts
- **Likelihood**: Low
- **Impact**: Medium (runtime errors in consuming apps)
- **Mitigation**: Match F01's React peer dep range exactly, test with pnpm link

**Risk 3**: Storybook fails to start due to config issues
- **Likelihood**: Low
- **Impact**: Low (blocks Storybook stories but not builds)
- **Mitigation**: Use minimal .storybook config, defer custom theming to later WP

## Reviewer Guidance

**Pre-Review Checklist**:
1. Verify all 8 subtasks marked complete
2. Clone branch and run `pnpm install` from repo root
3. Navigate to `packages/resource-display-alerts/`
4. Run build/test/storybook commands

**Critical Review Points**:
- [ ] package.json: Verify React 18 is peer dependency (not dependency)
- [ ] vite.config.ts: Verify peer deps are externalized in rollupOptions
- [ ] tsconfig.json: Verify strict mode is enabled
- [ ] Build output (dist/): Verify .d.ts files are generated
- [ ] Storybook: Verify a11y addon is configured

**Acceptance Test**:
From another package in the monorepo (e.g., examples/), try importing:
```typescript
import { Alert } from '@django-core/resource-alerts';
```
Verify TypeScript autocomplete works and no errors appear.

**Estimated Review Time**: 30 minutes

---

**Next Work Package**: After WP01 completes, WP02/WP03/WP04 can proceed in parallel.

## Activity Log

- 2025-12-12T21:29:02Z – claude – shell_pid=22128 – lane=doing – Started implementation
- 2025-12-12T21:36:11Z – claude – shell_pid=22128 – lane=for_review – Completed implementation - all 8 subtasks done, build/test/typecheck pass
