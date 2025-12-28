# Credits Page Crash Fix Summary

## Issue
The Credits page was crashing with `Uncaught TypeError: Cannot read properties of undefined (reading 'toLocaleString')`.
This was caused by the frontend expecting the API to return the `CreditsBalance` object directly, but the backend was returning it wrapped in a B13 response envelope (`{ status: 'success', data: { ... } }`).
As a result, `credits.current_balance` was undefined because `credits` was the envelope object, not the data object.

## Fix
Updated `CreditsPage.tsx` to correctly parse the API response for:
1. **Credits Balance:** extracting `response.data.data` if present.
2. **Transactions:** extracting `response.data.data.results` or `response.data.results` if present.

## Files Modified
- `examples/demo-shell/src/pages/config/CreditsPage.tsx`

## Verification
- Navigate to the Credits page.
- The page should now load without crashing.
- The current balance and transaction history should be displayed correctly.
