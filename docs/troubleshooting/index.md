# Troubleshooting

Solutions for common issues when working with Django Core-App.

## Common Issues

### Local Development

- **[Local Development](local-dev.md)** - Docker, database, and environment issues
- **[Migrations](migrations.md)** - Database migration problems and solutions

### Authentication & Authorization

- **[Authentication](auth.md)** - JWT token issues, login problems
- **[Permissions](permissions.md)** - Access denied errors, role configuration

### Background Tasks

- **[Celery Tasks](tasks.md)** - Task queue issues, Redis connection problems
- **[Notifications](notifications.md)** - Delivery failures, template issues

### Observability

- **[Observability](observability.md)** - Logging, metrics, health checks

## Quick Diagnosis

### Something Not Working?

1. **Check logs**: Look at Django logs and Celery worker logs
2. **Verify config**: Ensure environment variables are set correctly
3. **Run tests**: `pytest` to verify your setup
4. **Check health**: Visit `/health/` endpoint

### Common Error Patterns

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| `401 Unauthorized` | Invalid/expired token | Refresh token or re-authenticate |
| `403 Forbidden` | Missing permission | Check role assignments |
| `500 Internal Error` | Server exception | Check logs for stack trace |
| `Connection refused` | Service not running | Start Docker services |

## Still Stuck?

If you can't find a solution here:

1. Search existing [GitHub Issues](https://github.com/your-org/django-core/issues)
2. Check [ADRs](../adr/) for design context
3. Ask in the team discussion channel
4. Open a new issue with reproduction steps
