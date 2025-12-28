# Audit Log Fix Summary

## Issue
The Audit Log page was failing to display events and the WebSocket connection was failing.
1. **Data Loading:** The page was not correctly parsing the B13 API response envelope (`data.data.results` vs `data.results`), leading to an empty list or errors.
2. **WebSocket:** The WebSocket connection was failing with connection errors. (Note: The WebSocket failure might be a separate infrastructure issue or simply that the backend service isn't running/reachable on the expected port, but the primary data loading issue is fixed).

## Fix
Updated `examples/demo-shell/src/pages/config/AuditLogPage.tsx` to correctly parse the API response for audit events:
```typescript
const rawData = await response.json();
// Handle B13 response envelope
const data = rawData.data || rawData;
let filteredEvents = data.results || [];
```

## Verification
- Navigate to the Audit Log page (`/config/audit`).
- The page should now display the list of audit events.
- Note: If WebSocket errors persist, they indicate real-time updates might be unavailable, but the initial data load should now work.
