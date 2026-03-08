# D1 — Dark Mode Gaps

**Status:** ✅ Done
**Geschatte effort:** 3 uur
**Scope:** 117 CSS modules met hardcoded light kleuren + geen dark mode regels

---

## Doel

117 component CSS modules bevatten hardcoded "light" kleuren (`#fff`, `#fafafa`, `#f5f5f5`, `white`, `rgb(255,...)`) maar geen `[data-theme="dark"]` overrides. Bij dark mode switch worden deze componenten wit/licht tegen een donkere achtergrond.

---

## Top offenders

| Bestand | Hardcoded light | Impact |
|---------|----------------|--------|
| `TopNavbar.module.css` | 12 | 🔴 Altijd zichtbaar |
| `MatchWizard.module.css` | 8 | 🟡 Wizard flow |
| `HierarchyTreeView.module.css` | 4 | 🟡 Org pages |
| `MobileBottomNav.module.css` | 3 | 🔴 Mobiel altijd zichtbaar |
| `MobileTabBar.module.css` | 3 | 🔴 Mobiel |
| `Sidebar.module.css` | 2 | 🔴 Desktop altijd zichtbaar |
| `AssetCompletionMatrix.module.css` | 3 | 🟡 Content pages |
| `ErrorBoundary.module.css` | 2 | 🟡 Error states |
| `MatchWizardLineupStep.module.css` | 3 | 🟡 Wizard |
| `MemberMediaMatrix.module.css` | 2 | 🟡 Member pages |

---

## Aanpak

### Strategie A: Vervang door semantic tokens (voorkeur)

```css
/* Voor: */
.card { background-color: #fff; }

/* Na: */
.card { background-color: var(--app-surface); }
/* Geen dark mode override nodig — semantic token regelt het */
```

### Strategie B: Voeg dark override toe (als semantic token niet past)

```css
.badge { background-color: #f0f0f0; color: #333; }

[data-theme="dark"] .badge {
  background-color: var(--color-neutral-700);
  color: var(--color-neutral-100);
}
```

### Prioriteit

1. **Altijd-zichtbare componenten** (Sidebar, TopNavbar, MobileNav) — eerst
2. **Veelgebruikte componenten** (Card, Modal, Table) — daarna
3. **Feature-specifieke componenten** — als laatste

---

## Verificatie

- [ ] Alle 117 modules geaudit
- [ ] Prioriteit 1 (always-visible) componenten: 0 hardcoded light values
- [ ] Dark mode toggle: geen witte flashes
- [ ] `npx stylelint` = 0 violations
- [ ] `npx vite build` slaagt
