# I1 — CSS Pill Radius Fix

**Status:** ✅ Done
**Geschatte effort:** 15 min
**Scope:** 9 bestanden, `border-radius: 1000px/10000px` → `var(--radius-full)`

---

## Doel

CSS modules die `border-radius: 1000px` of `10000px` gebruiken voor pill/cirkel shapes standaardiseren naar het token `var(--radius-full)` (= `9999px`). Dit zijn waarden die door het A1-script gemist zijn omdat ze buiten de mapping vielen.

---

## Betrokken bestanden

| Bestand | Waarde | Actie |
|---------|--------|-------|
| `MatchLineupField.module.css` | `1000px` | → `var(--radius-full)` |
| `OrgHierarchyTab.module.css` | `1000px` | → `var(--radius-full)` |
| `TeamHierarchyTab.module.css` | `1000px` | → `var(--radius-full)` |
| `TeamMediaTab.module.css` | `1000px` | → `var(--radius-full)` |
| `CompetitionHierarchyTab.module.css` (×2) | `1000px` | → `var(--radius-full)` |
| `ProjectSeasonDetailPage.module.css` | `1000px` | → `var(--radius-full)` |
| `GeneratingStep.module.css` (×2) | `10000px` | → `var(--radius-full)` |

---

## Aanpak

Simpele regex-replace:
```
border-radius: 1000px  →  border-radius: var(--radius-full)
border-radius: 10000px →  border-radius: var(--radius-full)
```

---

## Verificatie

- [ ] Alle `1000px` / `10000px` border-radius vervangen
- [ ] `npx stylelint "src/**/*.css"` = 0 violations
- [ ] `npx vite build` slaagt
- [ ] Visueel: pill shapes zien er identiek uit
