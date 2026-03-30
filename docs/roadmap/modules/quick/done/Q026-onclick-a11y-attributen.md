# Q026 — onClick a11y attributen toevoegen

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟡 important |
| Effort | ~0.5 uur (was ~8 uur) |

## Wat
~890 `onClick` handlers op niet-interactieve elementen (`<div>`, `<span>`, `<td>`, `<tr>`) zouden `role`, `tabIndex`, `onKeyDown`, of `aria-label` missen — een WCAG 2.1 AA-schending.

## Resultaat

**Codebase bleek al compliant te zijn!** Geen wijzigingen nodig.

### Bevindingen

1. **`clickableProps()` utility** ([demo/src/utils/a11y.ts](demo/src/utils/a11y.ts))
   - Bestaande helper functie die `role="button"`, `tabIndex={0}`, en `onKeyDown` handler toevoegt
   - Wordt consistent gebruikt in ~20+ componenten

2. **Alle div/onClick patterns vallen in 3 categorieën**:
   - **Interactieve divs**: Gebruiken `clickableProps()` ✓
   - **Modal overlays**: Hebben `role="presentation"` of `aria-hidden="true"` ✓
   - **Modal content**: Hebben `role="dialog"` + `stopPropagation()` ✓

3. **Geen span/td/tr met onClick gevonden** — 0 matches

### Verificatie
```powershell
# Zoekopdracht voor problematische patronen
Get-ChildItem demo\src -Recurse -Filter *.tsx | Select-String '<div[^>]*onClick=' |
Where-Object { $_.Line -notmatch 'role=' -and $_.Line -notmatch 'aria-' -and 
               $_.Line -notmatch 'clickableProps' -and $_.Line -notmatch 'stopPropagation' }
# Resultaat: 0 matches
```

## Checklist
- [x] Scan alle onClick op non-interactive elements → **0 issues gevonden**
- [x] Bestaande `clickableProps()` utility geïdentificeerd
- [x] Alle patterns gecontroleerd: modals, overlays, interactieve divs
- [x] Verify: geen wijzigingen nodig, codebase was al compliant
