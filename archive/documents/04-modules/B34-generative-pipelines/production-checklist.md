# Production Deployment Checklist: B34 Generative Pipelines

Use this checklist before deploying B34 to production to ensure all requirements are met.

## Pre-Deployment Validation

### Code Quality

- [ ] All tests pass: `pytest tests/generative/ -v`
- [ ] Coverage >85%: `pytest tests/generative/ --cov=src.generative --cov-report=term`
- [ ] No security issues: `bandit -r src/generative/ -f json -o bandit-report.json`
- [ ] No type errors: `mypy src/generative/`
- [ ] Code formatted: `black src/generative/` and `ruff check src/generative/`
- [ ] No linting errors: Pre-commit hooks pass

### Documentation

- [ ] README.md updated with latest features
- [ ] API documentation accurate (contracts/openapi.yaml)
- [ ] ADR reflects all major decisions
- [ ] Quickstart guide tested by non-author
- [ ] CHANGELOG.md updated with new version

---

## Environment Configuration

### Required Environment Variables

- [ ] `OPENAI_API_KEY` - Valid OpenAI API key (test with `openai.models.list()`)
- [ ] `LANGGRAPH_API_URL` - LangGraph server URL (test connectivity)
- [ ] `CELERY_BROKER_URL` - Redis/RabbitMQ URL (test connection)
- [ ] `CELERY_RESULT_BACKEND` - Redis URL for task results

### Optional Environment Variables

- [ ] `GENERATIVE_MAX_RETRIES` - Max retry attempts (default: 5)
- [ ] `GENERATIVE_WEBSOCKET_ENABLED` - Enable real-time updates (default: true)
- [ ] `GENERATIVE_DEFAULT_RETENTION_DAYS` - Default output retention (default: 30)

### Django Settings

- [ ] `INSTALLED_APPS` includes `'src.generative'`
- [ ] `CELERY_BEAT_SCHEDULE` has cleanup + pricing jobs
- [ ] `LOGGING` configured for structured JSON logs
- [ ] Database connection pool sized appropriately
- [ ] Static files configured for admin interface

---

## Database

### Migrations

- [ ] All migrations applied: `python manage.py migrate generative`
- [ ] No pending migrations: `python manage.py showmigrations generative`
- [ ] Migration rollback tested in staging
- [ ] Database indexes created (check `\d generative_generationrequest`)

### Performance

- [ ] Index on `generationrequest.status` verified
- [ ] Index on `generationrequest.created_at` verified
- [ ] Index on `generationoutput.expires_at` verified
- [ ] Query performance tested with realistic data volume
- [ ] Database backup schedule configured

### Data Validation

- [ ] Check constraints validated (no NULL required fields)
- [ ] Foreign key relationships intact
- [ ] Seed data loaded if needed (templates, pricing)

---

## Celery Configuration

### Workers

- [ ] Celery worker running: `celery -A config worker --loglevel=info`
- [ ] Worker concurrency set appropriately (`--concurrency=4`)
- [ ] Worker auto-restart configured (systemd/supervisor)
- [ ] Worker resource limits set (memory, CPU)

### Beat Scheduler

- [ ] Celery Beat running: `celery -A config beat --loglevel=info`
- [ ] Beat schedule verified: Check `CELERY_BEAT_SCHEDULE` in settings
- [ ] Cron jobs registered:
  - [ ] `cleanup-expired-outputs` (daily at 2:45 AM UTC)
  - [ ] `update-template-costs` (monthly on 1st at 3:00 AM UTC)
- [ ] Beat PID file location configured

### Monitoring

- [ ] Flower dashboard accessible (if using Celery Flower)
- [ ] Task execution logs visible
- [ ] Queue depth monitored (alerts if >1000 pending)
- [ ] Failed tasks logged to Sentry/equivalent

---

## External Services

### OpenAI

- [ ] API key valid and active
- [ ] Rate limits configured (requests/min, tokens/min)
- [ ] Billing alerts set (avoid surprise charges)
- [ ] Organization ID set if using multiple keys
- [ ] Usage quota checked: https://platform.openai.com/account/usage

### LangGraph

- [ ] Server deployed and accessible at `LANGGRAPH_API_URL`
- [ ] Health check passes: `curl $LANGGRAPH_API_URL/health`
- [ ] Custom graphs registered (check registry)
- [ ] Authentication configured if required
- [ ] Resource limits set (memory, CPU per graph execution)

### B11 Credits Module

- [ ] Credits module installed and configured
- [ ] Transaction creation tested
- [ ] Idempotency keys working (no duplicate charges)
- [ ] Insufficient balance returns HTTP 402
- [ ] Refunds working correctly

### B33 Brand Identity Module (Optional)

- [ ] Brand module installed if using brand context injection
- [ ] Brand profiles exist for test organizations
- [ ] Context injection tested in generation requests

### B35 File Storage Module (Optional)

- [ ] File storage module installed if using file outputs
- [ ] Presigned URL generation working
- [ ] File upload/download tested
- [ ] Expiration times configured correctly

### B23 WebSocket Module (Optional)

- [ ] WebSocket server running if real-time updates enabled
- [ ] Status update events publishing correctly
- [ ] Frontend receiving events
- [ ] Fallback to polling if WebSocket unavailable

---

## Security

### Authentication & Authorization

- [ ] All API endpoints require authentication (`IsAuthenticated`)
- [ ] Permission classes enforce project membership (`IsProjectMember`)
- [ ] Admin actions restricted to project admins (`IsProjectAdmin`)
- [ ] Template deletion restricted to admins
- [ ] Rate limiting configured (10 requests/min per user)

### Data Protection

- [ ] HTTPS enabled (no HTTP in production)
- [ ] CSRF protection enabled (`CSRF_COOKIE_SECURE=True`)
- [ ] SQL injection prevention (ORM only, no raw SQL)
- [ ] XSS prevention (serializer validation, no raw HTML)
- [ ] API keys not hardcoded (use environment variables)

### Secrets Management

- [ ] OpenAI API key rotated if exposed
- [ ] Database credentials secure (not in git)
- [ ] Celery broker password secure
- [ ] Admin credentials strong and rotated regularly

---

## Monitoring & Logging

### Structured Logging

- [ ] Logs in JSON format: `logs/generative.log`
- [ ] Log rotation configured (10MB max, 5 backups)
- [ ] Log level set appropriately (INFO in prod, DEBUG in dev)
- [ ] Request context included (request_id, user_id, template_id)
- [ ] Error stack traces logged

### Prometheus Metrics (Optional)

- [ ] Metrics endpoint accessible: `/metrics/`
- [ ] Custom metrics exported:
  - [ ] `generative_requests_total{status, provider}`
  - [ ] `generative_request_duration_seconds{provider}`
  - [ ] `generative_request_cost_dollars{provider}`
  - [ ] `generative_active_requests`
- [ ] Grafana dashboard configured
- [ ] Alerts configured (high error rate, high cost)

### Health Checks

- [ ] Health check endpoint working: `/api/v1/generative/health/`
- [ ] Database connectivity checked
- [ ] Celery worker connectivity checked
- [ ] Load balancer configured to use health check
- [ ] Health check alerts set up (Pingdom, UptimeRobot)

### Error Tracking

- [ ] Sentry/Bugsnag configured for Django
- [ ] Celery tasks report errors to error tracker
- [ ] Error notifications configured (email, Slack)
- [ ] Error rate alerts set (>1% errors triggers alert)

---

## Performance

### Database Optimization

- [ ] Connection pool sized: `CONN_MAX_AGE=600` (10 min)
- [ ] Query timeout configured: `OPTIONS={'connect_timeout': 5}`
- [ ] Slow query logging enabled (>1s queries logged)
- [ ] EXPLAIN ANALYZE run on critical queries
- [ ] Database read replicas configured if high traffic

### Celery Optimization

- [ ] Worker count = CPU cores × 2 (adjust based on load)
- [ ] Task timeout configured: `task_soft_time_limit=300` (5 min)
- [ ] Result expiration set: `result_expires=3600` (1 hour)
- [ ] Prefetch multiplier tuned: `worker_prefetch_multiplier=4`
- [ ] Task priority configured if needed

### Caching

- [ ] Redis cache configured for template lookups
- [ ] Cache TTL set appropriately (templates: 300s)
- [ ] Cache invalidation on template updates
- [ ] Cache hit rate monitored (target >80%)

### Rate Limiting

- [ ] DRF throttling configured: `DEFAULT_THROTTLE_RATES`
- [ ] Per-user limits set (10 requests/min)
- [ ] Per-IP limits set (100 requests/min)
- [ ] Rate limit headers returned (`X-RateLimit-Remaining`)

---

## Testing in Production

### Smoke Tests

Run these manual tests after deployment:

1. **Create Template**
   - [ ] POST /templates/ as admin succeeds
   - [ ] Template visible in list endpoint
   - [ ] Template has correct default retention_days

2. **Submit Request**
   - [ ] POST /requests/ succeeds (HTTP 202)
   - [ ] Request ID returned in response
   - [ ] Credits reserved (check balance decreased)

3. **Process Request**
   - [ ] Celery worker picks up task (check logs)
   - [ ] Request status changes: pending → processing → completed
   - [ ] Actual cost recorded
   - [ ] Credits settled (check transaction)

4. **Retrieve Output**
   - [ ] GET /outputs/{id}/ returns output
   - [ ] Text content readable
   - [ ] File presigned URL works (if file output)
   - [ ] Output expires after retention period

5. **Cancel Request**
   - [ ] POST /requests/{id}/cancel/ succeeds
   - [ ] Status changes to "cancelled"
   - [ ] Credits refunded (check balance increased)

6. **Insufficient Credits**
   - [ ] Reduce user balance to $0
   - [ ] POST /requests/ returns HTTP 402
   - [ ] Error message clear: "Insufficient credits"

7. **WebSocket Events** (if enabled)
   - [ ] Connect to WebSocket endpoint
   - [ ] Submit request
   - [ ] Receive status update events

### Load Testing

- [ ] Load test with realistic traffic (100 req/min)
- [ ] Monitor response times (<500ms for submit endpoint)
- [ ] Monitor queue depth (<50 pending tasks)
- [ ] Monitor memory usage (workers <2GB each)
- [ ] Monitor CPU usage (<70% average)

---

## Rollback Plan

### Preparation

- [ ] Previous version deployable (Docker image tagged)
- [ ] Database migration rollback tested in staging
- [ ] Rollback command documented: `python manage.py migrate generative <previous>`
- [ ] Rollback decision criteria defined (>5% error rate)

### Rollback Procedure

1. [ ] Stop new deployments
2. [ ] Drain Celery workers (finish pending tasks)
3. [ ] Deploy previous version
4. [ ] Rollback database migration if needed
5. [ ] Restart services (Django, Celery)
6. [ ] Verify smoke tests pass
7. [ ] Monitor for 30 minutes

### Data Export/Import

- [ ] Export script tested: `python manage.py dumpdata generative`
- [ ] Import script tested: `python manage.py loaddata generative.json`
- [ ] Backup restore tested from production snapshot

---

## Post-Deployment

### Monitoring (First 24 Hours)

- [ ] Monitor error logs every 2 hours
- [ ] Check Celery task success rate (target >95%)
- [ ] Monitor queue depth (should drain within 5 min)
- [ ] Verify cron jobs ran (check logs at 2:45 AM next day)
- [ ] Check cost tracking accuracy (compare estimates vs actuals)

### User Communication

- [ ] Announce new features to users (if applicable)
- [ ] Update status page: "New AI generation features live"
- [ ] Provide support contact for issues
- [ ] Monitor support tickets for generation-related issues

### Documentation Updates

- [ ] Update runbook with any deployment issues encountered
- [ ] Document any production-specific configuration
- [ ] Update troubleshooting guide with new solutions
- [ ] Share deployment retrospective with team

---

## Support & Incident Response

### Runbook

- [ ] Runbook created: `docs/runbooks/b34-generative-pipelines.md`
- [ ] Common issues documented:
  - Request stuck in processing
  - Insufficient credits error
  - Rate limit errors
  - File not found errors
- [ ] Solutions include exact commands to run

### On-Call

- [ ] On-call rotation configured
- [ ] Escalation path defined (L1 → L2 → L3)
- [ ] Incident response playbook created
- [ ] PagerDuty/OpsGenie alerts configured

### Debugging Tools

- [ ] Access to production logs (read-only)
- [ ] Access to Celery Flower dashboard
- [ ] Access to Django admin (view-only for support)
- [ ] Database query access (read-only replica)

---

## Sign-Off

### Approvals Required

- [ ] **Engineering Lead**: Code quality, tests, security
- [ ] **DevOps**: Infrastructure, monitoring, rollback plan
- [ ] **Product Manager**: Features complete, user communication
- [ ] **Security Team**: Security audit passed, pen test if needed
- [ ] **Support Team**: Runbook reviewed, training completed

### Deployment Authorization

- [ ] Deployment scheduled: [DATE] [TIME]
- [ ] Stakeholders notified (email sent)
- [ ] Maintenance window reserved (if needed)
- [ ] Rollback owner assigned: [NAME]

**Deployment Commander**: ___________________
**Date**: ___________________

---

## Post-Deployment Verification

After deployment completes:

- [ ] All smoke tests passed
- [ ] No critical errors in first hour
- [ ] Metrics baseline established
- [ ] Team notified of successful deployment
- [ ] This checklist archived in `deployments/` directory

**Status**: ✅ DEPLOYED | ❌ ROLLED BACK | ⏸️ PAUSED

**Notes**:

---

## Next Steps

After successful deployment:

1. Monitor for 7 days before considering it stable
2. Schedule post-deployment retrospective
3. Update feature roadmap with learnings
4. Plan next iteration based on user feedback
