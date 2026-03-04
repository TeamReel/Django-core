# Phase A4 — Overlay Navigation Consistency

**Track:** A (Foundation)
**Status:** 📋 Planned

## Doel

Alle overlay modals krijgen een "Bekijk alles →" link die naar de volledige pagina navigeert. Consistent patroon: overlay = quick view, pagina = deep dive.

## Overlays die link nodig hebben

| Overlay | "Bekijk alles" link | Pagina |
|---------|-------------------|--------|
| `NavbarQuickReviewModal` | "Alle items bekijken →" | `/approvals` |
| `NavbarNotificationsModal` | "Alle notificaties →" | `/notifications` (of `/settings/notifications`) |
| `NavbarCreditsModal` | "Credits overzicht →" | `/credits` |

## UX-regels

- Link staat altijd **onderaan** de overlay content
- Max 5-10 items in overlay (geen scroll door 50 items)
- Na klik op "Bekijk alles": overlay sluit automatisch + navigate
- Badge count updatet direct na actie in overlay (optimistic)

## Taken

- [ ] NavbarQuickReviewModal: "Bekijk alles" link toevoegen → `/approvals`
- [ ] NavbarNotificationsModal: "Bekijk alles" link toevoegen
- [ ] NavbarCreditsModal: "Credits overzicht" link toevoegen
- [ ] Overlay sluit automatisch na navigate
- [ ] Max items limiet toevoegen (5 of 10)
- [ ] Consistent styling voor de "Bekijk alles" link (tekst + chevron)

## Checklist

- [ ] Alle 3 overlays hebben "Bekijk alles" link
- [ ] Links navigeren correct + overlay sluit
- [ ] Items gelimiteerd in overlay
- [ ] Styling consistent
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
