# S1 — usePreferencesData Refactor

**Status:** ✅ Done
**Track:** S — State Management
**Effort:** 2 uur
**Dependencies:** Geen

---

## Doel

Refactor `usePreferencesData.tsx` van 33 useState calls naar proper state management.

## Aanpak

**Optie B gekozen: Split in sub-hooks** — groepen van gerelateerde state per sub-hook.

## Resultaat

`usePreferencesData.tsx` (416 regels, 33 useState) → 5 bestanden:

| Bestand | Verantwoordelijkheid | useState calls |
|---------|----------------------|----------------|
| `usePreferencesData.tsx` | Orchestrator (orchestreert de 4 sub-hooks) | 0 |
| `usePreferencesState.ts` | Core prefs state + effects + handlers | 6 |
| `useChannelPreferences.ts` | Notificatie kanaal prefs + toggle | 4 |
| `useAuditEvents.ts` | Audit events (lazy per tab) | 3 |
| `useProfileModals.ts` | Profile/wachtwoord/avatar modal state | 20 |

De orchestrator heeft **0 useState** calls — enkel sub-hook composities.

## Acties

1. [x] Analyseer welke state groepen samen horen
2. [x] Kies Sub-hooks aanpak (behoud API, geen breaking changes)
3. [x] Maak `usePreferencesState.ts` — prefs, effectivePrefs, loading, saving, success, activeTab + tab sync + save/cancel handlers
4. [x] Maak `useChannelPreferences.ts` — channelPrefs, toggle, formatEventType
5. [x] Maak `useAuditEvents.ts` — auditEvents, geladen per tab
6. [x] Maak `useProfileModals.ts` — alle modal state (profile, password, avatar)
7. [x] Refactor `usePreferencesData.tsx` → orchestrator (108 regels)
8. [x] Behoud exacte return API (geen breaking changes voor consumers)

## Verificatie

- [x] 0 useState calls in orchestrator
- [x] Zelfde functionaliteit
- [x] `tsc --noEmit` clean (0 errors in alle 5 bestanden)
- [x] Gecommit + gepusht
