# Data Model: F05 Resource Display & Alerts

**Feature**: 027-resource-display-alerts
**Date**: 2025-12-12
**Status**: Draft

## Overview

F05 is a **frontend-only** package with no backend persistence. This document defines the **logical entities** and **TypeScript interfaces** used by components, not database schemas.

**Data Sources**:
- **B11 (Billing & Credits)**: Provides resource usage data
- **B18 (Health Monitoring)**: Provides service health status
- **Browser localStorage**: Persists alert dismissal preferences (client-side only)

---

## Entity Definitions

### 1. Alert

**Purpose**: Represents a user-facing alert message with severity and dismissal options.

**Source**: Created by products, rendered by F05 Alert component (wraps F01 Alert).

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for alert (used in localStorage key) |
| `severity` | `'info' \| 'success' \| 'warning' \| 'error'` | Yes | Alert severity level (maps to colors/icons) |
| `title` | `string` | No | Optional bold title text |
| `message` | `string` | Yes | Alert message content |
| `dismissible` | `boolean` | No | Whether alert can be dismissed (default: false) |
| `neverShowAgain` | `boolean` | No | Whether "Never show again" option is enabled |

**TypeScript Interface**:
```typescript
export type AlertSeverity = 'info' | 'success' | 'warning' | 'error';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title?: string;
  message: string;
  dismissible?: boolean;
  neverShowAgain?: boolean;
}
```

**Relationships**:
- One Alert → Zero or one AlertPreference (if dismissed)

**Lifecycle**:
1. Product creates Alert object
2. User dismisses alert → AlertPreference saved to localStorage
3. On next page load, check localStorage → hide if `dismissed: true`

**Example**:
```typescript
const lowCreditsAlert: Alert = {
  id: 'low-credits-warning',
  severity: 'warning',
  title: 'Low API Credits',
  message: 'You have 10 credits remaining. Upgrade your plan to avoid interruptions.',
  dismissible: true,
  neverShowAgain: true,
};
```

---

### 2. ResourceUsageData

**Purpose**: Represents resource consumption (credits, storage, bandwidth, etc.).

**Source**: B11 API response, normalized by products or `useResourceUsage` hook.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `value` | `number` | Yes | Current usage amount |
| `max` | `number` | Yes | Maximum limit/quota |
| `label` | `string` | Yes | Human-readable resource name (e.g., "API Credits") |
| `unit` | `string` | No | Unit of measurement (e.g., "GB", "requests") |
| `lastUpdated` | `string` | No | ISO 8601 timestamp of last data refresh |

**TypeScript Interface**:
```typescript
export interface ResourceUsageData {
  value: number;
  max: number;
  label: string;
  unit?: string;
  lastUpdated?: string; // ISO 8601
}
```

**Derived Values** (calculated in component):
- `percentage`: `(value / max) * 100`
- `remaining`: `max - value`
- `severityLevel`: `'low' | 'medium' | 'high'` (based on percentage)

**Relationships**:
- Independent entity (no foreign keys)
- May trigger Alert creation (product logic, not component)

**Lifecycle**:
1. B11 API returns raw usage data
2. Product (or `useResourceUsage` hook) normalizes to ResourceUsageData
3. Passed to ResourceUsageBar component via props
4. Component calculates percentage + renders progress bar

**Example**:
```typescript
const apiCreditsUsage: ResourceUsageData = {
  value: 850,
  max: 1000,
  label: 'API Credits',
  unit: 'requests',
  lastUpdated: '2025-12-12T14:30:00Z',
};
```

---

### 3. HealthStatus

**Purpose**: Represents operational health of a service/resource.

**Source**: B18 API response, normalized by products or `useHealthStatus` hook.

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | Yes | Service name (e.g., "Database", "Cache", "API") |
| `status` | `'healthy' \| 'degraded' \| 'unhealthy' \| 'unknown'` | Yes | Current health status |
| `details` | `string` | No | Optional additional context (e.g., error message) |
| `lastChecked` | `string` | No | ISO 8601 timestamp of last health check |
| `metrics` | `HealthMetrics` | No | Optional performance metrics |

**TypeScript Interfaces**:
```typescript
export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthMetrics {
  responseTime?: number; // milliseconds
  errorRate?: number;    // percentage (0-100)
  uptime?: number;       // percentage (0-100)
}

export interface HealthStatus {
  name: string;
  status: HealthStatusType;
  details?: string;
  lastChecked?: string; // ISO 8601
  metrics?: HealthMetrics;
}
```

**Relationships**:
- Independent entity (no foreign keys)
- May trigger Alert creation (product logic, not component)

**Lifecycle**:
1. B18 API returns service health data
2. Product (or `useHealthStatus` hook) normalizes to HealthStatus
3. Passed to HealthStatus component via props
4. Component renders status indicator (icon + color)

**Example**:
```typescript
const databaseHealth: HealthStatus = {
  name: 'PostgreSQL',
  status: 'healthy',
  details: 'All connections active',
  lastChecked: '2025-12-12T14:35:00Z',
  metrics: {
    responseTime: 12,
    errorRate: 0,
    uptime: 99.98,
  },
};
```

---

### 4. AlertPreference

**Purpose**: Client-side persistence of alert dismissal state.

**Source**: Browser localStorage (written by `useAlertDismissal` hook).

**Attributes**:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `alertId` | `string` | Yes | Matches Alert.id |
| `dismissed` | `boolean` | Yes | Whether alert was dismissed |
| `timestamp` | `number` | Yes | Unix timestamp (ms) when dismissed |
| `neverShowAgain` | `boolean` | No | Whether user chose "Never show again" |

**TypeScript Interface**:
```typescript
export interface AlertPreference {
  alertId: string;
  dismissed: boolean;
  timestamp: number; // Unix timestamp (ms)
  neverShowAgain?: boolean;
}
```

**Storage**:
- **Key**: `django_core_alert_${alertId}`
- **Value**: JSON-serialized AlertPreference
- **Lifecycle**: No expiration by default (manual cleanup possible)

**Relationships**:
- One AlertPreference → One Alert (by alertId)

**Lifecycle**:
1. User clicks "Dismiss" or "Never show again" on Alert
2. `useAlertDismissal` creates AlertPreference object
3. Saved to localStorage with key `django_core_alert_${alertId}`
4. On next page load, `useAlertDismissal` checks localStorage
5. If `dismissed: true`, alert is not rendered

**Example** (localStorage JSON):
```json
{
  "alertId": "low-credits-warning",
  "dismissed": true,
  "timestamp": 1702394400000,
  "neverShowAgain": true
}
```

---

## Entity Relationships

```
┌─────────────────┐
│     Alert       │
│  (Created by    │
│   products)     │
└────────┬────────┘
         │
         │ 0..1 (if dismissed)
         ▼
┌─────────────────┐
│ AlertPreference │
│  (localStorage) │
└─────────────────┘

┌──────────────────┐
│ ResourceUsageData│  ← B11 API
│  (Props only)    │
└──────────────────┘

┌──────────────────┐
│  HealthStatus    │  ← B18 API
│  (Props only)    │
└──────────────────┘
```

**Key Points**:
- Alert and AlertPreference are related (1-to-0..1)
- ResourceUsageData and HealthStatus are independent (no relationships)
- No database - all entities are in-memory or localStorage

---

## Data Flow Examples

### Example 1: Alert Dismissal Flow

```typescript
// 1. Product creates Alert
const alert: Alert = {
  id: 'maintenance-notice',
  severity: 'info',
  message: 'Scheduled maintenance tonight at 2 AM UTC.',
  dismissible: true,
  neverShowAgain: false,
};

// 2. User dismisses alert
const preference: AlertPreference = {
  alertId: 'maintenance-notice',
  dismissed: true,
  timestamp: Date.now(),
};

// 3. Save to localStorage
localStorage.setItem(
  'django_core_alert_maintenance-notice',
  JSON.stringify(preference)
);

// 4. On next page load, check localStorage
const raw = localStorage.getItem('django_core_alert_maintenance-notice');
if (raw) {
  const pref = JSON.parse(raw) as AlertPreference;
  if (pref.dismissed) {
    // Don't render alert
  }
}
```

### Example 2: Resource Usage Monitoring

```typescript
// 1. Fetch from B11 API (hypothetical response)
const apiResponse = await fetch('/api/billing/usage');
const { credits } = await apiResponse.json();

// 2. Normalize to ResourceUsageData
const resourceData: ResourceUsageData = {
  value: credits.used,
  max: credits.limit,
  label: 'API Credits',
  unit: 'requests',
  lastUpdated: new Date().toISOString(),
};

// 3. Pass to ResourceUsageBar component
<ResourceUsageBar
  value={resourceData.value}
  max={resourceData.max}
  label={resourceData.label}
/>

// 4. Component calculates percentage internally
const percentage = (resourceData.value / resourceData.max) * 100; // 85%
// Then renders progress bar with appropriate color (warning @ 85%)
```

### Example 3: Health Status Display

```typescript
// 1. Fetch from B18 API
const healthResponse = await fetch('/api/health/status');
const { services } = await healthResponse.json();

// 2. Normalize to HealthStatus
const dbHealth: HealthStatus = {
  name: services[0].name,
  status: services[0].status,
  details: services[0].details,
  lastChecked: services[0].lastChecked,
};

// 3. Pass to HealthStatus component
<HealthStatus
  name={dbHealth.name}
  status={dbHealth.status}
  details={dbHealth.details}
/>

// 4. Component renders status indicator
// status="healthy" → green checkmark icon + "Healthy" label
```

---

## Validation Rules

### Alert
- `id`: Must be non-empty string, unique within AlertStack
- `severity`: Must be one of 4 enum values
- `message`: Must be non-empty string
- `dismissible`: If true, requires `id` for localStorage key

### ResourceUsageData
- `value`: Must be >= 0
- `max`: Must be > 0
- `value`: Should be <= max (component handles overflow gracefully)
- `lastUpdated`: Must be valid ISO 8601 string (if provided)

### HealthStatus
- `name`: Must be non-empty string
- `status`: Must be one of 4 enum values
- `lastChecked`: Must be valid ISO 8601 string (if provided)
- `metrics.responseTime`: Must be >= 0 (if provided)
- `metrics.errorRate`: Must be 0-100 (if provided)

### AlertPreference
- `alertId`: Must match an Alert.id
- `timestamp`: Must be valid Unix timestamp (ms)
- `dismissed`: Must be boolean

**Runtime Validation**: Components use TypeScript for compile-time checks. Runtime validation only for user-provided data (not needed for props from trusted sources).

---

## Migration Notes

**N/A** - F05 is a new package with no existing data to migrate. localStorage keys are namespaced (`django_core_alert_*`) to avoid conflicts.

**Backwards Compatibility**: If localStorage key format changes in future, add migration logic in `useAlertDismissal` hook to read old format + convert to new format.

---

## Summary

| Entity | Persistence | Source | Purpose |
|--------|-------------|--------|---------|
| **Alert** | None (in-memory) | Products | User-facing alert messages |
| **ResourceUsageData** | None (in-memory) | B11 API | Resource consumption metrics |
| **HealthStatus** | None (in-memory) | B18 API | Service health indicators |
| **AlertPreference** | localStorage | Client-side | Alert dismissal state |

All entities are TypeScript interfaces with no backend persistence. Components are stateless and accept data via props.
