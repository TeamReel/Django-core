import { test, expect } from '@playwright/test';

/**
 * E2E Test: Authentication Flow
 *
 * Covers P1 Story 1 acceptance scenarios:
 * - AS-1.1: Redirect to login when not authenticated
 * - AS-1.2: Valid login redirects to dashboard
 * - AS-1.3: Dashboard shows username
 * - AS-1.4: Invalid credentials show error
 * - AS-1.5: Logout returns to login page
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
  });

  test('AS-1.1: Redirects to login when not authenticated', async ({ page }) => {
    // Try to access dashboard
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Should show login form
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();
  });

  test('AS-1.2: Valid login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials (alice@example.com / demo1234)
    await page.getByLabel(/email/i).fill('alice@example.com');
    await page.getByLabel(/password/i).fill('demo1234');

    // Submit form
    await page.getByRole('button', { name: /log in/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('AS-1.3: Dashboard shows username after login', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('alice@example.com');
    await page.getByLabel(/password/i).fill('demo1234');
    await page.getByRole('button', { name: /log in/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Should show welcome message with email
    await expect(page.getByText(/welcome.*alice/i)).toBeVisible();

    // Should show user email in header
    await expect(page.getByText('alice@example.com')).toBeVisible();
  });

  test('AS-1.4: Invalid credentials show error', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /log in/i }).click();

    // Should show error message
    await expect(page.getByText(/invalid.*credentials|login failed|unable to log in/i)).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('AS-1.5: Logout returns to login page', async ({ page }) => {
    // Log in first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('alice@example.com');
    await page.getByLabel(/password/i).fill('demo1234');
    await page.getByRole('button', { name: /log in/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Click logout button
    await page.getByRole('button', { name: /log out/i }).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });

    // Should show login form again
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();

    // Should not be able to access dashboard anymore
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('Complete auth journey: login → navigate → logout', async ({ page }) => {
    // 1. Start at login page
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();

    // 2. Log in
    await page.getByLabel(/email/i).fill('alice@example.com');
    await page.getByLabel(/password/i).fill('demo1234');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // 3. Navigate to organisations
    await page.getByRole('link', { name: /organisations/i }).first().click();
    await expect(page).toHaveURL(/\/organisations/);

    // 4. Navigate to settings
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/settings/);

    // 5. Logout
    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
