# Q026 — onClick a11y attributen toevoegen

| | |
|---|---|
| Status | 📋 TODO |
| Bron | Codebase Audit maart 2026 |
| Impact | 🟡 important |
| Effort | ~8 uur |

## Wat
~890 `onClick` handlers op niet-interactieve elementen (`<div>`, `<span>`, `<td>`, `<tr>`) missen `role`, `tabIndex`, `onKeyDown`, of `aria-label`. Dit is een WCAG 2.1 AA-schending — keyboard-gebruikers en screenreaders zien deze elementen niet als interactief.

## Aanpak
- **Prioriteit 1**: Pagina-componenten met veel gebruikersinteractie (dashboard, match-detail, directory)
- **Prioriteit 2**: Overlay/sheet componenten
- **Prioriteit 3**: Overige

## Patronen
```tsx
// FOUT:
<div onClick={handleClick}>...</div>

// GOED (optie A — maak het een button):
<button type="button" onClick={handleClick}>...</button>

// GOED (optie B — als het géén button kan zijn):
<div role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}>...</div>
```

## Checklist
- [ ] Scan alle onClick op non-interactive elements
- [ ] Top-20 meest gebruikte pagina's eerst
- [ ] Voeg role, tabIndex, onKeyDown toe (of refactor naar <button>)
- [ ] Tests
- [ ] Verify (axe-core)
