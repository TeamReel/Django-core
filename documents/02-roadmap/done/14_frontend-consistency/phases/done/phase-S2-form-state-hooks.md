# S2 — Form State Hooks

**Status:** ✅ Done
**Track:** S — State Management
**Effort:** 2 uur
**Dependencies:** S1 (als voorbeeld)
**Afgerond:** 2026-06-18

---

## Doel

Creëer herbruikbare form state patterns voor pages met meerdere form fields.

## Aanpak

Gekozen voor **Optie B: useFormFields Hook** — groepeert form fields in één useState object met typed helpers.

## Wat Gedaan

### Nieuw: `demo/src/hooks/useFormFields.ts`

Herbruikbare hook:
```ts
const { fields, setField, reset, setFields } = useFormFields({
  email: '',
  password: '',
  confirmPassword: '',
});
```

- `fields` — huidige field values
- `setField(key, value)` — update één field
- `setFields(partial)` — bulk update (bijv. na API load)
- `reset()` — terug naar initialValues

### `RegisterPage.tsx`

6 useState (email, password, confirmPassword, firstName, lastName, validationError) → `useFormFields` + 0 individual field state.

### `OrganisationEditPage.tsx`

3 field useState (name, description, isActive) → `useFormFields`. Loading/saving/error blijven apart als dat logisch is.

## Verificatie

- ✅ Geen TypeScript errors in alle 3 bestanden
- ✅ `useFormFields` generisch en type-safe
- ✅ Logisch patroon: field state gegroepeerd, UI state apart
