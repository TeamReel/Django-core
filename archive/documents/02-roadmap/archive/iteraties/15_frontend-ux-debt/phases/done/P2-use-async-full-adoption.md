# P2 — useAsync Volledige Adoptie

**Status:** ✅ Done
**Effort:** ~1.5 uur

## Wat

useAsync hook enhanced met `logger.error` in catch block, daarna geadopteerd in 6 extra bestanden bovenop de 5 uit P1. Totaal: 11 bestanden gebruiken nu useAsync.

## Wijzigingen

### Hook enhancement
- `demo/src/hooks/useAsync.ts`: Added `logger.error('useAsync error', err)` in catch block — alle adopters krijgen nu automatisch error logging.

### Geadopteerde bestanden (6 nieuw)

| Bestand | Pattern verwijderd |
|---------|-------------------|
| `hooks/useActivities.ts` | useState triple + useEffect + logger |
| `hooks/useTransactions.ts` | useState triple + useEffect + logger |
| `hooks/useCreditBalance.ts` | useState triple + useEffect + logger, composed return object |
| `pages/docs/DeploymentPage.tsx` | useState triple + useEffect, internal error handling |
| `hooks/useSports.ts` | useState triple + useEffect + normalizeSportsList |
| `pages/NotificationsPage.tsx` | useState triple + useCallback, setData for optimistic updates |

### Niet geadopteerd (buiten scope)
~55 hooks met complexere patterns: polling, WebSocket, mutations, multiple dependent fetches, conditional loading (startLoading: false). Deze vereisen een `{ initialLoading: false }` optie of custom wrappers.

## Verificatie
- 0 TypeScript errors across all 7 files (hook + 6 adopters)
