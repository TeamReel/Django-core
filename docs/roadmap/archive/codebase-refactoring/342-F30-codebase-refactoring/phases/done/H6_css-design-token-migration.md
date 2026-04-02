# H6 — CSS Design Token Migration

> **Effort:** ~10 uur | **Impact:** Theming, dark mode, visuele consistentie door hele app

## Context

Frontend audit (maart 2026) toont **329+ hardcoded waarden** in CSS Modules die design tokens moeten gebruiken. Dit is de grootste tech debt in de frontend — zonder tokens werkt dark mode niet, is theming onmogelijk, en is spacing inconsistent.

### Omvang per categorie

| Categorie | Aantal | Prioriteit |
|-----------|--------|-----------|
| Font-sizes (px → `var(--text-*)`) | 187 | 🔴 Hoog |
| Transitions/durations (s/ms → `var(--duration-*)`) | 100+ | 🟡 Medium |
| Spacing (px → `var(--space-*)`) | 95+ | 🟡 Medium |
| Named colors (`white`/`black` → token) | 24 | 🔴 Hoog |
| Hex colors (`#fff` → token) | 10 | 🟡 Medium |
| Border-radius (px → `var(--radius-*)`) | 5 | 🟢 Laag |

### Top-offender bestanden

1. `ProjectSeasonDetailPage.module.css` — 40+ violations
2. ContentGenerationModal bestanden — 30+ combined
3. `ActivityPage.module.css` — 15 violations
4. `SeasonMediaTab.module.css` — 12 violations
5. `MyTeamHubPage.module.css` — transitions

### Token mapping reference

**Font-sizes:**
| Hardcoded | Token |
|-----------|-------|
| 7-8px | `var(--text-2xs)` |
| 9-10px | `var(--text-xs)` |
| 12px | `var(--text-sm)` |
| 14px | `var(--text-base)` |
| 16px | `var(--text-md)` |
| 18-20px | `var(--text-lg)` |
| 24px | `var(--text-xl)` |
| 28-30px | `var(--text-2xl)` |
| 32-36px | `var(--text-3xl)` |
| 40-48px | `var(--text-4xl)` |
| 60-72px | `var(--text-5xl)` |

**Spacing:**
| Hardcoded | Token |
|-----------|-------|
| 4px | `var(--space-1)` |
| 8px | `var(--space-2)` |
| 12px | `var(--space-3)` |
| 16px | `var(--space-4)` |
| 20px | `var(--space-5)` |
| 24px | `var(--space-6)` |
| 32px | `var(--space-8)` |
| 40px | `var(--space-10)` |
| 48px | `var(--space-12)` |

**Durations:**
| Hardcoded | Token |
|-----------|-------|
| 0.1s, 100ms | `var(--duration-fast)` |
| 0.15-0.25s | `var(--duration-fast)` |
| 0.2-0.3s | `var(--duration-normal)` |
| 0.3-0.5s | `var(--duration-slow)` |
| 0.8s+ | custom var of `var(--duration-slow)` |

**Colors:**
| Hardcoded | Token |
|-----------|-------|
| `white`, `#fff` | `var(--color-white)` |
| `black`, `#000` | `var(--color-black)` |
| `#25d366` | WhatsApp groen — uitzondering, mag hardcoded als brand color |

**Border-radius:**
| Hardcoded | Token |
|-----------|-------|
| 2px | `var(--radius-xs)` |
| 4px | `var(--radius-sm)` |
| 8px | `var(--radius-md)` |
| 12px | `var(--radius-lg)` |
| 16px | `var(--radius-xl)` |

## To do

### Ronde 1: Colors + Border-radius (~1 uur)
- [ ] Alle `color: white` / `color: black` → tokens (24 locaties)
- [ ] Alle hex colors (#fff, #000) → tokens (10 locaties)
- [ ] Alle hardcoded border-radius → tokens (5 locaties)

### Ronde 2: Font-sizes (~3 uur)
- [ ] `ProjectSeasonDetailPage.module.css` — alle font-sizes
- [ ] ContentGenerationModal CSS bestanden — alle font-sizes
- [ ] `ActivityPage.module.css` — alle font-sizes
- [ ] `SeasonMediaTab.module.css` — alle font-sizes
- [ ] Overige bestanden — scan en fix alle hardcoded font-sizes

### Ronde 3: Spacing (~3 uur)
- [ ] `ProjectSeasonDetailPage.module.css` — padding/margin/gap
- [ ] `ProjectSeasonMemberDetailPage.module.css` — padding/margin/gap
- [ ] `CreateWizardShared.module.css` — spacing
- [ ] Overige bestanden — scan en fix alle hardcoded spacing

### Ronde 4: Transitions + durations (~2 uur)
- [ ] `SeasonMatchesTab.module.css` — transitions
- [ ] `MyTeamHubPage.module.css` — transitions
- [ ] `ActiveMatchCard.module.css` — transitions
- [ ] Overige bestanden — scan en fix alle hardcoded durations

### Ronde 5: Verify (~1 uur)
- [ ] `npx vite build` slaagt
- [ ] Visueel check: geen broken layouts na token swap
- [ ] Dark mode check: alle gemigreerde kleuren respecteren theme

## Done criteria

- [ ] 0 hardcoded named colors (`white`, `black`) in .module.css bestanden
- [ ] 0 hardcoded hex colors in .module.css bestanden (behalve brand-specifieke uitzonderingen)
- [ ] 0 hardcoded font-sizes in .module.css bestanden
- [ ] 0 hardcoded spacing >4px in padding/margin/gap zonder token
- [ ] 0 hardcoded transition durations zonder token
- [ ] `npx vite build` slaagt
- [ ] Geen visuele regressies (steekproef 5 pagina's)
