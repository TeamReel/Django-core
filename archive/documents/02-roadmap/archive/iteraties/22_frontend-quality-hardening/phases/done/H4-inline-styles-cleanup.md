# H4 — Inline Styles → CSS Modules

> **Status:** 📋 Todo
> **Effort:** 1-2 uur
> **Impact:** ~6 bestanden, ~45+ statische inline styles → CSS module classes

---

## Doel

Vervang statische/hardcoded inline `style={{}}` door CSS module classes. Dynamische styles (berekende waarden op basis van JS/API data) mogen inline blijven.

## Doelbestanden

| # | Bestand | Inline styles | Type |
|---|---------|---------------|------|
| 1 | `demo/src/components/NavbarQuickReviewModal.tsx` | 13 | Statische hardcoded waarden |
| 2 | `demo/src/components/dashboard/ContentBreakdownCard.tsx` | 8 | Statische hardcoded pixels |
| 3 | `demo/src/components/dashboard/MediaReadinessCard.tsx` | 8 | Statische layout waarden |
| 4 | `demo/src/components/dashboard/MemberContentProgressCard.tsx` | 5 | Statische waarden |
| 5 | `demo/src/components/dashboard/AssetsOverviewCard.tsx` | 4 | Statische waarden |

## Werkwijze

1. **Per bestand:**
   - Identificeer alle `style={{}}` attributen
   - Categoriseer: **statisch** (→ verplaats naar CSS module) vs **dynamisch** (→ laat staan)
2. **Maak CSS classes** aan in bijbehorende `.module.css`
3. **Vervang** `style={{padding: '12px'}}` → `className={styles.container}`
4. **Gebruik design tokens** waar mogelijk: `padding: var(--space-3)` ipv `padding: 12px`
5. **Markeer** dynamische inline styles met comment: `{/* dynamic: depends on API data */}`

## Voorbeeld transformatie

```tsx
// ❌ Voor
<div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>

// ✅ Na
<div className={styles.cardContainer}>
```

```css
/* In .module.css */
.cardContainer {
  padding: var(--space-4);
  background: var(--app-surface-secondary);
  border-radius: var(--radius-md);
}
```

## Verificatie

```bash
cd demo && npx tsc --noEmit && npx vite build
```

## Acceptatiecriteria

- [ ] Alle 5 bestanden: 0 statische inline styles
- [ ] Dynamische inline styles zijn gedocumenteerd met comment
- [ ] Nieuwe CSS classes gebruiken design tokens
- [ ] `tsc --noEmit` slaagt
- [ ] `vite build` slaagt

## Commit

```
refactor(components): move static inline styles to CSS modules — roadmap 22 H4
```
