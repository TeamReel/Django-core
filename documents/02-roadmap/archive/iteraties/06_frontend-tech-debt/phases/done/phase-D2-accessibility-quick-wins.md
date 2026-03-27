# D2 — Accessibility Quick Wins

**Status:** ✅ Done
**Geschatte effort:** 1 uur
**Scope:** 33 clickable div/span + 6 icon buttons zonder aria-label

---

## Doel

WCAG 2.1 Level A compliance verbeteren door de twee meest voorkomende accessibility violations op te lossen:

1. **Clickable non-interactive elements** — `<div onClick>` zonder `role="button"` en `tabIndex={0}`
2. **Icon-only buttons** — `<button>` met alleen een icon/svg, zonder `aria-label`

---

## Probleem 1: Clickable div/span (33 gevallen)

```tsx
// ❌ Niet toegankelijk:
<div onClick={handleClick}>Klik hier</div>

// ✅ Toegankelijk:
<div role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}>
  Klik hier
</div>

// ✅ Of beter: gebruik een <button>
<button type="button" onClick={handleClick}>Klik hier</button>
```

### Vereiste attributen voor clickable div/span:
- `role="button"` — vertelt screenreaders dat het klikbaar is
- `tabIndex={0}` — maakt het focusbaar met keyboard
- `onKeyDown` — handle Enter/Space toetsen

---

## Probleem 2: Icon-only buttons (6 gevallen)

```tsx
// ❌ Screenreader hoort niets:
<button onClick={onClose}><CloseIcon /></button>

// ✅ Met aria-label:
<button onClick={onClose} aria-label="Sluiten"><CloseIcon /></button>
```

---

## Aanpak

### Stap 1: Icon buttons — handmatig (6 stuks)

Klein aantal, context-afhankelijk label nodig. Handmatig toevoegen.

### Stap 2: Clickable divs — semi-geautomatiseerd

Script dat `<div onClick` vindt en:
1. `role="button"` toevoegt
2. `tabIndex={0}` toevoegt
3. Flaggt gevallen waar `onKeyDown` nog ontbreekt (handmatig toevoegen)

### Stap 3: ESLint plugin activeren

```json
{
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

---

## Verificatie

- [ ] Alle `<div onClick>` hebben `role="button"` + `tabIndex={0}`
- [ ] Alle icon-only buttons hebben `aria-label`
- [ ] `jsx-a11y` ESLint plugin actief
- [ ] Keyboard navigatie: Tab door alle interactieve elementen
- [ ] `npx vite build` slaagt
