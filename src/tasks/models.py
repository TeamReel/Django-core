"""
Models for tasks app.

This file is intentionally minimal - task execution state is managed by Celery
and Redis, not Django models. Persistent audit trail of task execution is
handled by the B09 audit system.
"""
