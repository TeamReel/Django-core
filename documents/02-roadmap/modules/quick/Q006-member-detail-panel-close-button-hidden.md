# Q006 — MemberDetailPanel: Close-knop verborgen onder top nav

| | |
|---|---|
| Status | 📋 TODO |
| Bron | E2E Test (Playwright MCP, 2026-03-22) |
| Impact | 🔴 critical |
| Effort | ~1 uur |

## Wat

De `MemberDetailPanel` (overlay die opent na "Bekijk profiel" in MemberSummarySheet) heeft een close-knop
die volledig verborgen zit **onder de top navigation bar**.

**Gemeten waarden (375×812):**
- Close-knop: `top: 12px`, `bottom: 56px`, `height: 44px`
- Top nav bar: `height: 56px`, `bottom: 56px`
- **Overlap: ja** — de knop eindigt exact waar de nav begint; de knop is 100% bedekt

De gebruiker kan het panel **niet sluiten via de X-knop**. Alleen via JavaScript-evaluatie
(`document.querySelector('button[title="Sluiten"]').click()`) kon ik de knop activeren.

**Repro:**
1. Open Selectie-tab op MyTeamHubPage (mobile 375×812)
2. Klik op een lid → MemberSummarySheet opent
3. Klik "Bekijk profiel" → MemberDetailPanel opent als overlay
4. De X-knop is niet bereikbaar (zit achter de nav)

## Oorzaak (vermoeden)

Het panel header heeft een `top: 0` positie maar houdt geen rekening met de hoogte van de top nav bar
(`_topNavWrapper_jwvbk_21`, `height: 56px`). Het panel moet `padding-top: 56px` krijgen of
beginnen *onder* de nav bar.

## Checklist
- [ ] Zoek de MemberDetailPanel component (`MemberDetailPanel.tsx` of vergelijkbaar)
- [ ] Voeg `padding-top` of `margin-top` van `var(--nav-height, 56px)` toe aan het panel-header element
- [ ] Controleer: wil je het panel volledig onder de nav starten, of moet de header sticky zijn?
- [ ] Verifieer: close-knop klikbaar op 375×812 viewport
- [ ] Verifieer: close-knop zichtbaar (niet afgekapt) op 375×812 viewport
- [ ] Geen regressie op desktop (1280×720)
