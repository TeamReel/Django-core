# Phase 41 — Inline Styles: Top 5 Bestanden

**Track:** E1 (Inline Style Elimination)
**Status:** 📋 Planned
**Geschatte inline styles:** ~472

## Focus bestanden

| Bestand | Geschatte inline styles |
|---------|------------------------|
| DesignSystemPage.tsx | ~120 |
| ConfirmStep.tsx | ~100 |
| UserEditModal.tsx | ~90 |
| index.tsx (entry) | ~85 |
| AssetGenerationModal.tsx | ~77 |

## Aanpak

Per bestand:
1. Inventariseer alle `style={{}}` patronen
2. Groepeer in categorieën (layout, colors, spacing, etc.)
3. Vervang door utility classes, CSS Modules, of primitive props
4. Waar nodig: nieuwe utility class toevoegen

## Checklist

- [ ] DesignSystemPage inline styles verwijderd
- [ ] ConfirmStep inline styles verwijderd
- [ ] UserEditModal inline styles verwijderd
- [ ] index.tsx inline styles verwijderd
- [ ] AssetGenerationModal inline styles verwijderd
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
