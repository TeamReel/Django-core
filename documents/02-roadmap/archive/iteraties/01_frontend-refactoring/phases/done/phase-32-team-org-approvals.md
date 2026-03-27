# Phase 32 — TeamOrganisationDetailPage + ApprovalsPage

**Track:** B (Page Decomposition)
**Status:** 📋 Planned

## Bestanden

| Bestand | Regels | Aanpak |
|---------|--------|--------|
| TeamOrganisationDetailPage.tsx | 1439 | Extract tabs, modals, data hook |
| ApprovalsPage.tsx | 1413 | Extract approval card, filter logic, batch actions |

## Checklist

### TeamOrganisationDetailPage
- [ ] Tabs geëxtraheerd naar eigen components
- [ ] Modals geëxtraheerd
- [ ] Data hook geëxtraheerd
- [ ] Bestand < 500 regels

### ApprovalsPage
- [ ] Approval card component geëxtraheerd
- [ ] Filter logic geëxtraheerd
- [ ] Batch actions geëxtraheerd
- [ ] Bestand < 500 regels

### Verificatie
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
