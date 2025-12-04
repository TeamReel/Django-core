# Architecture

This section documents the architecture and design decisions of Django Core-App.

## Overview

Django Core-App is a modular, product-agnostic platform providing reusable infrastructure for Django-based applications. It follows a layered architecture with clear separation of concerns.

## What You'll Find Here

- **[Overview](overview.md)** - High-level system architecture with diagrams
- **[Layers](layers.md)** - API, service, model, and infrastructure layers
- **[Extension Points](extension-points.md)** - How to extend and customize Core
- **[Decisions](decisions/)** - Architecture Decision Records (ADRs)

## Core Principles

1. **Product-Agnostic**: Core contains no product-specific logic
2. **Modular Design**: Each Django app has a single responsibility
3. **Stable APIs**: Extension points are documented and backward-compatible
4. **Security First**: Secure defaults throughout

## Quick Navigation

| Topic | Description |
|-------|-------------|
| [Overview](overview.md) | System components and interactions |
| [Layers](layers.md) | Architectural layering explained |
| [Extension Points](extension-points.md) | Customization guide for downstream projects |
| [ADRs](../adr/) | Historical design decisions |
