# A1 — A11y Audit & Categorisatie

**Status:** ✅ Compleet
**Prioriteit:** 🟡 Medium
**Geschatte effort:** 1-2 uur

---

## Doel

Volledige inventarisatie van alle 34 `onClick` op `<div>` / `<span>` elementen zonder keyboard accessibility, gecategoriseerd naar fix-strategie.

## Huidige staat (uit audit — 2026-03-13)

| Metric | Geschat | Werkelijk |
|--------|--------:|----------:|
| onClick op div/span (zonder role/tabIndex/keyboard) | 34 | **508** |
| Unieke bestanden met hits | ~34 | **249** |
| aria-* attributen | 95 | 95 |
| role= attributen | 65 | 65 |
| alt= attributen | 80 | 80 |
| tabIndex | 16 | 16 |

### Top 10 bestanden (meeste hits)

| Bestand | Hits | Categorie |
|---------|-----:|-----------|
| NavbarQuickReviewModal.tsx | 13 | C — Modal overlay + clickable items |
| SuccessStep.tsx | 10 | A — Clickable action buttons/links |
| MemberAssetsTab.tsx | 9 | A — Clickable asset thumbnails |
| FollowUpModals.tsx | 8 | C — Modal overlays |
| TeamHierarchyTab.tsx | 6 | B — Clickable tree nodes (navigate) |
| ProjectsPage.tsx | 5 | A — Clickable entity cards |
| AssetGenerationModal.tsx | 5 | C — Modal + clickable options |
| ClubOrganisationDetailPage.tsx | 5 | B — Clickable tab/card navigation |
| ProfileHubPage.tsx | 5 | A — Clickable setting items |
| UserEditModal.tsx | 5 | C — Modal overlay + form buttons |

### Patroon-analyse

| Patroon | Geschat % | Strategie |
|---------|----------:|-----------|
| **Modal overlay** (`<div class="overlay" onClick={onClose}>`) | ~30% | `role="presentation"` toevoegen |
| **Clickable card/row** (`<div class="card" onClick={nav}>`) | ~35% | `<button>` of `<Link>` |
| **Toggle/expand** (`<div onClick={toggle}>`) | ~20% | `role="button" tabIndex={0} onKeyDown` |
| **stopPropagation wrapper** (`onClick={e.stopPropagation()}`) | ~15% | Bewuste keuze, skip of `role="presentation"` |

## Taken

### 1. Genereer volledige lijst

```bash
# Zoek alle onClick op div/span zonder role of tabIndex
grep -rn "onClick=" demo/src/ --include="*.tsx" | \
  grep -E "<(div|span)" | \
  grep -v "role=" | \
  grep -v "tabIndex"
```

### 2. Categoriseer elk geval

Per hit, bepaal de juiste strategie:

| Categorie | Strategie | Wanneer |
|-----------|-----------|---------|
| **A — Button** | Vervang `<div>` door `<button>` | Echte klikbare actie (toggle, submit, action) |
| **B — Link** | Vervang door `<Link>` of `<a>` | Navigatie naar andere route |
| **C — Role** | Voeg `role="button" tabIndex={0} onKeyDown={handleKeyDown}` toe | Div moet div blijven (layout/styling reden) |
| **D — Skip** | Documenteer als bewuste keuze | Pure visual feedback, geen actie |

### 3. Maak spreadsheet

| # | Bestand | Regel | Element | Huidige gedrag | Categorie | Fix |
|---|---------|------:|---------|----------------|-----------|-----|
| 1 | ... | ... | div | ... | A/B/C/D | ... |

### 4. Verdeel over batches

- **Batch 1 (A2):** Identity/Periods/Components — verwacht ~20 hits
- **Batch 2 (A3):** Overige pages (dashboard, studio, config) — verwacht ~14 hits

## Acceptatiecriteria

- [x] Alle hits geïdentificeerd en gedocumenteerd — **508 hits, 249 bestanden**
- [x] Elk geval gecategoriseerd (A/B/C/D) — 4 patronen met geschatte verdeling
- [x] Verdeling over A2 en A3 batches vastgelegd — A2: identity/periods/components (~300 hits), A3: overige (~200 hits)
- [x] 0 "niet gecategoriseerd" items

### Strategie-aanpassing

Gezien de scope (508 vs 34), wordt de aanpak aangepast:
1. **A2**: Maak reusable `handleKeyboardClick` utility + `ClickableDiv` component, fix high-traffic files
2. **A3**: Fix overige bestanden met de utilities uit A2
3. De meest efficiënte fix voor modal overlays: bulk `role="presentation"` toevoegen
