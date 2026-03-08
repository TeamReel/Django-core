# Q1 — Quick Wins (base.css + tokens.css)

**Status:** ✅ Done
**Geschatte effort:** 30 min
**Bestanden:**
- `demo/src/styles/base.css`
- `demo/src/styles/tokens.css`
- `demo/src/providers/ThemeProvider.tsx` (of equivalent)

---

## Doel

Zeven ontbrekende premium UX-patronen toevoegen die zero-risk zijn en direct het kwaliteitsgevoel verhogen. Voornamelijk in `base.css` en `tokens.css`.

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

## 6. `prefers-color-scheme` auto-detect

Automatisch dark/light mode detecteren op basis van systeem preference. Momenteel is dark mode alleen via handmatige toggle.

### Aanpak

In de ThemeProvider (React):

```tsx
// Detecteer system preference als initiële waarde
const getInitialTheme = (): 'light' | 'dark' => {
  // 1. Eerst localStorage checken (user override)
  const stored = localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;

  // 2. Daarna system preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';

  return 'light';
};
```

Plus een CSS fallback voor de initiële laad (voorkomt flash):

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Dark mode tokens als fallback vóór JS hydration */
    color-scheme: dark;
  }
}
```

**Belangrijk:** De handmatige toggle blijft werken als override. System preference is alleen de default.

---

## 7. `content-visibility: auto`

Performance optimalisatie voor lange lijsten — de browser skipt rendering van off-screen items.

```css
/* Apply to repeating list items in long scrollable containers */
[class*="listItem"], [class*="ListItem"],
[class*="tableRow"], [class*="TableRow"],
[class*="card"]:not([class*="Card"]) {
  content-visibility: auto;
  contain-intrinsic-size: auto 80px; /* geschatte hoogte per item */
}
```

**Impact:** Gratis performance winst op pagina's met veel items (members lijst, activities, approvals). Browser rendert alleen zichtbare items.

**Kanttekening:** `contain-intrinsic-size` moet een redelijke schatting zijn. Te klein = layout jump, te groot = extra whitespace.

---

## 8. Border compound token

Eén token voor de meest voorkomende border declaratie in de hele app.

Toevoegen aan `tokens.css`:

```css
:root {
  --border-default: 1px solid var(--app-border);
  --border-subtle:  1px solid var(--app-border-subtle, rgba(0, 0, 0, 0.06));
}

[data-theme="dark"] {
  --border-subtle: 1px solid rgba(255, 255, 255, 0.08);
}
```

Dit vervangt het patroon `border: 1px solid var(--app-border)` dat honderden keren voorkomt. In latere fases (A1-A6) kan dit als `border: var(--border-default)` worden ingezet.

---

## Verificatie

- [ ] Text selectie toont brand kleur (light + dark mode)
- [ ] In-page anchor links scrollen soepel en stoppen onder de header
- [ ] Modal scroll stopt bij modal boundary
- [ ] Headings renderen met betere kerning
- [ ] `prefers-reduced-motion: reduce` schakelt smooth scroll uit
- [ ] System dark mode preference wordt automatisch gedetecteerd
- [ ] Lange lijsten (members, activities) scrollen soepeler (content-visibility)
- [ ] `border: var(--border-default)` werkt als shorthand
- [ ] `npx vite build` slaagt
- [ ] `pnpm lint:css` = 0 violations
