# D2 — Sheet Refresh & Badges

> **Status:** ✅ Klaar
> **Datum:** 2026-03-15
> **Omvang:** 49 regels geänpasseerd over 5 bestanden

## Doel

Na een actie in een child sheet (lineup save, content generatie) updaten de parent sheet en ActiveMatchCard badge live — zonder page refresh of opnieuw openen.

## Probleem

Momenteel toont ActiveMatchCard een `lineupCount` badge en `contentCount` badge die alleen bij initial mount worden opgehaald. Na een lineup save in LineupSheet of content generatie in ContentSheet blijven de badges stale totdat de gebruiker het dashboard refresht.

## Taken

### 1. Callback pattern: child → parent

```typescript
// LineupSheet
interface LineupSheetProps {
  onLineupSaved?: (count: number, formation: string) => void;
}

// ContentSheet
interface ContentSheetProps {
  onContentGenerated?: (count: number) => void;
}
```

### 2. ActiveMatchCard badge update

```typescript
// In ActiveMatchCard:
<LineupSheet
  onLineupSaved={(count, formation) => {
    setLineupCount(count);
    setLineupFormation(formation);
  }}
/>

<ContentSheet
  onContentGenerated={(count) => {
    setContentCount(prev => prev + count);
  }}
/>
```

### 3. Badge animatie

Subtiele scale-bounce animatie wanneer badge waarde verandert:

```css
.badgeUpdated {
  animation: badge-bump 300ms var(--ease-default);
}

@keyframes badge-bump {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
```

### 4. MatchSheet data refresh na sheet close

Wanneer een child sheet sluit via `onBack`, re-fetch de data die de MatchSheet toont:
- Lineup count/formation (uit match metadata)
- Content count (uit media items)

**Lightweight approach:** Niet opnieuw fetchen — gebruik de callback data die al beschikbaar is.

## Gewijzigde bestanden (verwacht)

| Bestand | Wijziging |
|---------|-----------|
| `ActiveMatchCard.tsx` | Callback handlers voor badge updates |
| `LineupSheet.tsx` | `onLineupSaved` prop toevoegen + trigger na save |
| `ContentSheet.tsx` | `onContentGenerated` prop toevoegen + trigger na generatie |
| `useLineupSheet.ts` | Return saved count/formation na succesvolle save |
| `ActiveMatchCard.module.css` | Badge bump animatie |

## Acceptatiecriteria

- [x] Na lineup save: lineup badge updated live op ActiveMatchCard
- [x] Na content generatie: content badge updated live op ActiveMatchCard
- [x] Badge animatie bij waarde-wijziging
- [x] Geen extra API calls — gebruik callback data
- [x] Works voor zowel lineup → back → match als direct sheet close

## Commits

| Hash | Beschrijving |
|------|-------------|
| `c03348d6` | feat(dashboard): D2 — live badge refresh after lineup save & content generation |

## Verificatie

- TypeScript: ✅ `tsc --noEmit` clean
- Build: ✅ `vite build` in 9.21s
- Railway: ✅ pushed to main
