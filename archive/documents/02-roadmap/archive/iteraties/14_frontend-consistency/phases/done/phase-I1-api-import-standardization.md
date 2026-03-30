# I1 — API Import Standardization

**Status:** ✅ Done
**Track:** I — Import Standardization
**Effort:** 1 uur
**Dependencies:** Geen

---

## Doel

Standaardiseer alle API imports naar `@/api` alias.

## Huidige Staat

Minstens 5 verschillende import patterns voor dezelfde API module:

| Pattern | Aantal | Voorbeeld |
|---------|--------|-----------|
| `import { api } from '@/api'` | ~15 | ✅ Gewenst |
| `import { api } from '../../api'` | ~8 | ❌ Relatief |
| `import { api } from '../../../api/client'` | ~5 | ❌ Diep relatief |
| `import { api } from './client'` | ~3 | Intern in /api folder |
| `import { apiFetch } from '../../utils/apiFetch'` | ~9 | ❌ Legacy direct gebruik |

## Target

Alles naar:
```tsx
import { api } from '@/api';
// of voor specifieke APIs:
import { projectsApi, organisationsApi } from '@/api';
```

## Acties

1. [x] Zoek alle `import.*from.*api` patterns
2. [x] Vervang relatieve `../../api` en varianten door `@/api`
3. [x] Evalueer `apiFetch` directe imports — moeten via API module gaan
4. [x] Verificeer dat `@/api` alias correct werkt in `tsconfig.json`

## Verificatie

- [x] Geen relatieve `../../api` imports meer
- [x] Geen directe `apiFetch` imports buiten `/api` folder
- [x] `tsc --noEmit` clean
- [x] `vitest run` all green
- [x] Gecommit + gepusht
