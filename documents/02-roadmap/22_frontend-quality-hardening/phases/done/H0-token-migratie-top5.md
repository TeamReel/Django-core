# H0 — Token Migratie: Top 5 CSS-bestanden

> **Status:** ✅ Done
> **Effort:** 4-6 uur
> **Impact:** ~450 hardcoded kleuren → design tokens
> **Resultaat:** 270 hex fallbacks + 17 rgba fallbacks + 53 bare rgba's → tokens

---

## Doel

Vervang alle hardcoded hex (`#xxx`) en `rgba()` kleuren door design tokens (`var(--color-*)`, `var(--app-*)`) in de 5 CSS-bestanden met de meeste overtredingen.

## Doelbestanden

| # | Bestand | LOC | Hex | RGBA | Totaal |
|---|---------|-----|-----|------|--------|
| 1 | `demo/src/components/CreateWizard/CreateWizard.module.css` | 1.453 | 154 | 16 | **170** |
| 2 | `demo/src/pages/aistudio/AIStudioPage.module.css` | 616 | 25 | 18 | **43** |
| 3 | `demo/src/components/TopNavbar.module.css` | 873 | 38 | — | **38** |
| 4 | `demo/src/components/MatchWizardV2/MatchWizardV2.module.css` | 542 | 36 | — | **36** |
| 5 | `demo/src/pages/ApprovalsPage.module.css` | 794 | ~20 | ~5 | **~25** |

## Werkwijze

1. **Inventariseer tokens** — Lees `variables.css` / `tokens.css` en bouw een mapping van hex → token
2. **Per bestand:**
   - Grep alle `#hex` en `rgba()` waarden
   - Map elke waarde naar een bestaande `--app-*` of `--color-*` token
   - Als token ontbreekt → markeer met `/* TODO: token needed */`
   - Vervang hardcoded waarde door `var(--token-naam)`
3. **Verifieer** per bestand: `npx tsc --noEmit && npx vite build`
4. **Visueel check** — dark mode breekt niet

## Token Mapping Referentie

Veelvoorkomende patronen:
```
#ffffff / #fff       → var(--app-surface) of var(--color-white)
#000000 / #000       → var(--app-text-primary) of var(--color-black)
#f5f5f5 / #fafafa    → var(--app-surface-secondary)
rgba(0,0,0,0.1)      → var(--app-border-color) of var(--app-shadow-color)
rgba(0,0,0,0.5)      → var(--app-overlay)
brand kleuren         → var(--app-primary) / var(--app-accent)
```

## Verificatie

```bash
cd demo && npx tsc --noEmit && npx vite build
```

## Acceptatiecriteria

- [ ] Alle 5 bestanden hebben 0 hardcoded hex/rgba (of gemarkeerde TODO's voor ontbrekende tokens)
- [ ] `tsc --noEmit` slaagt
- [ ] `vite build` slaagt
- [ ] Dark mode visueel getest — geen regressies

## Commit

```
style(css): replace hardcoded colors with design tokens in top 5 files — roadmap 22 H0
```
