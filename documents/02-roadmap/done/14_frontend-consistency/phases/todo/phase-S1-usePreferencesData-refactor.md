# S1 — usePreferencesData Refactor

**Status:** 🔲 Todo
**Track:** S — State Management
**Effort:** 2 uur
**Dependencies:** Geen

---

## Doel

Refactor `usePreferencesData.tsx` van 25+ useState calls naar proper state management.

## Huidige Staat

```tsx
// usePreferencesData.tsx — 371 regels, 25+ useState calls
const [profile, setProfile] = useState(null);
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
const [error, setError] = useState(null);
const [avatar, setAvatar] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
// ... 18+ meer useState calls
```

## Target

### Optie A: useReducer

```tsx
interface PreferencesState {
  profile: Profile | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  form: {
    avatar: string;
    password: string;
    confirmPassword: string;
    // ...
  };
}

const [state, dispatch] = useReducer(preferencesReducer, initialState);
```

### Optie B: Split in sub-hooks

```tsx
// usePreferencesData.tsx — orchestrator
const profile = useProfileData();
const password = usePasswordForm();
const avatar = useAvatarUpload();

return { ...profile, ...password, ...avatar };
```

## Acties

1. [ ] Analyseer welke state groepen samen horen
2. [ ] Kies tussen useReducer of sub-hooks
3. [ ] Refactor met gekozen aanpak
4. [ ] Behoud API naar consumers (geen breaking changes)

## Verificatie

- [ ] Minder dan 10 useState/useReducer calls in file
- [ ] Zelfde functionaliteit
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` all green
- [ ] Gecommit + gepusht
