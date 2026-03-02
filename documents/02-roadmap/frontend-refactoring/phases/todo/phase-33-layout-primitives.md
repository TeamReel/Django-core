# Phase 33 — Layout Primitives

**Track:** C2 (UI Primitives)
**Status:** 📋 Planned

## Doel

Layout primitives in `demo/src/components/ui/` voor consistente pagina-structuur.

## Components

| Component | Doel |
|-----------|------|
| `Stack` | Vertical spacing (vervangt `flex-col gap-*` herhaling) |
| `Row` | Horizontal layout met alignment |
| `PageHeader` | Consistente page headers met breadcrumb + actions |
| `Section` | Consistente section containers (al geëxtraheerd in AssetsTab) |
| `SplitView` | Desktop: sidebar + main, Mobile: full-width |
| `ResponsiveGrid` | Auto-responsive grid met breakpoints |

## Checklist

- [ ] Stack component gebouwd
- [ ] Row component gebouwd
- [ ] PageHeader component gebouwd
- [ ] Section component (uit AssetsTab) naar `components/ui/` gepromoveerd
- [ ] SplitView component gebouwd
- [ ] ResponsiveGrid component gebouwd
- [ ] 3+ bestaande pages gemigreerd naar layout primitives
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
