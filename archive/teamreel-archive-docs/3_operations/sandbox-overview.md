# Sandbox Overview

The TeamReel sandbox environment provides a fully local, offline-safe development and experimentation space. It intentionally excludes all cloud deployment, external AI services, and remote storage.

## Core Principles
- Local only: no Railway, Docker deployment targets, or CI triggers.
- Deterministic mock generation: workflows defined as JSON; output assembled by simple Python utilities.
- Easy reset: delete `db.sqlite3` and `media_local/` to reset state.
- Low barrier to entry: run with `DJANGO_SETTINGS_MODULE=teamreel.settings_sandbox` and `.env.sandbox`.

## Differences vs (future) Production
| Aspect | Sandbox | Production (future) |
|--------|---------|---------------------|
| DB | SQLite (`db.sqlite3`) | Managed Postgres |
| Media | Local folder `media_local/` | Object storage (e.g. S3) |
| AI | Mock JSON flows (`ai/flows/*`) | External model endpoints |
| Auth | Open / permissive (AllowAny) | Role & token-based |
| Deployment | Local runserver/gunicorn | Platform orchestration |
| Observability | Console logging | Structured + tracing |

## File & Directory Map
- `backend/teamreel/settings_sandbox.py` – forced SQLite & local media.
- `ai/flows/` – workflow definitions (e.g. `mock_pre_match.json`).
- `ai/mock_generator.py` – utility to load and execute mock workflows.
- `media_local/` – user-generated or placeholder media.
- `.env.sandbox` – environment variable overrides.
- Copilot Guardrails – `COPILOT_INSTRUCTIONS_SANDBOX.md`, `.copilot/sandbox.md`.

## Running Backend (Example)
(Use PowerShell)
```
$env:DJANGO_SETTINGS_MODULE="teamreel.settings_sandbox"
python backend/manage.py migrate
python backend/manage.py runserver
```

## Health & Validation Checklist
- Migrations succeed with SQLite.
- `/api/health/` returns status=ok and DB engine=sqlite.
- Mock generator script outputs structured narrative JSON.
- No accidental imports of cloud SDKs or secret managers.

## Extending Mock Workflows
1. Create a new JSON in `ai/flows/` with unique `id`.
2. Add steps and constraints fields.
3. Implement generation function (e.g. `generate_<name>` in `mock_generator.py`).
4. Keep outputs small (< ~2KB) for fast iteration.

## Reset Procedure
```
Remove-Item backend\db.sqlite3
Remove-Item -Recurse -Force backend\media_local\*
python backend/manage.py migrate
```

## Future Upgrade Notes
- Introduce feature flags to toggle real AI vs mock.
- Harden permission classes before external release.
- Add test suite around each workflow output contract.
