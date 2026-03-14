# U3 — Alert → Error State

**Status:** ✅ Done
**Effort:** 30 min

## Scope
3 productie-pagina's die `alert()` gebruikten omgezet naar inline error state UI.

## Changes

### DocsNotificationsPage.tsx
- 2× `alert()` → `setError()` (bestaande error state hergebruikt)

### EditMemberModal.tsx
- `useState` import + `saveError` state toegevoegd
- 4× `alert()` → `setSaveError()` met inline error display in modal actions

### UserDetailPage.tsx
- `useState` import + `actionError` state toegevoegd
- 3× `alert()` → `setActionError()` met inline Alert component

## Result
- 3 files gewijzigd, 0 TypeScript errors
- Geen browser-blocking alert() popups meer in deze flows
