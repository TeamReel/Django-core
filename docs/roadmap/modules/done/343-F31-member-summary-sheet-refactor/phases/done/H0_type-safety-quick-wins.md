# H0 — Type-safety & quick wins

| | |
|---|---|
| Status | TODO |
| Effort | ~30 min |
| Bestanden | `squadTabTypes.ts`, `MemberSummarySheet.tsx`, `MemberSummarySheet.module.css` |

## Doel

Type-safety verbeteren en thumbnail object-position per asset type instellen.

## Taken

### 1. `avatar_url` toevoegen aan SquadMember.user

```typescript
// demo/src/pages/periods/squadTabTypes.ts
user?: {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;  // ← toevoegen
};
```

### 2. Cast verwijderen in MemberSummarySheet.tsx

```typescript
// Was:
const avatarUrl = (member?.user as Record<string, unknown> | undefined)?.avatar_url as string | undefined;

// Wordt:
const avatarUrl = member?.user?.avatar_url;
```

### 3. object-position per asset type

```css
/* Fullbody: gezicht bovenaan */
.checklistThumbImg[data-asset="fullbody"],
.checklistThumbImg[data-asset="legacy_fullbody"] {
  object-position: top;
}

/* Close-up en overige: gecentreerd */
.checklistThumbImg {
  object-position: center;  /* default, was 'top' */
}
```

Vereist `data-asset` attribute toevoegen aan de `<img>` in de checklist rendering.

## Verificatie

- [ ] `npx tsc --noEmit` — geen fouten
- [ ] Harold's sheet: fullbody toont gezicht, close-up gecentreerd
- [ ] Geen `Record<string, unknown>` casts voor avatar_url
