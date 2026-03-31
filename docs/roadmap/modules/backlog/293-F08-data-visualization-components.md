# 293 — F08 — Data Visualization Components

| | |
|---|---|
| Status | 📋 BACKLOG |
| Categorie | Frontend (UI Components) |
| Impact | 🟡 important |
| Effort | ~25 uur |

## Wat

Herbruikbare visualisatie-componenten voor dashboards: chart components (Line, Bar, Pie, Area), metric cards met trend indicators, sorteerbare data tables, en responsive dashboard layouts. Gebouwd op het bestaande design system met CSS design tokens.

## Waarom belangrijk

Zonder visualisaties kan TeamReel geen inzicht geven in content performance, team activiteit of credit-verbruik. Data visualization is de basis voor elk dashboard — van club-analytics tot admin-overzicht. Eenmalig goed bouwen voorkomt dat elke feature z'n eigen chart-implementatie maakt.

## Past in TeamReel / CoreApp

- **TeamReel**: Clubs willen zien hoeveel content ze produceren, welke teams actief zijn, en hoe hun credits verbruikt worden. Coaches willen speler-statistieken. Dit vereist charts en metric cards.
- **CoreApp**: Data visualization is universeel — elke SaaS met analytics, reporting of monitoring dashboards heeft herbruikbare chart components nodig. Als shared package (`@django-core/charts`) bruikbaar voor elk project.

---

## Spec-Kitty Commando's

### Specify

```
/spec-kitty.specify feature=F08-data-visualization-components

We bouwen herbruikbare chart en dashboard componenten voor de React 18 + TypeScript frontend.

[feature summary]
Recharts-gebaseerde chart components, metric cards en data tables voor dashboards, gebouwd op het bestaande design system.

[goals]
- Chart components: Line, Bar, Pie, Area met responsive sizing
- Metric cards met waarde, label, trend (up/down/flat) en kleurcodering
- Data table met sorting, filtering, pagination (TanStack Table)
- Responsive dashboard grid layout (1 col mobile, 2-3 cols desktop)
- Alle kleuren via CSS design tokens (geen hardcoded values)

[non-goals]
- 3D visualisaties of complexe geo-maps
- Real-time streaming charts (WebSocket)
- Chart builder/editor (templates zijn fixed)

[tech context]
- Frontend: React 18, TypeScript, Vite, CSS Modules
- Design tokens: demo/src/styles/tokens/
- Chart library: recharts (lightweight, React-native)
- Table library: @tanstack/react-table
- Locatie: demo/src/components/charts/ of demo/src/components/dashboard/
```

### Plan

```
/spec-kitty.plan feature=F08-data-visualization-components

[tech choices]
- Charts: recharts (React + D3-based, tree-shakeable, ~45KB gzip)
- Tables: @tanstack/react-table v8 (headless, type-safe)
- Layout: CSS Grid met design tokens voor breakpoints
- Types: interfaces voor ChartData, MetricCardProps, TableColumn
- Styling: CSS Modules met design tokens (geen inline styles)

[components to build]
- LineChart, BarChart, PieChart, AreaChart — wrapper rond recharts
- MetricCard — KPI display met trend arrow
- DataTable — sorteerbare tabel met pagination
- DashboardGrid — responsive grid layout container
- ChartTooltip — styled tooltip component

[files to create]
- demo/src/components/charts/LineChart.tsx + .module.css
- demo/src/components/charts/BarChart.tsx + .module.css
- demo/src/components/charts/PieChart.tsx + .module.css
- demo/src/components/dashboard/MetricCard.tsx + .module.css
- demo/src/components/dashboard/DataTable.tsx + .module.css
- demo/src/components/dashboard/DashboardGrid.tsx + .module.css
- demo/src/types/charts.ts — TypeScript interfaces
```

### Research

```
/spec-kitty.research feature=F08-data-visualization-components

Onderzoek de volgende punten:

1. Welke design tokens bestaan er al in demo/src/styles/tokens/? Zijn er kleur-tokens voor charts?
2. Worden er al chart libraries gebruikt in het project? Check demo/package.json.
3. Hoe ziet het bestaande component-pattern eruit (demo/src/components/)? Folder structuur, naming, CSS Modules?
4. Zijn er al dashboard-achtige pagina's die charts nodig hebben?
5. Wat is de huidige bundle size? Past recharts (~45KB) binnen het budget?
```
