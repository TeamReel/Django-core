# Prerequisites

Before setting up Django Core-App, make sure you have the following software installed.

## Required Software

### Python 3.12+

Django Core-App requires Python 3.12 or higher for modern type hints and performance improvements.

=== "Linux (Ubuntu/Debian)"

    ```bash
    sudo apt update
    sudo apt install python3.12 python3.12-venv python3.12-dev
    ```

=== "macOS"

    ```bash
    # Using Homebrew
    brew install python@3.12
    ```

=== "Windows"

    Download from [python.org](https://www.python.org/downloads/) and run the installer.

    !!! warning "Important"
        Check "Add Python to PATH" during installation.

**Verify installation:**

```bash
python --version  # Should show Python 3.12.x or higher
```

---

### PostgreSQL 13+

PostgreSQL is the primary database, required for JSONB fields and GIN indexes.

=== "Linux (Ubuntu/Debian)"

    ```bash
    sudo apt update
    sudo apt install postgresql postgresql-contrib
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
    ```

=== "macOS"

    ```bash
    # Using Homebrew
    brew install postgresql@15
    brew services start postgresql@15
    ```

=== "Windows"

    Download from [postgresql.org](https://www.postgresql.org/download/windows/) and run the installer.

=== "Docker (Alternative)"

    Skip local installation and use Docker:
    ```bash
    docker run -d --name postgres \
      -e POSTGRES_PASSWORD=postgres \
      -p 5432:5432 \
      postgres:15
    ```

**Verify installation:**

```bash
psql --version  # Should show 13.x or higher
pg_isready       # Should show "accepting connections"
```

---

### Redis 6+

Redis is used for caching, rate limiting, and Celery task queue.

=== "Linux (Ubuntu/Debian)"

    ```bash
    sudo apt update
    sudo apt install redis-server
    sudo systemctl start redis
    sudo systemctl enable redis
    ```

=== "macOS"

    ```bash
    # Using Homebrew
    brew install redis
    brew services start redis
    ```

=== "Windows"

    Redis doesn't have official Windows support. Use one of these options:

    1. **Docker (Recommended)**:
       ```bash
       docker run -d --name redis -p 6379:6379 redis:7
       ```

    2. **WSL2**: Install Ubuntu on WSL2 and follow Linux instructions.

    3. **Memurai**: Commercial Redis-compatible server for Windows.

**Verify installation:**

```bash
redis-cli ping  # Should respond with "PONG"
```

---

### Git

Git is required for version control and contributing to the project.

=== "Linux (Ubuntu/Debian)"

    ```bash
    sudo apt install git
    ```

=== "macOS"

    ```bash
    # Git comes with Xcode Command Line Tools
    xcode-select --install

    # Or via Homebrew
    brew install git
    ```

=== "Windows"

    Download from [git-scm.com](https://git-scm.com/download/win) and run the installer.

**Verify installation:**

```bash
git --version  # Should show 2.x or higher
```

---

## Optional Software

### Docker & Docker Compose (Recommended)

Docker simplifies development by containerizing all dependencies.

=== "Linux"

    ```bash
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh

    # Add your user to docker group
    sudo usermod -aG docker $USER

    # Install Docker Compose
    sudo apt install docker-compose-plugin
    ```

=== "macOS"

    Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop) and install.

=== "Windows"

    Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop) and install.

    !!! note
        Docker Desktop requires WSL2 on Windows. The installer will guide you through setup.

**Verify installation:**

```bash
docker --version         # Should show 20.x or higher
docker compose version   # Should show v2.x or higher
```

---

### IDE Recommendations

While any text editor works, we recommend:

#### VS Code (Recommended)

[Download VS Code](https://code.visualstudio.com/)

**Recommended extensions:**

- **Python** (`ms-python.python`) - Python language support
- **Pylance** (`ms-python.vscode-pylance`) - Advanced type checking
- **Ruff** (`charliermarsh.ruff`) - Fast linting and formatting
- **Django** (`batisteo.vscode-django`) - Django template support
- **GitLens** (`eamodio.gitlens`) - Enhanced Git integration
- **Markdown All in One** (`yzhang.markdown-all-in-one`) - Markdown editing

**Settings for this project:**

```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/venv/bin/python",
  "python.analysis.typeCheckingMode": "basic",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    }
  }
}
```

#### PyCharm Professional

[Download PyCharm](https://www.jetbrains.com/pycharm/)

PyCharm Professional has built-in Django support including:

- Django-aware code completion
- Template debugging
- Database tools
- pytest integration

---

## Version Summary

| Software | Minimum Version | Recommended |
|----------|-----------------|-------------|
| Python | 3.12 | 3.12.x |
| PostgreSQL | 13 | 15.x |
| Redis | 6 | 7.x |
| Git | 2.0 | Latest |
| Docker | 20.0 | Latest |
| Docker Compose | 2.0 | Latest |

---

## Next Steps

Once you have the prerequisites installed:

1. Follow the [Quickstart Guide](quickstart.md) to set up the project
2. Read about the [Project Structure](project-structure.md)
3. Start your [First Contribution](first-contribution.md)
