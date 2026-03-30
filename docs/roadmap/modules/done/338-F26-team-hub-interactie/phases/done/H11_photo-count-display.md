# H11 — Photo Count Display

| | |
|---|---|
| Status | ✅ DONE |
| Effort | ~2 uur |
| Afhankelijkheid | — |

## Context

De member detail sheet toont "2 / 28" als navigatie-index (lid 2 van 28). De gebruiker verwacht hier te zien hoeveel leden een foto hebben: bijv. "14 / 28 met foto".

## Doel

Vervang de navigatie-index met een foto-statistiek of toon beide:
- Format: "14 / 28 met foto" of "Lid 2 van 28 • 14 met foto"

## Implementatie

### 1. MemberSummarySheet aanpassen

**Bestand**: `demo/src/pages/identity/MemberSummarySheet.tsx`

```tsx
interface MemberSummarySheetProps {
  // ... existing
  currentIndex?: number;
  totalCount?: number;
  membersWithPhoto?: number;  // NEW
}

// In render:
{showCounter && (
  <span className={s.navCounter}>
    {currentIndex + 1} / {totalCount}
    {membersWithPhoto !== undefined && (
      <span className={s.photoCount}> • {membersWithPhoto} met foto</span>
    )}
  </span>
)}
```

### 2. MyTeamHubPage: bereken foto-telling

**Bestand**: `demo/src/pages/identity/MyTeamHubPage.tsx`

```tsx
const membersWithPhoto = useMemo(() => {
  return (d.members as SquadMember[]).filter((m) => {
    const tr = (m.metadata as Record<string, unknown> | undefined)?.teamreel_assets;
    if (!tr?.images?.closeup) return false;
    // Check if any kit type has processed closeup
    for (const kitType of ['home', 'away', 'third', 'goalkeeper']) {
      if (tr.images.closeup[kitType]?.processed) return true;
    }
    return false;
  }).length;
}, [d.members]);

// Pass to sheet:
<MemberSummarySheet
  membersWithPhoto={membersWithPhoto}
  // ... other props
/>
```

### 3. CSS styling

```css
.photoCount {
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
}
```

## Acceptatiecriteria

- [ ] Counter toont "14 / 28 met foto" (of vergelijkbaar format)
- [ ] Telt alleen leden met processed closeup (niet raw uploads)
- [ ] Dynamisch bijgewerkt als fotos toegevoegd worden
- [ ] TypeScript 0 errors
