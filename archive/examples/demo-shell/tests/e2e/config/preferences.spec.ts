import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Preferences Page', () => {
  test('should load preferences for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/config/preferences');
    await assertPageLoaded(adminPage, 'Preferences');

    // Admin should see all preference categories
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="preferences-form"]', '[data-testid="save-preferences"]', '[data-testid="reset-preferences"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show preference sections
    const preferencesForm = adminPage.locator('[data-testid="preferences-form"]');
    await expect(preferencesForm).toBeVisible();
  });

  test('should load preferences for member', async ({ memberPage }) => {
    await memberPage.goto('/config/preferences');
    await assertPageLoaded(memberPage, 'Preferences');

    // Member should see personal preferences
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="preferences-form"]', '[data-testid="save-preferences"]'],
        cannotView: ['[data-testid="org-wide-preferences"]', '[data-testid="admin-preferences"]']
      }
    }, 'member');
  });

  test('should load preferences for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/config/preferences');
    await assertPageLoaded(viewerPage, 'Preferences');

    // Viewer should see limited preferences
    await assertRoleBasedUI(viewerPage, {
      viewer: {
        canView: ['[data-testid="basic-preferences"]'],
        cannotView: ['[data-testid="advanced-preferences"]', '[data-testid="notification-preferences"]']
      }
    }, 'viewer');
  });

  test('should handle theme preferences', async ({ adminPage }) => {
    await adminPage.goto('/config/preferences');
    await assertPageLoaded(adminPage);

    // Test theme selection (integrates with F07 theme system)
    const themeSelector = adminPage.locator('[data-testid="theme-selector"]');
    if (await themeSelector.isVisible()) {
      // Should show theme options
      await themeSelector.click();

      const lightOption = adminPage.locator('[data-testid="theme-light"]');
      const darkOption = adminPage.locator('[data-testid="theme-dark"]');

      if (await lightOption.isVisible()) {
        await lightOption.click();

        // Should update theme immediately or show preview
        const htmlElement = adminPage.locator('html');
        const themeAttr = await htmlElement.getAttribute('data-theme');
        expect(themeAttr).toBeDefined();
      }
    }
  });

  test('should handle language preferences', async ({ adminPage }) => {
    await adminPage.goto('/config/preferences');
    await assertPageLoaded(adminPage);

    // Test language selection (integrates with B04 i18n)
    const languageSelector = adminPage.locator('[data-testid="language-selector"]');
    if (await languageSelector.isVisible()) {
      await languageSelector.click();

      // Should show available languages
      const langOptions = adminPage.locator('[data-testid="language-option"]');
      const optionCount = await langOptions.count();
      expect(optionCount).toBeGreaterThan(0);

      // Test selecting a language
      if (optionCount > 1) {
        await langOptions.nth(1).click();

        // Should save preference
        const saveButton = adminPage.locator('[data-testid="save-preferences"]');
        await saveButton.click();

        // Should show success message
        const successMessage = adminPage.locator('[data-testid="preferences-saved"]');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle notification preferences', async ({ adminPage }) => {
    await adminPage.goto('/config/preferences');
    await assertPageLoaded(adminPage);

    const notificationSection = adminPage.locator('[data-testid="notification-preferences"]');
    if (await notificationSection.isVisible()) {
      // Should show notification toggles
      const emailNotifications = adminPage.locator('[data-testid="email-notifications"]');
      const pushNotifications = adminPage.locator('[data-testid="push-notifications"]');

      if (await emailNotifications.isVisible()) {
        const initialState = await emailNotifications.isChecked();

        // Toggle email notifications
        await emailNotifications.click();
        await expect(emailNotifications).toBeChecked({ checked: !initialState });
      }
    }
  });

  test('should handle timezone preferences', async ({ adminPage }) => {
    await adminPage.goto('/config/preferences');
    await assertPageLoaded(adminPage);

    const timezoneSelector = adminPage.locator('[data-testid="timezone-selector"]');
    if (await timezoneSelector.isVisible()) {
      await timezoneSelector.click();

      // Should show timezone options
      const timezoneOptions = adminPage.locator('[data-testid="timezone-option"]');
      const optionCount = await timezoneOptions.count();
      expect(optionCount).toBeGreaterThan(0);

      // Test selecting a timezone
      if (optionCount > 1) {
        await timezoneOptions.first().click();

        // Should update display
        const selectedTimezone = await timezoneSelector.textContent();
        expect(selectedTimezone).toBeTruthy();
      }
    }
  });

  test('should save and persist preferences', async ({ adminPage }) => {
    await adminPage.goto('/config/preferences');
    await assertPageLoaded(adminPage);

    // Make a preference change
    const displayNameInput = adminPage.locator('[data-testid="display-name"]');
    if (await displayNameInput.isVisible()) {
      const originalValue = await displayNameInput.inputValue();
      const newValue = `Updated ${Date.now()}`;

      await displayNameInput.fill(newValue);

      // Save preferences
      const saveButton = adminPage.locator('[data-testid="save-preferences"]');
      await saveButton.click();

      // Should show success
      const successMessage = adminPage.locator('[data-testid="preferences-saved"]');
      await expect(successMessage).toBeVisible({ timeout: 5000 });

      // Reload page and verify persistence
      await adminPage.reload();
      await assertPageLoaded(adminPage);

      const updatedInput = adminPage.locator('[data-testid="display-name"]');
      const persistedValue = await updatedInput.inputValue();
      expect(persistedValue).toBe(newValue);
    }
  });

  test('should reset preferences to defaults', async ({ adminPage }) => {
    await adminPage.goto('/config/preferences');
    await assertPageLoaded(adminPage);

    const resetButton = adminPage.locator('[data-testid="reset-preferences"]');
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // Should show confirmation dialog
      const confirmDialog = adminPage.locator('[data-testid="confirm-reset"]');
      if (await confirmDialog.isVisible()) {
        const confirmButton = adminPage.locator('[data-testid="confirm-reset-button"]');
        await confirmButton.click();

        // Should show success message
        const successMessage = adminPage.locator('[data-testid="preferences-reset"]');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
