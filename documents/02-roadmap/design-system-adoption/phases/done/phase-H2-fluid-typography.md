# H2 — Fluid Typography

**Status:** ✅ Done
**Geschatte effort:** 30 min
**Scope:** 5 `--text-*` tokens upgraden naar `clamp()` + Stylelint update
**Dependency:** Na A5 (alle font-sizes moeten eerst tokenized zijn)

---

## Doel

De typografie tokens upgraden van vaste `rem` waarden naar fluid `clamp()` waarden zodat tekst automatisch schaalt tussen mobiel en desktop. Eén wijziging in `tokens.css` → **hele app schaalt mee**.

---

## Huidige tokens (vast)

```css
--text-xs:   0.75rem;   /* 12px altijd */
--text-sm:   0.875rem;  /* 14px altijd */
--text-base: 1rem;      /* 16px altijd */
--text-lg:   1.25rem;   /* 20px altijd */
--text-xl:   1.5rem;    /* 24px altijd */
```

---

## Nieuwe tokens (fluid)

```css
--text-xs:   clamp(0.6875rem, 0.65rem + 0.19vw, 0.75rem);
/* 11px → 12px (320px → 1280px viewport) */

--text-sm:   clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem);
/* 13px → 14px (320px → 1280px viewport) */

--text-base: clamp(0.9375rem, 0.88rem + 0.31vw, 1rem);
/* 15px → 16px (320px → 1280px viewport) */

--text-lg:   clamp(1.125rem, 1rem + 0.63vw, 1.25rem);
/* 18px → 20px (320px → 1280px viewport) */

--text-xl:   clamp(1.25rem, 1.06rem + 0.94vw, 1.5rem);
/* 20px → 24px (320px → 1280px viewport) */
```

### Formule

```
clamp(min, preferred, max)
preferred = min + (max - min) * ((100vw - 320px) / (1280px - 320px))
         = min + slope * vw
```

Breakpoints: **320px** (smallest mobile) → **1280px** (desktop).

---

## Impact

Doordat alle font-sizes na A5 via `var(--text-*)` lopen, werkt deze change **retroactief op de hele app**. Geen per-file wijzigingen nodig.

### Voor (vast)
- Mobiel 320px: `--text-xl` = 24px (te groot voor kleine schermen)
- Desktop 1440px: `--text-xl` = 24px (zou groter kunnen)

### Na (fluid)
- Mobiel 320px: `--text-xl` = 20px (past beter)
- Desktop 1280px: `--text-xl` = 24px (volledige grootte)
- Tussenmaten: vloeiend geïnterpoleerd

---

## Aanpak

### Stap 1: Update `tokens.css`

Vervang de 5 `--text-*` waarden door `clamp()` varianten.

### Stap 2: Deprecated aliases updaten

```css
/* Deprecated aliases meeschalen */
--text-2xs:  var(--text-xs);    /* al alias, geen change nodig */
--text-md:   var(--text-sm);    /* idem */
--text-2xl:  var(--text-lg);    /* idem */
--text-3xl:  var(--text-xl);    /* idem */
```

### Stap 3: Compound type tokens updaten

```css
--type-xs:   var(--text-xs) / 1.5;
--type-sm:   var(--text-sm) / 1.5;
--type-base: var(--text-base) / 1.5;
--type-lg:   var(--text-lg) / 1.3;
--type-xl:   var(--text-xl) / 1.25;
```

Deze erven automatisch de clamp() waarden — geen wijziging nodig.

### Stap 4: `prefers-reduced-motion` check

Fluid typography met `vw` units is geen motion, maar sommige accessibility tools flaggen het. Geen actie nodig.

### Stap 5: Stylelint update

Update `stylelint-plugin-8pt-grid.cjs` om `clamp()` in font-size te accepteren (als het er al doorkomt).

---

## Optioneel: Extra grote headings

Als A5 `--text-2xl` en `--text-3xl` als echte tokens toevoegt:

```css
--text-2xl:  clamp(1.5rem, 1.25rem + 1.25vw, 2rem);
/* 24px → 32px */

--text-3xl:  clamp(1.75rem, 1.38rem + 1.88vw, 2.5rem);
/* 28px → 40px */
```

---

## Verificatie

- [ ] Alle 5 `--text-*` tokens gebruiken `clamp()`
- [ ] Mobiel (320px): tekst is kleiner maar leesbaar
- [ ] Desktop (1280px): tekst is op maximale grootte
- [ ] Tussenliggende viewports: vloeiende schaling
- [ ] Geen tekst overflow op kleine schermen
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] `prefers-reduced-motion` heeft geen invloed (correct)
