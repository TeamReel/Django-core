# Local Development Setup

## Prerequisites

- Python 3.12+
- Node.js 18+ (for frontend)
- PostgreSQL 15+ (optional - can use SQLite for development)
- Redis 7+ (optional - required for Celery tasks)

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/TeamReel/django-core.git
cd django-core

# Copy environment file
cp .env.example .env

# Start all services
docker-compose -f docker-compose.local.yml up
```

Visit [http://localhost:8000](http://localhost:8000)

### Option 2: Local Python Environment

**1. Backend Setup**

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/local.txt

# Set up environment
cp .env.example .env

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load demo data (optional)
python manage.py seed_demo_data

# Start development server
python manage.py runserver
```

**2. Frontend Setup (if working with UI)**

```bash
# Navigate to frontend package
cd packages/ui

# Install dependencies
npm install
# or with pnpm:
pnpm install

# Start development server
npm run dev
```

## Available Docker Compose Configurations

- **docker-compose.local.yml** - Full local development stack
- **docker-compose.demo.yml** - Demo environment
- **docker-compose.staging.yml** - Staging environment
- **docker-compose.prod.yml** - Production-like environment

## Environment Variables

Key variables needed in `.env`:

```bash
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (optional - defaults to SQLite)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis (optional - required for Celery)
REDIS_URL=redis://localhost:6379/0

# Frontend
VITE_API_BASE_URL=http://localhost:8000/api
```

## Management Commands

The Core-App provides several management commands for common tasks:

### Data Seeding
```bash
# Seed complete demo data (recommended for first setup)
python manage.py seed_demo_data

# Seed football league demo
python manage.py seed_football_data

# Seed specific modules
python manage.py seed_credit_transactions
python manage.py seed_usage_events
python manage.py seed_cache_metrics
python manage.py seed_default_roles
```

### Maintenance
```bash
# Rebuild search index
python manage.py rebuild_search_index

# Warm permission cache
python manage.py warm_permission_cache

# Clean up soft-deleted records
python manage.py cleanup_deleted_organisations
python manage.py cleanup_deleted_memberships

# Check Celery workers
python manage.py check_workers

# Verify demo data integrity
python manage.py verify_demo_data
```

### Database
```bash
# Run migrations
python manage.py migrate

# Create new migration
python manage.py makemigrations

# Show migration status
python manage.py showmigrations
```

## Running Tests

### Backend Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src

# Run specific app
pytest src/accounts/tests/

# Run specific test
pytest src/accounts/tests/test_models.py::TestUserModel::test_email_unique
```

### Frontend Tests
```bash
cd packages/ui
npm test
# or
pnpm test
```

## Code Quality Tools

### Linting & Formatting
```bash
# Python
ruff check src/          # Linting
ruff format src/         # Formatting
mypy src/                # Type checking

# JavaScript/TypeScript
cd packages/ui
npm run lint
npm run format
```

### Pre-commit Hooks
```bash
# Install pre-commit hooks
pre-commit install

# Run hooks manually
pre-commit run --all-files
```

## Development Workflow

1. **Pick a Feature**: Check the [Roadmap](../02-roadmap/index.md)
2. **Create Branch**: `git checkout -b feature/Bxx-feature-name`
3. **Develop**: Write code following [Testing Strategy](testing.md)
4. **Run Tests**: Ensure all tests pass
5. **Commit**: Follow [Git Workflow](git-workflow.md)
6. **Push & PR**: Create pull request for review

## Troubleshooting

### Database Issues
```bash
# Reset database completely
python manage.py flush

# Drop and recreate migrations (development only!)
find . -path "*/migrations/*.py" -not -name "__init__.py" -delete
python manage.py makemigrations
python manage.py migrate
```

### Redis/Celery Issues
```bash
# Check if Redis is running
redis-cli ping  # Should return "PONG"

# Clear Redis cache
redis-cli FLUSHDB

# Monitor Celery tasks
celery -A config inspect active
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

## Next Steps

- Read [Testing Strategy](testing.md) before writing code
- Follow [Git Workflow](git-workflow.md) for commits
- Check [Spec-Kitty Workflow](spec-kitty.md) for feature development
- Review [CI/CD Pipeline](cicd.md) for quality gates
