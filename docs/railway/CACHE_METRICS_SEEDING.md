# Railway Cache Metrics Seeding Instructions

## Problem
The cache performance page at `/demo/performance` shows real-time metrics but the historical graph is empty with the message:
> "No historical data available yet. Data is collected every 10 minutes by Celery Beat."

## Root Cause
The `collect_system_metrics` Celery task only runs every 10 minutes, so it takes time to build up historical data. For demo/testing purposes, we need to seed the database with historical data.

## Solution
Run the `seed_cache_metrics` management command to populate 7 days of realistic cache performance data.

## Deployment Steps

### 1. Wait for Railway Deployment
```bash
# Railway auto-deploys when you push to main
# Check Railway dashboard for deployment status
```

### 2. Run Seeder via Railway CLI
```bash
# Option A: Railway CLI (recommended)
railway run python manage.py seed_cache_metrics --days 7 --interval 10

# Option B: Railway Shell (interactive)
railway shell
python manage.py seed_cache_metrics --days 7 --interval 10
```

### 3. Verify Data Created
```bash
# Check the database
railway run python manage.py check_metrics

# Expected output:
# Total records: 4032 (1008 timestamps × 4 metric types)
# Last 7 days: 4032
```

### 4. Test Frontend
1. Open https://demo.teamreel.app/demo/performance
2. Scroll to "Performance History (Last 7 Days)" section
3. Should see a line graph with:
   - Green line: Hit Ratio (0-100%)
   - Blue line: Memory Usage (MB)
   - X-axis: Timestamps over 7 days

## Command Options

### Basic Usage
```bash
python manage.py seed_cache_metrics
```

### Custom Time Range
```bash
# Seed 14 days of data
python manage.py seed_cache_metrics --days 14

# Seed hourly intervals instead of 10-minute
python manage.py seed_cache_metrics --interval 60
```

## Seeded Data Characteristics

The seeder generates realistic cache patterns:

- **Business Hours Boost**: Higher activity 9am-5pm (1.5× multiplier)
- **Weekday Pattern**: More activity Monday-Friday (1.2× vs 0.6× weekend)
- **Memory Growth**: Gradual increase over time (~100KB per day)
- **Randomness**: ±20% variation to simulate real usage

### Example Values
```
Timestamp: 2026-01-04 09:30:00
- cache_hits: ~1800 (base 1000 × 1.5 × 1.2)
- cache_misses: ~180
- memory_used: ~1.5 MB
- total_keys: ~20
```

## Idempotent Behavior

The seeder is safe to run multiple times:

```python
# Checks existing timestamps before creating
existing_timestamps = SystemMetric.objects.filter(
    timestamp__gte=start_time,
    metric_type="cache_hits"
).values_list("timestamp", flat=True)

if timestamp in existing_timestamps:
    skipped_count += 1
    continue
```

## Troubleshooting

### No Data in Graph After Seeding

**Check 1: Verify API Response**
```bash
curl https://api.teamreel.app/api/v1/system/cache/metrics/ | jq '.history | length'
# Should return: > 0
```

**Check 2: Check Database Records**
```bash
railway run python manage.py check_metrics
```

**Check 3: Browser Console**
```javascript
// Open developer console on /demo/performance page
// Look for:
console.log('[CachePerformancePage] Unwrapped data:', data);
// Should show: { realtime: {...}, history: [array with data] }
```

### Seeder Fails with Database Error

**Symptom**: `django.db.utils.OperationalError`

**Solution**: Ensure Railway PostgreSQL service is running
```bash
railway status
# Check "postgres" service is "Active"
```

### Historical Query Returns Empty

**Symptom**: `history: []` in API response despite seeded data

**Check 1: Timezone Mismatch**
```python
# In Django shell
from django.utils import timezone
from observability.models import SystemMetric

print(timezone.now())
print(SystemMetric.objects.order_by('-timestamp').first().timestamp)
# Should be within 7 days
```

**Check 2: Wrong Metric Type**
```python
# Verify all 4 metric types exist
from observability.models import SystemMetric
for mt in ["cache_hits", "cache_misses", "memory_used", "total_keys"]:
    count = SystemMetric.objects.filter(metric_type=mt).count()
    print(f"{mt}: {count}")
```

## Related Files

- **Seeder**: `src/observability/management/commands/seed_cache_metrics.py`
- **Checker**: `src/observability/management/commands/check_metrics.py`
- **Model**: `src/observability/models.py` (record_metric with timestamp support)
- **API View**: `src/observability/views.py` (cache_metrics)
- **Frontend**: `examples/demo-shell/src/pages/platform/CachePerformancePage.tsx`

## Success Criteria

✅ **Database**: `railway run python manage.py check_metrics` shows 4032 records (7 days × 144 intervals × 4 metrics)
✅ **API**: `curl https://api.teamreel.app/api/v1/system/cache/metrics/` returns `history: [...]` with 1008 data points
✅ **Frontend**: https://demo.teamreel.app/demo/performance shows line graph with hit ratio and memory trends

## Next Steps

After seeding:

1. The Celery Beat task (`collect_system_metrics`) will continue adding new data every 10 minutes
2. The `cleanup_old_metrics(days=7)` function removes data older than 7 days automatically
3. No further manual intervention needed - the system is self-maintaining
