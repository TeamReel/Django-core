# A1 — Radius Token Adoption

**Status:** ✅ Done
**Geschatte effort:** 30 min
**Scope:** 707 hardcoded `border-radius` → `var(--radius-*)` (136 bestanden)

---

## Doel

Alle hardcoded `border-radius` waarden vervangen door design tokens. Dit maakt het mogelijk om per theme/brand de radius aan te passen en zorgt voor visuele consistentie.

---

## Beschikbare tokens

| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--radius-sm` | 4px | Kleine elementen: badges, chips, inline tags |
| `--radius-md` | 8px | Standaard: cards, inputs, buttons, dropdowns |
| `--radius-lg` | 12px | Grote containers: modals, sheets, hero cards |
| `--radius-full` | 9999px | Cirkels: avatars, pills, toggles |

---

## Mapping regels

| Hardcoded waarde | → Token | Rationale |
|-----------------|---------|-----------|
| `2px`, `3px`, `4px` | `var(--radius-sm)` | Allemaal "klein" — snap naar 4px |
| `5px`, `6px`, `8px` | `var(--radius-md)` | Standaard UI radius |
| `10px`, `12px`, `14px`, `16px` | `var(--radius-lg)` | Grote containers |
| `50%`, `9999px`, `100px`, `999px` | `var(--radius-full)` | Cirkel/pill |
| `0` | Behouden als `0` | Bewust scherp |

### Uitzonderingen (NIET vervangen)

- `border-radius` in `@keyframes` blokken
- `border-radius` met `calc()` of `var()` (al tokenized)
- Individuele corners (`border-top-left-radius` etc.) — case-by-case beoordelen
- `border-radius: inherit` / `initial` / `unset`

---

## Aanpak

### Script: `snap_radius_tokens.py`

```python
import re, pathlib

MAPPING = {
    # px values → tokens
    '1px': 'var(--radius-sm)',    # snap up
    '2px': 'var(--radius-sm)',
    '3px': 'var(--radius-sm)',
    '4px': 'var(--radius-sm)',
    '5px': 'var(--radius-md)',
    '6px': 'var(--radius-md)',
    '8px': 'var(--radius-md)',
    '10px': 'var(--radius-lg)',
    '12px': 'var(--radius-lg)',
    '14px': 'var(--radius-lg)',
    '16px': 'var(--radius-lg)',
    '20px': 'var(--radius-lg)',
    '24px': 'var(--radius-lg)',
    '50%': 'var(--radius-full)',
    '100%': 'var(--radius-full)',
    '9999px': 'var(--radius-full)',
    '999px': 'var(--radius-full)',
    '100px': 'var(--radius-full)',
}
```

Draai over alle `.css` / `.module.css` in `demo/src/`, skip `tokens.css` en `theme.css`.

---

## Top bestanden (meeste impact)

| Bestand | Hardcoded |
|---------|-----------|
| `CreateWizard.module.css` | 41 |
| `TopNavbar.module.css` | 41 |
| `ProjectSeasonDetailPage.module.css` | 31 |
| `ApprovalsPage.module.css` | 28 |
| `MatchWizardV2.module.css` | 22 |

---

## Verificatie

- [ ] 0 hardcoded `border-radius` px-waarden (behalve uitzonderingen)
- [ ] `pnpm lint:css` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Visuele steekproef: cards, buttons, modals, avatars
- [ ] Dark mode: radius moet identiek zijn
