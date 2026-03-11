# A2 — Interactive Elements

**Status:** 🔲 Todo
**Effort:** 4 uur
**Scope:** 34 `<div onClick>` → semantische interactive elements

---

## Doel

Alle clickable elements zijn keyboard-accessible en gebruiken semantische HTML.

## Current State

- 34 `<div onClick={...}>` patronen
- Keyboard-ontoegankelijk (geen `Enter`/`Space` support)
- Screen readers herkennen niet als interactief

## Aanpak

### Per case, kies de juiste oplossing:

| Situatie | Oplossing |
|----------|-----------|
| Navigatie naar route | `<Link to={...}>` of `<a href>` |
| Toggle/action | `<button onClick={...}>` |
| Custom clickable card | `<button>` met CSS reset, of `role="button" tabIndex={0} onKeyDown` |
| Clickable list item | `<li role="option">` of `<button>` wrapper |

### Regels
- **Nooit** `role="button"` zonder `tabIndex={0}` + `onKeyDown` handler
- `onKeyDown` handler: trigger op `Enter` en `Space`
- Verwijder cursor-pointer CSS van `<div>` → verplaats naar `<button>`

### Stappen
1. Zoek alle `<div.*onClick` matches
2. Categoriseer per type (nav, action, card, list)
3. Refactor naar juiste element
4. Voeg ESLint rule `jsx-a11y/click-events-have-key-events` toe (error)

## Verificatie

- [ ] 0 `<div onClick>` zonder keyboard support
- [ ] `jsx-a11y/click-events-have-key-events` ESLint rule actief
- [ ] Tab-navigatie werkt voor alle interactive elements
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
