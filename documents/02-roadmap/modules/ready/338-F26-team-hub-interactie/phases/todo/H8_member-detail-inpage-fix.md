# H8 — Member Detail In-Page Fix

| | |
|---|---|
| Fase | H8 |
| Status | 📋 TODO |
| Effort | ~3 uur |
| Afhankelijkheid | H3 (done) |

## Wat

Wanneer je op een member klikt en dan "Bewerken" tapt, navigeert de app weg van de hub naar een andere pagina. Dit moet in-page blijven als een iOS-style slide-in panel op dezelfde pagina.

## Technische analyse

### Huidige flow
1. User taps member → `MemberSummarySheet` opent (sheet overlay) ✅
2. User taps "Bewerken" → `onEdit` callback fires:
   - `setSelectedMember(null)` — sluit MemberSummarySheet
   - `setDetailMemberId(String(m.id))` — opent MemberDetailPanel
3. `MemberDetailPanel` rendert als overlay dialog (`memberPanelOverlay` CSS class)

### Mogelijke oorzaken dat het "weg navigeert"
De code zelf navigeert NIET weg — het rendert MemberDetailPanel als een in-page overlay. Maar:

1. **MemberDetailPanel kan intern navigatie triggeren** — als het panel zelf `useNavigate()` gebruikt om naar een member detail page te gaan bij bepaalde acties
2. **De overlay CSS kan het zo laten lijken** — `memberPanelOverlay` is een full-screen overlay die de hele hub bedekt, waardoor het voelt als een andere pagina
3. **Escape/close kan de verkeerde state resetten** — als er een race condition is

### Gewenste UX
- Member detail panel moet duidelijk een **slide-in overlay** zijn (van rechts)
- De hub moet zichtbaar op de achtergrond blijven (half zichtbaar of dimmed)
- "Sluiten" brengt je terug naar de hub op exact dezelfde scroll-positie
- Geen URL-wijziging — altijd op dezelfde hub URL blijven

## Checklist

- [ ] Verify: Check of MemberDetailPanel intern `navigate()` aanroept bij open/mount
- [ ] Fix: Blokkeer eventuele navigatie binnen MemberDetailPanel wanneer geopend vanuit de hub
- [ ] CSS: `memberPanelOverlay` stylen als slide-in van rechts met dimmed achtergrond (hub zichtbaar)
- [ ] Animatie: `slideInRight` voor openen, `slideOutRight` voor sluiten
- [ ] Achtergrond: hub dimmed maar zichtbaar achter het panel
- [ ] Scroll positie behouden na sluiten
- [ ] URL mag niet wijzigen bij openen/sluiten MemberDetailPanel
- [ ] Test: complete flow member tap → summary → bewerken → panel → sluiten → terug op hub
- [ ] TypeScript 0 errors, Vite build success
