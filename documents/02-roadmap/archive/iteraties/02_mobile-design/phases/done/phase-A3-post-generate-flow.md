# Phase A3 — Post-Generate Success Flow

**Track:** A + E (Foundation + Content Flow)
**Status:** ✅ Done — `56f29df6`

## Doel

Na het genereren van content: duidelijke success feedback + shortcuts naar volgende acties. Voorkomt dat gebruikers "verdwalen" na het genereren.

## Huidige situatie

- `ContentGenerationModal` sluit na generatie
- Geen toast/feedback over resultaat
- Geen shortcut naar preview of approvals queue

## Gewenste flow

```
Generate klaar
  → Toast: "Content gegenereerd! 🎉"
  → Toast bevat 2 acties:
     [Bekijk preview] → navigeer naar content detail
     [Naar queue]     → navigeer naar /approvals
  → Wizard sluit automatisch
  → Badge count op Queue icoon updatet direct
```

## Taken

- [ ] Toast component bouwen of bestaande uitbreiden met action buttons
- [ ] ContentGenerationModal: na success → toast tonen + wizard sluiten
- [ ] Toast actions: "Bekijk preview" link + "Naar queue" link
- [ ] Queue badge: optimistic update (increment direct na generate)
- [ ] MatchWizard: na generate → bottom sheet sluit, toast zichtbaar

## Bestaande componenten

| Component | Locatie | Hergebruiken |
|-----------|---------|-------------|
| `ContentGenerationModal` | `pages/identity/ContentGenerationModal/` | ✅ Success callback toevoegen |
| `MatchWizard` | `components/MatchWizard.tsx` | ✅ onGenerated callback |
| `NavbarQuickReviewModal` | `components/TopNavbar.tsx` | ✅ Queue badge state |
| Toast (design-system) | `@django-core/design-system` | ✅ Check of action slots bestaan |

## Checklist

- [ ] Toast met action buttons werkend
- [ ] ContentGenerationModal triggert success toast
- [ ] Wizard sluit na generatie
- [ ] Queue badge updatet direct
- [ ] Flow getest: + → wizard → generate → toast → navigate
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
