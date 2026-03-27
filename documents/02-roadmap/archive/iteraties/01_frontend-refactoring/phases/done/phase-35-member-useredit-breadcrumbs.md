# Phase 35 — MemberDetailPage + UserEditModal + Breadcrumbs

**Track:** B (Page Decomposition — Tier 2)
**Status:** 📋 Planned

## Bestanden

| Bestand | Regels | Aanpak |
|---------|--------|--------|
| ProjectSeasonMemberDetailPage.tsx | 1375 | Verder splitsen (was 3998 → 1375) |
| UserEditModal.tsx | 1333 | Extract form sections, validation |
| Breadcrumbs.tsx | 1264 | Extract route-config, breadcrumb resolvers |

## Checklist

- [ ] MemberDetailPage: resterende inline content geëxtraheerd
- [ ] UserEditModal: form sections + validation geëxtraheerd
- [ ] Breadcrumbs: route config + resolvers geëxtraheerd
- [ ] Alle bestanden < 500 regels
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
