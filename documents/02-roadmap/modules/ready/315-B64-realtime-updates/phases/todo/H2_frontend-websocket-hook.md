# H2 — Frontend WebSocket Hook

> **Effort:** ~4 uur | **Impact:** UI update real-time zonder polling

## To do

- [ ] `useRealtimeChannel(channelType, channelId)` hook: WebSocket verbinding + subscription management
- [ ] Auto-reconnect met exponential backoff (1s → 30s max)
- [ ] Fallback naar polling als WebSocket faalt (feature flag `VITE_REALTIME_WS_ENABLED`)
- [ ] Invalidate React Query cache bij incoming event (content status change → refetch content data)
- [ ] Integratie in `useGenerationJobs`: luister naar `content.status_changed` events
- [ ] Integratie in `useVideoJobs`: luister naar `video.progress` en `video.completed` events
- [ ] Connection status indicator component (online/reconnecting/offline)

## Done criteria

- [ ] Approvals page toont live status updates zonder polling
- [ ] Content-generatie status update verschijnt < 2s na backend event
- [ ] Bij WS disconnect switcht UI automatisch naar polling
- [ ] Geen flicker of duplicate data bij event + cache invalidation
