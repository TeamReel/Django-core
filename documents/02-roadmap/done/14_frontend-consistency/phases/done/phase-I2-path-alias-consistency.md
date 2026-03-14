# I2 — Path Alias Consistency

**Status:** ✅ Done
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

1. [x] Audit welke deep relatieve imports (3+ `../`) nog bestaan
2. [x] Vervang door `@/` aliassen waar beschikbaar
3. [x] Documenteer welke aliassen beschikbaar zijn
4. [x] Overweeg extra aliassen zoals `@/pages`, `@/layouts`

## Resultaat

Vervangen in 5 batches:
- Batch 1: 16 files — `api/client` relatieve imports
- Batch 2: 22 files — MatchWizardV2, medialib, credits, tests
- Batch 3: 2 files — 4-level deep test imports
- Batch 4A: 33 files — components/*, pages/* simple
- Batch 4B: 13 files — multi-import directory files + tests
- Batch 5: 15 files — periods, frontend, identity remainder

**Totaal: 101+ bestanden gemigreerd naar `@/` aliassen**

## Verificatie

- [x] Geen `../../../` imports meer (3+ levels)
- [x] `tsc --noEmit` clean (pre-existing errors ongewijzigd)
- [x] Gecommit + gepusht
