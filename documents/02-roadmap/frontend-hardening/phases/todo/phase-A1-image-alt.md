# A1 — Image Alt Text

**Status:** 🔲 Todo
**Effort:** 2 uur
**Scope:** 41 `<img>` tags zonder `alt` attribute → WCAG-compliant

---

## Doel

Elke `<img>` tag heeft een descriptief `alt` attribute (of `alt=""` voor decoratieve images).

## Current State

- 80 totale `<img>` tags in de codebase
- 41 zonder `alt` attribute (51%)
- WCAG 2.1 AA vereist: elk `<img>` MOET `alt` hebben

## Aanpak

### Categorieën
1. **Content images** (user avatars, logos, media) → descriptief alt: `alt={user.name}` of `alt="Club logo"`
2. **Decoratieve images** (icons, backgrounds) → `alt=""` (lege string, niet weglaten)
3. **Dynamic images** (media library, uploads) → `alt={item.title || 'Uploaded media'}`

### Stappen
1. Zoek alle `<img` zonder `alt=` in `.tsx` files (excl `_archive`)
2. Per file: bepaal of image content of decoratief is
3. Voeg passend `alt` attribuut toe
4. Voeg ESLint rule `jsx-a11y/alt-text` toe aan config (error, niet warn)

## Verificatie

- [ ] 0 `<img>` tags zonder `alt` attribute
- [ ] `jsx-a11y/alt-text` ESLint rule actief
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
