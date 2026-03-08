# S4 — Modal Extraction

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** ~5 mega-modal files → 1 modal per file

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

- [ ] Elk modal-bestand < 200 regels
- [ ] Barrel export in oorspronkelijke file (backward compatible)
- [ ] `npx vite build` slaagt
