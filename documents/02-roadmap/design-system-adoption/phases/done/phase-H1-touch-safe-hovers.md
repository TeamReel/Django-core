# H1 — Touch-safe Hovers

**Status:** ✅ Done
**Geschatte effort:** 1 uur
**Scope:** 123 `:hover` rules gewrapt in `@media (hover: hover)` (58 bestanden) + z-index tokens

---

## Doel

Alle `:hover` styles wrappen in `@media (hover: hover)` zodat touch devices (telefoons, tablets) geen "sticky hover" problemen ervaren. Dit is een **kritiek mobile UX probleem** — op touch devices blijft een `:hover` state vaak "plakken" na een tap.

---

## Probleem

```css
/* Huidige situatie — problematisch op touch */
.button:hover {
  background-color: var(--color-primary-400);
  transform: translateY(-1px);
}
```

Na een tap op mobiel blijft de hover state actief tot ergens anders wordt getapt. Dit zorgt voor:
- Buttons die "ingedrukt" blijven
- Cards met permanent highlight
- Nav items die geselecteerd lijken
- Visuele verwarring

---

## Oplossing

```css
/* Touch-safe hover */
@media (hover: hover) {
  .button:hover {
    background-color: var(--color-primary-400);
    transform: translateY(-1px);
  }
}
```

---

## Aanpak

### Stap 1: Inventarisatie

Categoriseer alle `:hover` rules:

| Type | Aanpak | Voorbeeld |
|------|--------|-----------|
| **Visuele feedback** (bg, color, shadow, transform) | Wrap in `@media (hover: hover)` | `.card:hover { box-shadow: ... }` |
| **Disclosure** (visibility, opacity, display) | Wrap in `@media (hover: hover)` + voeg touch alternatief toe | `.actions:hover { opacity: 1 }` |
| **Focus-equivalent** (outline, ring) | **NIET wrappen** — nodig voor accessibility | `.link:hover { text-decoration: underline }` |
| **State-indicators** (active state visual) | Verplaats naar `:active` | `.btn:hover { opacity: 0.9 }` |

### Stap 2: Script-based wrapping

De bulk (~120 van 150) zijn eenvoudige visuele feedback rules. Script:

1. Parse CSS bestand
2. Vind alle `selector:hover { ... }` blokken
3. Wrap in `@media (hover: hover) { ... }`
4. Merge als er al een `@media (hover: hover)` blok is

**Let op:** Nested media queries (`@media (hover: hover)` binnen `@media (max-width: ...)`) zijn niet toegestaan in vanilla CSS. Gebruik nesting of herstructureer.

### Stap 3: Manuele review voor disclosure patterns

Disclosure hovers (elementen die pas zichtbaar worden bij hover) hebben een touch fallback nodig:

```css
/* Desktop: toon bij hover */
@media (hover: hover) {
  .card:hover .actions {
    opacity: 1;
  }
}

/* Touch: altijd zichtbaar (of via tap/long-press) */
@media (hover: none) {
  .card .actions {
    opacity: 1;
  }
}
```

### Stap 4: z-index tokens aanmaken

Gerelateerd aan hover interacties — voeg z-index tokens toe aan `tokens.css`:

```css
:root {
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 500;
  --z-modal: 1000;
  --z-toast: 1100;
  --z-tooltip: 1200;
  --z-max: 9999;
}
```

---

## Top bestanden

| Bestand | `:hover` rules |
|---------|---------------|
| `CreateWizard.module.css` | ~20 |
| `TopNavbar.module.css` | ~15 |
| `ProjectSeasonDetailPage.module.css` | ~12 |
| `ApprovalsPage.module.css` | ~10 |
| `base.css` | ~8 |

---

## Stylelint uitbreiding

Optioneel: voeg een custom Stylelint regel toe die `:hover` buiten `@media (hover: hover)` detecteert:

```
teamreel/hover-media-query — Enforce :hover inside @media (hover: hover)
```

---

## Verificatie

- [ ] Alle visuele `:hover` states zitten in `@media (hover: hover)`
- [ ] Focus/accessibility hovers zijn behouden
- [ ] Disclosure patterns hebben touch fallbacks
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Mobiel: geen sticky hover states na tap
- [ ] Desktop: hover effects werken nog normaal
- [ ] iPad/tablet: hover werkt bij trackpad, niet bij touch
