# C1 — Console Statement Cleanup

**Status:** ✅ Done
**Geschatte effort:** 1 uur
**Scope:** 374 `console.log/warn/error` statements in productie-code

---

## Doel

`console.log/warn/error` statements verwijderen of vervangen door proper logging. Console output in productie is een security risico (data exposure), performance overhead, en ruis in developer tools.

---

## Aanpak

### Stap 1: Categoriseren

| Type | Actie |
|------|-------|
| `console.log` (debug) | **Verwijderen** — ontwikkelaar-only |
| `console.warn` (edge case) | **Evalueren** — sommige zijn nuttig |
| `console.error` (in catch) | **Behouden of upgraden** — naar error boundary/Sentry |

### Stap 2: Error console.error → structured logging

```tsx
// Voor:
catch (error) {
  console.error('Failed to load data:', error);
}

// Na:
catch (error) {
  // Verwijderd — error boundary vangt dit op
  // Of: logger.error('Failed to load data', { error, context: 'useDataHook' });
}
```

### Stap 3: ESLint rule activeren

```json
{
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
```

---

## Uitzonderingen

- `console.error` in error boundaries → behouden
- `console.warn` voor deprecation warnings → behouden
- Development-only logging (achter `import.meta.env.DEV` guard) → acceptabel

---

## Verificatie

- [ ] Alle `console.log` verwijderd of achter DEV guard
- [ ] `console.error` alleen in error handling paths
- [ ] ESLint `no-console` rule actief
- [ ] `npx vite build` slaagt
- [ ] Geen console output in productie build
