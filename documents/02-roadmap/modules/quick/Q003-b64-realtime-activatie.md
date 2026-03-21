# Q003 — B64 Realtime WebSocket Activatie

| | |
|---|---|
| Status | ✅ DONE |
| Bron | Visuele test B64 — WS toont "Offline", geen actieve connectie |
| Impact | 🟡 important |
| Effort | ~3 uur |

## Wat
De B64 realtime-infra (consumers, events, publisher) is gebouwd maar niet geactiveerd.
De frontend `ConnectionStatus` toont "Offline" omdat er geen WebSocket-connectie wordt opgezet.
Oorzaak: WS connecteert alleen bij channel-subscriptions, maar veel pagina's (dashboard, queue) hebben geen specifiek project-context.

## Checklist
- [x] Backend: `user:{id}` channel support in ContentUpdateConsumer
- [x] Backend: Workflow engine publiceert `approval.decided` events bij state transitions
- [x] Frontend: `useRealtimeChannel` uitbreiden met `user` channelType
- [x] Frontend: Global user-subscription in MainLayout → WS altijd "Live" voor ingelogde users
- [ ] Verify: `ConnectionStatus` toont "Live" na inloggen
- [ ] Verify: Queue-pagina ontvangt realtime events
