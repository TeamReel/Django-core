# H5 — Token Migratie: Resterende 20 bestanden

> **Status:** 📋 Todo
> **Effort:** 6-8 uur
> **Impact:** ~1.200 hardcoded kleuren → design tokens

---

## Doel

Vervang alle resterende hardcoded hex en `rgba()` kleuren in CSS modules die niet in H0 zijn behandeld. Na deze fase bevat de hele frontend alleen nog design tokens.

## Scope

Alle `.module.css` bestanden in `demo/src/` die na H0 nog hardcoded kleuren bevatten — geschat ~20 bestanden met elk 20-80 hardcoded waarden.

## Werkwijze

1. **Inventariseer** resterende bestanden:
   ```bash
   grep -rl "#[0-9a-fA-F]\{3,8\}" demo/src/**/*.module.css | sort
   grep -rl "rgba\?" demo/src/**/*.module.css | sort
   ```
2. **Sluit H0-bestanden uit** (reeds gemigreerd)
3. **Batch** van 4-5 bestanden per commit:
   - Batch A: Pages (Dashboard, Content, Activities, etc.)
   - Batch B: Components (Cards, Modals, Forms)
   - Batch C: Layout (Sidebar, Footer, MobileNav)
   - Batch D: Overige
4. **Per bestand:** zelfde workflow als H0
   - Map hex/rgba → bestaande tokens
   - Vervang waarden
   - Markeer ontbrekende tokens met `/* TODO: token needed */`
5. **Test dark mode** na elke batch

## Verificatie

```bash
cd demo && npx tsc --noEmit && npx vite build
```

Per batch:
```bash
# Check resterende hardcoded colors
grep -rn "#[0-9a-fA-F]\{3,8\}" demo/src/**/*.module.css | wc -l
```

## Acceptatiecriteria

- [ ] Alle CSS modules hebben 0 hardcoded hex/rgba (of gemarkeerde TODO's voor ontbrekende tokens)
- [ ] `tsc --noEmit` slaagt
- [ ] `vite build` slaagt
- [ ] Dark mode visueel getest
- [ ] Geen visuele regressies
- [ ] **Roadmap #22 volledig afgerond ✅**

## Commits

```
style(css): batch A — token migration pages — roadmap 22 H5
style(css): batch B — token migration components — roadmap 22 H5
style(css): batch C — token migration layout — roadmap 22 H5
style(css): batch D — token migration remaining — roadmap 22 H5
```
