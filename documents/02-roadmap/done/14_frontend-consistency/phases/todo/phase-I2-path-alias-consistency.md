# I2 — Path Alias Consistency

**Status:** 🔲 Todo
**Track:** I — Import Standardization
**Effort:** 1 uur
**Dependencies:** I1 (API imports)

---

## Doel

Consistente path aliassen voor alle imports: `@/hooks`, `@/utils`, `@/components`, etc.

## Huidige Staat

Mix van relatieve en alias imports:

```tsx
// Inconsistent
import { useApi } from '../../hooks/useApi';
import { getErrorMessage } from '@/utils/errorHelpers';
import { Button } from '../../../components/ui/Button';
```

## Target

```tsx
// Consistent
import { useApi } from '@/hooks/useApi';
import { getErrorMessage } from '@/utils/errorHelpers';
import { Button } from '@/components/ui/Button';
```

## Bekende aliassen in tsconfig.json

| Alias | Path |
|-------|------|
| `@/*` | `./src/*` |
| `@django-core/*` | Workspace packages |

## Acties

1. [ ] Audit welke deep relatieve imports (3+ `../`) nog bestaan
2. [ ] Vervang door `@/` aliassen waar beschikbaar
3. [ ] Documenteer welke aliassen beschikbaar zijn
4. [ ] Overweeg extra aliassen zoals `@/pages`, `@/layouts`

## Verificatie

- [ ] Geen `../../../` imports meer (3+ levels)
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
