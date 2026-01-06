# Django Core-App Documentation

**The 80/20 Platform Foundation for Modern Web Applications**

## 1. What is the Core-App?

The Django Core-App is a production-grade platform foundation designed to solve the "80/20" problem in software development. It provides the **80% of reusable infrastructure** common to almost every modern SaaS application—authentication, multi-tenancy, permissions, audit logging, and notifications—allowing developers to focus entirely on the **20% of unique business logic** that defines their specific product.

It is not merely a starter kit or a template, but a cohesive, integrated system architecture. It is built to be cloned, extended, and deployed, providing a stable "neutral core" upon which diverse domain-specific applications (e.g., E-commerce, CRM, Data Platforms) can be constructed.

## 2. How to Read These Documents

This documentation set is structured to guide you from high-level concepts down to implementation details. We recommend following this order:

1. **[01 Vision](01-vision/index.md)**: Start here. Understand the "Why". This section defines the mission, the 80/20 philosophy, and the non-negotiable principles.
2. **[02 Roadmap](02-roadmap/index.md)**: The "When". See the active development phases and the master plan for the platform's evolution.
3. **[03 System](03-system/index.md)**: The "How". Dive into the 5-layer architecture, the technology stack, and the Engineering Constitution that governs quality.
4. **[04 Modules](04-modules/index.md)**: The "Parts". The canonical registry of all capabilities (e.g., Auth, Orgs, Tasks). Use this as your reference library.
5. **[05 Demo](05-demo/index.md)**: The "Proof". See how the system integrates into a working application via the Demo Shell.
6. **[06 Workflow](06-workflow/index.md)** & **[07 Operations](07-operations/index.md)**: The "Process". Guides for building, testing, and deploying the platform.
7. **[08 Testing](08-testing/index.md)**: The "Quality". Manual and automated testing guides for validating all features.

## 3. Key Definitions

To navigate this system effectively, distinguish between these three concepts:

- **Core**: The domain-agnostic foundation. These are the reusable parts (Users, Organisations, Projects) that never change regardless of the business domain.
- **Module**: A specific unit of functionality (e.g., `B09 Audit Logging`, `F01 Design System`). Modules are the building blocks of the Core.
- **Demo**: An example implementation (currently "Football Leagues") used solely to validate and showcase the Core. The Demo is an *overlay*; its logic (Teams, Seasons) must never leak into the Core.

## 4. Documentation Status

> **⚠️ IMPORTANT:** This `/documents/` directory is the **single source of truth** for the Django Core-App.

The legacy `/docs/` directory is deprecated and retained only for archival purposes. If you find a contradiction between `/documents/` and `/docs/`, **this directory prevails**.

---
*Version 2.0 — January 2026*
