# CI/CD & Deployment

## Current Practice

### Local Verification (Before Push)

```bash
# Backend
pytest                              # Run tests
python manage.py check              # Django system check
python manage.py makemigrations     # Verify no missing migrations

# Frontend
cd demo && npx tsc --noEmit         # Type check
cd demo && npx vite build           # Production build
```

### Deployment

| Service | Platform | Trigger |
|---------|----------|---------|
| Backend API | Railway | Push to `main` (auto-deploy) |
| Frontend | Vercel | Push to `main` (auto-deploy) |
| Celery workers | Railway | Push to `main` (auto-deploy) |
| Database migrations | Railway | `python manage.py migrate` (manual) |

### Railway Services

| Service | Purpose |
|---------|---------|
| `backend` | Django API server |
| `frontend` | React/Vite (nginx) |
| `celery-worker` | Async tasks (video, AI, email) |
| `celery-beat` | Scheduled tasks |
| `worker-ai` | AI processing |
| `Postgres` | Database |
| `Redis` | Cache + Celery broker |

## Planned (Not Yet Implemented)

*   GitHub Actions CI on Pull Request (linting, testing, type checking)
*   Automated security scanning
*   Automated accessibility checks
