# S2 — Form State Hooks

**Status:** 🔲 Todo
**Track:** S — State Management
**Effort:** 2 uur
**Dependencies:** S1 (als voorbeeld)

---

## Doel

Creëer herbruikbare form state patterns voor pages met meerdere form fields.

## Probleembestanden

| Bestand | useState Count | Form Fields |
|---------|----------------|-------------|
| `RegisterPage.tsx` | 6 | email, password, name, etc. |
| `OrganisationEditPage.tsx` | 6 | name, slug, sport, etc. |
| `MainLayout.tsx` | 3 | sidebar states |

## Huidige Staat

```tsx
// RegisterPage.tsx
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [name, setName] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
```

## Target

### Optie A: Object State

```tsx
const [form, setForm] = useState({
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
});

const updateField = (field: keyof typeof form, value: string) =>
  setForm(prev => ({ ...prev, [field]: value }));
```

### Optie B: useForm Hook

```tsx
const form = useForm({
  email: '',
  password: '',
  confirmPassword: '',
  name: '',
});

return (
  <input
    value={form.values.email}
    onChange={e => form.setField('email', e.target.value)}
  />
);
```

## Acties

1. [ ] Evalueer of `useForm` hook bestaat (check design-system package)
2. [ ] Indien niet: creëer simpele `useFormFields` utility
3. [ ] Refactor RegisterPage als voorbeeld
4. [ ] Refactor OrganisationEditPage
5. [ ] Document het pattern

## Verificatie

- [ ] Minder dan 5 useState per form page
- [ ] Pattern is herbruikbaar
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
