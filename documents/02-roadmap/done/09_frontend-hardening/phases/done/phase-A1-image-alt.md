# A1 — Image Alt Text

**Status:** ✅ Done
**Effort:** 0 uur (al voldaan)
**Scope:** 41 `<img>` tags zonder `alt` attribute → WCAG-compliant

---

## Doel

Elke `<img>` tag heeft een descriptief `alt` attribute (of `alt=""` voor decoratieve images).

## Resultaat

- 80 totale `<img>` tags in de codebase
- **0 zonder `alt` attribute** — alle 80 hebben al `alt`
- Originele meting (41) was een false positive door line-based grep (multi-line JSX tags)

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

- [x] 0 `<img>` tags zonder `alt` attribute (al voldaan: 80/80 hebben alt)
- [ ] `jsx-a11y/alt-text` ESLint rule actief (toekomstige guard)
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green
