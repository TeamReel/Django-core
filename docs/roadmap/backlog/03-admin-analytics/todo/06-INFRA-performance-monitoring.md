# 301 — F16 — Performance Monitoring & Budgets

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Frontend / DevOps |
| Impact | 🟡 important |
| Effort | ~20 uur |

## Wat

Continuous performance monitoring met Lighthouse CI in GitHub Actions, bundle size budgets, Core Web Vitals tracking, en een performance dashboard. Targets: LCP < 2.5s, CLS < 0.1, total JS < 250KB gzipped. Mobile-first testing op mid-range Android (Moto G Power, 4G).

## Waarom belangrijk

Clubvrijwilligers gebruiken TeamReel op hun telefoon langs het veld. Een trage app = geen adoptie. Zonder performance budgets groeit de bundle ongemerkt. Lighthouse CI in CI/CD vangt regressies op voordat ze in productie komen. Core Web Vitals beïnvloeden ook SEO.

## Past in TeamReel / CoreApp

- **TeamReel**: Doelgroep is amateurclubs — mensen met midrange telefoons op 4G langs het sportveld. Performance is geen luxe, het is een vereiste. Grote componenten als MatchDetailPage (3300 regels) en ContentGenerationModal (4800 regels) moeten gesplit worden.
- **CoreApp**: Performance monitoring is universeel voor elke webapplicatie. Lighthouse CI + bundle budgets zijn industriestandaard. Het tooling-framework is herbruikbaar.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=F16-performance-monitoring-and-budgets

We bouwen performance monitoring tooling voor de React 18 + Vite frontend.

[feature summary]
Lighthouse CI in GitHub Actions, bundle size budgets, Core Web Vitals tracking, en performance dashboard.

[goals]
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1, INP < 200ms
- Bundle budgets: total JS < 250KB gzip, initial chunk < 100KB gzip
- Lighthouse CI in GitHub Actions (score thresholds ≥90 perf, ≥90 a11y)
- Bundle analysis met Vite plugin (size comparison PR vs main)
- Runtime Web Vitals reporting via web-vitals library
- Mobile testing: Moto G Power, 4G, 4x CPU throttle

[non-goals]
- Real User Monitoring (RUM) service (Datadog, etc.)
- APM voor backend (dat is infra)
- Automatische performance optimalisatie

[tech context]
- Frontend: React 18, TypeScript, Vite (demo/)
- CI: GitHub Actions
- Build: Vite met code splitting (React.lazy)
- Bekend: MatchDetailPage (3300 LOC), ContentGenerationModal (4800 LOC) moeten gesplit
- Deploy: Vercel (frontend)
```

### Plan

```
/spec-kitty.plan feature=F16-performance-monitoring-and-budgets

[tech choices]
- Lighthouse CI: @lhci/cli in GitHub Actions
- Bundle analysis: rollup-plugin-visualizer (Vite)
- Web Vitals: web-vitals library (Google, ~1KB)
- Budget config: budget.json + .lighthouserc.js
- PR comments: lhci autorun output als PR comment

[files to create]
- .lighthouserc.js — Lighthouse CI configuratie met thresholds
- budget.json — performance budget definities
- .github/workflows/lighthouse.yml — CI workflow
- demo/src/utils/webVitals.ts — runtime Web Vitals reporting

[files to modify]
- demo/vite.config.ts — bundle analyzer plugin toevoegen
- demo/package.json — web-vitals dependency
```

### Research

```
/spec-kitty.research feature=F16-performance-monitoring-and-budgets

Onderzoek de volgende punten:

1. Wat is de huidige bundle size van de Vite build? Run `cd demo && npx vite build` en analyseer output.
2. Welke grote componenten/pagina's zijn er? Check de grootste .tsx bestanden in demo/src/.
3. Wordt er al code splitting toegepast (React.lazy, dynamic imports)?
4. Bestaan er al GitHub Actions workflows? Welke CI stappen zijn er?
5. Wat is de huidige Lighthouse score van demo.teamreel.app?
```
