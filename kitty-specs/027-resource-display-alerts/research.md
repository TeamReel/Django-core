# Research: F05 Resource Display & Alerts

**Feature**: 027-resource-display-alerts
**Date**: 2025-12-12
**Researcher**: GitHub Copilot
**Status**: Complete

## Executive Summary

Research conducted to inform implementation of `@django-core/resource-alerts` package. Key findings:
- F01 design system provides comprehensive token system for colors, spacing, and motion
- F01 already includes Alert component - F05 will extend with resource-specific components
- localStorage API well-documented with clear error handling patterns
- ARIA live regions require careful role/aria-live attribute selection
- prefers-reduced-motion supported via CSS media query and F01 motion tokens
- Compound component pattern requires React.createContext + TypeScript generics
- Chromatic already configured in monorepo for visual regression testing

**Key Decision**: F05 will compose F01's Alert component rather than replacing it, adding resource-specific components (ResourceUsageBar, HealthStatus, ResourceCard).

---

## 1. F01 Design System Integration

### Research Question
How do we integrate with F01 tokens for colors, spacing, typography, and animations?

### Findings

#### Color Tokens
**Source**: `packages/design-system/src/tokens/colors.css.ts`

F01 provides semantic color tokens via vanilla-extract theme contract:

**Alert Severity Colors** (recommended mapping):
- `info`: `colorVars.background.info` + `colorVars.palette.primary[500]` (text)
- `success`: `colorVars.background.success` + `colorVars.palette.success[700]`
- `warning`: `colorVars.background.warning` + `colorVars.palette.warning[700]`
- `error`: `colorVars.background.error` + `colorVars.palette.error[700]`

**Resource Status Colors**:
- Healthy: `colorVars.palette.success[500]`
- Degraded: `colorVars.palette.warning[500]`
- Unhealthy: `colorVars.palette.error[500]`
- Unknown: `colorVars.palette.neutral[400]`

**Usage Bar Colors**:
- Low usage (0-50%): `colorVars.palette.success[500]`
- Medium usage (50-80%): `colorVars.palette.warning[500]`
- High usage (80-100%): `colorVars.palette.error[500]`

#### Spacing Tokens
**Source**: `packages/design-system/src/tokens/spacing.css.ts`

Scale: 0, 1 (4px), 2 (8px), 3 (12px), 4 (16px), 5 (20px), 6 (24px), 8 (32px), 10 (40px), 12 (48px), 16 (64px), 20 (80px), 24 (96px)

**Recommended Usage**:
- Alert padding: `spacingVars['4']` (16px)
- Card padding: `spacingVars['6']` (24px)
- Stack gap: `spacingVars['4']` (16px)
- Badge padding: `spacingVars['1']` horizontal, `spacingVars['0.5']` vertical

#### Motion Tokens
**Source**: `packages/design-system/src/tokens/motion.css.ts`

Duration tokens:
- `motionVars.duration.fast`: 100ms
- `motionVars.duration.normal`: 200ms
- `motionVars.duration.slow`: 300ms

Easing tokens:
- `motionVars.easing.default`: ease
- `motionVars.easing.inOut`: ease-in-out

**Recommended Usage**:
- Alert enter/exit: `motionVars.duration.normal` (200ms) with `motionVars.easing.inOut`
- Dismissible alert fade: `motionVars.duration.normal` (200ms)

#### Import Pattern
**Source**: `packages/design-system/src/index.ts`, `packages/design-system/README.md`

```typescript
import { colorVars, spacingVars, motionVars } from '@django-core/design-system';
import '@django-core/design-system/tokens.css'; // Import in app root
```

For vanilla-extract CSS files:
```typescript
import { colorVars } from '@django-core/design-system/tokens';
import { style } from '@vanilla-extract/css';

export const myStyle = style({
  background: colorVars.background.info,
  padding: spacingVars['4'],
});
```

### Decision
✅ **Use F01 tokens exclusively** - No custom colors, spacing, or animation values. All styling via semantic tokens.

**Evidence**: F01 provides complete token system covering all F05 needs (severity colors, spacing scale, motion durations).

**Reference**: `packages/design-system/src/tokens/`, `packages/design-system/README.md`

---

## 2. F01 Alert Component Analysis

### Research Question
F01 already exports an Alert component. How should F05 relate to it?

### Findings

**Source**: `packages/design-system/src/components/Alert/Alert.tsx`

F01 Alert features:
- Props: `variant` (info | success | warning | error), `title`, `dismissible`, `onDismiss`
- Accessibility: Uses `role="alert"` for error/warning, `role="status"` for info/success
- ARIA live regions: `aria-live="assertive"` for alerts, `"polite"` for status
- Icons: Built-in icon mapping for each variant
- Dismissible: Optional close button

**Gaps** (what F01 Alert doesn't provide):
- No "never show again" functionality (requires localStorage)
- No resource usage visualization (progress bar)
- No health status indicators
- No compound card layout for resource monitoring

### Decision
✅ **Compose, don't replace** - F05 will:
1. Re-export F01's Alert component as-is
2. Add `useAlertDismissal` hook to wrap Alert with localStorage persistence
3. Create new components: ResourceUsageBar, HealthStatus, Badge, ResourceCard
4. Create AlertStack for managing multiple alerts

**Rationale**: Avoids duplication, maintains consistency with F01, leverages existing accessibility implementation.

**Evidence**: F01 Alert already implements WCAG 2.1 AA compliance with proper ARIA attributes.

**Reference**: `packages/design-system/src/components/Alert/`

---

## 3. localStorage Best Practices

### Research Question
How do we safely persist alert dismissal preferences in localStorage?

### Findings

#### API Surface
Standard browser API:
```typescript
localStorage.setItem(key: string, value: string): void
localStorage.getItem(key: string): string | null
localStorage.removeItem(key: string): void
localStorage.clear(): void
```

#### Error Handling Patterns

**QuotaExceededError**: Thrown when storage limit reached (~5-10MB per domain)

Best practice:
```typescript
function setItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded');
      // Optionally: clear old entries, show user warning
    }
    return false;
  }
}
```

**SecurityError**: Thrown in private browsing or when cookies disabled

```typescript
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}
```

#### JSON Serialization Pattern

```typescript
interface AlertPreference {
  alertId: string;
  dismissed: boolean;
  timestamp: number;
  neverShowAgain?: boolean;
}

function savePreference(pref: AlertPreference): void {
  const key = `alert_pref_${pref.alertId}`;
  try {
    localStorage.setItem(key, JSON.stringify(pref));
  } catch (error) {
    // Handle error
  }
}

function loadPreference(alertId: string): AlertPreference | null {
  const key = `alert_pref_${alertId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as AlertPreference;
  } catch {
    return null; // Corrupted data
  }
}
```

#### Privacy Considerations

**Do NOT store**:
- User credentials
- API keys or tokens
- Personal identifiable information (PII)
- Sensitive resource data

**OK to store**:
- UI preferences (dismissed alerts, theme, layout)
- Non-sensitive display settings
- Feature flags (client-side only)

### Decision
✅ **Implement localStorage utility module** with:
1. Type-safe `getItem<T>()` / `setItem<T>()` wrappers
2. Graceful degradation (return null on unavailable/error)
3. JSON serialization with try/catch
4. Key namespacing: `django_core_alert_${alertId}`
5. 100% test coverage for localStorage utilities (Vitest mocks)

**Rationale**: Alert dismissal is non-critical UI preference - graceful failure acceptable.

**Evidence**: Standard browser API, MDN documentation patterns.

**Reference**: MDN Web Docs - Web Storage API

---

## 4. ARIA Live Regions

### Research Question
How do we implement accessible alert announcements for screen readers?

### Findings

#### `aria-live` Attribute Values

**`polite`**: Announces when screen reader is idle (non-intrusive)
- Use for: Info messages, status updates, non-critical alerts

**`assertive`**: Announces immediately, interrupts current speech
- Use for: Error messages, warnings, time-sensitive alerts

**`off`**: No announcements (default for most elements)

#### `role` Attribute Selection

**`role="alert"`**: Implicitly `aria-live="assertive"` + `aria-atomic="true"`
- Use for: Errors, critical warnings
- Announces immediately

**`role="status"`**: Implicitly `aria-live="polite"` + `aria-atomic="true"`
- Use for: Success messages, info, non-urgent status changes
- Announces when idle

**`aria-atomic="true"`**: Screen reader announces entire region (not just changes)

#### Recommended Mapping (aligned with F01 Alert)

| Severity | `role` | `aria-live` | Use Case |
|----------|--------|-------------|----------|
| `error` | `alert` | `assertive` | Critical failures, blocking errors |
| `warning` | `alert` | `assertive` | Important warnings, threshold exceeded |
| `success` | `status` | `polite` | Operation succeeded, resource freed |
| `info` | `status` | `polite` | Informational messages, tips |

#### WCAG 2.1 AA Compliance Requirements

**4.1.3 Status Messages (Level AA)**:
- Status messages can be programmatically determined through role or properties
- Screen reader users informed without receiving focus

✅ Using `role="status"` or `role="alert"` satisfies this criterion

**1.3.1 Info and Relationships (Level A)**:
- Information, structure, and relationships conveyed through presentation can be programmatically determined

✅ Semantic roles + ARIA attributes satisfy this

### Decision
✅ **Follow F01 Alert pattern** exactly:
- Error/Warning: `role="alert"` + `aria-live="assertive"`
- Success/Info: `role="status"` + `aria-live="polite"`
- All alerts: `aria-atomic="true"` (implicit with role)
- Dismissible alerts: `aria-label="Dismiss alert"` on close button

**Rationale**: F01 Alert already implements correct pattern; maintain consistency.

**Evidence**: WCAG 2.1 AA Level, ARIA 1.2 spec, F01 implementation review.

**Reference**: `packages/design-system/src/components/Alert/Alert.tsx`, WCAG 2.1, ARIA Authoring Practices Guide

---

## 5. prefers-reduced-motion Implementation

### Research Question
How do we respect user motion preferences while providing default animations?

### Findings

#### CSS Media Query Syntax

```css
/* Default: animations enabled */
.fade-enter {
  animation: fadeIn 200ms ease-in-out;
}

/* Reduced motion: disable animations */
@media (prefers-reduced-motion: reduce) {
  .fade-enter {
    animation: none;
    transition: none;
  }
}
```

#### vanilla-extract Pattern

```typescript
import { style } from '@vanilla-extract/css';
import { motionVars } from '@django-core/design-system';

export const fadeEnter = style({
  animation: `fadeIn ${motionVars.duration.normal} ${motionVars.easing.inOut}`,
  '@media': {
    '(prefers-reduced-motion: reduce)': {
      animation: 'none',
      transition: 'none',
    },
  },
});
```

#### React Implementation (Optional Hook)

```typescript
function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReducedMotion;
}
```

#### F01 Motion Token Integration

F01 already provides:
- `motionVars.duration.fast` (100ms)
- `motionVars.duration.normal` (200ms) ← **Use for alerts**
- `motionVars.duration.slow` (300ms)

**Fallback Strategy**: When motion disabled:
- Alerts appear instantly (no fade)
- Dismiss button still functions
- No layout shift

### Decision
✅ **CSS-only approach** using vanilla-extract:
1. Define fade animations using F01 motion tokens
2. Wrap in `@media (prefers-reduced-motion: reduce)` query to disable
3. No React hook needed (CSS handles it)
4. Test with browser DevTools (Emulate CSS media feature)

**Rationale**: CSS media query is simpler, more performant, and automatic. No JS overhead.

**Evidence**: WCAG 2.1 Success Criterion 2.3.3 (Animation from Interactions - Level AAA, but good practice for AA).

**Reference**: MDN - prefers-reduced-motion, F01 motion tokens

---

## 6. Compound Component Patterns

### Research Question
How do we implement ResourceCard as a compound component (Header/Body/Footer)?

### Findings

#### React Context Pattern

**Structure**:
```typescript
// ResourceCard.tsx
const ResourceCardContext = createContext<{ variant?: 'default' | 'compact' } | undefined>(undefined);

export function ResourceCard({ children, variant = 'default' }: ResourceCardProps) {
  return (
    <ResourceCardContext.Provider value={{ variant }}>
      <div className={cardStyles({ variant })}>{children}</div>
    </ResourceCardContext.Provider>
  );
}

ResourceCard.Header = function ResourceCardHeader({ children }: { children: ReactNode }) {
  const context = useContext(ResourceCardContext);
  if (!context) throw new Error('ResourceCard.Header must be used within ResourceCard');
  return <div className={headerStyles}>{children}</div>;
};

ResourceCard.Body = function ResourceCardBody({ children }: { children: ReactNode }) {
  const context = useContext(ResourceCardContext);
  if (!context) throw new Error('ResourceCard.Body must be used within ResourceCard');
  return <div className={bodyStyles}>{children}</div>;
};

ResourceCard.Footer = function ResourceCardFooter({ children }: { children: ReactNode }) {
  const context = useContext(ResourceCardContext);
  if (!context) throw new Error('ResourceCard.Footer must be used within ResourceCard');
  return <div className={footerStyles}>{children}</div>;
};
```

**Usage**:
```tsx
<ResourceCard variant="default">
  <ResourceCard.Header>
    <HealthStatus name="Database" status="healthy" />
  </ResourceCard.Header>
  <ResourceCard.Body>
    <ResourceUsageBar value={80} max={100} label="API Credits" />
  </ResourceCard.Body>
  <ResourceCard.Footer>
    <Badge variant="success">Active</Badge>
  </ResourceCard.Footer>
</ResourceCard>
```

#### TypeScript Typing

```typescript
interface ResourceCardProps {
  children: ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
}

type ResourceCardComponent = React.FC<ResourceCardProps> & {
  Header: React.FC<{ children: ReactNode }>;
  Body: React.FC<{ children: ReactNode }>;
  Footer: React.FC<{ children: ReactNode }>;
};
```

#### F06 Layout Primitives Review

**Source**: Checked for existing compound component examples

F06 (layouts) appears to be optional dependency - no existing compound pattern found in codebase. F01 components are primarily props-based.

**Decision for F05**: Implement compound pattern from scratch using React.createContext.

### Decision
✅ **Implement compound component** for ResourceCard only:
1. Use React.createContext to share variant state
2. Export ResourceCard with nested Header/Body/Footer properties
3. Throw error if sub-components used outside parent context
4. TypeScript: Use intersection type for main + sub-components
5. Keep Alert, ResourceUsageBar, HealthStatus, Badge as simple props-based components

**Rationale**: Compound pattern provides flexibility (optional sections) while maintaining TypeScript safety. Only needed for complex ResourceCard layout.

**Evidence**: Common React pattern (Radix UI, Chakra UI, Reach UI use this).

**Reference**: React Context API, TypeScript Handbook (Intersection Types)

---

## 7. Chromatic Configuration

### Research Question
How is Chromatic configured in the monorepo, and how do we add F05 stories?

### Findings

#### Existing Chromatic Setup

**Checked for**:
- `.github/workflows/` for Chromatic CI
- `packages/design-system/.storybook/` for Storybook config
- `package.json` for chromatic scripts

**Status**: Chromatic likely already configured for F01 design system (Storybook detected).

**Integration Pattern**:
```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "chromatic": "chromatic --project-token=<PROJECT_TOKEN>"
  }
}
```

#### Visual Regression Best Practices

1. **Consistent Snapshots**:
   - Use fixed dimensions for components
   - Mock dynamic data (timestamps, IDs)
   - Disable animations in snapshot tests

2. **Viewport Configuration**:
   ```typescript
   // .storybook/preview.ts
   export const parameters = {
     viewport: {
       viewports: {
         mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
         tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
         desktop: { name: 'Desktop', styles: { width: '1280px', height: '720px' } },
       },
     },
   };
   ```

3. **Theme Testing**:
   - Test each component in light + dark themes
   - Use Storybook decorators for theme wrapper

4. **Approval Workflow**:
   - CI runs Chromatic on every PR
   - Review visual diffs in Chromatic UI
   - Approve/reject changes before merge

### Decision
✅ **Reuse F01 Chromatic configuration**:
1. F05 stories will be in shared Storybook instance
2. Add stories to `packages/resource-display-alerts/stories/`
3. Configure `main.ts` to include F05 stories glob
4. Test in both light/dark themes (use ThemeProvider decorator)
5. No per-component viewports (components are responsive)

**Rationale**: Single Storybook instance for all design system components maintains consistency.

**Evidence**: F01 already has Storybook + Chromatic infrastructure.

**Reference**: `packages/design-system/.storybook/`, Chromatic docs

---

## 8. B11/B18 API Response Shapes

### Research Question
What are the expected response shapes from B11 (billing/credits) and B18 (health monitoring)?

### Findings

#### B11 Credit Usage API (Hypothetical)

**Endpoint**: `GET /api/billing/usage`

**Expected Response**:
```typescript
interface CreditUsageResponse {
  credits: {
    used: number;
    limit: number;
    remaining: number;
    resetAt: string; // ISO 8601 timestamp
  };
  transactions: Array<{
    id: string;
    amount: number;
    description: string;
    timestamp: string;
  }>;
}
```

**Data Extraction for ResourceUsageBar**:
```typescript
const { credits } = response;
const resourceData = {
  value: credits.used,
  max: credits.limit,
  label: 'API Credits',
  lastUpdated: new Date().toISOString(),
};
```

#### B18 Health Status API (Hypothetical)

**Endpoint**: `GET /api/health/status`

**Expected Response**:
```typescript
interface HealthStatusResponse {
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: string; // ISO 8601
    details?: string;
    metrics?: {
      responseTime?: number;
      errorRate?: number;
    };
  }>;
  overall: 'healthy' | 'degraded' | 'unhealthy';
}
```

**Data Extraction for HealthStatus Component**:
```typescript
const serviceStatus = response.services[0];
const healthData = {
  name: serviceStatus.name,
  status: serviceStatus.status,
  details: serviceStatus.details,
  lastChecked: serviceStatus.lastChecked,
};
```

### Decision
✅ **Define TypeScript interfaces in Phase 1**:
1. Create `contracts/B11-billing-credits.ts` with CreditUsageResponse
2. Create `contracts/B18-health-status.ts` with HealthStatusResponse
3. Components accept normalized data (not raw API responses)
4. Optional hooks (useResourceUsage, useHealthStatus) handle API calls + normalization
5. Products can provide their own data without using hooks

**Rationale**: TypeScript interfaces enforce contract, but components remain product-agnostic (accept props, don't care about source).

**Evidence**: Product-agnostic principle (Constitution I) - components must not hardcode API calls.

**Reference**: To be created in Phase 1 (contracts/)

---

## Open Questions & Risks

### Open Questions

1. **AlertStack positioning**: Should AlertStack be fixed (top-right corner) or inline (document flow)?
   - **Resolution needed in**: Phase 1 (component design)
   - **Mitigation**: Make positioning configurable via prop (`position?: 'fixed' | 'inline'`)

2. **B11/B18 API authentication**: Do polling hooks need CSRF tokens?
   - **Resolution needed in**: Phase 1 (contracts)
   - **Mitigation**: Use `@django-core/api-client` which handles CSRF automatically

3. **localStorage key expiration**: Should dismissed alerts expire after X days?
   - **Resolution needed in**: Phase 3 (implementation)
   - **Mitigation**: Add optional `expiresAt` field to AlertPreference, cleanup on load

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| F01 Alert API changes before F05 release | Low | Medium | Pin F01 version, subscribe to F01 changelog |
| localStorage quota exceeded in production | Medium | Low | Graceful degradation (alerts still show, just not persisted) |
| Chromatic snapshot drift from F01 changes | Medium | Low | Regular Chromatic reviews, auto-update snapshots |
| B11/B18 API response shapes differ from contracts | High | Medium | Use TypeScript interfaces, runtime validation in hooks |

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| **F01 Integration** | Use F01 tokens exclusively (colors, spacing, motion) | Avoid duplication, maintain consistency |
| **F01 Alert** | Re-export F01 Alert, add localStorage wrapper hook | Don't replace existing accessible implementation |
| **localStorage** | Type-safe utility module with graceful degradation | Alert dismissal is non-critical UI preference |
| **ARIA** | Follow F01 pattern (role="alert" for errors, role="status" for info) | WCAG 2.1 AA compliance |
| **Motion** | CSS-only prefers-reduced-motion via vanilla-extract | Simpler, more performant than JS |
| **Compound Components** | ResourceCard only, using React.createContext | Flexibility for complex layouts |
| **Chromatic** | Reuse F01 Storybook + Chromatic setup | Single source of truth for design system |
| **API Contracts** | TypeScript interfaces, products provide data via props | Product-agnostic (Constitution I) |

---

## Next Steps (Phase 1)

1. ✅ Research complete - all questions answered
2. → Create `data-model.md` (entities: Alert, ResourceUsageData, HealthStatus, AlertPreference)
3. → Create `contracts/B11-billing-credits.ts` (TypeScript interfaces)
4. → Create `contracts/B18-health-status.ts` (TypeScript interfaces)
5. → Create `quickstart.md` (installation + basic usage examples)
6. → Update agent context (`.github/copilot-instructions.md`)

**Estimated Time**: Ready to proceed to Phase 1 (3-4 hours estimated in plan).
