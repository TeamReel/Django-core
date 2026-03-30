# Database Management

## Overview

This guide covers database operations, backups, migrations, and maintenance for the Django Core-App.

## Database Schema

The Core-App uses **PostgreSQL 15+** with the following key schemas:

**Core Tables:**
- `accounts_user` - User accounts
- `organisations_organisation` - Multi-tenant organizations
- `projects_project` - Projects/workspaces
- `permissions_*` - RBAC permissions and roles
- `audit_auditlog` - Immutable audit trail

**Extension Tables:**
- `transactions_*` - Credits and billing
- `settings_*` - Feature flags and preferences
- `notifications_*` - Notification system
- `search_*` - Full-text search indexes
- `files_*` - File metadata (B22)
- `observability_*` - Metrics (B18)

## Migrations

### Running Migrations

**Production:**
```bash
# Railway (automatic on deploy)
railway run python manage.py migrate

# Docker
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate

# Kubernetes
kubectl exec -it deployment/django-core-web -n django-core -- python manage.py migrate
```

**Development:**
```bash
python manage.py migrate
```

### Creating Migrations

```bash
# Auto-generate migrations for all apps
python manage.py makemigrations

# Specific app
python manage.py makemigrations accounts

# With custom name
python manage.py makemigrations accounts --name add_email_verified_field

# Empty migration (for data migrations)
python manage.py makemigrations accounts --empty --name populate_email_verified
```

### Migration Best Practices

1. **Review Generated Migrations**: Always check the migration file before committing
2. **Test Migrations**: Run on staging before production
3. **Backward Compatible**: Ensure migrations can be safely rolled back
4. **Data Migrations**: Use separate migrations for data changes
5. **No Schema + Data**: Don't mix schema and data changes in one migration

### Migration Status

```bash
# Show all migrations and their status
python manage.py showmigrations

# Show specific app
python manage.py showmigrations accounts

# Show unapplied migrations
python manage.py showmigrations --plan
```

### Rollback Migrations

```bash
# Rollback to specific migration
python manage.py migrate accounts 0003_previous_migration

# Rollback all migrations for an app (development only!)
python manage.py migrate accounts zero
```

## Backups

### Automated Backups

**Railway:**
- Automatic daily backups
- Access via Railway Dashboard → Database → Backups
- Retention: 7 days (free), 30 days (pro)

**Docker/Self-Hosted:**
```bash
# Automated backup script (add to cron)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="django_core"

docker-compose exec -T db pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 7 backups
ls -t $BACKUP_DIR/backup_*.sql.gz | tail -n +8 | xargs rm -f
```

**Cron Schedule (daily at 2 AM):**
```bash
0 2 * * * /path/to/backup-script.sh >> /var/log/db-backup.log 2>&1
```

### Manual Backups

**PostgreSQL Direct:**
```bash
# Backup
pg_dump -h localhost -U postgres -d django_core > backup.sql

# Compressed backup
pg_dump -h localhost -U postgres -d django_core | gzip > backup.sql.gz

# Custom format (faster restore)
pg_dump -h localhost -U postgres -d django_core -Fc > backup.dump
```

**Docker:**
```bash
# Backup
docker-compose exec -T db pg_dump -U postgres django_core > backup.sql

# Restore
docker-compose exec -T db psql -U postgres django_core < backup.sql
```

**Railway:**
```bash
# Get DATABASE_URL from Railway
railway variables

# Backup using pg_dump
pg_dump $DATABASE_URL > backup.sql
```

### Restore from Backup

**⚠️ Warning: This will overwrite existing data!**

```bash
# 1. Stop application
docker-compose stop web

# 2. Drop and recreate database
docker-compose exec db psql -U postgres -c "DROP DATABASE IF EXISTS django_core;"
docker-compose exec db psql -U postgres -c "CREATE DATABASE django_core;"

# 3. Restore backup
docker-compose exec -T db psql -U postgres django_core < backup.sql

# 4. Run migrations (if schema changed)
docker-compose exec web python manage.py migrate

# 5. Restart application
docker-compose start web
```

**Custom format restore:**
```bash
pg_restore -h localhost -U postgres -d django_core backup.dump
```

## Data Seeding

### Production Initial Data

```bash
# Required: Seed default roles and permissions
python manage.py seed_default_roles

# Optional: Seed demo data for testing
python manage.py seed_demo_data
```

### Development Seeding

```bash
# Complete demo environment
python manage.py seed_demo_data
python manage.py seed_football_data
python manage.py seed_credit_transactions
python manage.py seed_usage_events
python manage.py seed_cache_metrics

# Verify data integrity
python manage.py verify_demo_data
```

## Database Maintenance

### Vacuum & Analyze

PostgreSQL requires regular maintenance to reclaim space and update statistics.

```bash
# Analyze tables (update statistics)
docker-compose exec db psql -U postgres -d django_core -c "ANALYZE;"

# Vacuum (reclaim space)
docker-compose exec db psql -U postgres -d django_core -c "VACUUM;"

# Full vacuum (locks tables)
docker-compose exec db psql -U postgres -d django_core -c "VACUUM FULL;"
```

**Automatic Vacuuming:**
PostgreSQL autovacuum runs automatically. Check settings:
```sql
SHOW autovacuum;
SHOW autovacuum_vacuum_scale_factor;
SHOW autovacuum_analyze_scale_factor;
```

### Index Maintenance

```bash
# Rebuild indexes
docker-compose exec db psql -U postgres -d django_core -c "REINDEX DATABASE django_core;"

# Check index usage
docker-compose exec db psql -U postgres -d django_core -c "
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
"
```

### Clean Up Soft-Deleted Records

The Core-App uses soft deletion for most models.

```bash
# Clean up soft-deleted organisations (after 30 days)
python manage.py cleanup_deleted_organisations

# Clean up soft-deleted memberships
python manage.py cleanup_deleted_memberships

# Clean up old audit logs (optional - after 90 days)
# Not implemented yet - audit logs are immutable
```

### Transaction Cleanup

```bash
# Clean up old idempotency keys (after 7 days)
python manage.py cleanup_idempotency_keys
```

## Database Optimization

### Query Performance

**Find Slow Queries:**
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1s
SELECT pg_reload_conf();

-- View logs
docker-compose logs db | grep "duration:"
```

**Analyze Query Plans:**
```sql
EXPLAIN ANALYZE SELECT * FROM accounts_user WHERE email = 'test@example.com';
```

**Index Usage:**
```sql
-- Find missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;
```

### Connection Pooling

**PgBouncer (Recommended for production):**
```yaml
# docker-compose.yml
services:
  pgbouncer:
    image: pgbouncer/pgbouncer
    environment:
      - DATABASES_HOST=db
      - DATABASES_PORT=5432
      - DATABASES_USER=postgres
      - DATABASES_PASSWORD=postgres
      - DATABASES_DBNAME=django_core
      - PGBOUNCER_POOL_MODE=transaction
      - PGBOUNCER_MAX_CLIENT_CONN=1000
      - PGBOUNCER_DEFAULT_POOL_SIZE=25
    ports:
      - "6432:6432"
```

**Django Connection Settings:**
```python
# settings/production.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'django_core',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'pgbouncer',  # Use PgBouncer
        'PORT': '6432',
        'CONN_MAX_AGE': 0,  # Don't persist connections with PgBouncer
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

## Database Monitoring

### Check Database Size

```sql
SELECT
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;
```

### Check Table Sizes

```sql
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Check Active Connections

```sql
SELECT
    datname,
    count(*) as connections
FROM pg_stat_activity
GROUP BY datname;
```

### Check Locks

```sql
SELECT
    locktype,
    relation::regclass,
    mode,
    granted
FROM pg_locks
WHERE NOT granted;
```

## Troubleshooting

### "Too many connections"
```sql
-- Check max connections
SHOW max_connections;

-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

**Solution:** Implement connection pooling (PgBouncer)

### "Database disk full"
```bash
# Check disk usage
df -h

# Check database size
SELECT pg_size_pretty(pg_database_size('django_core'));

# Run vacuum to reclaim space
VACUUM FULL;

# Archive old audit logs (if applicable)
```

### "Slow queries"
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 500;
SELECT pg_reload_conf();

-- Analyze problematic tables
ANALYZE accounts_user;
ANALYZE organisations_organisation;

-- Check for missing indexes
SELECT * FROM pg_stat_user_tables WHERE seq_scan > 1000;
```

## Best Practices

1. **Regular Backups**: Daily automated backups with 7+ day retention
2. **Test Restores**: Verify backups work by testing restores monthly
3. **Monitor Size**: Set up alerts for database size growth
4. **Vacuum Regularly**: Ensure autovacuum is running
5. **Index Wisely**: Add indexes for frequently queried columns
6. **Connection Pooling**: Use PgBouncer in production
7. **Soft Delete**: Use cleanup commands to remove old soft-deleted records
8. **Audit Logs**: Plan retention policy for audit logs (90+ days)

## Next Steps

- Set up [automated backups](#automated-backups)
- Configure [connection pooling](#connection-pooling)
- Review [Observability Guide](observability.md) for database metrics
- Check [Deployment Guide](deployment.md) for production database setup
