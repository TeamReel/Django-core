# Q1 — Quick Wins (base.css)

**Status:** 🔲 Todo
**Geschatte effort:** 15 min
**Bestanden:**
- `demo/src/styles/base.css`
- `demo/src/styles/tokens.css` (eventueel)

---

## Doel

Vier ontbrekende premium UX-patronen toevoegen die zero-risk zijn en direct het kwaliteitsgevoel verhogen. Allemaal in `base.css`.

---

## 1. `::selection` styling

Brand-kleur text selectie — momenteel browser default (blauw).

```css
/* Brand-colored text selection */
::selection {
  background-color: var(--color-primary-200);
  color: var(--color-neutral-900);
}

[data-theme="dark"] ::selection {
  background-color: var(--color-primary-700);
  color: white;
}
```

**Impact:** Subtiel maar merkbaar — elke keer dat een gebruiker tekst selecteert ziet hij/zij de brand kleur.

---

## 2. `scroll-padding-top`

Voorkomt dat anchor-scroll content achter de fixed header verdwijnt.

```css
html {
  scroll-padding-top: 80px; /* hoogte van TopNavbar + marge */
  scroll-behavior: smooth;
}

@media (max-width: 768px) {
  html {
    scroll-padding-top: 64px; /* mobiele header is smaller */
  }
}
```

---

## 3. `overscroll-behavior`

Voorkomt dat modals/drawers doorscrollen naar de body (rubber-band effect).

```css
/* Prevent scroll chaining on overlay surfaces */
[class*="modal"], [class*="Modal"],
[class*="drawer"], [class*="Drawer"],
[class*="bottomSheet"], [class*="BottomSheet"],
[class*="overlay"], [class*="Overlay"] {
  overscroll-behavior: contain;
}
```

**Plus:** Op individuele scrollable containers:

```css
.sidebar, [class*="Sidebar"] {
  overscroll-behavior: contain;
}
```

---

## 4. `text-rendering`

Betere kerning voor headings.

```css
h1, h2, h3, h4, h5, h6 {
  text-rendering: optimizeLegibility;
}
```

---

## 5. Bonus: `scroll-behavior: smooth` (globaal)

Momenteel alleen in 3 bestanden JS-based. Eén CSS regel maakt het overal consistent.

```css
html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

---

## Verificatie

- [ ] Text selectie toont brand kleur (light + dark mode)
- [ ] In-page anchor links scrollen soepel en stoppen onder de header
- [ ] Modal scroll stopt bij modal boundary
- [ ] Headings renderen met betere kerning
- [ ] `prefers-reduced-motion: reduce` schakelt smooth scroll uit
- [ ] `npx vite build` slaagt
- [ ] `pnpm lint:css` = 0 violations
