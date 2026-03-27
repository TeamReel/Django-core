# A4 — Font-weight Token Adoption

**Status:** ✅ Done
**Geschatte effort:** 30 min
**Scope:** 586 hardcoded `font-weight` → `var(--font-*)` (124 bestanden)

---

## Doel

Alle hardcoded `font-weight` numerieke waarden vervangen door semantische tokens. Dit maakt gewicht-aanpassingen per theme/brand mogelijk en verbetert leesbaarheid.

---

## Beschikbare tokens

| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--font-normal` | 400 | Body text, descriptions |
| `--font-medium` | 500 | Labels, emphasis, nav items |
| `--font-semibold` | 600 | Subtitles, card headers, buttons |
| `--font-bold` | 700 | Page titles, strong emphasis |
| `--font-extrabold` | 800 | Hero text, brand elements |

---

## Mapping regels

| Hardcoded | → Token | Rationale |
|-----------|---------|-----------|
| `400`, `normal` | `var(--font-normal)` | Directe match |
| `500` | `var(--font-medium)` | Directe match |
| `600` | `var(--font-semibold)` | Directe match |
| `650` | `var(--font-semibold)` | Exists niet — snap naar 600 |
| `700`, `bold` | `var(--font-bold)` | Directe match |
| `800` | `var(--font-extrabold)` | Directe match |
| `900` | `var(--font-extrabold)` | Geen token voor 900 — snap naar 800 |

### Nieuw token overwegen

`font-weight: 900` komt voor — optie:
- **A)** Snap naar `--font-extrabold` (800) — minimaal verschil
- **B)** Voeg `--font-black: 900` toe — als het visueel verschil maakt

**Aanbeveling:** Optie A (80/20 — 900 is nauwelijks te onderscheiden van 800)

### Uitzonderingen (NIET vervangen)

- `font-weight: inherit` / `initial` / `unset`
- `font-weight` in `@keyframes` blokken
- `font-weight` al met `var()` (al tokenized)

---

## Aanpak

### Script: `snap_font_weight_tokens.py`

Eenvoudige regex: `font-weight:\s*(400|500|600|650|700|800|900|normal|bold)\b`

Vervang met corresponderende token. Let op:
- `font-weight: bold` → `var(--font-bold)` (keyword, niet numeriek)
- `font-weight: normal` → `var(--font-normal)` (keyword)
- Skip als al `var(` bevat

---

## Top bestanden

| Bestand | Hardcoded |
|---------|-----------|
| `CreateWizard.module.css` | 40 |
| `ProjectSeasonDetailPage.module.css` | 32 |
| `TopNavbar.module.css` | 28 |
| `ApprovalsPage.module.css` | 25 |
| `MatchDetailPage.module.css` | 18 |

---

## Verificatie

- [ ] 0 numerieke/keyword `font-weight` waarden (behalve uitzonderingen)
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Visuele check: headings, buttons, labels, nav items
- [ ] Geen onverwachte gewichtsveranderingen (650→600, 900→800)
