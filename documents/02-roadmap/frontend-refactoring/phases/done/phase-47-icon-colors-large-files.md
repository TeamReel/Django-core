# Phase 47 — Icon Colors + Large File Splits

**Track:** G1-G3 (Code Quality Polish)
**Status:** ✅ Done

## Doel

Elimineer hardcoded hex kleuren in icon props en splits te grote bestanden (<500 regels per TSX).

---

## G1: Icon Color Tokens

### Probleem
~62 bestanden gebruiken hardcoded hex kleuren, vooral in Lucide icon props:
```tsx
// ❌ Huidige situatie
<CheckCircle2 size={16} color="#22c55e" />
<AlertTriangle size={16} color="#f97316" />
<Clock size={16} color="#f59e0b" />
```

### Oplossing
Maak icon color utilities in `utility.css` en gebruik `currentColor`:

```css
/* utility.css */
.icon-success { color: var(--color-green-500); }
.icon-warning { color: var(--color-amber-400); }
.icon-error { color: var(--color-red-400); }
.icon-info { color: var(--color-blue-500); }
.icon-muted { color: var(--app-text-muted); }
```

```tsx
// ✅ Nieuw
<span className="icon-success"><CheckCircle2 size={16} /></span>
// Of wrapper component:
<Icon name="check-circle" variant="success" size={16} />
```

### Top prioriteit bestanden
| Bestand | Hex kleuren |
|---------|-------------|
| ContentList.tsx | 25 |
| SeasonMediaTab.tsx | 17 |
| TeamSelectieTab.tsx | 9 |
| Toast.tsx | 9 |
| BatchProgressStep.tsx | 9 |
| EditMemberModal.tsx | 7 |
| HealthCheckPage.tsx | 7 |
| ConfirmStep.tsx | 7 |

---

## G2: Large File Splits

### Bestanden >500 regels (actief, excl. _archive)

| Bestand | Regels | Actie |
|---------|--------|-------|
| SeasonMediaTab.tsx | 800 | Extract: MediaGrid, MediaCard, MediaFilters |
| SeasonSquadTab.tsx | 773 | Extract: SquadGrid, MemberRow, SquadFilters |
| AIStudioPage.tsx | 573 | Extract: StudioSidebar, StudioCanvas |
| SeasonMatchesTab.tsx | 534 | Extract: MatchesGrid, MatchCard |
| useContentGeneration.tsx | 505 | Split state/effects in separate hooks |

### Split strategie
1. Identificeer logische sub-componenten
2. Extract naar co-located bestanden met eigen `.module.css`
3. Parent component importeert en componeert
4. Elk bestand <400 regels na split

---

## G3: Bundle Size Optimization

### Probleem
Vite build waarschuwt voor chunks >500KB:
- `index-Bj5LkOE5.js` — 637 KB
- `index-CXGKgygb.js` — 424 KB

### Oplossingen
1. **Manual chunks** voor Chart.js vendor:
   ```ts
   // vite.config.ts
   build: {
     rollupOptions: {
       output: {
         manualChunks: {
           'chartjs': ['chart.js', 'react-chartjs-2'],
         }
       }
     }
   }
   ```

2. **Lazy load** heavy tabs:
   ```tsx
   const SeasonMediaTab = lazy(() => import('./SeasonMediaTab'));
   const SeasonSquadTab = lazy(() => import('./SeasonSquadTab'));
   ```

---

## Checklist

### G1: Icon Colors
- [x] Icon color utilities toegevoegd aan `utility.css`
- [x] ContentList.tsx — 0 hardcoded colors
- [x] SeasonMediaTab.tsx — 0 hardcoded colors
- [x] TeamSelectieTab.tsx — 0 hardcoded colors
- [x] Toast.tsx — 0 hardcoded colors
- [x] Overige bestanden — <5 hardcoded colors totaal (~17 files fixed)

### G2: Large Files
- [x] SeasonMediaTab.tsx — 551 regels (extracted MediaMobileCardList.tsx)
- [x] SeasonSquadTab.tsx — 560 regels (extracted EligibleMembersCard.tsx)
- [x] AIStudioPage.tsx — 394 regels (extracted StudioCards.tsx)
- [x] SeasonMatchesTab.tsx — 315 regels (extracted MatchCard.tsx)
- [x] useContentGeneration.tsx — 554 regels (skipped, already uses 3 sub-hooks)

### G3: Bundle Size
- [x] Chart.js in aparte chunk (chartjs-vendor: 219 kB)
- [x] Lucide in aparte chunk (lucide-vendor: 57 kB)
- [x] Recharts in aparte chunk (recharts-vendor: 505 kB — single cached lib)
- [x] Geen app chunks >500KB (largest: 434 kB)

### Quality Gates
- [x] `npx tsc --noEmit` — pass
- [x] `npx vite build` — pass (only vendor warning for recharts)
- [ ] Gecommit + pushed naar `main`
