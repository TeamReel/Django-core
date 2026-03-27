# U1 — Toast Notificatie Systeem

**Track:** U — UX Modernisatie
**Status:** 📋 Todo
**Geschatte effort:** 4 uur

---

## Doel

Een `useToast` hook + `ToastContainer` component bouwen als vervanging voor `alert()`.

## Requirements

### API Design

```typescript
const toast = useToast();

// Success
toast.success('Wedstrijd aangemaakt');

// Error
toast.error('Kon niet opslaan. Probeer opnieuw.');

// Warning
toast.warning('Je hebt geen wijzigingen gemaakt');

// Info
toast.info('Bezig met verwerken...');
```

### Component

- Auto-dismiss na 5s (configureerbaar)
- Stackable (max 3 zichtbaar)
- Dismiss on click/swipe
- Animatie: slide-in van rechtsonder (desktop) / bovenin (mobile)
- Accessibility: `role="status"` + `aria-live="polite"`
- CSS Modules styling met design tokens

### Integratie

- `ToastProvider` wrappen in `AppShell`
- `useToast()` beschikbaar in alle componenten

## Acceptatiecriteria

- [ ] `useToast` hook met `success/error/warning/info` methods
- [ ] `ToastContainer` rendered in AppShell
- [ ] Auto-dismiss + manual dismiss
- [ ] Responsive (desktop + mobile positionering)
- [ ] Accessible (ARIA roles)
- [ ] CSS Modules + design tokens
- [ ] Unit tests voor hook + component
