---
name: webapp-testing
description: "Test the running TeamReel web app via Playwright MCP — navigate pages, fill forms, take screenshots, verify user flows, check responsive behavior"
argument-hint: "URL or page to test (e.g. 'http://localhost:5173/dashboard')"
---

# Web Application Testing

Test the running TeamReel app by interacting with it through a real browser via Playwright MCP.

## Prerequisites

1. **Target URL**: `https://demo.teamreel.app` (live demo) or `http://localhost:5173` (local dev server via `cd demo && npm run dev`)
2. **Playwright MCP must be available** (configured in `.vscode/mcp.json`)

## Testing Workflow

### Step 1: Verify the App is Accessible
```bash
# Check live demo
curl -s -o /dev/null -w "%{http_code}" https://demo.teamreel.app
# Should return 200

# Or check local dev server
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

If testing locally and dev server not running:
```bash
cd demo && npm run dev &
sleep 5
```

### Step 2: Navigate and Explore
1. Use Playwright MCP to navigate to the target page
2. Take a page snapshot (DOM structure)
3. Take a screenshot for visual reference
4. Identify interactive elements

### Step 3: Test User Interactions

**Common interactions:**
- Click navigation links
- Fill form inputs
- Toggle switches
- Open/close sheets and modals
- Select dropdown options
- Upload files (if applicable)

### Step 4: Responsive Testing

Test at standard viewports:

| Viewport | Width | Height | Checks |
|----------|-------|--------|--------|
| Mobile | 375 | 812 | No overflow, stacked layout, touch targets ≥ 44px |
| Tablet | 768 | 1024 | Grid adjusts, navigation changes |
| Desktop | 1280 | 720 | Full layout, all panels visible |
| Wide | 1920 | 1080 | No excessive whitespace |

### Step 5: Error Detection

Monitor for:
- Browser console errors/warnings
- Failed network requests (4xx, 5xx)
- React error boundaries triggered
- Uncaught exceptions

### Step 6: Screenshot Documentation

Take screenshots for:
- Each page at desktop and mobile viewports
- Before/after user interactions
- Error states
- Edge cases (empty states, loading states)

## TeamReel-Specific Flows

| Flow | URL | What to verify |
|------|-----|---------------|
| Dashboard | `/dashboard` | Cards render, stats load, navigation works |
| Squad | `/squad` | Member list, filters, search, member detail |
| Activities | `/activities` | Activity list, period selector, participation |
| Match Day | `/match-day` | Line-up, readiness, countdown |
| Brand | `/brand` | Logo, colors, preview |
| Settings | `/settings` | Forms save, validation works |

## Output Format

```markdown
## Test Results: [Page/Flow]

### Screenshots
[Attach screenshots at each viewport]

### Interactions Tested
| # | Action | Result | Pass/Fail |
|---|--------|--------|-----------|

### Console Errors
[List any errors found]

### Issues Found
| # | Severity | Issue | Expected | Actual |
|---|----------|-------|----------|--------|
```
