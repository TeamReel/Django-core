# H1 — Content Consumer & Channel Subscriptions

> **Effort:** ~3 uur | **Impact:** Clients kunnen subscriben op specifieke content/project channels

## To do

- [x] `ContentUpdateConsumer` (extends `BaseConsumer`): handled `subscribe` en `unsubscribe` messages
- [x] Channel subscription management: user kan subscriben op `content:{id}`, `project:{id}`
- [x] Permission check: user mag alleen subscriben op content/projects waar ze toegang toe hebben
- [x] Routing update: `ws/content-updates/` endpoint
- [x] Integration tests: subscribe → receive event → unsubscribe (19 tests passing)

## Done criteria

- [x] Client kan WebSocket openen naar `ws/content-updates/`
- [x] Subscribe op content channel → ontvangt status updates
- [x] Subscribe op project channel → ontvangt alle project events
- [x] Geen events voor content waar user geen toegang toe heeft
