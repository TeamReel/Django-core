# H4 — Hardening & Monitoring

> **Effort:** ~2 uur | **Impact:** Production-ready

## To do

- [ ] Rate limiting op subscription requests (max 20 channels per connection)
- [ ] Connection cleanup: stale connections opruimen (> 1 uur geen heartbeat)
- [ ] Metrics: WebSocket connections count, events published/s, subscription count (bestaande `metrics.py` uitbreiden)
- [ ] Logging: structured logging voor event publish + delivery failures
- [ ] Load test: 50 concurrent WebSocket connections met events

## Done criteria

- [ ] Geen memory leaks bij langdurige connections
- [ ] Metrics zichtbaar in Grafana dashboard (bestaande `grafana_dashboard.json` uitbreiden)
- [ ] Rate limiting werkt: > 20 subscriptions → error response
- [ ] Stale connection cleanup draait via Celery beat
