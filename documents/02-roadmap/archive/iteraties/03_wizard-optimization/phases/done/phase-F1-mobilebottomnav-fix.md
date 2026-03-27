# Phase F1 -- MobileBottomNav Fix + QuickCreateFAB Verwijderen

**Track:** F (Foundation)
**Status:** Todo
**Effort:** Klein (1 sessie)
**Blokkert:** E1, C1 -- alles hangt af van 1 werkende entry point

---

## Doel

Er zijn nu 2 plekken die de wizard openen: MobileBottomNav (oude v1) en QuickCreateFAB (nieuwe v2). Dit moet 1 entry point worden via de MobileBottomNav center-knop, met MatchWizardV2.

## Huidige staat

| Component | Importeert | Probleem |
|-----------|-----------|----------|
| `MobileBottomNav.tsx` L20 | `MatchWizard` (v1, monoliet) | Gebruikt het oude 461-regel monoliet-component |
| `QuickCreateFAB.tsx` L10 | `MatchWizardV2` (v2, modulair) | Redundant -- doet hetzelfde als de nav + knop |

Beide luisteren ook naar `teamreel:open-quick-create` custom events, wat dubbele wizard-opens kan veroorzaken.

## Taken

### 1. MobileBottomNav updaten
- [ ] Import wijzigen: `import MatchWizard from './MatchWizard'` -> `import MatchWizardV2 from './MatchWizardV2'`
- [ ] JSX wijzigen: `<MatchWizard ... />` -> `<MatchWizardV2 ... />`
- [ ] Props zijn identiek (`isOpen`, `onClose`, `initialMatchId`) -- geen wijzigingen nodig

### 2. QuickCreateFAB verwijderen
- [ ] `QuickCreateFAB.tsx` verwijderen
- [ ] Alle imports van QuickCreateFAB zoeken en verwijderen
- [ ] Locaties die `QuickCreateFAB` renderen: opschonen

### 3. Custom event deduplicatie
- [ ] `teamreel:open-quick-create` event alleen afhandelen in MobileBottomNav
- [ ] Controleer of SmartEmptyState en andere dispatchers nog correct werken

### 4. Verificatie
- [ ] `npx tsc --noEmit` -- geen type errors
- [ ] `npx vite build` -- build slaagt
- [ ] Handmatig: + knop opent MatchWizardV2 (niet v1)
- [ ] Handmatig: geen dubbele FAB zichtbaar op mobile

## Bestanden

| Actie | Bestand |
|-------|---------|
| WIJZIG | `demo/src/components/MobileBottomNav.tsx` |
| VERWIJDER | `demo/src/components/QuickCreateFAB.tsx` |
| CHECK | Alle bestanden die QuickCreateFAB importeren |
