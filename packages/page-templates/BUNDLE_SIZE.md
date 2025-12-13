# Bundle Size Report

**Generated:** 2025-12-13
**Package:** @django-core/page-templates v0.1.0
**Status:** ✅ Within Budget

## Summary

| Format | Raw Size | Gzipped | Budget | Usage |
|--------|----------|---------|--------|-------|
| ESM (index.js) | 55.60 KB | **13.60 KB** | 15 KB | 90.7% |
| CommonJS (index.cjs) | 35.66 KB | 11.39 KB | - | - |

## Size Budget

- **Maximum allowed:** 15 KB gzipped
- **Current size:** 13.60 KB gzipped
- **Remaining:** 1.40 KB (9.3%)

## Package Contents

The bundle includes:

- ✅ Dashboard template with Header, Grid, FilterBar components
- ✅ ListDetail template with List, Detail panels and responsive layout
- ✅ Wizard template with Step, Navigation components
- ✅ Settings template with Section, Navigation components
- ✅ Default state renderers (Loading, Error, Empty, PermissionDenied)
- ✅ TypeScript type definitions (.d.ts files)

**Not included** (peer dependencies):
- React 18.x
- ReactDOM 18.x
- @django-core/design-system

## Validation

Bundle size is automatically validated in CI pipeline:

```yaml
# .github/workflows/page-templates.yml
- name: Validate bundle size
  run: |
    cd packages/page-templates
    GZIP_SIZE=$(gzip -c dist/index.js | wc -c)
    MAX_SIZE=$((15 * 1024))  # 15KB
    if [ $GZIP_SIZE -gt $MAX_SIZE ]; then
      echo "❌ Bundle exceeds limit!"
      exit 1
    fi
```

## Optimization Strategies

If bundle size exceeds limit:

1. **Tree-shaking**: Ensure all exports are ES modules
2. **Code splitting**: Move large components to separate chunks
3. **Peer dependencies**: Move shared utilities to peer deps
4. **Dead code elimination**: Remove unused code paths
5. **Minification**: Verify Vite production build settings

## Monitoring

Run bundle analysis locally:

```bash
pnpm analyze  # Generates visual report + size validation
```

Compare sizes across branches:

```bash
git checkout main
pnpm build && node scripts/bundle-report.js > /tmp/main-size.txt

git checkout feature-branch
pnpm build && node scripts/bundle-report.js > /tmp/feature-size.txt

diff /tmp/main-size.txt /tmp/feature-size.txt
```

## Historical Data

| Date | Version | ESM Gzipped | Change | Notes |
|------|---------|-------------|--------|-------|
| 2025-12-13 | 0.1.0 | 13.60 KB | - | Initial release |

## References

- [Bundle Size CI Check](.github/workflows/page-templates.yml#L135)
- [Bundle Report Script](./scripts/bundle-report.js)
- [Vite Build Config](./vite.config.ts)
