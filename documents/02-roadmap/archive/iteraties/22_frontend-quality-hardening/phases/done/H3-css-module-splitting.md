# H3 — CSS Module Splitting: Top 3 megabestanden

> **Status:** 📋 Todo
> **Effort:** 3-4 uur
> **Impact:** 3 bestanden van >800 LOC → meerdere ~150 LOC modules

---

## Doel

Split de 3 grootste CSS modules op in logische sub-modules per component/section, zodat elk bestand <200 LOC blijft. Dit verbetert leesbaarheid, onderhoudbaarheid en code review.

## Doelbestanden

| # | Bestand | LOC | Split strategie |
|---|---------|-----|-----------------|
| 1 | `demo/src/components/CreateWizard/CreateWizard.module.css` | 1.453 | Per wizard step |
| 2 | `demo/src/components/TopNavbar.module.css` | 873 | Per sectie (mobile, dropdown) |
| 3 | `demo/src/pages/ApprovalsPage.module.css` | 794 | Per sub-component |

## Split Plan

### 1. CreateWizard.module.css → 6-8 modules

```
CreateWizard/
├── CreateWizard.module.css          (~100 LOC — shared/container styles)
├── WizardHeader.module.css          (~80 LOC)
├── ContentStep.module.css           (~150 LOC)
├── MatchStep.module.css             (~150 LOC)
├── LineupStep.module.css            (~150 LOC)
├── ReviewStep.module.css            (~100 LOC)
├── SuccessStep.module.css           (~80 LOC)
└── WizardNavigation.module.css      (~80 LOC)
```

### 2. TopNavbar.module.css → 4 modules

```
TopNavbar/
├── TopNavbar.module.css             (~150 LOC — base layout)
├── TopNavbarDropdown.module.css     (~150 LOC — dropdown menus)
├── TopNavbarSearch.module.css       (~100 LOC — zoekbalk)
└── TopNavbarMobile.module.css       (~150 LOC — mobile overrides)
```

### 3. ApprovalsPage.module.css → 4 modules

```
ApprovalsPage/
├── ApprovalsPage.module.css         (~100 LOC — page layout)
├── ApprovalsJobList.module.css      (~200 LOC — job listing)
├── ApprovalsFilters.module.css      (~100 LOC — filter bar)
└── ApprovalsDetail.module.css       (~150 LOC — detail panel)
```

## Werkwijze

1. **Analyseer** het bestand: identificeer logische secties via comments en class naming
2. **Maak** sub-module bestanden aan
3. **Verplaats** relevante stijlen naar sub-modules
4. **Update** imports in TSX bestanden: `import styles from './X.module.css'` → meerdere imports of merged styles
5. **Verifieer** dat alle `className={styles.xxx}` references correct blijven
6. **Test** visueel in browser

## Verificatie

```bash
cd demo && npx tsc --noEmit && npx vite build
```

## Acceptatiecriteria

- [ ] Originele mega-bestanden verwijderd of <200 LOC
- [ ] Alle nieuwe sub-modules <200 LOC
- [ ] Alle imports correct in TSX bestanden
- [ ] `tsc --noEmit` slaagt
- [ ] `vite build` slaagt
- [ ] Geen visuele regressies

## Commit

```
refactor(css): split 3 mega CSS modules into logical sub-modules — roadmap 22 H3
```
