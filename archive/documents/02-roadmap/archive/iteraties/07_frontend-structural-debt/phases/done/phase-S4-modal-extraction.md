# S4 — Modal Extraction

**Status:** ✅ Done
**Effort:** 2 uur
**Scope:** 2 mega-modal files → 6 individual modals + barrels

---

## Doel

Files als `NavbarModals.tsx` (491 regels) en `SeasonDetailModals.tsx` bevatten meerdere modals in één bestand. Elk modal moet z'n eigen file hebben.

## Te splitten bestanden

| Bestand | Regels | Verwacht aantal modals |
|---------|--------|----------------------|
| `NavbarModals.tsx` | 491 | ~5 modals |
| `SeasonDetailModals.tsx` | ~400 | ~4 modals |
| `FollowUpModals.tsx` | ~300 | ~3 modals |
| `ReviewModals.tsx` | ~250 | ~3 modals |

## Aanpak

1. Identificeer elke modal in het bestand (zoek `Modal` returns)
2. Extract naar eigen file: `QuickReviewModal.tsx`, `ShareModal.tsx`, etc.
3. Originele file wordt barrel export of thin wrapper
4. Update imports

## Verificatie

- [x] Elk modal-bestand < 200 regels (1 exception: 255)
- [x] Barrel export in oorspronkelijke file (backward compatible)
- [x] `npx vite build` slaagt
