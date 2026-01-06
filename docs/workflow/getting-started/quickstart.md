# Quickstart

Get Django Core-App running locally in under 15 minutes.

!!! tip "Before You Start"
    Make sure you have the [required software installed](prerequisites.md) before proceeding.

## Option A: Docker Setup (Recommended)

The fastest way to get started is with Docker. This approach handles all dependencies automatically.

### 1. Clone the Repository

```bash
git clone https://github.com/TeamReel/django-core.git
cd django-core
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if you need to customize settings. The defaults work for local development.

### 3. Start Services

```bash
docker-compose -f docker-compose.local.yml up
```

This starts:

- **Django** application on port 8000
- **PostgreSQL** database on port 5432
- **Redis** cache on port 6379
- **Celery** worker for background tasks

### 4. Verify Installation

Open your browser and visit:

- **Django Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/)
- **Health Check**: [http://localhost:8000/health/live](http://localhost:8000/health/live)
- **API Root**: [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/)

To create a superuser:

```bash
docker-compose -f docker-compose.local.yml exec web python manage.py createsuperuser
```

---

## Option B: Local Python Setup

If you prefer running Python directly on your machine:

### 1. Clone the Repository

```bash
git clone https://github.com/TeamReel/django-core.git
cd django-core
```

### 2. Create Virtual Environment

=== "Linux/macOS"

    ```bash
    python3.12 -m venv venv
    source venv/bin/activate
    ```

=== "Windows (PowerShell)"

    ```powershell
    python -m venv venv
    .\venv\Scripts\Activate.ps1
    ```

=== "Windows (CMD)"

    ```cmd
    python -m venv venv
    venv\Scripts\activate.bat
    ```

### 3. Install Dependencies

```bash
pip install -r requirements/local.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and configure your database and Redis connections:

```ini
# Database (local PostgreSQL)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/django_core

# Redis (local instance)
REDIS_URL=redis://localhost:6379/0

# Development settings
DEBUG=True
SECRET_KEY=your-development-secret-key
```

### 5. Set Up Database

Make sure PostgreSQL is running, then:

```bash
# Create database
createdb django_core

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 6. Start Development Server

```bash
python manage.py runserver
```

Visit [http://localhost:8000](http://localhost:8000) to verify it's working.

### 7. Start Celery Worker (Optional)

For background task processing, open a new terminal:

```bash
source venv/bin/activate  # or Windows equivalent
celery -A config worker -l INFO
```

---

## Troubleshooting

### Docker Issues

**Container won't start?**

```bash
# Check logs
docker-compose -f docker-compose.local.yml logs

# Rebuild containers
docker-compose -f docker-compose.local.yml build --no-cache
docker-compose -f docker-compose.local.yml up
```

**Port already in use?**

```bash
# Find process using port 8000
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# Kill the process or change the port in docker-compose.local.yml
```

### Database Issues

**Can't connect to PostgreSQL?**

- Ensure PostgreSQL is running: `pg_isready`
- Check your DATABASE_URL in `.env`
- Verify the database exists: `psql -l`

**Migration errors?**

```bash
# Reset migrations (development only!)
python manage.py migrate --fake-initial
```

### Redis Issues

**Can't connect to Redis?**

- Ensure Redis is running: `redis-cli ping`
- Check REDIS_URL in `.env`

---

## Next Steps

Now that you have a running environment:

1. **Explore the API**: Visit [http://localhost:8000/api/v1/](http://localhost:8000/api/v1/) to see available endpoints
2. **Read the Architecture**: Understand [how the system works](../architecture/index.md)
3. **Make a Contribution**: Follow the [first contribution guide](first-contribution.md)
4. **Learn the Structure**: Understand the [project layout](project-structure.md)

---

## Common Commands

Here's a quick reference of commands you'll use often:

| Task | Command |
|------|---------|
| Run tests | `pytest` |
| Run tests with coverage | `pytest --cov=src --cov-report=html` |
| Type checking | `mypy src/` |
| Linting | `ruff check src/` |
| Format code | `black src/` |
| Run migrations | `python manage.py migrate` |
| Create migration | `python manage.py makemigrations` |
| Django shell | `python manage.py shell` |
| Celery worker | `celery -A config worker -l INFO` |
