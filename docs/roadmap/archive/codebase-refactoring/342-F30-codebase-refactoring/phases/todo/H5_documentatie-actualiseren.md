# H5 — Documentatie Actualiseren

> **Effort:** ~4 uur | **Impact:** AI agents hebben correcte context, snellere onboarding

## To do

### ai-context-index.md updaten
- [ ] Voeg recente features toe: match logos (BrandAsset approach), team hub MatchSheetFlow, navbar icon split
- [ ] Update component-inventaris met nieuwe/verwijderde componenten
- [ ] Verwijder referenties naar verwijderde features (HeroBanner)
- [ ] Update data flow documentatie (logo resolution chain)

### Feature docs bijwerken
- [ ] `documents/05-demo/features/branding-tokens.md` — update met BrandAsset logo resolution
- [ ] `documents/05-demo/features/project-hierarchy.md` — update met team→club logo fallback
- [ ] `documents/05-demo/frontend-design/component-library.md` — update component lijst
- [ ] `documents/05-demo/frontend-design/ux-flows.md` — update met match detail flow + team hub

### Architectuur docs verifiëren
- [ ] `documents/05-demo/architecture.md` — klopt de high-level beschrijving nog?
- [ ] `documents/05-demo/data/tables.md` — reflecteert dit de huidige database staat?
- [ ] `documents/05-demo/infrastructure/railway-services.md` — kloppen de service beschrijvingen?

### Stale docs archiveren
- [ ] Review alle bestanden in `documents/05-demo/archive/` — zijn nieuwe candidates?
- [ ] Verplaats verouderde docs vanuit `05-demo/` root naar `05-demo/archive/`
- [ ] `documents/05-demo/plans/` — zijn deze plannen uitgevoerd of achterhaald?

### README en getting-started
- [ ] `documents/05-demo/getting-started.md` — werken de setup-instructies nog?
- [ ] `README.md` (root) — update met huidige setup stappen en project status

## Done criteria

- [ ] `ai-context-index.md` is volledig actueel met maart 2026 codebase
- [ ] Alle feature docs in `05-demo/features/` beschrijven werkende code
- [ ] Geen docs die verwijzen naar verwijderde componenten of features
- [ ] Getting-started guide is getest en werkt
- [ ] Stale docs verplaatst naar `archive/`
