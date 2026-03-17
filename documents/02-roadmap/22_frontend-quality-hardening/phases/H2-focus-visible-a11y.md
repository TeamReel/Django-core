# H2 — Focus-Visible & Accessibility Pass

> **Status:** 📋 Todo
> **Effort:** 2-3 uur
> **Impact:** 53 CSS modules WCAG 2.1 AA-compliant voor keyboard navigatie

---

## Doel

Voeg `:focus-visible` stijlen toe aan alle interactieve elementen (buttons, links, inputs, selects, custom controls) in CSS modules die deze nog missen.

## Scope

53 CSS module bestanden in `demo/src/` die interactieve elementen stylen maar geen `:focus-visible` declaratie bevatten.

## Prioriteit (interactieve componenten eerst)

| # | Bestand | Reden |
|---|---------|-------|
| 1 | `TopNavbar.module.css` | Hoofdnavigatie — elke pagina |
| 2 | `Sidebar.module.css` | Navigatie — elke pagina |
| 3 | `SearchBar.module.css` | Veelgebruikte interactie |
| 4 | `MobileTabBar.module.css` | Mobiele hoofdnavigatie |
| 5 | `MediaAssetCard.module.css` | Contentkaart — klikbaar |
| 6 | `MatchWizard*.module.css` | Multi-step interactie |
| 7-53 | Overige bestanden | Batch-gewijs afronden |

## Werkwijze

1. **Grep** alle `.module.css` bestanden die GEEN `:focus-visible` bevatten:
   ```bash
   grep -rL "focus-visible" demo/src/**/*.module.css
   ```
2. **Identificeer** interactieve selectors: `.btn`, `.link`, `button`, `a`, `input`, `select`, `[role="button"]`, `.tab`, `.card` (klikbaar)
3. **Voeg toe** naast elke `:hover`:
   ```css
   .selector:focus-visible {
     outline: 2px solid var(--app-focus-ring, var(--color-primary));
     outline-offset: 2px;
   }
   ```
4. **Verwijder** eventuele `outline: none` zonder bijbehorende `:focus-visible` fallback
5. **Test** keyboard navigatie (Tab door de pagina)

## Standaard focus ring

```css
/* Gebruik dit als standaard voor alle interactieve elementen */
:focus-visible {
  outline: 2px solid var(--app-focus-ring, var(--color-primary));
  outline-offset: 2px;
}
```

## Verificatie

```bash
cd demo && npx tsc --noEmit && npx vite build
```

Optioneel: Keyboard navigatie test met Playwright MCP.

## Acceptatiecriteria

- [ ] Alle 53 bestanden hebben `:focus-visible` op interactieve elementen
- [ ] Geen `outline: none` zonder bijbehorende `:focus-visible`
- [ ] Focus ring is visueel zichtbaar bij Tab-navigatie
- [ ] `vite build` slaagt
- [ ] Geen visuele regressies in normal flow

## Commit

```
style(a11y): add focus-visible styles to 53 CSS modules — roadmap 22 H2
```
