import { test, expect, assertPageLoaded } from '../fixtures';

test.describe('Profile Page', () => {
  test('should show user profile for admin', async ({ adminPage }) => {
    await adminPage.goto('/identity/profile');
    await assertPageLoaded(adminPage, 'Profile');

    // Should show user details
    await expect(adminPage.locator('[data-testid="user-email"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="user-role"]')).toBeVisible();

    // Should show admin email
    const emailElement = adminPage.locator('[data-testid="user-email"]');
    const emailText = await emailElement.textContent();
    expect(emailText).toContain('admin@demo.local');

    // Should show admin role
    const roleElement = adminPage.locator('[data-testid="user-role"]');
    const roleText = await roleElement.textContent();
    expect(roleText).toContain('admin');
  });

  test('should show user profile for member', async ({ memberPage }) => {
    await memberPage.goto('/identity/profile');
    await assertPageLoaded(memberPage, 'Profile');

    // Should show member email
    const emailElement = memberPage.locator('[data-testid="user-email"]');
    const emailText = await emailElement.textContent();
    expect(emailText).toContain('member@demo.local');

    // Should show member role
    const roleElement = memberPage.locator('[data-testid="user-role"]');
    const roleText = await roleElement.textContent();
    expect(roleText).toContain('member');
  });

  test('should show user profile for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/identity/profile');
    await assertPageLoaded(viewerPage, 'Profile');

    // Should show viewer email
    const emailElement = viewerPage.locator('[data-testid="user-email"]');
    const emailText = await emailElement.textContent();
    expect(emailText).toContain('viewer@demo.local');

    // Should show viewer role
    const roleElement = viewerPage.locator('[data-testid="user-role"]');
    const roleText = await roleElement.textContent();
    expect(roleText).toContain('viewer');
  });

  test('should show last login information', async ({ adminPage }) => {
    await adminPage.goto('/identity/profile');
    await assertPageLoaded(adminPage);

    // Should show last login timestamp
    const lastLogin = adminPage.locator('[data-testid="last-login"]');
    if (await lastLogin.isVisible()) {
      const loginText = await lastLogin.textContent();
      expect(loginText).toBeTruthy();
    }
  });

  test('should show organization memberships', async ({ adminPage }) => {
    await adminPage.goto('/identity/profile');
    await assertPageLoaded(adminPage);

    // Should show organizations the user belongs to
    const orgMemberships = adminPage.locator('[data-testid="org-memberships"]');
    if (await orgMemberships.isVisible()) {
      const memberships = adminPage.locator('[data-testid="org-membership-item"]');
      const count = await memberships.count();
      expect(count).toBeGreaterThan(0);
    }
  });
});
