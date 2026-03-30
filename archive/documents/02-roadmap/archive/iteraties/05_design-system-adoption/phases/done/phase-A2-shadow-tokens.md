# A2 — Shadow Token Adoption

**Status:** ✅ Done
**Geschatte effort:** 30 min
**Scope:** 28 hardcoded `box-shadow` → `var(--shadow-*)` (16 bestanden)

---

## Doel

Alle hardcoded `box-shadow` waarden vervangen door elevation tokens. Dit maakt het shadow-systeem consistent en dark-mode-aware (tokens passen automatisch aan).

---

## Beschikbare tokens

| Token | Waarde (light) | Gebruik |
|-------|---------------|---------|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtiel: inputs, small cards |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Standaard: cards, dropdowns |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), ...` | Elevated: floating cards, popovers |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), ...` | High: modals, command palette |
| `--shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), ...` | Highest: dragging, hero elements |

Dark mode tokens zijn al gedefinieerd met sterkere shadows.

---

## Mapping strategie

Omdat box-shadow waarden enorm variëren (custom rgba, inset, multi-layer), is een eenvoudige string match niet genoeg. Aanpak:

### Categorie 1: Exacte of near-exacte matches (script)
Patterns die direct mappen:
- `0 1px 2px ...` → `--shadow-xs`
- `0 1px 3px ...` → `--shadow-sm`
- `0 2px 4px ...` / `0 4px 6px ...` → `--shadow-md`
- `0 10px 15px ...` / `0 8px 16px ...` → `--shadow-lg`
- `0 20px 25px ...` → `--shadow-xl`

### Categorie 2: Manueel (case-by-case)
- `inset` shadows — behouden (geen token voorzien)
- `box-shadow: none` → behouden
- Focus ring shadows (bijv. `0 0 0 3px rgba(...)`) → behouden
- Gekleurde shadows (bijv. `0 4px 12px rgba(59, 142, 165, 0.3)`) → case-by-case

### Categorie 3: `box-shadow: none !important`
- Behouden — dit zijn bewuste resets

---

## Aanpak

1. **Script ronde 1** — Vervang bekende patronen (geschat ~60 van 110)
2. **Manuele ronde 2** — Inspecteer resterende ~50, categoriseer als:
   - a) Past in bestaand token → vervangen
   - b) Inset/focus/custom → behouden
3. **Stylelint check** — Nieuwe custom regel overwegen: `teamreel/no-hardcoded-shadow`

---

## Top bestanden

| Bestand | Hardcoded |
|---------|-----------|
| `CreateWizard.module.css` | 10 |
| `TopNavbar.module.css` | 6 |
| `base.css` | 6 |
| `ApprovalsPage.module.css` | 5 |
| `MatchWizard.module.css` | 4 |

---

## Verificatie

- [ ] Alle standaard elevation shadows gebruiken tokens
- [ ] Inset / focus / custom shadows zijn bewust behouden
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Dark mode: shadows zijn automatisch sterker (token-based)
- [ ] Visuele steekproef: cards, modals, dropdowns, hover states
