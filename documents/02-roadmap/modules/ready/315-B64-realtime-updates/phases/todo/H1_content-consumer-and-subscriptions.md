# H1 — Content Consumer & Channel Subscriptions

> **Effort:** ~3 uur | **Impact:** Clients kunnen subscriben op specifieke content/project channels

## To do

- [ ] `ContentUpdateConsumer` (extends `BaseConsumer`): handled `subscribe` en `unsubscribe` messages
- [ ] Channel subscription management: user kan subscriben op `content:{id}`, `project:{id}`
- [ ] Permission check: user mag alleen subscriben op content/projects waar ze toegang toe hebben
- [ ] Routing update: `ws/content-updates/` endpoint
- [ ] Integration tests: subscribe → receive event → unsubscribe

## Done criteria

- [ ] Client kan WebSocket openen naar `ws/content-updates/`
- [ ] Subscribe op content channel → ontvangt status updates
- [ ] Subscribe op project channel → ontvangt alle project events
- [ ] Geen events voor content waar user geen toegang toe heeft
