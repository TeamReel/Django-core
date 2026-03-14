# N5 — Sheet Component Systeem

> **Status:** ✅ Klaar
> **Datum:** 2026-03-13

## Probleem

ProfileSheet bevatte ~100 regels logica (focus trap, escape key, scroll lock, animations) die identiek was aan Modal.tsx. Andere componenten (MemberEditSheet, MemberDetailPanel) implementeerden vergelijkbare patterns opnieuw. Geen herbruikbaar sheet-primitief.

## Oplossing

### NavigationSheet — Universeel sheet-primitief

Nieuw component in `components/ui/`:

```
NavigationSheet.tsx      — Component (197 regels)
NavigationSheet.module.css — Styling met open + close animaties
```

**Features:**
- Escape key (alleen wanneer open)
- Body scroll lock met overflow restore
- Focus trapping (Tab cycle)
- Focus restore bij sluiten
- Animated open: slideUp (mobile) / slideInRight (desktop)
- Animated close: slideDown (mobile) / slideOutRight (desktop)
- `prefers-reduced-motion` support
- Overlay backdrop click to dismiss
- `role="dialog"`, `aria-modal`, `aria-label`
- Optional: `icon`, `footer`, `desktopWidth`, `className`

### ProfileSheet → thin wrapper

ProfileSheet.tsx is nu 20 regels — delegeert alles aan NavigationSheet.
ProfileSheet.module.css is verwijderd (orphaned).

### Barrel export

`components/ui/index.ts` — `NavigationSheet` + `NavigationSheetProps` geëxporteerd.

## Bestanden
- `demo/src/components/ui/NavigationSheet.tsx` — Nieuw
- `demo/src/components/ui/NavigationSheet.module.css` — Nieuw
- `demo/src/components/ui/index.ts` — Export toegevoegd
- `demo/src/components/ProfileSheet.tsx` — Herschreven als wrapper
- `demo/src/components/ProfileSheet.module.css` — Verwijderd
