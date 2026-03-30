# Phase B3 — Wizard Error States

**Track:** B (Wizard Polish)
**Status:** 📋 Planned

## Doel

Error/retry handling per wizard-stap. Elke stap handelt graceful af als data niet laadt.

## Taken

- [ ] Stap 1 (match selectie): error state als matches niet laden → retry knop
- [ ] Stap 2 (content type): error state als templates niet laden → retry knop
- [ ] Stap 3 (lineup): error state als squad niet laadt → retry knop
- [ ] Stap 4 (review): generate error → inline foutmelding + retry
- [ ] Consistent error-component hergebruiken (of maken als niet bestaat)
- [ ] Network-offline detectie → "Geen internetverbinding" state

## Pattern

```tsx
{error && (
  <div className={styles.errorState}>
    <AlertCircle size={32} />
    <p>Kon data niet laden</p>
    <Button variant="secondary" size="sm" onClick={retry}>
      Probeer opnieuw
    </Button>
  </div>
)}
```

## Checklist

- [ ] Elke wizard-stap heeft error + retry
- [ ] Error styling consistent
- [ ] Offline detectie
- [ ] `npx tsc --noEmit` — pass
- [ ] `npx vite build` — pass
- [ ] Gecommit + pushed naar `main`
