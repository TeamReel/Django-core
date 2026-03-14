# A5 — Font-size Token Adoption

**Status:** ✅ Done
**Geschatte effort:** 45 min
**Scope:** 900 hardcoded `font-size` → `var(--text-*)` (145 bestanden)

---

## Doel

Alle hardcoded `font-size` waarden vervangen door de 5-stappen typografie tokens. Dit dwingt de visuele hiërarchie af en maakt fluid typography (H2) mogelijk.

---

## Beschikbare tokens

| Token | Waarde | px equiv. | Gebruik |
|-------|--------|-----------|---------|
| `--text-xs` | 0.75rem | 12px | Captions, badges, timestamps, meta |
| `--text-sm` | 0.875rem | 14px | Secondary text, form labels, nav |
| `--text-base` | 1rem | 16px | Body, inputs, default |
| `--text-lg` | 1.25rem | 20px | Card headers, subtitles |
| `--text-xl` | 1.5rem | 24px | Page titles, hero text |

---

## Mapping regels

### rem waarden

| Hardcoded | → Token |
|-----------|---------|
| `0.625rem` (10px) | `var(--text-xs)` — snap up |
| `0.6875rem` (11px) | `var(--text-xs)` — snap up |
| `0.75rem` (12px) | `var(--text-xs)` |
| `0.8125rem` (13px) | `var(--text-sm)` — snap up |
| `0.875rem` (14px) | `var(--text-sm)` |
| `0.9375rem` (15px) | `var(--text-base)` — snap up |
| `1rem` (16px) | `var(--text-base)` |
| `1.0625rem` (17px) | `var(--text-base)` — snap down |
| `1.125rem` (18px) | `var(--text-lg)` — snap up* |
| `1.25rem` (20px) | `var(--text-lg)` |
| `1.375rem` (22px) | `var(--text-xl)` — snap up |
| `1.5rem` (24px) | `var(--text-xl)` |

*18px → `--text-lg` (20px): +2px, meest controversieel. Alternatief: behouden als hardcoded.

### px waarden

| Hardcoded | → Token |
|-----------|---------|
| `10px`, `11px` | `var(--text-xs)` |
| `12px` | `var(--text-xs)` |
| `13px` | `var(--text-sm)` |
| `14px` | `var(--text-sm)` |
| `15px` | `var(--text-base)` |
| `16px` | `var(--text-base)` |
| `18px` | `var(--text-lg)` |
| `20px` | `var(--text-lg)` |
| `24px` | `var(--text-xl)` |

### Buiten bereik (> 24px)

Waarden boven 24px komen sporadisch voor (hero, splash):
- `28px`, `32px`, `36px`, `48px` → **behouden als hardcoded** of voeg `--text-2xl` / `--text-3xl` toe

**Aanbeveling:** Voeg toe aan `tokens.css` als ze > 5x voorkomen:
```css
--text-2xl: 2rem;     /* 32px — dashboard hero, large headers */
--text-3xl: 2.5rem;   /* 40px — splash, onboarding */
```

### Uitzonderingen (NIET vervangen)

- `font-size: inherit` / `initial` / `unset`
- `font-size: 0` (accessibility trick)
- `font-size` in `@keyframes` blokken
- `font-size` in `svg` / icon-specifieke context
- `font-size` al met `var()` / `calc()` / `clamp()`

---

## Aanpak

### Script: `snap_font_size_tokens.py`

Twee passes:
1. **rem waarden** — regex: `font-size:\s*([\d.]+)rem`
2. **px waarden** — regex: `font-size:\s*(\d+)px`

Map elke match naar nearest token. Skip als regel al `var(` bevat.

### Volgorde

1. Draai script → review diff
2. Controleer of 18px→20px-snaps visueel OK zijn (meest gevoelig)
3. Beslis over `--text-2xl` / `--text-3xl` op basis van count
4. Commit

---

## Top bestanden

| Bestand | Hardcoded |
|---------|-----------|
| `CreateWizard.module.css` | 71 |
| `ProjectSeasonDetailPage.module.css` | 66 |
| `ApprovalsPage.module.css` | 50 |
| `TopNavbar.module.css` | 42 |
| `MatchDetailPage.module.css` | 35 |

---

## Verificatie

- [ ] Alle font-sizes gebruiken `var(--text-*)` tokens
- [ ] Geen visuele hiërarchie-breuken (headings nog groter dan body)
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Mobiel: tekst nog leesbaar, geen overflow
- [ ] Dashboard, Wizard, Match Detail steekproef
