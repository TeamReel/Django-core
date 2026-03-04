# Phase C4 — Dashboard Upgrade

**Track:** C (Page Refinement)
**Status:** 📋 Planned

## Doel

Dashboard verbeteren als dagelijks startpunt. Snelle context, recente activiteit, quick actions.

## Huidige situatie

- ActivityFeed widget (shimmer ✅)
- UpcomingMatchesWidget (shimmer + SmartEmptyState ✅)
- TransactionWidget
- PullToRefresh ✅

## Gewenste toevoegingen

| Widget | Doel |
|--------|------|
| **Quick Actions card** | Prominente knoppen: "Content maken", "Match bekijken", "Gallery openen" |
| **Pending Approvals widget** | Aantal items in queue + "Bekijk queue" link |
| **Recent Content carousel** | Horizontaal scrollbare thumbnails van laatste 5 generaties |
| **Club context banner** | Actieve club/team tonen bovenaan, met switch optie |

## Taken

- [ ] Quick Actions card component
- [ ] Pending Approvals mini-widget
- [ ] Recent Content horizontale carousel
- [ ] Club context banner (als geen context actief: "Selecteer een team")
- [ ] Widget grid layout optimaliseren (mobile: 1 kolom, desktop: 2-3)
- [ ] Alle widgets: loading → empty → error → success states

## Checklist

- [ ] Quick Actions gebouwd
- [ ] Pending Approvals widget
- [ ] Recent Content carousel
- [ ] Club context banner
- [ ] Grid responsive
- [ ] Alle states afgehandeld
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
