# CSS2 — Static Inline Styles → CSS Modules

**Status:** ✅ Done
**Effort:** 4 uur
**Scope:** Static inline styles: 715 → 102 (excl archive)

---

## Doel

Van de 854 inline `style={{}}`, zijn ~400 statisch (vaste waarden die niet afhangen van props/state). Deze horen in CSS modules, niet in JSX.

## Onderscheid

| Type | Voorbeeld | Actie |
|------|-----------|-------|
| **Statisch** | `style={{ display: 'flex', gap: 'var(--space-4)' }}` | → CSS module class |
| **Dynamisch** | `style={{ width: `${progress}%` }}` | Laten (of CSS custom property) |
| **Conditioneel** | `style={{ color: isActive ? 'green' : 'gray' }}` | → CSS module + conditional class |

## Aanpak

1. Script detecteert statische inline styles (geen template literals, geen ternaries, geen variabelen)
2. Genereer CSS class in bijbehorende `.module.css`
3. Vervang `style={{...}}` door `className={styles.xxx}`
4. Handmatige review voor edge cases

## Verificatie

- [x] Static inline styles < 50 (van ~400)
- [x] Dynamische inline styles ongewijzigd
- [x] `npx vite build` slaagt
