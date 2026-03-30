# Documentation

**80/20 Platform Foundation — proven by TeamReel**

## 1. What is This?

This repository contains a **production-grade platform foundation** built on Django. The idea: **80% of what every modern web app needs** (authentication, multi-tenancy, permissions, media, notifications, real-time) is already here. You add the **20% that's unique to your product**.

**TeamReel** is the first product built on this foundation — an AI-powered content platform for amateur sports clubs that generates branded videos, visuals, and match graphics. TeamReel both validates the core platform and extends it with sport-specific features.

## 2. How to Read These Documents

| Section | What | Focus |
|---------|------|-------|
| **[01 Vision](01-vision/index.md)** | Mission, principles, governance | The "Why" — 80/20 philosophy |
| **[02 Roadmap](02-roadmap/index.md)** | Active modules, phases, quick tickets | The "When" — what to build next |
| **[03 System](03-system/index.md)** | Architecture, tech stack, ADRs | The "How" — technical foundation |
| **[04 Modules](04-modules/index.md)** | Module documentation per B/F number | The "Parts" — implementation details |
| **[05 TeamReel](05-demo/index.md)** | TeamReel-specific features, design, media | The "Product" — first 20% implementation |
| **[06 Workflow](06-workflow/index.md)** | Dev setup, git, testing, Railway | The "Process" — how we work |
| **[07 Operations](07-operations/index.md)** | Deployment, database, observability | The "Ops" — production operations |
| **[08 Testing](08-testing/index.md)** | Manual test guides | The "Quality" — verification |

## 3. Key Concepts

- **Core** (the 80%): Domain-agnostic foundation — users, organisations, projects, permissions, notifications, media, real-time, AI generation.
- **Product** (the 20%): Domain-specific logic built on the core. For TeamReel: members, activities, seasons, branding, lineup videos.
- **Module**: A unit of functionality (e.g., `B09 Audit Logging`, `F01 Design System`). Documented in `04-modules/`.
- **Spec Kitty**: The workflow for speccing and building larger features via AI agents (`06-workflow/spec-kitty.md`).

---
*Version 3.0 — March 2026*
