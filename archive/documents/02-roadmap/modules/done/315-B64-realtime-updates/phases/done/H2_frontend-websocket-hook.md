# H2 — Frontend WebSocket Hook

> **Effort:** ~4 uur | **Impact:** UI update real-time zonder polling

## To do

- [x] `useRealtimeChannel(channelType, channelId)` hook: WebSocket verbinding + subscription management
- [x] Auto-reconnect met exponential backoff (1s → 30s max)
- [x] Fallback naar polling als WebSocket faalt (feature flag `VITE_REALTIME_WS_ENABLED`)
- [x] Invalidate React Query cache bij incoming event (queryKeys + queryClient export)
- [x] Integratie in `useGenerationJobs`: luister naar `content.status_changed` events
- [x] Integratie in `useVideoJobs`: luister naar `video.progress` en `video.completed` events
- [x] Connection status indicator component (online/reconnecting/offline)

## Done criteria

- [x] Approvals page toont live status updates zonder polling
- [x] Content-generatie status update verschijnt < 2s na backend event
- [x] Bij WS disconnect switcht UI automatisch naar polling (slowdown → normal interval)
- [x] Geen flicker of duplicate data bij event + cache invalidation (same JSON dedup in hooks)
