# Q004 — Navbar Modal Consistency

| | |
|---|---|
| Status | 🚧 IN UITVOERING |
| Bron | UI Review (mobiel) |
| Impact | 🟡 important |
| Effort | ~1 uur |

## Wat
De drie navbar modals (Queue, Notificaties, Credits) gebruiken verschillende patronen voor header, close button, footer en panel sizing. Dit moet consistent worden op basis van het Notificaties-pattern (meest mobile-friendly).

## Gevonden inconsistenties
1. **Close button**: Queue & Credits gebruiken `s.closeBtn` (klein, geen 44px touch target). Notificaties gebruikt `styles.closeBtnMobile` (correct: 44×44px touch target, hover/focus states)
2. **Header class**: Queue gebruikt `s.modalHeader` + handmatige flex utility. Notificaties/Credits gebruiken `s.modalHeaderRow` (proper flex row)
3. **Panel max-height**: Queue 80vh, Notificaties 70vh, Credits geen — moet uniform 80vh
4. **Footer**: Queue heeft 2 buttons, Notificaties een ghost link, Credits een inline link — moet uniform pattern
5. **Title class**: `.modalTitle` vs `.modalTitle15` — identiek gedefinieerd, consolideren naar één

## Checklist
- [ ] Alle modals: `s.modalHeaderRow` + `styles.closeBtnMobile` met `aria-label="Sluiten"`
- [ ] Alle modals: consistent `max-height: 80vh`
- [ ] Queue footer: behoud 2 buttons (is logisch voor die context)
- [ ] Credits: voeg `max-height` toe + aria-label op dialog
- [ ] Verwijder ongebruikte `.modalTitle` (of alias naar `.modalTitle15`)
- [ ] CSS: verwijder `.modalHeader` als niet meer gebruikt
- [ ] TypeScript check: `npx tsc --noEmit`
- [ ] Build check: `npx vite build`
