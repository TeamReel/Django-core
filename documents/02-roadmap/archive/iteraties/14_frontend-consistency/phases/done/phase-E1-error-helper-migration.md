# E1 — Error Helper Migration

**Status:** ✅ Done
**Track:** E — Error Handling Consistency
**Effort:** 30 min
**Dependencies:** Geen
**Voltooid:** 2026-03-12

---

## Doel

Vervang alle `err instanceof Error ? err.message : 'fallback'` patterns door de bestaande `getErrorMessage()` utility.

## Huidige Staat

### Het probleem

De codebase heeft **30+ plekken** met handmatig error message extraction:

```tsx
// SLECHT — gedupliceerd, inconsistent
try { ... }
catch (err) {
  const message = err instanceof Error ? err.message : 'Fout opgetreden';
  setError(message);
}
```

### De oplossing bestaat al

`demo/src/utils/errorHelpers.ts` heeft `getErrorMessage()`:

```tsx
// GOED — centraal, consistent
import { getErrorMessage } from '@/utils/errorHelpers';

try { ... }
catch (err) {
  setError(getErrorMessage(err));
}
```

### Bekende bestanden met dit patroon

| Bestand | Voorkomens |
|---------|-----------|
| `pages/files/index.tsx` | 6 |
| `pages/NotificationsPage.tsx` | 4 |
| `pages/platform/CachePerformancePage.tsx` | 4 |
| `pages/identity/MemberDetailPage.tsx` | 3 |
| Diverse andere | ~15 |

## Acties

1. [ ] Zoek alle `err instanceof Error ? err.message` patronen
2. [ ] Voeg `import { getErrorMessage } from '@/utils/errorHelpers'` toe waar nodig
3. [ ] Vervang patroon door `getErrorMessage(err)`
4. [ ] Verifieer dat fallback strings consistent zijn met `getErrorMessage` default

## Verificatie

- [ ] Geen `err instanceof Error ? err.message` meer in codebase (buiten errorHelpers zelf)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
