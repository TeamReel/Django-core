# A6 — Spacing Token Adoption

**Status:** ✅ Done
**Geschatte effort:** 2 uur
**Scope:** 2.111 hardcoded `padding`/`margin`/`gap` → `var(--space-*)` (202 bestanden)

---

## Doel

Alle hardcoded spacing waarden vervangen door spacing tokens. Dit is de **grootste fase** (~33% van alle token gaps) en maakt het spacing systeem volledig tokenized.

---

## Beschikbare tokens

| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--space-0` | 0px | Reset |
| `--space-1` | 4px | Tight: icon gap, badge padding |
| `--space-2` | 8px | Standard small: inline padding, small gaps |
| `--space-3` | 12px | Medium-small: card padding (mobile), list gaps |
| `--space-4` | 16px | Standard: card padding, section gaps |
| `--space-5` | 20px | Medium-large: content area padding |
| `--space-6` | 24px | Large: section separators, modal padding |
| `--space-8` | 32px | XL: page margins, hero spacing |
| `--space-10` | 40px | 2XL: section dividers |
| `--space-12` | 48px | 3XL: major sections |
| `--space-16` | 64px | 4XL: page-level spacing |

---

## Mapping regels

| Hardcoded | → Token |
|-----------|---------|
| `0`, `0px` | `0` (geen token nodig) |
| `4px` | `var(--space-1)` |
| `8px` | `var(--space-2)` |
| `12px` | `var(--space-3)` |
| `16px` | `var(--space-4)` |
| `20px` | `var(--space-5)` |
| `24px` | `var(--space-6)` |
| `32px` | `var(--space-8)` |
| `40px` | `var(--space-10)` |
| `48px` | `var(--space-12)` |
| `64px` | `var(--space-16)` |

### Shorthand properties

De meeste spacing declarations zijn shorthands:

```css
/* Voor */
padding: 16px 24px;
margin: 0 8px 16px;

/* Na */
padding: var(--space-4) var(--space-6);
margin: 0 var(--space-2) var(--space-4);
```

**Dit maakt het script complexer** — elke waarde in een shorthand moet individueel gemapt worden.

### Negatieve waarden

```css
/* margin: -8px → calc(var(--space-2) * -1) — te verbose */
```

**Aanbeveling:** Negatieve waarden behouden als hardcoded. Ze zijn zeldzaam en de `calc()` variant is minder leesbaar.

### Uitzonderingen (NIET vervangen)

- Waarden die niet op exact grid liggen (bijv. `2px`, `6px` in margins) — al gesnapped door G1, maar tokenizen zou de waarde veranderen
- `auto`, `inherit`, `initial`, `unset`
- `calc()`, `env()`, `clamp()` expressions
- Negatieve waarden (`-4px`, `-8px` etc.)
- `padding` / `margin` in `@keyframes`
- Waarden al met `var()`
- Waarden in `%`, `em`, `rem`, `vh`, `vw`

---

## Aanpak

### Stap 1: Eenvoudige properties (gap, padding-top, margin-left, etc.)

Regex: `(gap|padding-top|padding-right|padding-bottom|padding-left|margin-top|margin-right|margin-bottom|margin-left):\s*(\d+)px`

Directe 1-op-1 vervanging. Geschat **~800 waarden**.

### Stap 2: Shorthand met enkele waarde

`padding: 16px;` / `margin: 8px;` / `gap: 12px;`

Regex: `(padding|margin|gap):\s*(\d+)px\s*;`

Geschat **~400 waarden**.

### Stap 3: Shorthand met 2 waarden

`padding: 8px 16px;`

Regex: `(padding|margin):\s*(\d+)px\s+(\d+)px\s*;`

Geschat **~600 waarden**.

### Stap 4: Shorthand met 3-4 waarden

`padding: 8px 16px 12px;` / `margin: 4px 8px 4px 8px;`

Complexer — per waarde mappen. Geschat **~200 waarden**.

### Stap 5: Mixed shorthands

`padding: 0 16px;` / `margin: 0 auto;`

`0` niet tokenizen (overbodig), `auto` skippen. Geschat **~500 waarden**.

---

## Top bestanden

| Bestand | Hardcoded spacing |
|---------|-------------------|
| `CreateWizard.module.css` | ~156 |
| `ProjectSeasonDetailPage.module.css` | ~115 |
| `TopNavbar.module.css` | ~86 |
| `ApprovalsPage.module.css` | ~83 |
| `AIStudioPage.module.css` | ~69 |

---

## Verificatie

- [ ] Alle `Npx` spacing waarden die matchen met tokens zijn vervangen
- [ ] Negatieve waarden, %, em, auto — ongewijzigd
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Visuele check: layout spacings identiek (pixel-perfect)
- [ ] Mobiel: geen overflow door te veel/weinig spacing
- [ ] Wizard, Dashboard, Activity detail steekproef
