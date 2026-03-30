# T1 — Token & Typography Foundation

**Status:** ✅ Done
**Voltooid:** 2026-03-08 (commit 26bd78c6)
**Geschatte effort:** 25 min
**Bestanden:**
- `demo/src/styles/tokens.css`
- `demo/src/styles/theme.css`
- `demo/src/styles/base.css`
- `packages/design-system/src/tokens/radius.css.ts`
- `packages/design-system/src/tokens/typography.css.ts`

---

## Doel

Font-size schaal vereenvoudigen naar **5 stappen**, font-family tokens toevoegen, line-height koppelen aan font-sizes, en radius tokens op grid brengen.

---

## 1. Font-size schaal: 9 → 5 stappen

### Huidige schaal (te granulair)

```
10  11  12  13  14  16  18  20  24   ← 9 stappen, verschil 11↔12 en 13↔14 nauwelijks zichtbaar
```

### Nieuwe schaal (5 stappen)

| Token | Nieuw | Oud | Rol | Gebruik |
|-------|-------|-----|-----|---------|
| `--text-xs` | **12px** (0.75rem) | 11px | Caption | badges, timestamps, meta-labels |
| `--text-sm` | **14px** (0.875rem) | 14px | Body small | secondary text, form labels |
| `--text-base` | **16px** (1rem) | 16px | Body | standaard leestekst, inputs |
| `--text-lg` | **20px** (1.25rem) | 20px | Title | pagina-subtitels, card headers |
| `--text-xl` | **24px** (1.5rem) | 24px | Heading | pagina-titels, hero text |

### Verwijderde tokens (migratie nodig)

| Verwijderd | Waarde | Migreer naar |
|------------|--------|--------------|
| `--text-2xs` | 10px | `--text-xs` (12px) — of hardcode `0.625rem` voor micro-badges |
| `--text-md` | 13px | `--text-sm` (14px) |
| `--text-xl` (oud 18px) | 18px | `--text-lg` (20px) of hardcode voor specifieke heading |
| `--text-2xl` | 20px | `--text-lg` (20px) — zelfde waarde, andere naam |
| `--text-3xl` | 24px | `--text-xl` (24px) — zelfde waarde, andere naam |

### Design-system typography.css.ts: ook 5 stappen

Sync de `packages/design-system/src/tokens/typography.css.ts` met dezelfde 5-stappen schaal:

```ts
// Nieuw
export const fontSize = {
  xs: '12px',   // 0.75rem
  sm: '14px',   // 0.875rem
  md: '16px',   // 1rem (= base)
  lg: '20px',   // 1.25rem
  xl: '24px',   // 1.5rem
};
```

Verwijder `2xl`, `3xl`, `4xl` uit typography tokens. Voeg eventueel `--text-display: 32px` toe als er grotere headings nodig zijn.

---

## 2. Font-family tokens

Momenteel hardcoded in `base.css`. Maak tokens:

```css
/* tokens.css — toevoegen */
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  --font-mono: source-code-pro, Menlo, Monaco, Consolas, 'Courier New', monospace;
}
```

```css
/* base.css — wijzig */
body {
  font-family: var(--font-sans);  /* was: hardcoded stack */
}

code {
  font-family: var(--font-mono);  /* was: hardcoded stack */
}
```

Voordeel: later makkelijk switchen naar branded font (Inter, club-specifiek font).

---

## 3. Line-height koppeling

Huidige situatie: losse `--leading-*` tokens die niet aan font-sizes gekoppeld zijn.

### Compound tokens toevoegen

```css
/* tokens.css — toevoegen na font-size scale */
:root {
  /* Compound: font-size / line-height per rol */
  --type-xs:   var(--text-xs) / 1.5;     /* 12px / 18px — caption */
  --type-sm:   var(--text-sm) / 1.5;     /* 14px / 21px — body small */
  --type-base: var(--text-base) / 1.5;   /* 16px / 24px — body */
  --type-lg:   var(--text-lg) / 1.3;     /* 20px / 26px — title */
  --type-xl:   var(--text-xl) / 1.25;    /* 24px / 30px — heading */
}
```

Gebruik: `font: var(--type-base);` — zet font-size + line-height in één keer.

**Optioneel:** Dit is een progressive enhancement. Bestaande code blijft werken, nieuwe code kan de compound tokens gebruiken.

---

## 4. Radius tokens

| Token | Huidig | Voorstel | Change |
|-------|--------|----------|--------|
| `radius.sm` | 2px | **4px** | +2px |

```ts
// packages/design-system/src/tokens/radius.css.ts
// Was: sm: '2px'
// Wordt: sm: '4px'
```

---

## Migratie-aanpak

### Stap 1: tokens.css bijwerken
- Verwijder `--text-2xs`, `--text-md`, `--text-xl` (18px), `--text-2xl`, `--text-3xl`
- Hernummer: `--text-xs` (12px), `--text-sm` (14px), `--text-base` (16px), `--text-lg` (20px), `--text-xl` (24px)
- Voeg `--font-sans`, `--font-mono` toe
- Voeg `--type-*` compound tokens toe

### Stap 2: grep alle verwijderde tokens
```bash
grep -rn "text-2xs\|text-md\|text-2xl\|text-3xl" demo/src/
```
Vervang elk voorkomen door de juiste nieuwe token.

### Stap 3: grep hardcoded font-sizes die nu een token hebben
```bash
grep -rn "font-size:\s*\(11\|13\|18\)px" demo/src/
```
Vervang door de dichtstbijzijnde token.

### Stap 4: base.css font-family → token
### Stap 5: radius.css.ts sm → 4px

## Verificatie

- [ ] `tsc --noEmit` — geen TypeScript errors
- [ ] Grep: geen verwijderde tokens meer in codebase
- [ ] Visueel check: badges/labels (was 10-11px, nu 12px)
- [ ] Visueel check: body text (was mix 13-14px, nu consistent 14px)
- [ ] Visueel check: headings (was 18-20px, nu 20px)
- [ ] Font-family: body en code blocks zien er identiek uit
- [ ] Grep `radius.*sm` in design-system — check visueel effect
