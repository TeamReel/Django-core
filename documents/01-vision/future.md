# Long-Term Vision

> **Note**: This document describes aspirational goals. See [vision.md](vision.md) for what exists today.

## The Platform Evolution

The core platform grows through real product usage. TeamReel is the first product — future products will further prove and extend the 80/20 model.

### Near-Term (TeamReel)
*   Complete the content generation pipeline (templates → AI → video → export).
*   Expand sport-specific features (more sports, more template types).
*   Self-service onboarding for clubs.
*   Credits & billing system for content generation.

### Medium-Term (Platform Maturation)
*   Extract proven patterns from TeamReel back into the core.
*   Improve the Spec Kitty workflow for faster feature delivery.
*   Add CI/CD quality gates (automated testing on PR).
*   Performance monitoring and alerting in production.

### Long-Term (80/20 Ecosystem)
*   Second product built on the same core — validates the 80/20 model across domains.
*   Core consumed as dependency (pip/npm packages) by external products.
*   Community of AI-assisted builders using Spec Kitty to ship features.
*   Every product improves the shared 80% foundation.

## Scope Boundaries

### In Scope (The 80% Core)
*   Multi-tenant infrastructure and RBAC security.
*   Content management, media processing, AI generation pipeline.
*   Background task processing and scheduling.
*   Real-time updates and notification routing.
*   Reusable UI components and design tokens.

### Out of Scope (The 20% Product Layer)
*   Domain-specific business logic (sport rules, club management, etc.).
*   Industry-specific compliance requirements.
*   Product-specific branding and marketing.
*   Custom integrations with external platforms.
