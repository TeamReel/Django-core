import { test, expect } from '@playwright/test';

test.describe('Navigation Architecture Sweep', () => {

  // Setup Network Mocks
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies(); // ensure clean state

    // Mock Login
    await page.route('**/api/v1/auth/login/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ key: "mock_token_123" })
      });
    });

    // Mock User Me
    await page.route('**/api/v1/auth/me/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          email: "alice@example.com",
          first_name: "Alice",
          last_name: "Test",
          pk: 1,
          is_staff: true,
          is_active: true
        })
      });
    });

    // Mock Profile
    await page.route('**/api/v1/auth/profile/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
           id: 1,
           language: 'en',
           timezone: 'UTC',
           avatar: null,
           role: 'org_admin'
        })
      });
    });

     // Mock Pages (Content)
    await page.route('**/api/v2/pages/?**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
           items: [],
           meta: { total_count: 0 }
        })
      });
    });
  });

  // Helper to login (Simulated via Network Mocks)
  async function login(page) {
    // With 'me' mocked to return a valid user, visiting any protected route
    // or /login should settle on /dashboard or the protected route.
    await page.goto('/login');

    // If the auth logic works, we should be redirected to dashboard immediately
    // because /api/v1/auth/me/ returns a valid user.
    try {
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    } catch (e) {
        // Fallback: If for some reason we are still on login (e.g. no token in storage yet prevents 'me' call?)
        // Try to force a login flow, but this shouldn't be needed with the "me" mock if the app checks session on mount.
        console.log("Auto-login redirect didn't happen, trying form...");
        await page.getByLabel(/email/i).fill('alice@example.com');
        await page.getByLabel(/password/i).fill('demo1234');
        await page.getByRole('button', { name: /log in/i }).click();
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    }
  }

  // 1) Public/auth routes
  test('Login/Register pages render without MainLayout', async ({ page }) => {
    await page.goto('/login');
    // MainLayout has Sidebar (aside) and TopNavbar. Public pages shouldn't.
    await expect(page.locator('aside')).not.toBeVisible();
    await expect(page.locator('nav')).not.toBeVisible(); // Assuming TopNavbar uses <nav> or check for specific content

    await page.goto('/register');
    await expect(page.locator('aside')).not.toBeVisible();
  });

  // 2) Global layout persistence & 5) Responsive sanity (basic)
  test('Global layout persistence and structure', async ({ page }) => {
    await login(page);

    // Initial Dashboard state
    await expect(page.locator('aside').first()).toBeVisible(); // Panel A
    // Panel B might be hidden on Dashboard? Let's check Sidebar.tsx logic.
    // Dashboard -> path '/dashboard' -> section 'overview' (mapped in NAV_CONFIG) -> switch(activeSection)
    // activeSection logic: if /users -> people. else if /content -> content. else if /permissions -> org. else if /health -> platform. else if /docs -> help.
    // Dashboard path doesn't start with any of those.
    // So activeSection defaults to 'work'.
    // Case 'work' -> no matchId, no context -> "Browse Mode".
    // So Panel B should be visible with "Browse" title.

    // Check Panel A exists
    const panelA = page.locator('aside').first();
    await expect(panelA).toBeVisible();

    // Check Panel B exists (it's the second aside if distinct, or contained in Sidebar)
    // Sidebar.tsx renders: <aside ...> (Panel A) </aside> <aside ...> (Panel B) </aside>
    const panelB = page.locator('aside').nth(1);
    await expect(panelB).toBeVisible();
    await expect(panelB).toContainText('Browse');

    // Naviagte to /matches
    await page.goto('/matches');
    await expect(panelA).toBeVisible();
    await expect(panelB).toBeVisible();
    await expect(panelB).toContainText('Browse');

    // Navigate to /users
    await page.goto('/users');
    // activeSection = 'people' -> Panel B title 'People' -> items 'All Users'
    await expect(panelB).toContainText('People');
    await expect(panelB).toContainText('All Users');

    // Navigate back to work
    await page.goto('/teams');
    // activeSection needs to be Work. /teams is in Work.
    // Panel B should show "Browse" for teams root.
    await expect(panelB).toContainText('Browse');
  });

  // 3) Deep link scenarios & 4) Breadcrumb correctness
  test('Deep link scenarios', async ({ page }) => {
    // START MOck Setup
    // MOCK 1: Clubs (parent_project=null)
    await page.route(/.*organisations\/demo-org\/projects\/\?.*parent_project__isnull=true.*/, async route => {
        await route.fulfill({
        status: 200, json: { results: [{ id: 10, name: 'Demo Club', slug: 'demo-club' }], count: 1 }
        });
    });

    // MOCK 2: Teams (parent_project=false)
    await page.route(/.*organisations\/demo-org\/projects\/\?.*parent_project__isnull=false.*/, async route => {
        await route.fulfill({
        status: 200, json: { results: [{ id: 20, name: 'Demo Team', slug: 'demo-team', parent_id: 10 }], count: 1 }
        });
    });

    // MOCK 3: Seasons
    await page.route(/.*\/seasons.*/, async route => {
        await route.fulfill({
        status: 200, json: { results: [{ id: 30, name: 'Demo Season', slug: 'demo-season' }], count: 1 }
        });
    });
    // END Mock Setup

    await login(page);

    // Scenario: /matches (No Context)
    await page.goto('/matches');
    const panelA = page.locator('aside').first();
    const panelB = page.locator('aside').nth(1);

    // Panel A: "Where I am" context block should NOT be present.
    // We check that orgSlug-based items are not there.
    await expect(panelA).not.toContainText('Demo Club');

    await expect(panelB).toContainText('Browse');
    // Ensure Panel B has shortcuts (using loose match for icon+text)
    await expect(panelB.getByRole('link', { name: /Matches/i })).toBeVisible();

    // Scenario: Team Route
    // Path: /demo-org/demo-club/demo-team
    // We mock the route response to avoid 404 page taking over completely if error boundary is strict
    // But our Layout should render.
    await page.goto('/demo-org/demo-club/demo-team');

    // Panel A should show Context: Club, Team
    // Note: Title "Context" is not rendered in UI, only the items.
    await expect(panelA).toContainText('Demo Club');
    await expect(panelA).toContainText('Demo Team');

    // Panel B should show "Team Actions"
    await expect(panelB).toContainText('Team Actions');
    await expect(panelB).toContainText('Overview');
    await expect(panelB.getByRole('link', { name: /Seasons/i })).toBeVisible();

    // TODO: Add Season and Competition deep link scenarios once API mocking for seasons is fully implemented.
  });

});
