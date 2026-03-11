# S2 — Page Inline Styles

**Status:** 🔲 Todo
**Effort:** 8 uur
**Scope:** 118 inline `style={{...}}` in `pages/` → CSS Modules

---

## Doel

Inline styles in page components verplaatsen naar CSS Modules.

## Current State

- 118 `style={{...}}` in `pages/` directory
- Pages gebruiken al grotendeels CSS Modules
- Inline styles zijn vaak quick-fixes die niet terug-gerefactored zijn

## Aanpak

### Prioriteit per page area

| Directory | ~Count | Prioriteit |
|-----------|--------|------------|
| `pages/identity/` | ~30 | Hoog (meeste traffic) |
| `pages/periods/` | ~20 | Hoog |
| `pages/config/` | ~15 | Medium |
| `pages/content/` | ~12 | Medium |
| `pages/aistudio/` | ~10 | Medium |
| Rest | ~31 | Laag |

### Stappen (per page)
1. Identificeer alle `style={{...}}`
2. Groepeer vergelijkbare styles
3. Maak/extend `PageName.module.css`
4. Vervang inline door className
5. Dynamic values → CSS custom properties

### Dynamic styles die mogen blijven
- `style={{ '--color': brandColor }}` (runtime brand theming)
- `style={{ transform: \`translateX(${offset}px)\` }}` (animation values)
- `style={{ gridTemplateColumns: dynamicColumns }}` (computed layouts)

## Verificatie

- [ ] < 20 `style={{...}}` in `pages/` (alleen dynamic values)
- [ ] Visueel geen regressies
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
