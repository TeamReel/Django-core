# D6 — Waterfall Eliminatie & Image Optimalisatie

> **Status:** ✅ Afgerond (commit `63b57c4d`)
> **Geschatte effort:** 2-3 uur
> **Geschatte omvang:** ~100 regels wijzigingen
> **Bron:** [optimalisatie-analyse.md — §2 & §3](../../../05-demo/plans/optimalisatie-analyse.md)

## Doel

Sequentiële API calls (waterfalls) vervangen door parallelle fetches, en image lazy loading toevoegen. Laatste performance-optimalisatie na de React Query migratie.

## Probleem — Waterfall patronen

| Bestand | Patroon | Extra RTTs |
|---------|---------|:----------:|
| `AssetsOverviewCard.tsx` | assets → members → requests (sequentieel) | +2 |
| `MemberContentProgressCard.tsx` | members → requests (sequentieel) | +1 |
| `useMatchContentMedia.ts` | flags → templates (dependency chain) | +1 |
| `useBreadcrumbsData.ts` | 9 separate `useEffect`s per hiërarchie-niveau | cascading |

## Taken

### 1. Dashboard card waterfall → `Promise.all`

**Na D5 (React Query):** Cards die meerdere queries hebben kunnen `useQueries` of parallelle `useQuery` calls gebruiken — React Query viert ze automatisch parallel. Maar sommige cards hebben **sequentiële dependencies** (`await members; then fetch requests for member IDs`).

**Oplossing:** Refactor card data fetching zodat member-dependent queries niet wachten op member fetch:

```typescript
// In plaats van: fetch members → extract IDs → fetch requests(memberIds)
// Gebruik: fetch requests (all for project) + fetch members → client-side join

const members = useProjectMembers(projectSlug);
const requests = useGenerativeRequests({ project: projectSlug });

// Client-side join na beide resolved
const progress = useMemo(() => {
  if (!members.data || !requests.data) return [];
  return calculateProgress(members.data, requests.data);
}, [members.data, requests.data]);
```

### 2. Match content media parallel fetch

`useMatchContentMedia` haalt nu sequentieel op:
1. Template flags (depends on orgId + clubId) ← parallel mogelijk
2. Templates (depends on flags) ← echte dependency

**Oplossing:** Flags en templates tegelijk fetchen, client-side filteren:

```typescript
const [flags, templates] = useQueries({
  queries: [
    { queryKey: queryKeys.templates.flags(orgId), queryFn: fetchFlags },
    { queryKey: queryKeys.templates.active(), queryFn: fetchTemplates },
  ],
});

// Client-side filter templates by flags
const filtered = useMemo(() =>
  filterTemplatesByFlags(templates.data, flags.data),
  [templates.data, flags.data]
);
```

### 3. Breadcrumb batch/memoize

`useBreadcrumbsData.ts` heeft 9 `useEffect`s die elk een hiërarchie-niveau fetchen. Na D4/D5 zijn deze al React Query hooks, maar ze triggeren cascading refetches.

**Oplossing:** Memoize breadcrumb data agressiever — hiërarchie wijzigt zelden:

```typescript
const breadcrumbData = useQuery({
  queryKey: ['breadcrumbs', orgSlug, clubSlug, teamSlug, seasonSlug],
  queryFn: () => fetchBreadcrumbHierarchy(orgSlug, clubSlug, teamSlug, seasonSlug),
  staleTime: 30 * 60 * 1000, // 30 min — hierarchy is very stable
});
```

**Alternatief (backend):** Single API endpoint `/api/hierarchy/?path=org/club/team/season` die de hele keten returnt. Backend change — alleen als breadcrumbs merkbaar traag zijn.

### 4. Image lazy loading

| Metric | Huidig | Na D6 |
|--------|-------:|------:|
| `<img>` tags totaal | 16 | 16 |
| Met `loading="lazy"` | 0 | 14 |
| Above-the-fold (geen lazy) | — | 2 (logo, user avatar) |

**Implementatie:** Zoek alle `<img>` tags, voeg `loading="lazy"` toe behalve:
- Logo in header/sidebar (always visible)
- User avatar in navigation (always visible)

```tsx
// Before:
<img src={mediaUrl} alt={label} />

// After:
<img src={mediaUrl} alt={label} loading="lazy" />
```

**Effort:** 16 wijzigingen, elk triviaal.

## Gewijzigde bestanden (verwacht)

| Bestand | Wijziging |
|---------|-----------|
| `AssetsOverviewCard.tsx` | Parallel queries (geen sequentieel await) |
| `MemberContentProgressCard.tsx` | Parallel queries |
| `useMatchContentMedia.ts` | Parallel flags + templates fetch |
| `useBreadcrumbsData.ts` | Memoize / batch hierarchy queries |
| 14× diverse componenten | `loading="lazy"` op `<img>` tags |

## Acceptatiecriteria

- [x] Geen sequentiële API waterfalls in dashboard cards
- [x] Template flags + templates parallel gefetcht
- [x] Breadcrumb data cached met `staleTime: 30min`
- [x] 14/16 images hebben `loading="lazy"`
- [x] Above-the-fold images (logo, avatar) NIET lazy
- [x] Network waterfall chart toont parallelle calls (DevTools verificatie)
- [x] TypeScript clean, Vite build succesvol
- [x] Geen regressies in data weergave of breadcrumbs
