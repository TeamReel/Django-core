import { test, expect } from '@playwright/test';

/**
 * E2E Test: Context Switching & Permissions
 *
 * Covers P1 Story 2 acceptance scenarios:
 * - AS-2.1: Organisation switcher visible in header
 * - AS-2.2: Switch organisation updates URL and context
 * - AS-2.3: Project selector available after org selection
 * - AS-2.4: Selected context persists across page navigation
 * - AS-2.5: Permission-based UI elements (admin vs member)
 */

test.describe('Context Switching & Permissions', () => {
  // Helper function to log in
  async function login(page: any, email: string, password: string = 'demo1234') {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  }

  test.beforeEach(async ({ page }) => {
    // Clear session before each test
    await page.context().clearCookies();
  });

  test('AS-2.1: Organisation switcher visible in header', async ({ page }) => {
    await login(page, 'alice@example.com');

    // Should see context switcher in header
    await expect(page.getByRole('button', { name: /select organisation|techcorp|datalab/i }).first()).toBeVisible();
  });

  test('AS-2.2: Switch organisation updates context', async ({ page }) => {
    await login(page, 'alice@example.com');

    // Click context switcher
    const switcher = page.getByRole('button', { name: /select organisation|techcorp|datalab/i }).first();
    await switcher.click();

    // Select DataLab organisation
    await page.getByRole('option', { name: /datalab/i }).click();

    // Verify dashboard shows DataLab org in context
    await expect(page.getByText(/datalab/i)).toBeVisible();

    // Switch back to TechCorp
    await switcher.click();
    await page.getByRole('option', { name: /techcorp/i }).click();

    // Verify context updated
    await expect(page.getByText(/techcorp/i)).toBeVisible();
  });

  test('AS-2.3: Project selector available after org selection', async ({ page }) => {
    await login(page, 'alice@example.com');

    // Select organisation
    const switcher = page.getByRole('button', { name: /select organisation/i }).first();
    await switcher.click();
    await page.getByRole('option', { name: /techcorp/i }).click();

    // Should see project selector
    await expect(page.getByRole('button', { name: /select project|web platform|mobile app/i })).toBeVisible();
  });

  test('AS-2.4: Selected context persists across navigation', async ({ page }) => {
    await login(page, 'alice@example.com');

    // Select organisation and project
    await page.getByRole('button', { name: /select organisation/i }).first().click();
    await page.getByRole('option', { name: /techcorp/i }).click();

    await page.getByRole('button', { name: /select project/i }).click();
    await page.getByRole('option', { name: /web platform/i }).click();

    // Navigate to settings page
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/settings/);

    // Context should still show TechCorp and Web Platform
    await expect(page.getByText(/techcorp/i)).toBeVisible();
    await expect(page.getByText(/web platform/i)).toBeVisible();

    // Navigate to organisations page
    await page.getByRole('link', { name: /organisations/i }).first().click();
    await expect(page).toHaveURL(/\/organisations/);

    // Context should still be preserved
    await expect(page.getByText(/techcorp/i)).toBeVisible();
  });

  test('AS-2.5: Admin permissions show edit buttons', async ({ page }) => {
    // Log in as Alice (admin of TechCorp)
    await login(page, 'alice@example.com');

    // Select TechCorp organisation
    await page.getByRole('button', { name: /select organisation/i }).first().click();
    await page.getByRole('option', { name: /techcorp/i }).click();

    // Navigate to organisations detail page
    await page.goto('/organisations/techcorp');

    // Admin should see edit/manage options (look for buttons or links with "Edit", "Manage", "Settings")
    const hasAdminControls =
      (await page.getByRole('button', { name: /edit|manage|delete/i }).count()) > 0 ||
      (await page.getByRole('link', { name: /edit|manage|settings/i }).count()) > 0;

    expect(hasAdminControls).toBe(true);
  });

  test('Member permissions hide admin controls', async ({ page }) => {
    // Log in as Bob (member of TechCorp)
    await login(page, 'bob@example.com');

    // Select TechCorp organisation
    await page.getByRole('button', { name: /select organisation/i }).first().click();
    await page.getByRole('option', { name: /techcorp/i }).click();

    // Navigate to organisations detail page
    await page.goto('/organisations/techcorp');

    // Member should NOT see edit/delete buttons
    const adminButtons = await page.getByRole('button', { name: /edit|delete/i }).count();
    expect(adminButtons).toBe(0);

    // Should still see view-only content
    await expect(page.getByText(/techcorp/i)).toBeVisible();
  });

  test('Complete context journey: switch org → select project → verify permissions', async ({ page }) => {
    await login(page, 'alice@example.com');

    // 1. View available organisations
    await page.getByRole('link', { name: /organisations/i }).first().click();
    await expect(page).toHaveURL(/\/organisations/);

    // 2. Switch to TechCorp
    await page.getByRole('button', { name: /select organisation/i }).first().click();
    await page.getByRole('option', { name: /techcorp/i }).click();

    // 3. Select a project
    await page.getByRole('button', { name: /select project/i }).click();
    await page.getByRole('option', { name: /web platform/i }).first().click();

    // 4. Navigate to resources page
    await page.getByRole('link', { name: /resources/i }).click();
    await expect(page).toHaveURL(/\/resources/);

    // 5. Verify context persists
    await expect(page.getByText(/techcorp/i)).toBeVisible();
    await expect(page.getByText(/web platform/i)).toBeVisible();

    // 6. Switch to different org (DataLab)
    await page.getByRole('button', { name: /select organisation/i }).first().click();
    await page.getByRole('option', { name: /datalab/i }).click();

    // 7. Verify context updated
    await expect(page.getByText(/datalab/i)).toBeVisible();

    // 8. Should see low credit warning (DataLab has low credits)
    await page.goto('/dashboard');
    await expect(page.getByText(/low credit/i)).toBeVisible();
  });
});
