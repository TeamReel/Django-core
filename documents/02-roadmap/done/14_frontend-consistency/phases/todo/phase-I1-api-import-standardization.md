# I1 — API Import Standardization

**Status:** 🔲 Todo
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

1. [ ] Zoek alle `import.*from.*api` patterns
2. [ ] Vervang relatieve `../../api` en varianten door `@/api`
3. [ ] Evalueer `apiFetch` directe imports — moeten via API module gaan
4. [ ] Verificeer dat `@/api` alias correct werkt in `tsconfig.json`

## Verificatie

- [ ] Geen relatieve `../../api` imports meer
- [ ] Geen directe `apiFetch` imports buiten `/api` folder
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
