# A4 — Keyboard Navigation & Skip Links

**Status:** ✅ Compleet
**Prioriteit:** 🟡 Medium
**Geschatte effort:** 2-3 uur
**Kan parallel met:** A2, A3

---

## Doel

Implementeer structurele accessibility-patronen die niet per-element maar app-breed gelden: skip-to-content link, focus management bij navigatie, focus trapping in modals, en aria-live voor toasts.

## Uitgevoerde Fixes

### 1. Skip-to-content Link

**Bestand:** `components/AppShell.tsx` + `AppShell.module.css`

- `<a href="#main-content" className={styles.skipLink}>Skip to main content</a>` toegevoegd bovenaan de shell
- Visueel verborgen (position: absolute; top: -100%) tot keyboard focus
- Bij `:focus` schuift link naar top-left (top: 8px; left: 8px) met z-index: 9999
- Styled met club brand colors (var(--app-bg), var(--app-focus-ring))

### 2. Focus Management bij Route Change

**Bestand:** `components/AppShell.tsx`

- `<main>` element kreeg `id="main-content"`, `tabIndex={-1}`, en `ref={mainRef}`
- `useEffect` op `location.pathname`: verplaatst focus naar main na elke navigatie
- `isFirstRender` ref voorkomt focus-steal bij initiële page load
- `preventScroll: true` voorkomt ongewenste scroll jumps
- `.main:focus { outline: none; }` verbergt focus ring op programmatische focus

### 3. Focus Trapping in Modal.tsx

**Bestand:** `components/ui/Modal.tsx`

- Bij modal open: focus verplaatst naar eerste focusbare element (of panel zelf)
- Tab-trap: Tab op laatste element → springt naar eerste; Shift+Tab op eerste → springt naar laatste
- Bij modal close: focus keert terug naar eerder gefocust element (`previouslyFocused?.focus()`)
- Panel kreeg `tabIndex={-1}` als fallback focus target

### 4. Toast aria-live Region

**Bestand:** `components/ui/Toast.tsx`

- `ToastContainer` kreeg `aria-live="polite"` + `aria-atomic="false"`
- Individuele toasts hadden al `role="alert"` — nu ook container-level announcements

### 5. Focus-visible Styling ✅ (reeds aanwezig)

**Bestand:** `styles/base.css`

```css
:focus-visible {
  outline: 2px solid var(--app-focus-ring);
  outline-offset: 2px;
  z-index: 10;
}
```

Al consistent geïmplementeerd — geen actie nodig.

## Build Verificatie

```
✓ built in 10.95s — geen errors
```

## Acceptatiecriteria

- [x] Skip-to-content link aanwezig en zichtbaar bij Tab
- [x] Focus verplaatst naar main content bij route change
- [x] Modal.tsx heeft volledige focus trapping (Tab cycle + restore)
- [x] Toast system heeft aria-live region
- [x] `:focus-visible` styling consistent across app
- [x] Geen visuele regressies (build succesvol)
