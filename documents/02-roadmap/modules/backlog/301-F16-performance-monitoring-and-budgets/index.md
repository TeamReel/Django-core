# F16: Performance Monitoring & Budgets

**Phase:** 14
**Status:** 📋 ROADMAP
**Module ID:** 301
**Category:** Frontend / DevOps

## Description

## 301. F16 – Performance Monitoring & Budgets

**Doel**: Continuous performance monitoring met Lighthouse CI, bundle size budgets, en Core Web Vitals tracking voor mobile-first kwaliteitsgarantie.

**Waarom agnostisch**: Performance monitoring is universeel - elke webapplicatie met mobiele gebruikers heeft meetbare targets nodig om regressies te voorkomen.

**Wat moet er gebeuren**:
- **Core Web Vitals targets**:
  - LCP (Largest Contentful Paint): < 2.5s (mobile 4G)
  - FID (First Input Delay): < 100ms
  - CLS (Cumulative Layout Shift): < 0.1
  - INP (Interaction to Next Paint): < 200ms
  - TTI (Time to Interactive): < 3.8s (mobile 4G)
  - TTFB (Time to First Byte): < 800ms
- **Bundle size budgets**:
  - Total JS bundle: < 250KB gzipped
  - Initial chunk: < 100KB gzipped
  - Per-route chunk: < 50KB gzipped
  - CSS: < 50KB gzipped
  - Largest asset: < 150KB
- **Lighthouse CI integration**:
  - Run Lighthouse in GitHub Actions on every PR
  - Score thresholds: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 80
  - Fail PR if scores drop below thresholds
  - Historical score tracking
  - Mobile emulation (Moto G Power on 4G)
- **Bundle analysis**:
  - Vite bundle analyzer integration
  - Size comparison between PR and main branch
  - Tree-shaking validation
  - Dependency size impact warnings
- **Runtime performance monitoring**:
  - Web Vitals reporting (via `web-vitals` library)
  - Performance marks/measures for key interactions
  - Long task detection (> 50ms)
  - Memory usage monitoring (dev mode)
- **Component-level performance**:
  - React Profiler integration (dev mode)
  - Render count tracking for key components
  - Lazy-load audit: verify route splitting
  - Image optimization audit (WebP, proper sizing)
- **Mobile-specific targets**:
  - Test device: Moto G Power (mid-range Android)
  - Network: Regular 4G (9Mbps down, 1.44Mbps up, 170ms RTT)
  - CPU throttling: 4x slowdown
  - Test pages: Dashboard, Gallery, Match Detail, Content Modal
- **Performance dashboard**:
  - Historical trends (LCP, CLS, bundle size over time)
  - Per-page breakdown
  - Regression alerts
  - Integration with F10 (operations dashboard) if available
- **Code splitting recommendations**:
  - Route-based splitting via `React.lazy()`
  - Heavy component splitting: MatchDetailPage tabs, ContentGenerationModal steps
  - Third-party library lazy loading (Lottie, chart libraries)
- **Integration**: P05 (dependency validation), F10 (operations dashboard), B18 (observability)

**Scope**: 🔧 **CI/CD + Frontend Tooling + Dashboard**

**CI Outputs**:
- `lighthouse-report.html` — Full Lighthouse report per PR
- `bundle-stats.json` — Bundle size breakdown
- `performance-budget.json` — Pass/fail per metric
- GitHub PR comment with summary table

**Configuration Files**:
- `.lighthouserc.js` — Lighthouse CI config with thresholds
- `budget.json` — Performance budget definitions
- `vite.config.ts` — Bundle analyzer plugin

**Status**: 📋 ROADMAP

**Specify Prompt**:
```
/spec-kitty.specify feature=F16-performance-monitoring-and-budgets

[feature summary]
Continuous performance monitoring with Lighthouse CI, bundle size budgets, and Core Web Vitals tracking for mobile-first quality assurance.

[goals]
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1, INP < 200ms
- Bundle size budgets: total < 250KB gzip, initial < 100KB gzip
- Lighthouse CI in GitHub Actions with score thresholds (≥90 perf, ≥90 a11y)
- Bundle analysis with size comparison between PR and main branch
- Runtime Web Vitals reporting via web-vitals library
- Mobile-specific testing (Moto G Power, 4G, 4x CPU throttle)
- Performance dashboard with historical trends
- Code splitting recommendations and validation

[non-goals]
- Real User Monitoring (RUM) service (e.g., Datadog RUM)
- Synthetic monitoring from multiple geographic locations
- APM (Application Performance Monitoring) for backend
- Automated performance optimization (only monitoring + alerting)

[dependencies]
- P05 (dependency and stack validation)
- F10 (operations dashboard for UI integration)
- B18 (observability infrastructure)

[scope]
CI/CD pipeline (GitHub Actions), frontend tooling (Vite plugins),
performance dashboard page in demo app
No backend Django app required
```

## Notes

**Design Decisions:**
- Lighthouse CI is preferred over paid alternatives (free, open-source, GitHub-native)
- Mobile-first targets based on Google's "good" thresholds
- Test device is mid-range Android (Moto G Power) — represents typical amateur football club user
- Bundle budgets are aggressive but achievable with proper code splitting
- Current known issues:
  - `MatchDetailPage.tsx` (3300 lines) — needs route-level tab splitting
  - `ContentGenerationModal.tsx` (4800 lines) — needs step-based code splitting
  - Gallery grid with 50+ items — needs virtualization (`react-window`)

**Related Analysis:** See `documents/05-demo/plans/mobile-ux-gamification-analyse.md` for full mobile UX analysis.

---

## Delivery Checklist

- [ ] **Lighthouse CI**: GitHub Action configured and running on PRs
- [ ] **Bundle Budget**: `budget.json` defined with thresholds
- [ ] **Bundle Analyzer**: Vite plugin integrated
- [ ] **Web Vitals**: Runtime reporting integrated in demo app
- [ ] **PR Comments**: Automated performance summary on PRs
- [ ] **Dashboard**: Performance trends visible in demo app
- [ ] **Documentation**: README with performance targets and how to run locally
