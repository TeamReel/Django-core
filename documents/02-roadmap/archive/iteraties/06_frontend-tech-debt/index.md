# Frontend Technical Debt — Cleanup Roadmap

**Status:** ✅ Voltooid (12/12 fases)
**Aangemaakt:** 2026-03-08
**Vorige roadmap:** `design-system-adoption/` (11/11 ✅ voltooid)

---

## Context

De design-system-adoption roadmap heeft ~4.800 hardcoded CSS-waarden getokenized en cascade layers geïntroduceerd. Maar **inline styles in TSX/TS** (`style={{}}`) zijn grotendeels onaangeraakt. Daarnaast zijn er bredere code-quality issues.

## Audit Resultaten (8 maart 2026)

| Categorie | Aantal | Bestanden |
|-----------|--------|-----------|
| **Inline `style={{}}`** | 448 | 635 actieve TSX/TS |
| **Inline `borderRadius`** (hardcoded) | 134 | — |
| **Inline `fontSize`** (hardcoded) | 229 | — |
| **Inline `fontWeight`** (hardcoded) | 114 | — |
| **Inline `padding/margin`** (hardcoded px) | 166 | — |
| **Inline `color: '#hex'`** | 111 | — |
| **Inline `backgroundColor: '#hex'`** | 23 | — |
| **Inline `boxShadow`** (raw rgba) | 16 | — |
| **Inline `gap`** (hardcoded) | 81 | — |
| **Inline `zIndex`** (hardcoded) | 10 | — |
| **CSS `rgba()`** (no token) | 467 | 225 actieve CSS |
| **CSS hardcoded hex** | ~122 | — |
| **CSS `border-radius` off-scale** | 9 | — |
| **CSS `!important`** (na @layer) | 269 | — |
| **`: any` type** | 2.002 | — |
| **`console.log/warn/error`** | 374 | — |
| **Empty catch blocks** | 371 / 588 | — |
| **`onClick` op div/span** (missing role) | 33 | — |
| **Dark mode gaps** (hardcoded light + no dark) | 117 modules | — |
| **Breakpoint inconsistentie** | 10 waarden vs 5 tokens | — |
| **Large CSS files** (>500 lines) | 10 bestanden | — |
| **Large TSX files** (>300 lines) | 10+ bestanden | — |
| **Test coverage** | 2 test files / 137 testable targets | — |

## Fasering — 3 Tracks

### Track I — Inline Style Tokenisatie (visuele consistentie)

| Fase | Naam | Scope | Waarden | Effort | Status |
|------|------|-------|---------|--------|--------|
| **I1** | CSS Pill Radius Fix | `1000px/10000px` → `var(--radius-full)` in CSS modules | 9 | 15 min | ✅ Done |
| **I2** | CSS Hardcoded Hex Cleanup | Resterende hex colors → tokens in CSS modules | 57 | 45 min | ✅ Done |
| **I3** | Inline Border-Radius → Tokens | `borderRadius: N` → `var(--radius-*)` in TSX | 36 | 1 uur | ✅ Done |
| **I4** | Inline Typography → Tokens | `fontSize` + `fontWeight` → tokens | 39 | 1.5 uur | ✅ Done |
| **I5** | Inline Spacing → Tokens | `padding/margin/gap` → tokens | 159 | 1.5 uur | ✅ Done |
| **I6** | Inline Colors → Tokens | `color/backgroundColor: '#hex'` → tokens | 47 | 1 uur | ✅ Done |
| **I7** | Inline Shadow + Z-index | `boxShadow/zIndex` → tokens | 22 | 30 min | ✅ Done |

### Track C — Code Quality

| Fase | Naam | Scope | Waarden | Effort | Status |
|------|------|-------|---------|--------|--------|
| **C1** | Console Cleanup | `console.log/warn/error` → proper logging of verwijderen | 131 | 1 uur | ✅ Done |
| **C2** | TypeScript `any` Audit | Meest-gebruikte `any` → typed interfaces (catch params) | 51 | 4 uur | ✅ Done |
| **C3** | Error Handling | Empty catch → proper error handling/logging | 370 | 2 uur | ✅ Done |

### Track D — Dark Mode & Accessibility

| Fase | Naam | Scope | Waarden | Effort | Status |
|------|------|-------|---------|--------|--------|
| **D1** | Dark Mode Gaps | Hardcoded light colors → semantic tokens in 117 modules | 466 | 3 uur | ✅ Done |
| **D2** | Accessibility Quick Wins | `onClick` div/span → `role="button"` + `tabIndex`, icon buttons → `aria-label` | 50 | 1 uur | ✅ Done |

## Volgorde

```
I1 (pill radius) → I2 (hex cleanup) → I3 (inline radius) → I6 (inline colors) → I4 (typography) → I5 (spacing) → I7 (shadow+z) → D1 (dark mode) → D2 (a11y) → C1 (console) → C2 (any) → C3 (errors)
```

**Rationale:**
- **I1–I3** eerst — lost direct visuele inconsistenties op (vierkant vs rond)
- **I6** daarna — kleuren zijn het meest zichtbaar na radius
- **I4–I5** — typografie en spacing, bulk maar mechanisch
- **I7** — kleinste inline set, afronder
- **D1–D2** — dark mode en a11y zijn UX-kritisch
- **C1–C3** — code quality als laatst, geen visueel effect

## Aanpak

**I-track:** Python-scripts (zoals eerdere fases) die TSX inline styles regex-matig tokeniseren. Let op: inline styles in TSX kunnen geen `var()` gebruiken in alle gevallen — sommige moeten naar CSS modules verhuizen.

**C-track:** Handmatig + geautomatiseerd. Console.log kan geautomatiseerd, `any` en error handling vereisen context.

**D-track:** Per-component semantic token migratie. 117 modules × gemiddeld 2 waarden = ~234 replacements.
