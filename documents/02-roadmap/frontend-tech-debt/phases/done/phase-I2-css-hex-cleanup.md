# I2 — CSS Hardcoded Hex Cleanup

**Status:** ✅ Done
**Geschatte effort:** 45 min
**Scope:** ~122 hardcoded hex kleuren in CSS modules → semantic/color tokens

---

## Doel

Resterende hardcoded hex kleuren in CSS module-bestanden vervangen door de juiste `var(--color-*)` of `var(--app-*)` tokens. Deze zijn gemist door het K1-script omdat ze in complexere contexten staan (selectors, pseudo-elements, etc.).

---

## Top offenders

| Bestand | Aantal | Voorbeeld |
|---------|--------|-----------|
| `TopNavbar.module.css` | 12 | `#fff`, `#f5f5f5` |
| `MatchWizard.module.css` | 8 | `#fff`, `#fafafa` |
| `HierarchyTreeView.module.css` | 5 | `#9333ea`, `#dc2626`, `#059669` |
| `ActiveJobsModal.module.css` | — | `#60a5fa` |
| `SettingsPage.module.css` | — | `#6c757d` |
| `WorkflowTemplatesPage.module.css` | — | `#dc2626`, `#059669` |
| `OrgHierarchyTab.module.css` | — | `#60a5fa` |
| `ProjectSeasonsPage.module.css` | — | `#d97706` |

---

## Mapping

| Hex | Token |
|-----|-------|
| `#fff` / `#ffffff` | `var(--app-surface)` of `var(--color-neutral-50)` (context-afhankelijk) |
| `#fafafa` / `#f5f5f5` | `var(--app-surface-2)` |
| `#e5e5e5` | `var(--app-border)` |
| `#60a5fa` | `var(--color-blue-400)` |
| `#dc2626` | `var(--color-red-500)` |
| `#059669` | `var(--color-green-600)` |
| `#d97706` | `var(--color-amber-500)` |
| `#9333ea` | `var(--color-violet-500)` |
| `#6c757d` | `var(--color-neutral-400)` |
| `#c62828` | `var(--color-red-600)` |
| `#0891b2` | Near `var(--color-primary-400)` |

---

## Aanpak

Python script dat per hex-waarde de juiste token vervangt. **Uitsluitingen:**
- `tokens.css` en `theme.css` (definitie-bestanden)
- `_archive/` bestanden
- Hex in `var()` functies (al getokenized)
- Hex in gradient definities (context-specifiek)

---

## Verificatie

- [ ] Alle bekende hex → token mappings vervangen
- [ ] `npx stylelint` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Dark mode: kleuren passen zich aan via semantic tokens
