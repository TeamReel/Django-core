# N1 — ProfileHub Sheet-ificatie

> **Status:** ✅ Klaar
> **Datum:** 2026-03-13

## Probleem

In ProfileHubPage openden Credits, Notifications en Memberships als **volledige pagina-navigaties** (`navigate('/credits')`, etc.), wat de context brak. Edit Profile en Change Password gebruikten wél modals — inconsistent.

## Oplossing

### 1. `ProfileSheet` component (nieuw)

Herbruikbare full-screen overlay sheet:
- **Mobiel:** slideUp animatie (als iOS settings drill-down)
- **Desktop:** slideInRight animatie, 560px breed, rechter paneel
- Header: titel + X knop
- Body: scrollbaar, safe-area padding
- Focus management: escape-to-close, body scroll lock, focus restore
- A11y: `role="dialog"`, `aria-modal="true"`, overlay `role="presentation"`

### 2. Lazy-loaded sheet content (3 nieuwe componenten)

| Component | Bron | Beschrijving |
|-----------|------|-------------|
| `CreditsSheetContent` | `useCreditsData` hook + tabs | Wallet scope, balance/transaction tabs, compact personal wallet |
| `NotificationsSheetContent` | `useAsync` + API | Notificatie lijst met mark-as-read, optimistic updates |
| `MembershipsSheetContent` | `useAuth().user` | Federations/Clubs/Teams cards |

Alle 3 worden `React.lazy()` geladen — zero impact op initial bundle.

### 3. ProfileHubPage wijzigingen

| Was | Nu |
|-----|----|
| `navigate('/credits?wallet=personal')` | `setCreditsOpen(true)` → `<ProfileSheet>` |
| `navigate('/notifications')` | `setNotificationsOpen(true)` → `<ProfileSheet>` |
| `navigate('/memberships')` | `setMembershipsOpen(true)` → `<ProfileSheet>` |

## Gewijzigde bestanden

| Bestand | Actie | Beschrijving |
|---------|-------|-------------|
| `components/ProfileSheet.tsx` | **Nieuw** | Herbruikbare sheet overlay component |
| `components/ProfileSheet.module.css` | **Nieuw** | Sheet styling (overlay, slideUp, slideInRight) |
| `pages/config/CreditsSheetContent.tsx` | **Nieuw** | Compact credits content voor sheet |
| `pages/config/NotificationsSheetContent.tsx` | **Nieuw** | Compact notificaties content voor sheet |
| `pages/config/MembershipsSheetContent.tsx` | **Nieuw** | Compact memberships content voor sheet |
| `pages/ProfileHubPage.tsx` | **Gewijzigd** | Sheets ipv navigations, lazy imports |

## Verificatie

- Build: ✅ 11.14s, 0 errors
- TypeScript: ✅ 0 type errors in alle 6 bestanden
