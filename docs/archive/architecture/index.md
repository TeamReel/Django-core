# Architecture

This section documents the architecture and design decisions of Django Core-App.

## Overview

Django Core-App is a modular, product-agnostic platform providing reusable infrastructure for Django-based applications. It follows a layered architecture with clear separation of concerns.

## What You'll Find Here

### Core Architecture

- **[Overview](overview.md)** - High-level system architecture with Mermaid diagrams
- **[Layers](layers.md)** - Presentation, business logic, data access, and infrastructure layers
- **[Data Model](data-model.md)** - Entity relationships and database schema

### Request Handling

- **[Request Flow](request-flow.md)** - HTTP request lifecycle from edge to response
- **[Async Patterns](async-patterns.md)** - Celery task patterns and background processing
- **[Django Adapter](django-adapter.md)** - Integration patterns for Django Core.

### Security & Decisions

- **[Security Model](security-model.md)** - Authentication, authorization, and security controls
- **[ADRs](adr/index.md)** - Architecture Decision Records with full index

## Core Principles

1. **Product-Agnostic**: Core contains no product-specific logic
2. **Modular Design**: Each Django app has a single responsibility
3. **Stable APIs**: Extension points are documented and backward-compatible
4. **Security First**: Secure defaults throughout

## Quick Navigation

| Topic | Description |
|-------|-------------|
| [Overview](overview.md) | Platform vision, tech stack, system components |
| [Layers](layers.md) | Four-layer architecture explained |
| [Data Model](data-model.md) | ER diagrams, models, indexes |
| [Request Flow](request-flow.md) | Middleware stack, auth flow, error handling |
| [Async Patterns](async-patterns.md) | Celery tasks, retries, monitoring |
| [Security Model](security-model.md) | Auth, RBAC, rate limits, audit |
| [ADRs](adr/index.md) | 18 architectural decisions indexed |

## Related Documentation

- [Getting Started](../getting-started/index.md) - Installation and first steps
- [Examples](../examples/index.md) - Working code examples
- [API Reference](../api/index.md) - API endpoints and schemas
