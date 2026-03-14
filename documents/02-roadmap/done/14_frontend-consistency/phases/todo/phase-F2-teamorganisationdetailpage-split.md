# F2 — TeamOrganisationDetailPage Split

**Status:** 🔲 Todo
**Track:** F — File Splitting
**Effort:** 2 uur
**Dependencies:** Geen

---

## Doel

Split `TeamOrganisationDetailPage.tsx` (410 regels) naar <300 regels.

## Huidige Staat

```
demo/src/pages/identity/TeamOrganisationDetailPage.tsx — 410 regels
├── Component state (~50 regels)
├── Data fetching (~100 regels)
├── Tab: Overview
├── Tab: Seasons
├── Tab: Members
├── Tab: Credits
├── Tab: Settings
└── Render (~150 regels)
```

## Target

### Optie A: Extract Tabs

```
demo/src/pages/identity/TeamOrganisationDetailPage/
├── index.tsx — Main page + layout (~200 regels)
├── TeamOverviewTab.tsx
├── TeamSeasonsTab.tsx
├── TeamMembersTab.tsx
├── TeamCreditsTab.tsx
├── TeamSettingsTab.tsx
└── useTeamDetailData.ts — Shared data hook
```

### Optie B: Extract Data Hook

Behoud page, maar extract data fetching:

```
demo/src/pages/identity/
├── TeamOrganisationDetailPage.tsx — Render only (~200 regels)
└── useTeamOrganisationDetailData.ts — Data + handlers (~200 regels)
```

## Acties

1. [ ] Analyseer welke tabs meest complex zijn
2. [ ] Kies tussen Optie A of B
3. [ ] Extract data/state indien nog niet apart
4. [ ] Extract tabs indien Optie A
5. [ ] Update imports

## Verificatie

- [ ] Main file <300 regels
- [ ] Page werkt identiek
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
