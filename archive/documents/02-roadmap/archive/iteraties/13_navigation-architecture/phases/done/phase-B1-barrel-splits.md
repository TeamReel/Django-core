# B1 — Barrel Import Splits

**Status:** 🔲 Todo
**Track:** B — Bundle & Performance
**Effort:** 3 uur
**Dependencies:** Geen (kan parallel lopen)

---

## Doel

Vervang barrel-import lazy loads door individuele file imports. Dit voorkomt dat zelden bezochte admin/config pages meegeladen worden in het chunk van een veelbezochtere page.

## Huidige Staat

### Barrel imports in appLazyImports.ts

```tsx
// Identity — 10+ pages in één chunk:
const OrganisationDetailPage = lazyWithRetry(() =>
  import('./pages/identity').then(m => ({ default: m.OrganisationDetailPage }))
);
const MemberDetailPage = lazyWithRetry(() =>
  import('./pages/identity').then(m => ({ default: m.MemberDetailPage }))
);
// → Webpack/Vite bundelt ALLE exports uit pages/identity/ in één chunk

// Config — 8+ pages in één chunk:
const AuditLogPage = lazyWithRetry(() =>
  import('./pages/config').then(m => ({ default: m.AuditLogPage }))
);

// Frontend — 7 pages in één chunk:
const DesignSystemPage = lazyWithRetry(() =>
  import('./pages/frontend').then(m => ({ default: m.DesignSystemPage }))
);
```

### Impact

Een gebruiker die alleen `OrganisationDetailPage` bezoekt, download ook:
- `MemberDetailPage`
- `ProjectCreatePage`
- `ProjectEditPage`
- `PermissionsPage`
- `UsersPage`
- `UserDetailPage`
- `OrganisationCreatePage`
- `OrganisationEditPage`
- Etc.

### Barrel groups die gesplitst moeten worden

| Barrel | Pages | Waarom splitsen |
|--------|-------|-----------------|
| `./pages/identity` | ~10 | OrgDetail is frequent, rest is admin |
| `./pages/config` | ~8 | Elk config-page is zeldzaam bezoek |
| `./pages/frontend` | ~7 | Developer-only pages |
| `./pages/docs` | ~4 | Zeldzaam |
| `./pages/platform` | ~6 | Admin-only |
| `./pages/files` | ~2 | Admin-only |
| `./pages/medialib` | ~2 | Kan samenblijven (beide frequent) |

### Barrels die NIET gesplitst hoeven worden

| Barrel | Reden |
|--------|-------|
| `./pages/work/*` | Individuele imports (al goed) |
| `./pages/activities/*` | Individuele imports (al goed) |
| `./pages/periods/*` | Individuele imports (al goed) |

## Target

```tsx
// ❌ Nu (barrel — alle identity pages in 1 chunk):
const OrganisationDetailPage = lazyWithRetry(() =>
  import('./pages/identity').then(m => ({ default: m.OrganisationDetailPage }))
);

// ✅ Straks (individueel — eigen chunk per page):
const OrganisationDetailPage = lazyWithRetry(() =>
  import('./pages/identity/OrganisationDetailPage')
);
```

## Scope

### 1. Split barrel imports in appLazyImports.ts

Vervang `.then(m => ({ default: m.X }))` patronen door directe imports.

**Voorwaarde:** Elke page moet een `default export` hebben (of we voegen die toe).

### 2. Verifieer chunk sizes

Na de split: controleer of Vite inderdaad aparte chunks maakt:

```bash
npx vite build --report
```

### 3. Barrel index files opschonen (optioneel)

De `index.ts` barrel files (`pages/identity/index.ts`, etc.) kunnen behouden blijven voor direct-import convenience, maar de lazy-imports in `appLazyImports.ts` gebruiken ze niet meer.

## Acties

1. [ ] Inventariseer welke pages default exports hebben vs named-only
2. [ ] Voeg `export default` toe waar nodig
3. [ ] Vervang barrel lazy imports door individuele file imports
4. [ ] `npx vite build` — verifieer chunk splitting
5. [ ] Vergelijk bundle sizes voor/na
6. [ ] `tsc --noEmit` clean
7. [ ] `vitest run` all green

## Verificatie

- [ ] Geen barrel `.then(m => ...)` patronen meer in `appLazyImports.ts`
- [ ] `npx vite build` produceert meer, kleinere chunks
- [ ] Identity chunk: van ~X kB → per page ~Y kB
- [ ] Geen functionality regressie
- [ ] Gecommit + gepusht
