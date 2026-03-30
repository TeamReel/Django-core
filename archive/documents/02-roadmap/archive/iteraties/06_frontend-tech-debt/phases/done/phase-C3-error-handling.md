# C3 — Error Handling Cleanup

**Status:** ✅ Done
**Geschatte effort:** 2 uur
**Scope:** 371 empty catch blocks / 588 total try-catch

---

## Doel

63% van alle catch blocks is leeg (`catch (e) {}`). Dit slikt fouten onzichtbaar — gebruikers zien niets, developers zien niets, bugs overleven in productie.

---

## Probleem

```tsx
// 63% van catch blocks ziet er zo uit:
try {
  await api.updateMember(id, data);
} catch (e) {
  // niets — fout verdwijnt
}
```

---

## Strategie per context

| Context | Actie |
|---------|-------|
| **API calls in hooks** | Toast notification + state update |
| **Form submissions** | Form error state + user-facing message |
| **Non-critical operations** (analytics, logging) | Silent fail is OK — maar log naar console.error |
| **Data parsing** (JSON.parse, etc.) | Fallback value + optional warning |

---

## Aanpak

### Stap 1: Categoriseer empty catches

```bash
# Vind alle empty catch blocks met context
grep -B5 "catch.*{" file | grep -A1 "catch"
```

### Stap 2: Template per categorie

```tsx
// API call pattern:
try {
  await api.updateMember(id, data);
} catch (error) {
  toast.error('Kon lid niet bijwerken. Probeer opnieuw.');
}

// Non-critical pattern:
try {
  analytics.track('page_view');
} catch {
  // Analytics failure is non-critical
}
```

### Stap 3: Batch toepassen

Python script dat empty catch blocks detecteert en op basis van de aanroep in de try-block de juiste error handling toevoegt.

---

## Verificatie

- [ ] Empty catch blocks < 50 (van 371)
- [ ] Alle API calls hebben user-facing error handling
- [ ] Non-critical catches hebben commentaar waarom ze leeg zijn
- [ ] `npx vite build` slaagt
- [ ] Error boundaries werken correct
