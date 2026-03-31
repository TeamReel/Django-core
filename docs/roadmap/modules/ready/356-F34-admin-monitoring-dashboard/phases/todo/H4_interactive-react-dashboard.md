# H4 — Interactive React Dashboard (Route B)

> **Effort:** ~20-25 uur | **Impact:** Power BI-achtige ervaring voor de product owner — auto-refresh, interactieve charts, date range filtering, drill-down

## Context

H0-H2 leveren een statisch Django Admin dashboard (server-rendered, handmatig herladen). De product owner wil een **interactief** dashboard met:
- Auto-refresh (live data zonder F5)
- Visuele charts (lijn, bar, donut) i.p.v. alleen getallen
- Date range selector ("deze week" vs "vorige maand")  
- Drill-down (klik op "5 stale jobs" → zie welke)
- Filter/segmentatie (per organisatie, per periode)

Dit wordt een **nieuwe pagina in de React app** (`/platform-stats`), beschermd met `<AdminOnlyRoute>`.

## Tech keuzes

| Beslissing | Keuze | Reden |
|------------|-------|-------|
| Charts library | **Recharts** | Al in `package.json`, gebruikt door `CreditsChart` + `ObservabilityCharts` |
| Routing | `<AdminOnlyRoute>` in bestaande admin routes | Consistent met `/observability`, `/health`, `/security` |
| API | Nieuwe DRF endpoints `/api/v1/dashboard/` | JSON responses voor frontend charts |
| Auto-refresh | **React Query polling** (`refetchInterval`) | Geen WebSocket nodig, 30s interval |
| Date range | Preset buttons ("7d / 30d / 90d / seizoen") | Eenvoudiger dan datepicker, dekt 95% use cases |
| State management | React Query + URL params | Geen extra state lib nodig |

## Backend: API Endpoints

Drie nieuwe DRF endpoints, alleen voor `is_superuser`:

### 1. `GET /api/v1/dashboard/overview/`
Platform overview + growth trends met date range filter.

**Query params:** `?range=7d|30d|90d|season`

**Response:**
```json
{
  "platform": {
    "organisations": 12,
    "projects": 34,
    "members": 156,
    "users": 45,
    "file_assets": 890
  },
  "growth": [
    {
      "week": "2026-03-23",
      "organisations": 12, "delta_organisations": 2,
      "members": 156, "delta_members": 8,
      "content_items": 340, "delta_content_items": 45,
      "generation_requests": 89, "delta_generation_requests": 12
    }
  ]
}
```

### 2. `GET /api/v1/dashboard/pipelines/`
AI, content, en video pipeline status.

**Query params:** `?range=7d|30d|90d|season`

**Response:**
```json
{
  "ai": {
    "requests_by_status": {"completed": 45, "pending": 3, "failed": 1},
    "requests_by_provider": {"gemini": 30, "openai": 15},
    "total_outputs": 120,
    "avg_processing_seconds": 4.2
  },
  "content": {
    "items_by_status": {"draft": 10, "approved": 30, "rejected": 2},
    "templates_active": 8,
    "approval_rate": 93.7,
    "pending_approvals": 5
  },
  "video": {
    "jobs_by_status": {"completed": 20, "processing": 2, "failed": 1},
    "jobs_by_type": {"highlight": 12, "recap": 8},
    "stale_jobs": [
      {"id": 45, "type": "highlight", "started_at": "2026-03-31T10:00:00Z", "minutes_elapsed": 47}
    ]
  }
}
```

### 3. `GET /api/v1/dashboard/credits/`
Credits verbruik met drill-down per organisatie.

**Query params:** `?range=7d|30d|90d|season`

**Response:**
```json
{
  "total_allocated": 5000,
  "total_used": 3200,
  "usage_by_day": [
    {"date": "2026-03-25", "used": 45},
    {"date": "2026-03-26", "used": 62}
  ],
  "top_orgs": [
    {"id": 1, "name": "FC Demo", "balance": 450, "used": 120}
  ]
}
```

## Frontend: Page Structure

```
demo/src/pages/admin/
├── PlatformStatsPage.tsx          ← Main page with tabs/sections
├── PlatformStatsPage.module.css
├── PlatformStatsPage.test.tsx
├── components/
│   ├── StatsOverviewSection.tsx    ← KPI cards + sparklines  
│   ├── GrowthTrendsChart.tsx       ← Recharts AreaChart (week-over-week)
│   ├── PipelineStatusSection.tsx   ← AI/Content/Video donut + bar charts
│   ├── CreditsUsageChart.tsx       ← Recharts AreaChart (daily usage)
│   ├── StaleJobsAlert.tsx          ← Clickable alert cards
│   └── DateRangeSelector.tsx       ← Preset buttons (7d/30d/90d/season)
└── hooks/
    ├── useDashboardOverview.ts     ← React Query + auto-refresh
    ├── useDashboardPipelines.ts
    └── useDashboardCredits.ts
```

## Interactiviteit (Best Practices)

| Feature | Implementatie |
|---------|--------------|
| **Auto-refresh** | React Query `refetchInterval: 30_000` (30s) |
| **Loading states** | Skeleton loaders per section (niet hele pagina) |
| **Date range** | URL params (`?range=30d`), preset buttons |
| **Drill-down** | Klik op status badge → filtered admin changelist link |
| **Responsive** | CSS Grid, 3-col → 2-col → 1-col |
| **Tooltips** | Recharts `<Tooltip>` op hover |
| **Trend indicators** | Groen/rood pijltjes naast KPI's (berekend van delta's) |
| **Stale alerts** | Rode badge met count, klikbaar naar detail |
| **Empty states** | Friendly message + illustratie als geen data |
| **Error states** | Per-section error boundary, retry button |

## Subfases

### H4a — Backend API (~5 uur)
- [ ] `src/dashboard/api_views.py`: 3 ViewSets (overview, pipelines, credits)
- [ ] `src/dashboard/serializers.py`: Response serializers
- [ ] `src/dashboard/api_urls.py`: URL routing onder `/api/v1/dashboard/`
- [ ] Hergebruik `DashboardStatsService` methods, voeg date range filter toe
- [ ] `permission_classes = [IsAdminUser]` op alle views
- [ ] Tests: 10+ (auth, date ranges, response shapes)

### H4b — Frontend Page + Layout (~6 uur)
- [ ] `PlatformStatsPage.tsx`: main layout met sections
- [ ] `DateRangeSelector.tsx`: preset buttons (7d/30d/90d/season)
- [ ] `StatsOverviewSection.tsx`: KPI cards met delta indicators
- [ ] Route toevoegen in `appRouteGroups.tsx` als `<AdminOnlyRoute>`
- [ ] Nav link toevoegen in sidebar/menu
- [ ] CSS Module met design tokens, responsive grid

### H4c — Charts + Interactiviteit (~6 uur)
- [ ] `GrowthTrendsChart.tsx`: Recharts AreaChart (orgs, members, content over tijd)
- [ ] `PipelineStatusSection.tsx`: Donut charts (AI status) + bar charts (video types)
- [ ] `CreditsUsageChart.tsx`: AreaChart (dagelijks verbruik)
- [ ] React Query hooks met `refetchInterval: 30_000`
- [ ] Skeleton loaders per section
- [ ] Responsive breakpoints

### H4d — Drill-down + Polish (~5 uur)
- [ ] `StaleJobsAlert.tsx`: klikbare alert → detail view
- [ ] Drill-down links: klik op status → filtered list
- [ ] Empty states per section
- [ ] Error boundaries per section met retry
- [ ] Keyboard navigation + focus management
- [ ] Frontend tests (component tests)

## Done criteria

- [ ] `/platform-stats` pagina laadt met alle 4 secties (Overview, Growth, Pipelines, Credits)
- [ ] Auto-refresh elke 30 seconden (visueel zichtbaar met "Last updated" timestamp)
- [ ] Date range selector werkt (7d/30d/90d/seizoen) — data verandert zichtbaar
- [ ] Minstens 3 chart types: AreaChart (growth), DonutChart (status breakdown), BarChart (providers)
- [ ] Stale jobs alert zichtbaar wanneer er stale video jobs zijn
- [ ] Responsive: werkt op desktop (3-col), tablet (2-col), mobiel (1-col)
- [ ] Alleen zichtbaar voor admin users (`AdminOnlyRoute`)
- [ ] Skeleton loaders tonen tijdens laden (niet witte pagina)
- [ ] Backend tests: 10+ (auth, date ranges, response shape)
- [ ] TypeScript strict: geen `any` types
- [ ] `npx tsc --noEmit` + `npx vite build` slagen
