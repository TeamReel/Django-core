# CS2 — Vite Manual Chunks Strategy

**Status:** ✅ Compleet
**Prioriteit:** 🔴 Hoog
**Geschatte effort:** 2-3 uur
**Afhankelijk van:** CS1

---

## Doel

Configureer Vite's Rollup `manualChunks` om de bundel op te splitsen in logische, op feature gebaseerde chunks. Hierdoor worden pagina's die nooit bezocht worden (admin, platform, docs) niet meegeladen.

## Huidige staat

- `appLazyImports.ts` definieert ~80 lazy imports met `lazyWithRetry`
- Alle lazy imports komen in een barrel file → Vite kan ze niet optimaal splitten
- Slechts 1 Suspense boundary (AppShell) → alles valt in dezelfde loading state

## Taken

### 1. Definieer chunk groepen in `vite.config.ts`

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        // Vendor splits
        if (id.includes('node_modules')) {
          if (id.includes('react-dom')) return 'vendor-react';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('@django-core')) return 'vendor-core';
          return 'vendor';
        }
        // Feature area splits
        if (id.includes('/pages/identity/')) return 'chunk-identity';
        if (id.includes('/pages/periods/')) return 'chunk-periods';
        if (id.includes('/pages/config/')) return 'chunk-config';
        if (id.includes('/pages/platform/')) return 'chunk-platform';
        if (id.includes('/pages/frontend/')) return 'chunk-frontend-dev';
        if (id.includes('/pages/docs/')) return 'chunk-docs';
        if (id.includes('/pages/activities/')) return 'chunk-activities';
        if (id.includes('/pages/studio/')) return 'chunk-studio';
        if (id.includes('/pages/work/')) return 'chunk-work';
        if (id.includes('/components/CreateWizard/')) return 'chunk-create-wizard';
        if (id.includes('/components/MatchWizardV2/')) return 'chunk-match-wizard';
      },
    },
  },
},
```

### 2. Split appLazyImports.ts in groep-bestanden

Overweeg om `appLazyImports.ts` op te splitsen naar:
- `appLazyImports.core.ts` — Dashboard, Search, Recents, Favorites
- `appLazyImports.identity.ts` — Identity, Org, Club, Team, Member pages
- `appLazyImports.admin.ts` — Config, Platform, Frontend, Docs pages
- `appLazyImports.content.ts` — Studio, Approvals, MediaLib, Content

### 3. Verifieer chunk output
```bash
ANALYZE=true pnpm build
```
Vergelijk met CS1 baseline.

### 4. Test lazy loading in browser
- Open DevTools → Network tab
- Navigeer naar identity pages → alleen `chunk-identity` wordt geladen
- Navigeer naar config → alleen `chunk-config` wordt geladen
- Admin-only chunks worden **nooit** geladen voor reguliere gebruikers

## Verwachte impact

| Chunk | Bestanden | Verwachte grootte |
|-------|----------:|-------------------|
| chunk-identity | 211 | Groot — enkel laden bij identity navigatie |
| chunk-periods | 83 | Medium — enkel bij season/competition detail |
| chunk-config | 42 | Klein — enkel superadmin |
| chunk-platform | ~10 | Klein — enkel superadmin |
| chunk-frontend-dev | ~10 | Klein — enkel development |
| chunk-docs | ~5 | Klein — enkel reference |

## Acceptatiecriteria

- [ ] `manualChunks` geconfigureerd in `vite.config.ts`
- [ ] Build produceert minstens 6 feature-area chunks
- [ ] Initiële bundel (main chunk) is >20% kleiner dan CS1 baseline
- [ ] Browser Network tab bevestigt lazy loading per feature area
- [ ] Geen runtime errors door ontbrekende chunks
