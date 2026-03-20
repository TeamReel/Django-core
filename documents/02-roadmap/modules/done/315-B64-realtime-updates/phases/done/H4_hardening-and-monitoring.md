# H4 — Hardening & Monitoring

> **Effort:** ~2 uur | **Impact:** Production-ready

## To do

- [x] Rate limiting op subscription requests (max 20 channels per connection)
- [x] Connection cleanup: stale connections opruimen (> 1 uur geen heartbeat)
- [x] Metrics: WebSocket connections count, events published/s, subscription count (bestaande `metrics.py` uitbreiden)
- [x] Logging: structured logging voor event publish + delivery failures
- [ ] Load test: 50 concurrent WebSocket connections met events

## Done criteria

- [x] Geen memory leaks bij langdurige connections
- [ ] Metrics zichtbaar in Grafana dashboard (bestaande `grafana_dashboard.json` uitbreiden)
- [x] Rate limiting werkt: > 20 subscriptions → error response
- [x] Stale connection cleanup draait via Celery beat
