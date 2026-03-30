# Test 36: Activity Feed & Permissions Management

**Status:** READY TO RUN
**Spec Reference:** B03 RBAC System, Activity Logging
**Related Packages:** `@django-core/permissions`
**Page:** Project Settings → Members & Permissions

## Test Overview

This test validates the Activity Feed component and permission management features within projects. The Activity Feed displays recent permission-related actions (member additions, role changes, invitations), while the Permission Matrix shows the full capability matrix across roles.

## Quick Access

**Direct URL:** `/projects/{project_id}/settings/members`
**Navigation:** Project Context → Settings → Members & Permissions

## Prerequisites

- Multiple users with different roles (Admin, Coach, Member)
- Test project with existing team members
- Permission to view/modify project memberships

---

## Test Scenarios

### Scenario 1: View Activity Feed (Admin)

**Test as:** Admin
**Expected behaviour:**
- Activity Feed displays at top/side of members page
- Shows recent events: MEMBER_ADDED, MEMBER_REMOVED, ROLE_CHANGED, INVITE_SENT, PROMOTION_REQUESTED
- Events include: actor name, target user, timestamp (relative format), event icon
- Events can be filtered by type via dropdown
- Load more button appears if >10 events

**Success criteria:**
- ✅ Activity Feed renders with realistic data
- ✅ Event icons display correctly (👤+, 👤-, 🔄, ✉️, ⬆️)
- ✅ Timestamps show relative time (e.g., "2 hours ago")
- ✅ Filter dropdown works (All, Member Added, Removed, etc.)
- ✅ Load More pagination functions
- ✅ No TypeScript errors in console

**API Endpoint:**
```
GET /api/v1/activity/?organization={org_id}&project={project_id}&type={filter}
```

---

### Scenario 2: Activity Feed Event Types

**Test as:** Admin
**Action:** Perform various permission actions
**Expected behaviour:**

**Event: MEMBER_ADDED**
- Badge: Green (success)
- Icon: 👤+
- Message: "[Actor] added [Target] to the team."

**Event: MEMBER_REMOVED**
- Badge: Red (error)
- Icon: 👤-
- Message: "[Actor] removed [Target] from the team."

**Event: ROLE_CHANGED**
- Badge: Yellow (warning)
- Icon: 🔄
- Message: "[Actor] changed role of [Target] to {new_role}."

**Event: INVITE_SENT**
- Badge: Blue (info)
- Icon: ✉️
- Message: "[Actor] sent an invite to [email]."

**Event: PROMOTION_REQUESTED**
- Badge: Purple (primary)
- Icon: ⬆️
- Message: "[Actor] requested promotion to {requested_role}."

**Success criteria:**
- ✅ All event types render correctly
- ✅ Badge colors match event severity
- ✅ Messages are grammatically correct
- ✅ Actor/target names display (fallback to email)

---

### Scenario 3: Resend Invitation

**Test as:** Admin
**Action:** Click "Resend Invite" button on pending invitation
**Expected behaviour:**
- Button shows loading spinner during request
- POST request to `/api/v1/projects/{project_id}/invitations/{invitation_id}/resend/`
- Success toast notification appears
- Activity Feed updates with new INVITE_SENT event
- Button returns to normal state

**Success criteria:**
- ✅ Resend button accessible
- ✅ Loading state displays (Spinner component)
- ✅ CSRF token included in request
- ✅ Success callback fires
- ✅ Error handling works (displays error message)

---

### Scenario 4: Permission Matrix Modal

**Test as:** Admin
**Action:** Click "View Permission Matrix" button
**Expected behaviour:**
- Modal opens with full-screen permission matrix
- Left column: All permissions grouped by module (e.g., "projects", "members", "billing")
- Top row: All roles (Admin, Coach, Member, etc.)
- Grid cells: Green badge "Yes" or gray "-" for each role/permission combo
- Matrix is scrollable for large permission sets

**Success criteria:**
- ✅ Modal opens/closes correctly
- ✅ Grid layout renders (CSS Grid with dynamic columns)
- ✅ Module headings visible (capitalized)
- ✅ Permission codes displayed (e.g., "projects.view")
- ✅ Role columns align with permission rows
- ✅ Badge variant "success" for granted permissions

**Sample Grid Structure:**
```
Permission              | Admin | Coach | Member
------------------------|-------|-------|--------
Projects
projects.view           | Yes   | Yes   | Yes
projects.create         | Yes   | -     | -
projects.delete         | Yes   | -     | -
Members
members.view            | Yes   | Yes   | Yes
members.invite          | Yes   | Yes   | -
members.remove          | Yes   | -     | -
```

---

### Scenario 5: Activity Feed Filtering

**Test as:** Admin
**Action:** Change filter dropdown
**Expected behaviour:**
- Default: "All Events" selected
- Select "Member Added" → only MEMBER_ADDED events visible
- Select "Role Changed" → only ROLE_CHANGED events visible
- Events re-fetch from API with `?type={filter}` query param
- Loading spinner shows during fetch

**Success criteria:**
- ✅ Filter dropdown has all options
- ✅ Selecting filter triggers API call
- ✅ Event list updates correctly
- ✅ No flash of unfiltered content
- ✅ Empty state shows if no events match filter

---

### Scenario 6: Activity Feed Scoping

**Test as:** Admin
**Context:** Switch between organizations and projects
**Expected behaviour:**
- **Organization-level:** Activity feed shows all events across org's projects
- **Project-level:** Activity feed scoped to selected project only
- URL params include: `?organization={org_id}&project={project_id}`
- Switching context re-fetches activity feed

**Success criteria:**
- ✅ Org-level shows broader event set
- ✅ Project-level shows narrower scope
- ✅ Context switching triggers refresh
- ✅ No events from other orgs visible

---

### Scenario 7: Activity Feed Empty State

**Test as:** Admin
**Context:** New project with no activity
**Expected behaviour:**
- Activity Feed shows centered message: "No activity found."
- Text color: secondary (muted)
- No event cards displayed
- Filter dropdown still functional

**Success criteria:**
- ✅ Empty state message visible
- ✅ No loading spinner stuck
- ✅ Text styling correct (secondary color)
- ✅ No console errors

---

### Scenario 8: Permission Management (Non-Admin)

**Test as:** Coach
**Expected behaviour:**
- Activity Feed visible (read-only)
- Cannot modify member roles
- Cannot send invitations
- No "Resend Invite" button visible
- Permission Matrix modal accessible (read-only)

**Success criteria:**
- ✅ Activity Feed renders for Coach
- ✅ No edit/delete buttons available
- ✅ Permission Matrix opens but no edit actions
- ✅ UI reflects read-only state

---

### Scenario 9: Design System Integration

**Test as:** Any User
**Expected behaviour:**
- All components use `@django-core/design-system`:
  - `Text` (size, weight, color props)
  - `Stack` (gap prop, not spacing)
  - `Badge` (variant: default/primary/success/warning/error/info)
  - `Button` (variant: outline/primary/secondary)
  - `Modal` (isOpen, onClose props)
  - `Spinner` (loading state)
  - `Card` (padding prop)
  - `Heading` (level prop)

**Success criteria:**
- ✅ No TypeScript errors about invalid props
- ✅ Consistent design tokens (colors, spacing, typography)
- ✅ Components render without style conflicts
- ✅ No inline styles except functional (grid layout)

---

## API Contracts

### Activity Feed Endpoint
```typescript
GET /api/v1/activity/
Query params:
  - organization: UUID (optional)
  - project: UUID (optional)
  - type: ActivityEventType (optional)
  - page: number (default: 1)
  - page_size: number (default: 10)

Response:
{
  results: [
    {
      id: string,
      type: 'MEMBER_ADDED' | 'MEMBER_REMOVED' | 'ROLE_CHANGED' | 'INVITE_SENT' | 'PROMOTION_REQUESTED',
      timestamp: string (ISO 8601),
      actor: { id: string, name: string, email: string },
      target?: { id: string, name: string, type: 'USER' | 'PROJECT' | 'ORGANIZATION' },
      details: Record<string, any>
    }
  ],
  count: number,
  next: string | null,
  previous: string | null
}
```

### Resend Invitation Endpoint
```typescript
POST /api/v1/projects/{project_id}/invitations/{invitation_id}/resend/
Response: 204 No Content
```

---

## Known Issues

### Fixed Issues ✅
- **Design System Compatibility:** ActivityFeed now uses correct design-system API (`gap` not `spacing`, `secondary` not `text.secondary`)
- **Missing Dependency:** `@django-core/design-system` added to permissions package peer dependencies
- **TypeScript Errors:** Badge variant types corrected (`error` not `danger`, `default` not `neutral`)

### Remaining Issues ⚠️
- Permission Matrix Modal may not be implemented in demo-shell UI yet
- Activity API endpoint may return 404 (fallback to mock data)

---

## Testing Checklist

- [ ] Activity Feed renders with events
- [ ] All 5 event types display correctly (icons, colors, messages)
- [ ] Event filtering works (dropdown + API integration)
- [ ] Load More pagination functions
- [ ] Resend Invite button works (spinner, success state)
- [ ] Permission Matrix modal opens
- [ ] Permission Matrix grid renders correctly
- [ ] Context switching (org/project) updates feed
- [ ] Empty state displays for new projects
- [ ] Non-admin users see read-only view
- [ ] All design system components render correctly
- [ ] No TypeScript errors in console
- [ ] No React warnings in console
- [ ] CSRF tokens included in POST requests
- [ ] Error handling displays user-friendly messages

---

## Success Criteria

**PASS:** All checklist items verified, activity feed displays real-time permission events, permission matrix shows correct role capabilities

**FAIL:** TypeScript errors, missing design system components, broken API integration, incorrect event rendering

---

## Notes

This test validates the newly fixed `@django-core/permissions` package after resolving Railway build errors. The ActivityFeed component is the primary focus, ensuring it correctly uses the design system API and integrates with the backend activity logging system.

**Related Commits:**
- `fix(permissions): add @django-core/design-system as external dependency`
- `fix(permissions): update ActivityFeed to use correct design-system API`
- `chore: update pnpm-lock.yaml after adding design-system peer dep`
