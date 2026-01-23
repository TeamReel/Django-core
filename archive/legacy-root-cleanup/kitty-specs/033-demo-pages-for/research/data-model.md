# Data Model - Feature 033: Demo Pages for Modules 001-030

**Feature Branch**: 033-demo-pages-for
**Last Updated**: 2025-12-17

---

## Overview

This feature is **frontend-only** and consumes data from existing backend APIs (B01-B21) and seed database (module 032). No new database models are created.

This document maps how demo pages consume existing entities and their relationships.

---

## Entity Mapping

### Core Entities (from Backend Modules)

#### Organisation (B06)
**Source**: `/api/organisations/` endpoint

**Attributes**:
- `id`: UUID (primary key)
- `name`: String (e.g., "TechCorp", "DataLab Enterprise")
- `slug`: String (URL-friendly identifier)
- `member_count`: Integer (calculated field)
- `project_count`: Integer (calculated field)
- `credits_balance`: Integer (from B11 integration)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:
- Has many `Project` (B07)
- Has many `User` through membership (B06)
- Has one `CreditAccount` (B11)

**Consumed By Pages**:
- `/organisations` (list view, P1)
- `/organisations/:id` (detail view, P1)
- Context switcher (F03, all pages)

**Seed Data** (module 032):
- TechCorp (15 projects, 5 members, 10000 credits)
- DataLab Enterprise (30 projects, 8 members, 5000 credits)
- MarketingHub (12 projects, 3 members, 200 credits - low balance alert)
- OpenSource Foundation (18 projects, 10 members, 8000 credits)
- AI Research Lab (5 projects, 4 members, 3000 credits)

---

#### Project (B07)
**Source**: `/api/projects/` endpoint (org-scoped via X-Organisation-ID header)

**Attributes**:
- `id`: UUID (primary key)
- `name`: String (e.g., "Mobile App Redesign")
- `slug`: String
- `organisation_id`: UUID (foreign key to Organisation)
- `owner_id`: UUID (foreign key to User)
- `description`: Text (nullable)
- `status`: Enum (active, archived, planned)
- `member_count`: Integer (calculated)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:
- Belongs to `Organisation` (B06)
- Belongs to `User` (owner, B05)
- Has many `User` through membership (B07)
- Has many `AuditEvent` (B09)

**Consumed By Pages**:
- `/projects` (list view, P1)
- `/projects/:id` (detail view, P1)
- Context switcher (F03, all pages)
- `/organisations/:id` (shows org's projects, P1)

**Seed Data** (module 032):
- 80 total projects across 5 organisations
- TechCorp: 15 projects
- DataLab: 30 projects
- MarketingHub: 12 projects
- OpenSource: 18 projects
- AI Research: 5 projects

---

#### User (B05)
**Source**: `/api/users/me/` (current user), `/api/users/` (admin only)

**Attributes**:
- `id`: UUID (primary key)
- `email`: String (unique)
- `first_name`: String
- `last_name`: String
- `role`: Enum (admin, member, viewer)
- `is_active`: Boolean
- `last_login`: DateTime (nullable)
- `created_at`: DateTime

**Relationships**:
- Member of many `Organisation` (B06)
- Member of many `Project` (B07)
- Has many `AuditEvent` (actor, B09)
- Has one `UserPreferences` (B12)

**Consumed By Pages**:
- `/profile` (current user detail, P1)
- `/permissions` (role display, P1)
- Auth flows (F02, login/signup)

**Seed Data** (module 032):
- 20 demo users with roles: 5 admins, 10 members, 5 viewers
- `admin@demo.djangocore.app` (admin, member of all orgs)
- `viewer@demo.djangocore.app` (viewer, member of MarketingHub only)

---

#### AuditEvent (B09)
**Source**: `/api/audit/` endpoint

**Attributes**:
- `id`: UUID (primary key)
- `event_type`: String (login, logout, project_created, credits_purchased, etc.)
- `actor_id`: UUID (foreign key to User, nullable for system events)
- `actor_email`: String (denormalized for display)
- `organisation_id`: UUID (foreign key, nullable)
- `project_id`: UUID (foreign key, nullable)
- `resource_type`: String (nullable: organisation, project, user, etc.)
- `resource_id`: UUID (nullable)
- `metadata`: JSONB (flexible event data)
- `ip_address`: String (nullable)
- `user_agent`: String (nullable)
- `timestamp`: DateTime

**Relationships**:
- Belongs to `User` (actor, B05)
- Belongs to `Organisation` (B06, nullable)
- Belongs to `Project` (B07, nullable)

**Consumed By Pages**:
- `/audit` (list view with filters, P1)
- `/security` (security events only, P2)

**Seed Data** (module 032):
- 200+ events from last 30 days
- Event types: login (40), logout (35), project_created (20), credits_purchased (15), user_invited (30), role_changed (10), etc.

---

#### FeatureFlag (B10)
**Source**: `/api/features/` endpoint (org-scoped)

**Attributes**:
- `id`: UUID (primary key)
- `key`: String (unique, e.g., "new_ui_enabled")
- `name`: String (display name)
- `description`: Text
- `enabled`: Boolean (global default)
- `rollout_percentage`: Integer (0-100)
- `organisation_overrides`: JSONB (org-specific enabled/disabled)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:
- Scoped by `Organisation` (B06, via overrides)

**Consumed By Pages**:
- `/features` (list view with toggles, P1)

**Seed Data** (module 032):
- 10 feature flags with various rollout states
- "new_dashboard" (enabled: true, 100%)
- "beta_analytics" (enabled: false, 25% rollout)
- "advanced_permissions" (enabled: true, org overrides)

---

#### CreditAccount (B11)
**Source**: `/api/credits/` endpoint (org-scoped)

**Attributes**:
- `id`: UUID (primary key)
- `organisation_id`: UUID (foreign key, unique)
- `balance`: Integer (current credits)
- `threshold`: Integer (low balance alert threshold)
- `total_purchased`: Integer (lifetime)
- `total_consumed`: Integer (lifetime)
- `last_purchase_at`: DateTime (nullable)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships**:
- Belongs to `Organisation` (B06, one-to-one)
- Has many `CreditTransaction` (B11)

**Consumed By Pages**:
- `/credits` (dashboard with usage chart, P1)
- `/organisations/:id` (shows balance, P1)

**Seed Data** (module 032):
- TechCorp: 10000 balance, 20000 purchased, 10000 consumed
- DataLab: 5000 balance, 15000 purchased, 10000 consumed
- MarketingHub: 200 balance (< 500 threshold, triggers alert), 5000 purchased, 4800 consumed

---

#### CreditTransaction (B11)
**Source**: `/api/credits/transactions/` endpoint (org-scoped)

**Attributes**:
- `id`: UUID (primary key)
- `account_id`: UUID (foreign key to CreditAccount)
- `amount`: Integer (positive for purchase, negative for consumption)
- `type`: Enum (purchase, consumption, refund)
- `description`: String
- `balance_after`: Integer (snapshot)
- `timestamp`: DateTime

**Relationships**:
- Belongs to `CreditAccount` (B11)

**Consumed By Pages**:
- `/credits` (usage chart, last 30 days, P1)

**Seed Data** (module 032):
- 30 days of transactions per org (purchases, daily consumption)

---

#### UserPreferences (B12)
**Source**: `/api/preferences/` endpoint (current user only)

**Attributes**:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key, unique)
- `theme`: Enum (light, dark, system)
- `language`: String (en, nl, fr, de)
- `timezone`: String (IANA timezone)
- `notifications_enabled`: Boolean
- `updated_at`: DateTime

**Relationships**:
- Belongs to `User` (B05, one-to-one)

**Consumed By Pages**:
- `/preferences` (settings form, P1)
- Theme toggle (F07, all pages)
- i18n demo (P3)

**Seed Data** (module 032):
- All 20 users have preferences (theme: light default, en language)

---

#### BackgroundTask (B15)
**Source**: `/api/tasks/` endpoint

**Attributes**:
- `id`: UUID (primary key)
- `task_name`: String (e.g., "generate_report", "send_email")
- `status`: Enum (pending, running, success, failed)
- `priority`: Enum (low, normal, high)
- `retry_count`: Integer
- `max_retries`: Integer
- `error_message`: Text (nullable)
- `started_at`: DateTime (nullable)
- `completed_at`: DateTime (nullable)
- `created_at`: DateTime

**Relationships**:
- None (standalone task tracking)

**Consumed By Pages**:
- `/tasks` (monitor view, P3)

**Seed Data** (module 032):
- 50 tasks: 5 pending, 2 running, 40 success, 3 failed

---

#### Notification (B16/B17)
**Source**: `/api/notifications/` endpoint

**Attributes**:
- `id`: UUID (primary key)
- `user_id`: UUID (foreign key)
- `type`: Enum (system, organisation, project, credit_alert)
- `title`: String
- `message`: Text
- `read_at`: DateTime (nullable)
- `action_url`: String (nullable)
- `created_at`: DateTime

**Relationships**:
- Belongs to `User` (B05)
- May reference `Organisation` or `Project` via metadata

**Consumed By Pages**:
- `/notifications` (list view, P3)
- Notification hub (F04, top nav)

**Seed Data** (module 032):
- 5-10 unread notifications per user
- Types: credit alerts (MarketingHub), project invites, system updates

---

#### HealthCheck (B01)
**Source**: `/api/health/` endpoint

**Attributes** (response body):
- `status`: Enum (healthy, degraded, unhealthy)
- `services`: Object (PostgreSQL, Redis, Django, Python status)
- `timestamp`: DateTime
- `version`: String (app version)

**Consumed By Pages**:
- `/health` (system status dashboard, P2)
- `/deployment` (health indicator, P3)

**No database persistence** - computed on-demand.

---

#### ConstitutionRule (B02)
**Source**: `/api/constitution/rules/` endpoint

**Attributes**:
- `id`: UUID (primary key)
- `rule_id`: String (e.g., "P02-simplicity-first")
- `category`: String (e.g., "product_agnostic", "architecture")
- `description`: Text
- `active`: Boolean
- `violation_count`: Integer (calculated)

**Consumed By Pages**:
- `/constitution` (rules dashboard, P2)

**Seed Data** (module 032):
- 12 active rules, 0-2 violations per rule

---

#### SecurityEvent (B03)
**Source**: `/api/security/events/` endpoint

**Attributes**:
- `id`: UUID (primary key)
- `event_type`: String (failed_login, suspicious_ip, rate_limit_exceeded)
- `severity`: Enum (low, medium, high, critical)
- `description`: Text
- `ip_address`: String
- `user_id`: UUID (nullable)
- `resolved_at`: DateTime (nullable)
- `timestamp`: DateTime

**Consumed By Pages**:
- `/security` (ASVS scorecard + events, P2)

**Seed Data** (module 032):
- 20 security events (mostly low/medium severity, 1 resolved high-severity)

---

#### ObservabilityMetric (B18)
**Source**: `/api/observability/metrics/` endpoint

**Attributes** (time-series response):
- `timestamp`: DateTime
- `response_time_p99`: Float (milliseconds)
- `response_time_p95`: Float
- `response_time_median`: Float
- `error_rate_4xx`: Float (percentage)
- `error_rate_5xx`: Float (percentage)
- `active_connections`: Integer

**Consumed By Pages**:
- `/observability` (charts dashboard with 30s polling, P2)

**No database persistence** - computed from Prometheus/metrics backend.

---

## Frontend-Only Entities

### NavigationGroup
**Purpose**: Sidebar navigation structure

**Attributes**:
- `id`: String (identity, config, platform, frontend, docs)
- `label`: String (display name)
- `icon`: Component (from F01 icon set)
- `items`: Array<NavigationItem>
- `expanded`: Boolean (state from localStorage)

**Used By**: Sidebar component (F06 AppShell)

---

### NavigationItem
**Purpose**: Individual navigation link

**Attributes**:
- `id`: String (organisations, projects, audit, etc.)
- `label`: String (display name)
- `path`: String (route path)
- `icon`: Component (from F01 icon set)
- `badge`: Number (optional, e.g., unread notification count)
- `requiredPermission`: String (optional, e.g., "admin")

**Used By**: Sidebar component (F06 AppShell)

---

### ChartConfig
**Purpose**: Chart.js configuration with theme support

**Attributes**:
- `type`: String (line, bar, doughnut)
- `data`: ChartData (datasets, labels)
- `options`: ChartOptions (theme-aware colors, scales, tooltips)

**Used By**: Credits page, Observability page

---

## Query Param Schemas

### Audit Log Filters (`/audit`)
```typescript
interface AuditQueryParams {
  type?: 'all' | 'authentication' | 'authorization' | 'crud' | 'system';
  user?: string; // User ID
  date?: 'last-7-days' | 'last-30-days' | 'last-90-days' | 'custom';
  start?: string; // ISO date (if date=custom)
  end?: string; // ISO date (if date=custom)
  page?: number;
  per_page?: number; // Default 25
}
```

### Organisation List Filters (`/organisations`)
```typescript
interface OrgQueryParams {
  sort?: 'name' | 'members' | 'projects' | 'credits' | 'created';
  order?: 'asc' | 'desc';
  search?: string; // Name or slug
}
```

### Project List Filters (`/projects`)
```typescript
interface ProjectQueryParams {
  status?: 'all' | 'active' | 'archived' | 'planned';
  sort?: 'name' | 'updated' | 'created';
  order?: 'asc' | 'desc';
  search?: string;
}
```

### Notification Filters (`/notifications`)
```typescript
interface NotificationQueryParams {
  type?: 'all' | 'system' | 'organisation' | 'project' | 'credit_alert';
  read?: 'all' | 'unread' | 'read';
}
```

---

## State Management

### Global State (via React Context)

#### AuthContext (F02)
Provides:
- `currentUser: User | null`
- `isAuthenticated: boolean`
- `login(email, password): Promise<void>`
- `logout(): Promise<void>`
- `hasPermission(permission): boolean`

#### TenantContext (F03)
Provides:
- `currentOrg: Organisation | null`
- `currentProject: Project | null`
- `setOrg(orgId): void`
- `setProject(projectId): void`
- `clearContext(): void`

#### ThemeContext (F07)
Provides:
- `theme: 'light' | 'dark'`
- `toggleTheme(): void`
- `setTheme(theme): void`

### Page-Specific State

All page-specific state (filters, sorting, pagination) stored in **URL query params** via `useSearchParams`.

### Local Storage

- `demo-sidebar-state`: Object mapping category IDs to expanded state
- `demo-theme`: Theme preference (synced to B12 on change)
- `demo-last-org`: Last selected organisation ID (fallback if context cleared)

---

## API Integration Patterns

### Fetching Data
```typescript
// Use F09 API client utilities
import { useApi } from '@django-core/integration-patterns';

const { data, loading, error } = useApi<Organisation[]>('/api/organisations/');
```

### Context-Aware Requests
```typescript
import { useTenantContext } from '@django-core/context-switcher';

const { currentOrg } = useTenantContext();

// F03 automatically adds X-Organisation-ID header when currentOrg is set
const { data } = useApi<Project[]>('/api/projects/');
```

### Authenticated Requests
```typescript
// F02 automatically includes session cookie
// CSRF token injected by F09 API client for POST/PUT/DELETE
await apiClient.post('/api/credits/purchase/', { amount: 1000 });
```

---

## Validation Rules

### URL Query Params
- Invalid enum values → default to 'all'
- Negative page numbers → default to 1
- Invalid date ranges → default to 'last-7-days'
- Missing required params → use sensible defaults

### API Responses
- Use TypeScript interfaces to catch type mismatches at compile-time
- Runtime validation with Zod or similar (optional, can fail fast with clear errors)
- Handle 403 (permission denied) → show error page
- Handle 404 (not found) → show empty state
- Handle 500 (server error) → show F09 error boundary

---

## Performance Considerations

### Data Volume
- Organisation list: 5 items (no pagination needed)
- Project list: 80 items (pagination required, 25 per page)
- Audit log: 200+ events (pagination + filtering required)
- Credit transactions: 30 days per org (~90 items, chart aggregates)

### Caching Strategy
- Seed data is static → cache GET requests for 60 seconds
- Organisation/project lists → cache with `stale-while-revalidate`
- Real-time metrics → no caching (30s polling)

### Lazy Loading
- Chart.js only loads when visiting `/credits` or `/observability`
- Page components lazy loaded by category (optional optimization)

---

## Next Steps

1. ✅ Data model documented
2. ⏭️ Generate API contracts (OpenAPI specs already exist in B13, reference them)
3. ⏭️ Create quickstart.md (developer onboarding guide)
4. ⏭️ Update agent context with planning decisions
