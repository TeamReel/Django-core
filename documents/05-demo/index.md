# TeamReel Demo Documentation

**Last Updated:** 2026-01-26
**Demo Context:** Football League Management (TeamReel)
**Production Environment:** Railway
**Status:** Active Development

---

## 📖 Overview

TeamReel is the reference implementation of the Django Core-App, demonstrating a complete SaaS platform for **Football League Management**. It showcases all Core-App capabilities in a realistic, production-ready environment.

### The TeamReel Scenario

**TeamReel** models football league management with a hierarchical structure:
- **Organisation**: Football Federation (e.g., KNVB, DFB, FIGC, The FA)
- **Project (Club)**: Football Club (e.g., Ajax, Bayern München, Inter Milan)
- **Project (Team)**: Team Squad (e.g., Ajax 1, Bayern München 1. Mannschaft)
- **Period (Season)**: Season Container (e.g., Season 2024/2025)
- **Period (Competition)**: Competition/League (e.g., League, Cup, Youth)
- **Activity**: Match Event (e.g., Ajax 1 vs PSV 1)
- **Membership**: Player/Staff Role (e.g., Keeper, Speler, Coach, Assistent)

---

## 📚 Document Structure

### 1. Strategy & Architecture
**Core design documents defining TeamReel's data model and principles.**

- **[TeamReel Data Strategy](teamreel-data-strategy.md)** ⭐
  Master architecture document with confirmed design decisions, hierarchy principles, and permission model.

- **[TeamReel Data Structure](teamreel-data-structure.md)**
  Reference guide showing the Club → Team → Season → Competition → Match hierarchy with examples.

### 2. Implementation & Configuration
**Practical guides for setting up and configuring TeamReel.**

- **[TeamReel RBAC Configuration](teamreel-rbac-config.md)**
  Production-ready Role-Based Access Control with 23 permissions, 5 roles, and hierarchical access patterns.

- **[TeamReel Transactions, Balances & Wallets Plan](teamreel-transactions-wallets-plan.md)**
  How credits are modeled (ledger + wallet scopes), how balances are computed, and how payer routing + demo seeding are configured.

- **[TeamReel Seeding Plan](teamreel-seeding-plan.md)**
  Step-by-step player and team seeding procedures for Railway production environment.

### 3. Current State & Monitoring
**Real-time status of data population and system integration.**

- **[Audit Status Overview](AUDIT_STATUS.md)** 🔍
  Master dashboard showing all audit documents, freshness status, and regeneration commands.

- **[TeamReel Current Database State](teamreel-current-db-state.md)**
  Quick reference showing database fill statistics, record counts, and seeding progress.

- **[TeamReel Database Audit](teamreel-db-audit.md)** ⭐
  Concise, auto-generated overview of all database tables with counts + status.

- **[TeamReel Frontend Integration Audit](teamreel-frontend-integration-audit.md)** ⭐
  Complete audit of backend-to-frontend connections, identifying integrated vs. missing components.

---

## 🧭 Navigation & UX

- **[TeamReel Navigation Model (Panel A + Panel B)](teamreel-navigation-model.md)** ⭐
  The final navigation spec, aligned with current implementation and no-mock policy.

- **[TeamReel Layout Optimization](teamreel-layout-optimization.md)**
  What changed in the demo UI (TopNavbar, sidebars, modern UX add-ons).

- **[TeamReel Webapp Hierarchy](teamreel-webapp-hierarchy.md)**
  High-level hierarchy UX: Federation → Club → Team → Season → Competition → Match.

---

## 🎬 Media Generation

- **[TeamReel Media Generation Plan](teamreel-media-generation-plan.md)** 🆕
  Plan voor automatische afbeelding- en videogeneratie met S3 (storage), Gemini API (AI), en FFmpeg (video rendering). Inclusief use cases voor tenue-ontwerpen en lineup-video's.

---

## 🚀 Quick Start

### Accessing TeamReel

- **Live Demo**: [https://demo.teamreel.app](https://demo.teamreel.app) (Railway)
- **API Root**: [https://api.teamreel.app/api/v1/](https://api.teamreel.app/api/v1/)
- **Local Dev**: `pnpm dev` (Frontend) + `python manage.py runserver` (Backend)

### Key API Endpoints

- **Organisations**: `/api/v1/organisations/` - Football federations (KNVB, DFB, etc.)
- **Projects**: `/api/v1/projects/` - Clubs and teams
- **Periods**: `/api/v1/periods/` - Seasons and competitions
- **Activities**: `/api/v1/activities/` - Matches and events
- **Memberships**: `/api/v1/project-memberships/` - Players and staff
- **Audit**: `/api/v1/audit/` - Activity logs
- **Metrics**: `/api/observability/metrics/` - System health

---

## 📊 Current Status

Source of truth for current counts:
- [TeamReel Database Audit](teamreel-db-audit.md) (model-by-model counts)
- [TeamReel Current Database State](teamreel-current-db-state.md) (hierarchy snapshot; regenerate when needed)

Source of truth for UI coverage:
- [TeamReel Frontend Integration Audit](teamreel-frontend-integration-audit.md)

### Implementation Priorities
1. **MatchesPage.tsx** - Display 1,307 match activities
2. **Fix Dashboard Credits** - Replace hardcoded checks with real API
3. **Player Roster View** - Period-scoped membership display
4. **Org-Level Audit** - Extend audit log to organisation scope

---

## 🎯 Core Principles

### Data Cascade
Data inheritance flows downward through the hierarchy:
```
Federation → Club → Team → Season → Competition → Match
```

### Step-by-Step Seeding
Each level must be complete before proceeding to the next:
1. Federations (Organisations)
2. Clubs (Root Projects)
3. Teams (Child Projects)
4. Seasons (Root Periods)
5. Competitions (Child Periods)
6. Memberships (Players/Staff)
7. Activities (Matches)

### RBAC Hierarchy
- **Land Admin**: Federation-wide access, all credit management
- **Club Admin**: Club-wide access, cross-club visibility, club credits
- **Team Admin**: Team settings + all team matches, team credits
- **Team Member**: Profile editing only, functional roles (Keeper, Speler, etc.)
- **Supporter**: Read-only access to granted team content

---

## 🗂️ Archive

Historical audit reports and integration logs are preserved in [archive/](archive/) for reference and troubleshooting.

---

**Navigation**: [← Back to Documentation Home](../index.md)
