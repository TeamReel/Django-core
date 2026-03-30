# H1 — Notificatie Modal Integratie

> **Effort:** ~2 uur | **Impact:** Activity feed zichtbaar in bestaande bell flow

## To do

- [ ] Tab-switcher toevoegen aan `NavbarNotificationsModal`: "Notificaties" | "Activiteit"
- [ ] Activity tab: compact lijst van 10 recente events (verb icon + actortekst + tijdstip)
- [ ] Link "Bekijk alles →" naar `/activity`
- [ ] Role-gate: tab alleen zichtbaar voor `isOrgAdmin || isCoach` (via `useUserRole`)
- [ ] Fetch activity feed in `useTopNavbarData/effects.ts` (naast bestaande notification fetch)

## Done criteria

- [ ] Notificatie modal heeft werkende tab-switcher
- [ ] Activity tab toont events van B62 API
- [ ] Tab onzichtbaar voor spelers/supporters
- [ ] Bestaande notificatie-functionaliteit onaangetast
