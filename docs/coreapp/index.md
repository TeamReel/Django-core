# 80/20 Core Platform

> Production-grade multi-tenant foundation for modern web applications — proven by TeamReel.

## Contents

| Document | Description |
|----------|-------------|
| [overview.md](overview.md) | What the core platform is, what it provides, design principles |
| [modules.md](modules.md) | All core apps with models, permissions, and extension points |
| [extending.md](extending.md) | How to build a product on the core (the 20%) |

## Quick Reference

**Wat is het Core Platform?**
Een productieklare Django+React foundation die 80% van een moderne web app afdekt: multi-tenancy, authenticatie, file management, AI pipeline, video processing, notificaties, background tasks.

**Bewezen door:** TeamReel — AI content platform voor sportclubs.

**Stack:** Django 5 + DRF · React 18 + TypeScript · PostgreSQL · Redis · Celery · S3 · Railway

**Core levert:**
- Multi-tenant organisatie/project hiërarchie met RBAC
- File management (S3) met thumbnails
- AI generation request/result pipeline
- Video job processing (FFmpeg)
- Notification routing (multi-channel)
- Background tasks (Celery, 4 queues)
- Search, audit trail, credits, workflows
- Design token system + component library
