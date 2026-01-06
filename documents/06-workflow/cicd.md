# CI/CD Pipeline

## Overview

We use GitHub Actions to enforce quality gates and automate deployment.

## Quality Gates (On Pull Request)

1.  **Linting**: `ruff` (Python), `eslint` (JS/TS).
2.  **Type Checking**: `mypy` (Python), `tsc` (TS).
3.  **Testing**: `pytest` (Backend), `vitest` (Frontend).
4.  **Security**: `bandit`, `safety` (Dependency scan).
5.  **Constitution**: `P01` checks (if enabled).

## Deployment (On Merge to Main)

1.  **Build**: Docker images for Backend and Frontend.
2.  **Push**: Push to Container Registry.
3.  **Deploy**: Trigger update on Railway (Backend) and Vercel (Frontend).
4.  **Migrate**: Run database migrations.
