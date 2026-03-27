# K1 — Hardcoded Color Cleanup

**Status:** ✅ Done — 181 hex waarden getokenized in 41 bestanden
**Voltooid:** 2026-03-08 (commit 26bd78c6)
**Geschatte effort:** 30 min
**Bestanden:** Alle `demo/src/**/*.module.css` + `demo/src/styles/*.css`

---

## Doel

Alle hardcoded hex-kleuren (`#fff`, `#10b981`, `#ef4444`, etc.) in component CSS vervangen door design tokens. Geen kleur mag direct als hex in component CSS staan.

## Probleem

De audit vond **30+ hardcoded hex-waarden** in component CSS. Dit breekt dark mode, maakt theming onmogelijk, en is inconsistent met het token-systeem.

### Gevonden hex-waarden per bestand

| Bestand | Hex | Zou moeten zijn |
|---------|-----|-----------------|
| **DashboardPage.module.css** | `#000` | `var(--app-text)` |
| **AIStudioPage.module.css** | `#fff` | `var(--app-surface)` of `white` token |
| **AIStudioPage.module.css** | `#10b981` | `var(--color-green-400)` |
| **AIStudioPage.module.css** | `#ef4444` | `var(--color-red-500)` ⚠️ niet in schaal |
| **HierarchyTreeView.module.css** | `#fff`, `#9333ea`, `#dc2626`, `#059669`, `#d97706`, `#0891b2` | Mix Tailwind kleuren — migreer naar tokens |
| **AddMemberModal.module.css** | `#fff` | `var(--app-surface)` |
| **MemberEditSheet.module.css** | `#818cf8`, `#f87171`, `#fff` | Tailwind indigo/red — geen tokens voor |
| **TemplateStep.module.css** | `#d97706` | `var(--color-amber-500)` |
| **TopNavbar.module.css** | `#9ca3af`, `#fff`, `#dc2626`, `#fee2e2`, `#0f172a` | Mix Tailwind kleuren |

### Kleuren die NIET in het token-systeem zitten

| Hex | Kleur | Actie |
|-----|-------|-------|
| `#ef4444` | Tailwind red-500 | Gebruik `var(--color-red-400)` (#E63946) of `var(--color-red-500)` (#dc2626) |
| `#818cf8` | Tailwind indigo-400 | Nieuwe token nodig? Of vervang door `var(--color-primary-300)` |
| `#f87171` | Tailwind red-400 | Gebruik `var(--color-red-300)` |
| `#9ca3af` | Tailwind gray-400 | Gebruik `var(--app-muted-text)` |
| `#9333ea` | Tailwind purple-600 | Nieuwe token? Of alleen in HierarchyTreeView — inline custom property |
| `#0891b2` | Tailwind cyan-600 | Gebruik `var(--color-primary-500)` (dichtbij) |
| `#fee2e2` | Tailwind red-100 | Gebruik `var(--color-red-50)` |
| `#0f172a` | Tailwind slate-900 | Gebruik `var(--color-neutral-900)` |

## Aanpak

### Stap 1: Directe vervangingen (bestaande tokens)

```css
/* Was */
color: #fff;
/* Wordt */
color: white;  /* of var(--app-surface) als het dark-mode-aware moet zijn */

/* Was */
color: #dc2626;
/* Wordt */
color: var(--color-red-500);

/* Was */
color: #10b981;
/* Wordt */
color: var(--color-green-400);

/* Was */
background-color: #0f172a;
/* Wordt */
background-color: var(--color-neutral-900);
```

### Stap 2: Tailwind kleuren → dichtstbijzijnde token

Kleuren als `#ef4444`, `#f87171`, `#9ca3af` zijn Tailwind defaults die niet in onze schaal zitten. Vervang door dichtstbijzijnde eigen token.

### Stap 3: Ontbrekende kleuren → overweeg tokens

HierarchyTreeView gebruikt `#9333ea` (paars) en `#0891b2` (cyan) voor type-indicators. Opties:
1. **Inline custom props:** `--type-color: var(--color-primary-500)` per variant
2. **Nieuwe token-set:** `--color-purple-*` toevoegen als het breder gebruikt wordt

### Stap 4: Witte/zwarte tekst

- `color: #fff` → `color: white` (altijd wit, bijv. op gekleurde badge)
- `color: #000` → `color: var(--app-text)` (theme-aware)
- `background: #fff` → `background: var(--app-surface)` (theme-aware)

## Regel: kleur-tokens verplicht

Na K1 geldt:
- **Nooit** hardcoded hex in component CSS
- Uitzondering: `white` en `transparent` (CSS keywords)
- Uitzondering: `rgba()` met token-based kleur voor opacity varianten

## Verificatie

- [ ] `grep -rn "#[0-9a-fA-F]\{3,8\}" demo/src/ --include="*.css"` — 0 resultaten buiten tokens/theme
- [ ] Dark mode toggle: geen "witte vlekken" of onleesbare tekst
- [ ] HierarchyTreeView type-nodes: kleuren zien er nog goed uit
- [ ] TopNavbar: dropdown menu styling intact
- [ ] AIStudio: status badges (success/error) correct
