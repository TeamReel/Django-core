# Vision

## Mission

An **80/20 platform foundation** for modern, production-grade web applications built on Django — proven by TeamReel.

### The 80/20 Principle

**80% reusable foundation** → provided by the core platform
**20% custom business logic** → built per product

The core platform provides:

- **Multi-tenant architecture** — users → organisations → projects with RBAC
- **Content & media management** — file handling (S3), processing, AI generation
- **Video processing pipeline** — FFmpeg with platform-specific exports
- **AI content generation** — OpenAI and Google Generative AI
- **Background processing** — Celery tasks, scheduling, queue management
- **Notification routing** — multi-channel with user preferences
- **Spec-Driven Development** — AI agents (Spec Kitty workflow) under governance

### TeamReel: First Product

TeamReel is the first product built on this foundation, proving the 80/20 model works.

**What TeamReel adds (the 20%):**
- Sport-specific data: members, activities, participations, periods, competitions
- Brand identity system: club colors, logos, kit images, typography
- Content templates: match graphics, line-ups, social media posts
- AI-powered video generation: branded highlight reels, previews

**What the core provides (the 80%):**
- Multi-tenant organisation/project hierarchy with RBAC
- File management and S3 storage
- AI generation request/result pipeline
- Video job processing infrastructure
- Notification routing with user preferences
- Background task execution (Celery)
- Authentication, permissions, audit trail

---

## Target Users

### TeamReel (current product)
- **Amateur sports clubs** — need branded content without design skills
- **Club administrators** — manage teams, seasons, members
- **Content coordinators** — generate match graphics, line-ups, video

### Platform (80/20 foundation)
- **Product owners** — using Spec-Driven Development to define features
- **AI-assisted builders** — using GitHub Copilot to build under governance
- **Development teams** — starting SaaS on a production-grade Django+React foundation

---

## What This IS and IS NOT

### IS
- A **production-grade multi-tenant architecture** with hierarchical access control
- A **complete content & media platform** with AI generation and video processing
- A **Spec-Driven Development platform** where AI agents build features under governance
- **Proven in production** — TeamReel runs on this foundation today

### IS NOT
- A basic SaaS starter template — it's a comprehensive production foundation
- A theoretical exercise — everything described here is built and running
- A locked-in framework — products extend, not fork
- A replacement for cloud infrastructure — it runs on Railway/Vercel

---

## Long-Term Direction

### Near-Term (TeamReel)
- Complete the content generation pipeline (templates → AI → video → export)
- Expand sport-specific features (more sports, more template types)
- Self-service onboarding for clubs
- Credits & billing system for content generation

### Medium-Term (Platform)
- Extract proven patterns from TeamReel back into the core
- Improve the Spec Kitty workflow for faster feature delivery
- Add CI/CD quality gates (automated testing on PR)
- Performance monitoring and alerting

### Long-Term (Ecosystem)
- Second product on the same core — validates the 80/20 model across domains
- Core consumed as dependency (pip/npm packages)
- Community of AI-assisted builders using Spec Kitty

### Scope Boundaries

**In scope (the 80% core):** Multi-tenant infrastructure, RBAC, content management, media processing, AI generation, background tasks, real-time updates, notifications, reusable UI components, design tokens.

**Out of scope (the 20% product layer):** Domain-specific business logic, industry-specific compliance, product-specific branding, custom external integrations.
