# Q043 — SettingsPage Splitsen

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Code Review |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
`SettingsPage.tsx` (~450 regels) combineert 5 verantwoordelijkheden: Profile editing, Security settings, Notifications, Preferences en Trash management. Dit maakt het moeilijk te onderhouden en te testen.

## Aanpak
Extractie naar sub-componenten:
1. `ProfileSection.tsx` — profiel bewerken
2. `SecuritySection.tsx` — wachtwoord, 2FA
3. `NotificationsSection.tsx` — notificatie-instellingen
4. `PreferencesSection.tsx` — taal, thema
5. `TrashSection.tsx` — prullenbak beheer

Elke sectie krijgt eigen hook voor state management.

## Checklist
- [ ] Extract 5 section-componenten
- [ ] SettingsPage wordt orchestrator (~50 regels)
- [ ] Verify: `pnpm exec tsc --noEmit` → 0 errors
- [ ] Verify: `pnpm exec vite build` → success
- [ ] Tests blijven groen
