---
work_package_id: "WP11"
subtasks:
  - "T125"
  - "T126"
  - "T127"
  - "T128"
  - "T129"
  - "T130"
  - "T131"
  - "T132"
  - "T133"
title: "Bundle Optimization & Performance"
phase: "Phase 3 - Quality & Polish"
priority: "P3"
lane: "doing"
assignee: "claude-implementer"
agent: "claude-implementer"
shell_pid: "35160"
review_status: ""
reviewed_by: ""
history:
  - timestamp: "2025-12-09T14:18:00Z"
    lane: "doing"
    agent: "claude-implementer"
    shell_pid: "35160"
    action: "Started implementation - Bundle optimization and performance validation"
  - timestamp: "2025-12-08T00:00:00Z"
    lane: "planned"
    agent: "system"
    shell_pid: ""
    action: "Prompt generated via /spec-kitty.tasks"
---

# Work Package Prompt: WP11 – Bundle Optimization & Performance

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

**Goal**: Ensure F02 bundle size meets target (~10-15KB gzipped), optimize build output, validate Lighthouse metrics.

**Success Criteria**:
- [x] Production build shows bundle size ≤15KB gzipped (excluding React + F01)
- [x] React, React-DOM, F01 are externalized (not bundled in F02)
- [x] Bundle analysis visualization available
- [x] Tree-shaking verified (no unused exports in bundle)
- [x] Code splitting implemented if bundle exceeds 15KB (SKIPPED - bundle optimal at 6.28KB)
- [x] Bundle size check in CI (fails if >15KB gzipped)
- [ ] Lighthouse CI configured for auth flows (T130-T131 pending)
- [ ] Lighthouse metrics pass: TTI <2s, FCP <1.5s, Accessibility 100 (T130-T131 pending)
- [ ] Performance budget configured in Vite (T132 pending - documented approach)
- [x] Bundle size and performance metrics documented in README

**Independent Test**: Run `pnpm build` → analyze bundle with vite-plugin-visualizer → verify bundle ≤15KB gzipped. Run Lighthouse CI → all thresholds pass.

---

## Context & Constraints

**Prerequisites**:
- WP04-WP08 completed (all features implemented to measure real bundle size)

**Related Documents**:
- `kitty-specs/023-core-auth-identity/spec.md` - Performance requirements
- `kitty-specs/023-core-auth-identity/plan.md` - Bundle size targets
- `.kittify/memory/constitution.md` - Principle VI (Performance & Reliability), X (CI/CD)

**Architectural Decisions**:
- **Target**: 10-15KB gzipped (excluding React + F01)
- **Externals**: React, React-DOM, F01 must be external dependencies (not bundled)
- **Code Splitting**: Use dynamic imports for pages if bundle >15KB
- **Lighthouse**: Run on Chromatic or GitHub Actions, fail build if thresholds not met

**Constraints**:
- Must not bundle peer dependencies (React, React-DOM, F01)
- Tree-shaking must be enabled (Vite default, but verify)
- No large dependencies (e.g., moment.js, lodash full)—use only what's needed
- Performance budget enforced in CI

---

## Subtasks & Detailed Guidance

### Subtask T125 – Measure Current Bundle Size with vite-plugin-bundle-analyzer

**Purpose**: Establish baseline bundle size.

**Steps**:
1. Install bundle analyzer:
   ```bash
   pnpm add -D rollup-plugin-visualizer
   ```
2. Update `vite.config.ts`:
   ```typescript
   import { visualizer } from 'rollup-plugin-visualizer';

   export default defineConfig({
     plugins: [
       react(),
       visualizer({
         filename: './dist/stats.html',
         gzipSize: true,
         brotliSize: true,
       }),
     ],
     // ... other config
   });
   ```
3. Build and analyze:
   ```bash
   pnpm build
   open dist/stats.html  # macOS
   start dist/stats.html  # Windows
   ```
4. Document baseline size in KB (uncompressed, gzipped, brotli)

**Validation**:
- Bundle visualization generated
- Baseline size measured and documented

**Files Modified**:
- `vite.config.ts` (add visualizer plugin)
- `package.json` (add dependency)

---

### Subtask T126 – Ensure React + F01 Are External

**Purpose**: Prevent bundling peer dependencies.

**Steps**:
1. Update `vite.config.ts`:
   ```typescript
   export default defineConfig({
     build: {
       lib: {
         entry: './src/index.ts',
         formats: ['es', 'cjs'],
       },
       rollupOptions: {
         external: [
           'react',
           'react-dom',
           'react/jsx-runtime',
           '@django-core/design-system',
         ],
         output: {
           globals: {
             react: 'React',
             'react-dom': 'ReactDOM',
             '@django-core/design-system': 'DesignSystem',
           },
         },
       },
     },
   });
   ```
2. Verify in bundle stats: React, React-DOM, F01 should not appear in bundle

**Validation**:
- Build output excludes React, React-DOM, F01
- Bundle size significantly reduced

**Files Modified**:
- `vite.config.ts` (update rollupOptions.external)

---

### Subtask T127 – Use Code Splitting If Bundle Exceeds 15KB

**Purpose**: Split large chunks to reduce initial load.

**Steps**:
1. Measure bundle size from T125
2. If >15KB gzipped:
   - Split pages from forms using dynamic imports
   - Example:
     ```typescript
     // src/index.ts
     export { AuthProvider } from './components/AuthProvider';
     export { useAuth } from './hooks/useAuth';

     // Lazy-loaded pages
     export const SignInPage = React.lazy(() => import('./components/pages/SignInPage'));
     export const ProfilePage = React.lazy(() => import('./components/pages/ProfilePage'));
     ```
   - Document in README that pages require `<Suspense>` wrapper
3. If <15KB gzipped: Skip code splitting (not needed)

**Validation**:
- If code split: Separate chunks generated for pages
- Bundle size ≤15KB gzipped

**Files Modified**:
- `src/index.ts` (lazy exports if needed)

---

### Subtask T128 – Minimize Bundle

**Purpose**: Apply tree-shaking, avoid unused exports, audit dependencies.

**Steps**:
1. **Tree-shaking**: Verify Vite config has `build.lib.formats: ['es']` (ESM enables tree-shaking)
2. **Unused exports**: Review `src/index.ts`, remove any unused exports
3. **Dependency audit**:
   ```bash
   pnpm list --depth=0
   ```
   - Check for large dependencies
   - Avoid: moment.js (use date-fns or native Date), lodash full (use lodash-es), axios (use fetch)
4. **Side effects**: Ensure `package.json` has `"sideEffects": false` for tree-shaking
5. **Minification**: Verify Vite minifies in production (`build.minify: 'esbuild'` default)

**Validation**:
- Bundle size reduced
- No large dependencies in bundle
- Tree-shaking working (unused imports not in bundle)

**Files Modified**:
- `package.json` (add `"sideEffects": false`)
- `src/index.ts` (remove unused exports)

---

### Subtask T129 – Add Bundle Size Check to CI

**Purpose**: Prevent bundle size regressions.

**Steps**:
1. Create GitHub Actions workflow or update existing CI:
   ```yaml
   # .github/workflows/ci.yml
   - name: Build packages/auth
     run: |
       cd packages/auth
       pnpm build

   - name: Check bundle size
     run: |
       cd packages/auth
       BUNDLE_SIZE=$(gzip -c dist/index.js | wc -c)
       MAX_SIZE=15360  # 15KB in bytes
       if [ $BUNDLE_SIZE -gt $MAX_SIZE ]; then
         echo "Bundle size ($BUNDLE_SIZE bytes) exceeds limit ($MAX_SIZE bytes)"
         exit 1
       fi
       echo "Bundle size: $BUNDLE_SIZE bytes (gzipped)"
   ```
2. Alternative: Use `size-limit` package:
   ```bash
   pnpm add -D @size-limit/preset-small-lib
   ```
   ```json
   // package.json
   {
     "size-limit": [
       {
         "path": "dist/index.js",
         "limit": "15 KB"
       }
     ]
   }
   ```
3. Run in CI: `pnpm size-limit`

**Validation**:
- CI fails if bundle >15KB gzipped
- Bundle size displayed in CI logs

**Files Modified**:
- `.github/workflows/ci.yml` (add bundle size check)
- `package.json` (add size-limit config if used)

---

### Subtask T130 – Configure Lighthouse CI for Auth Flows

**Purpose**: Validate performance metrics automatically.

**Steps**:
1. Install Lighthouse CI:
   ```bash
   pnpm add -D @lhci/cli
   ```
2. Create `lighthouserc.json`:
   ```json
   {
     "ci": {
       "collect": {
         "url": [
           "http://localhost:3000/auth/login",
           "http://localhost:3000/profile"
         ],
         "numberOfRuns": 3
       },
       "assert": {
         "preset": "lighthouse:recommended",
         "assertions": {
           "categories:performance": ["error", { "minScore": 0.9 }],
           "categories:accessibility": ["error", { "minScore": 1.0 }],
           "first-contentful-paint": ["error", { "maxNumericValue": 1500 }],
           "interactive": ["error", { "maxNumericValue": 2000 }]
         }
       },
       "upload": {
         "target": "temporary-public-storage"
       }
     }
   }
   ```
3. Add script to package.json:
   ```json
   {
     "scripts": {
       "lighthouse": "lhci autorun"
     }
   }
   ```
4. Run in CI:
   ```yaml
   - name: Lighthouse CI
     run: |
       cd examples/auth-demo
       pnpm dev &
       sleep 5
       pnpm lighthouse
   ```

**Validation**:
- Lighthouse CI runs successfully
- Reports generated and uploaded

**Files Modified**:
- `lighthouserc.json` (new)
- `package.json` (add script)
- `.github/workflows/ci.yml` (add Lighthouse job)

---

### Subtask T131 – Optimize Lighthouse Metrics

**Purpose**: Ensure TTI <2s, FCP <1.5s, Accessibility 100.

**Steps**:
1. Run Lighthouse locally:
   ```bash
   cd examples/auth-demo
   pnpm dev
   # Open http://localhost:3000/auth/login in Chrome
   # DevTools → Lighthouse → Run audit
   ```
2. Review metrics:
   - **FCP (First Contentful Paint)**: Target <1.5s
     - Optimize: Reduce bundle size, inline critical CSS
   - **TTI (Time to Interactive)**: Target <2s
     - Optimize: Code splitting, defer non-critical JS
   - **Accessibility**: Target 100
     - Fix: Any violations from WP09
3. Iterate: Make optimizations, re-run Lighthouse, verify improvements

**Validation**:
- FCP <1.5s
- TTI <2s
- Accessibility score 100

---

### Subtask T132 – Add Performance Budget to Vite Config

**Purpose**: Warn/fail build if assets exceed budget.

**Steps**:
1. Update `vite.config.ts`:
   ```typescript
   export default defineConfig({
     build: {
       // ... other config
       rollupOptions: {
         output: {
           manualChunks: (id) => {
             if (id.includes('node_modules')) {
               return 'vendor'; // Separate vendor chunk
             }
           },
         },
       },
       chunkSizeWarningLimit: 500, // Warn if chunk >500KB
     },
   });
   ```
2. Document budget in README

**Validation**:
- Build warns/fails if assets exceed budget
- Vendor chunk separated from app code

**Files Modified**:
- `vite.config.ts` (add performance budget)

---

### Subtask T133 – Document Bundle Size and Performance Metrics in README

**Purpose**: Communicate performance characteristics to users.

**Steps**:
1. Add Performance section to README:
   ```markdown
   ## Performance

   ### Bundle Size
   - **Gzipped**: ~12KB (excluding React and F01)
   - **Uncompressed**: ~35KB

   ### Lighthouse Metrics (example/auth-demo)
   - **Performance**: 95/100
   - **Accessibility**: 100/100
   - **FCP**: 1.2s
   - **TTI**: 1.8s

   ### Optimization Tips
   - Use code splitting for large apps (lazy load pages)
   - Enable gzip/brotli compression on server
   - Use CDN for static assets
   ```
2. Update after each optimization (keep metrics current)

**Validation**:
- Performance section in README
- Metrics are realistic (from actual measurements)

**Files Modified**:
- `packages/auth/README.md` (add Performance section)

---

## Parallel Execution Strategy

**Sequential**:
- T125 (measure baseline) → T126-T128 (optimize) → T129 (CI check)
- T130 (Lighthouse setup) → T131 (optimize metrics)
- T132 (performance budget) → T133 (document)

---

## Testing & Validation Checklist

**Bundle Size**:
- [ ] Bundle ≤15KB gzipped (excluding React + F01)
- [ ] Bundle visualization generated
- [ ] React, React-DOM, F01 externalized
- [ ] Tree-shaking verified
- [ ] CI fails if bundle >15KB

**Lighthouse**:
- [ ] Lighthouse CI configured
- [ ] FCP <1.5s
- [ ] TTI <2s
- [ ] Accessibility 100
- [ ] Performance ≥90

**Documentation**:
- [ ] Bundle size documented in README
- [ ] Lighthouse metrics documented

---

## Definition of Done

- [ ] All subtasks (T125-T133) completed
- [ ] Bundle size ≤15KB gzipped
- [ ] Lighthouse metrics pass thresholds
- [ ] CI enforces bundle size and performance budgets
- [ ] Performance metrics documented
- [ ] Code reviewed
- [ ] Merged to feature branch

---

## Risk Mitigation

**Risk**: Bundle exceeds 15KB
**Mitigation**: Code split pages, audit dependencies, remove unused code

**Risk**: Lighthouse CI flakiness
**Mitigation**: Run multiple times (numberOfRuns: 3), use median scores

**Risk**: Performance regression
**Mitigation**: Track bundle size and Lighthouse metrics over time in CI, alert on increases

**Risk**: External dependencies not excluded
**Mitigation**: Verify `rollupOptions.external` in Vite config, check bundle stats

---

## Notes for Implementer

- **Bundle size**: Measure gzipped size (most relevant metric)
- **Code splitting**: Only if needed (bundle >15KB)—don't over-optimize
- **Lighthouse**: Run on realistic example app, not isolated components
- **CI**: Automate checks to prevent regressions

**Common Pitfalls**:
- Not excluding peer dependencies (React, F01) → Bundle bloat
- Not using gzipped size for comparison → Misleading metrics
- Over-engineering code splitting → Complexity without benefit
- Skipping Lighthouse CI → Performance regressions go unnoticed

---

## Constitutional Compliance

**Principle VI (Performance & Reliability)**:
- Bundle size targets
- Lighthouse metrics
- Performance budgets

**Principle X (CI/CD)**:
- Performance gates in CI
- Bundle size checks
- Lighthouse CI integration

---

## Handoff to Next Work Package

**Output Artifacts**:
- Bundle size report (dist/stats.html)
- Lighthouse CI configuration (lighthouserc.json)
- Performance section in README
- CI workflows with bundle size and Lighthouse checks

**Next WP (WP12)** can proceed in parallel—integration testing independent of performance optimization.

---

**Prompt Version**: 1.0
**Last Updated**: 2025-12-08
**Maintainer**: F02 Implementation Team

## Activity Log

- 2025-12-09T14:17:19Z – system – shell_pid= – lane=doing – Moved to doing
- 2025-12-09T16:30:00Z – claude-implementer – shell_pid=35160 – lane=doing – Completed T125-T129, documented performance

## Implementation Notes

### Bundle Size Results ✅

**Baseline Measurements** (cf9e1aca):
- ESM: 6.28 KB gzipped (26.93 KB raw)
- CJS: 5.26 KB gzipped (18.45 KB raw)
- **Budget Usage**: 42% of 15KB target (8.72KB headroom)
- **Build Time**: ~1.2s

### Completed Subtasks

**T125: Bundle Size Measurement** ✅
- Installed rollup-plugin-visualizer ^6.0.5
- Configured treemap visualization with gzip/brotli sizes
- Generated dist/stats.html for bundle analysis
- Added `pnpm analyze` script for local analysis

**T126: External Dependencies** ✅
- Verified React, React-DOM, @django-core/design-system externalized
- No peer dependencies bundled
- vite.config.ts properly configured

**T127: Code Splitting** ✅ (Skipped - Not Needed)
- Bundle already optimal at 6.28KB (42% of target)
- No code splitting required
- Keeps package simple and predictable

**T128: Bundle Minimization** ✅
- Added `sideEffects: false` to package.json
- Tree-shaking enabled
- esbuild minification verified
- es2020 target configured

**T129: CI Bundle Size Check** ✅
- Created `.github/workflows/auth-ui.yml`
- Added bundle-size job with size-limit
- Configured 15KB gzip limit
- Uploads stats.html as artifact for PR reviews

### Documentation

**README.md** ✅:
- Added Performance section with bundle size metrics
- Updated feature list (6.28KB instead of ~10-15KB)
- Added `pnpm analyze` command documentation

**packages/auth/docs/PERFORMANCE.md** ✅:
- Comprehensive performance testing guide
- Bundle size monitoring instructions
- CI/CD pipeline documentation
- Future optimization strategies
- Reference links to tools and configs

**vite.config.ts** ✅:
- Added detailed comments explaining optimizations
- Documented current bundle size (6.28KB)
- Explained external dependencies strategy

### Pending Items

**T130-T131: Lighthouse CI** ⏭️:
- Requires example app or test harness for Lighthouse
- Target metrics documented in PERFORMANCE.md
- Implementation deferred (optional for package release)
- Can be added when integration testing complete (WP12)

**T132: Performance Budget** ⏭️:
- Approach documented in PERFORMANCE.md
- CI enforcement via size-limit already in place
- Lighthouse CI would add runtime performance budget
- Optional enhancement

**T133: Documentation** ✅:
- Bundle size metrics in README ✅
- Performance guide created ✅
- CI workflow documented ✅
- Future improvements outlined ✅

### Commits

- `42aa9c5d` - Start WP11 implementation, move to doing lane
- `cf9e1aca` - Bundle optimization complete (T125-T128)
- `[pending]` - CI workflow and documentation (T129, T133)
