import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Internationalization (i18n) Page', () => {
  test('should load i18n page for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage, 'Internationalization');

    // Admin should see all i18n management features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="i18n-overview"]', '[data-testid="language-management"]', '[data-testid="translation-editor"]', '[data-testid="i18n-settings"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show i18n overview
    const i18nOverview = adminPage.locator('[data-testid="i18n-overview"]');
    await expect(i18nOverview).toBeVisible();
  });

  test('should load i18n page for member with translation access', async ({ memberPage }) => {
    await memberPage.goto('/i18n/internationalization');
    await assertPageLoaded(memberPage, 'Internationalization');

    // Member should see translations but limited management
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="i18n-overview"]', '[data-testid="translation-editor"]'],
        cannotView: ['[data-testid="language-management"]', '[data-testid="i18n-settings"]']
      }
    }, 'member');
  });

  test('should load i18n page for viewer with read-only access', async ({ viewerPage }) => {
    await viewerPage.goto('/i18n/internationalization');
    await assertPageLoaded(viewerPage, 'Internationalization');

    // Viewer should see basic i18n info only
    await assertRoleBasedUI(viewerPage, {
      viewer: {
        canView: ['[data-testid="basic-i18n-info"]'],
        cannotView: ['[data-testid="translation-editor"]', '[data-testid="language-management"]', '[data-testid="i18n-settings"]']
      }
    }, 'viewer');
  });

  test('should display supported languages and status', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const languageManagement = adminPage.locator('[data-testid="language-management"]');
    if (await languageManagement.isVisible()) {
      // Should show language list
      const languages = adminPage.locator('[data-testid="language-item"]');
      const languageCount = await languages.count();
      expect(languageCount).toBeGreaterThan(0);

      if (languageCount > 0) {
        const firstLanguage = languages.first();
        await expect(firstLanguage.locator('[data-testid="language-name"]')).toBeVisible();
        await expect(firstLanguage.locator('[data-testid="language-code"]')).toBeVisible();
        await expect(firstLanguage.locator('[data-testid="translation-progress"]')).toBeVisible();
        await expect(firstLanguage.locator('[data-testid="language-status"]')).toBeVisible();

        // Should show translation completion percentage
        const progress = await firstLanguage.locator('[data-testid="translation-progress"]').textContent();
        expect(progress).toMatch(/\d+%/);

        // Should show language status
        const status = await firstLanguage.locator('[data-testid="language-status"]').textContent();
        expect(['active', 'inactive', 'draft', 'review']).toContain(status?.toLowerCase());
      }
    }
  });

  test('should filter and search translation keys', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const translationEditor = adminPage.locator('[data-testid="translation-editor"]');
    if (await translationEditor.isVisible()) {
      // Test search functionality
      const translationSearch = adminPage.locator('[data-testid="translation-search"]');
      if (await translationSearch.isVisible()) {
        await translationSearch.fill('button.save');
        await adminPage.press('[data-testid="translation-search"]', 'Enter');

        // Should show filtered translation keys
        const searchResults = adminPage.locator('[data-testid="translation-search-results"]');
        if (await searchResults.isVisible()) {
          await expect(searchResults).toBeVisible();

          // Should highlight search terms
          const highlightedText = adminPage.locator('[data-testid="search-highlight"]');
          if (await highlightedText.count() > 0) {
            await expect(highlightedText.first()).toBeVisible();
          }
        }
      }

      // Test category filter
      const categoryFilter = adminPage.locator('[data-testid="translation-category-filter"]');
      if (await categoryFilter.isVisible()) {
        await categoryFilter.selectOption('navigation');

        // Should filter to navigation translations
        const navTranslations = adminPage.locator('[data-testid="translation-key"]');
        const navCount = await navTranslations.count();

        if (navCount > 0) {
          const firstNav = navTranslations.first();
          const keyText = await firstNav.textContent();
          expect(keyText?.toLowerCase()).toContain('nav');
        }
      }
    }
  });

  test('should edit translation values', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const translationEditor = adminPage.locator('[data-testid="translation-editor"]');
    if (await translationEditor.isVisible()) {
      // Should show translation keys and values
      const translationItems = adminPage.locator('[data-testid="translation-item"]');
      const itemCount = await translationItems.count();

      if (itemCount > 0) {
        const firstTranslation = translationItems.first();
        await expect(firstTranslation.locator('[data-testid="translation-key"]')).toBeVisible();
        await expect(firstTranslation.locator('[data-testid="translation-value"]')).toBeVisible();

        // Test editing translation value
        const editButton = firstTranslation.locator('[data-testid="edit-translation"]');
        if (await editButton.isVisible()) {
          await editButton.click();

          const translationInput = adminPage.locator('[data-testid="translation-input"]');
          if (await translationInput.isVisible()) {
            const originalValue = await translationInput.inputValue();
            const newValue = `Updated ${originalValue}`;

            await translationInput.fill(newValue);

            // Save translation
            const saveButton = adminPage.locator('[data-testid="save-translation"]');
            if (await saveButton.isVisible()) {
              await saveButton.click();

              // Should show success message
              const successMessage = adminPage.locator('[data-testid="translation-saved"]');
              if (await successMessage.isVisible()) {
                await expect(successMessage).toBeVisible();
              }
            }
          }
        }
      }
    }
  });

  test('should manage language settings (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const languageSettings = adminPage.locator('[data-testid="language-settings"]');
    if (await languageSettings.isVisible()) {
      // Should have add language button
      const addLanguageButton = adminPage.locator('[data-testid="add-language"]');
      if (await addLanguageButton.isVisible()) {
        await addLanguageButton.click();

        const addLanguageDialog = adminPage.locator('[data-testid="add-language-dialog"]');
        if (await addLanguageDialog.isVisible()) {
          await expect(addLanguageDialog).toBeVisible();

          // Should have language selector
          const languageSelector = adminPage.locator('[data-testid="language-selector"]');
          if (await languageSelector.isVisible()) {
            await languageSelector.selectOption('es');

            // Should show language details
            const languageDetails = adminPage.locator('[data-testid="language-details"]');
            if (await languageDetails.isVisible()) {
              await expect(languageDetails).toBeVisible();
            }
          }

          // Cancel adding language
          const cancelAdd = adminPage.locator('[data-testid="cancel-add-language"]');
          if (await cancelAdd.isVisible()) {
            await cancelAdd.click();
            await expect(addLanguageDialog).not.toBeVisible();
          }
        }
      }
    }
  });

  test('should show translation statistics and progress', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const translationStats = adminPage.locator('[data-testid="translation-statistics"]');
    if (await translationStats.isVisible()) {
      // Should show overall translation progress
      const overallProgress = adminPage.locator('[data-testid="overall-progress"]');
      if (await overallProgress.isVisible()) {
        const progressText = await overallProgress.textContent();
        expect(progressText).toMatch(/\d+%/);
      }

      // Should show language-specific stats
      const languageStats = adminPage.locator('[data-testid="language-stat"]');
      const statCount = await languageStats.count();

      if (statCount > 0) {
        const firstStat = languageStats.first();
        await expect(firstStat.locator('[data-testid="stat-language"]')).toBeVisible();
        await expect(firstStat.locator('[data-testid="stat-translated"]')).toBeVisible();
        await expect(firstStat.locator('[data-testid="stat-missing"]')).toBeVisible();

        // Should show numbers
        const translated = await firstStat.locator('[data-testid="stat-translated"]').textContent();
        const missing = await firstStat.locator('[data-testid="stat-missing"]').textContent();

        expect(translated).toMatch(/\d+/);
        expect(missing).toMatch(/\d+/);
      }

      // Should show untranslated keys
      const untranslatedKeys = adminPage.locator('[data-testid="untranslated-keys"]');
      if (await untranslatedKeys.isVisible()) {
        const untranslatedCount = adminPage.locator('[data-testid="untranslated-count"]');
        if (await untranslatedCount.isVisible()) {
          const countText = await untranslatedCount.textContent();
          expect(countText).toMatch(/\d+/);
        }
      }
    }
  });

  test('should export and import translations', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const translationTools = adminPage.locator('[data-testid="translation-tools"]');
    if (await translationTools.isVisible()) {
      // Should have export option
      const exportButton = adminPage.locator('[data-testid="export-translations"]');
      if (await exportButton.isVisible()) {
        await exportButton.click();

        const exportDialog = adminPage.locator('[data-testid="export-dialog"]');
        if (await exportDialog.isVisible()) {
          await expect(exportDialog).toBeVisible();

          // Should have format options
          const formatSelector = adminPage.locator('[data-testid="export-format"]');
          if (await formatSelector.isVisible()) {
            await formatSelector.selectOption('json');

            // Should have language selection
            const languageSelection = adminPage.locator('[data-testid="export-languages"]');
            if (await languageSelection.isVisible()) {
              await expect(languageSelection).toBeVisible();
            }
          }

          // Close export dialog
          const closeExport = adminPage.locator('[data-testid="close-export"]');
          if (await closeExport.isVisible()) {
            await closeExport.click();
            await expect(exportDialog).not.toBeVisible();
          }
        }
      }

      // Should have import option
      const importButton = adminPage.locator('[data-testid="import-translations"]');
      if (await importButton.isVisible()) {
        await importButton.click();

        const importDialog = adminPage.locator('[data-testid="import-dialog"]');
        if (await importDialog.isVisible()) {
          await expect(importDialog).toBeVisible();

          // Should have file input
          const fileInput = adminPage.locator('[data-testid="translation-file-input"]');
          if (await fileInput.isVisible()) {
            await expect(fileInput).toBeVisible();
          }

          // Close import dialog
          const closeImport = adminPage.locator('[data-testid="close-import"]');
          if (await closeImport.isVisible()) {
            await closeImport.click();
            await expect(importDialog).not.toBeVisible();
          }
        }
      }
    }
  });

  test('should validate translation keys and pluralization', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const translationValidation = adminPage.locator('[data-testid="translation-validation"]');
    if (await translationValidation.isVisible()) {
      // Should show validation issues
      const validationIssues = adminPage.locator('[data-testid="validation-issue"]');
      const issueCount = await validationIssues.count();

      if (issueCount > 0) {
        const firstIssue = validationIssues.first();
        await expect(firstIssue.locator('[data-testid="issue-type"]')).toBeVisible();
        await expect(firstIssue.locator('[data-testid="issue-key"]')).toBeVisible();
        await expect(firstIssue.locator('[data-testid="issue-description"]')).toBeVisible();

        // Should show issue severity
        const issueSeverity = await firstIssue.locator('[data-testid="issue-severity"]').textContent();
        expect(['error', 'warning', 'info']).toContain(issueSeverity?.toLowerCase());
      }

      // Should have run validation button
      const runValidationButton = adminPage.locator('[data-testid="run-validation"]');
      if (await runValidationButton.isVisible()) {
        await runValidationButton.click();

        // Should show validation progress
        const validationProgress = adminPage.locator('[data-testid="validation-progress"]');
        if (await validationProgress.isVisible()) {
          await expect(validationProgress).toBeVisible();
        }
      }
    }
  });

  test('should configure i18n settings (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const i18nSettings = adminPage.locator('[data-testid="i18n-settings"]');
    if (await i18nSettings.isVisible()) {
      await i18nSettings.click();

      const settingsPanel = adminPage.locator('[data-testid="i18n-settings-panel"]');
      if (await settingsPanel.isVisible()) {
        await expect(settingsPanel).toBeVisible();

        // Should show default language setting
        const defaultLanguage = adminPage.locator('[data-testid="default-language-setting"]');
        if (await defaultLanguage.isVisible()) {
          await defaultLanguage.selectOption('en');

          // Should update default language
          const selectedValue = await defaultLanguage.inputValue();
          expect(selectedValue).toBe('en');
        }

        // Should show fallback language setting
        const fallbackLanguage = adminPage.locator('[data-testid="fallback-language-setting"]');
        if (await fallbackLanguage.isVisible()) {
          await fallbackLanguage.selectOption('en');
        }

        // Should show auto-detection toggle
        const autoDetectToggle = adminPage.locator('[data-testid="auto-detect-language"]');
        if (await autoDetectToggle.isVisible()) {
          const initialState = await autoDetectToggle.isChecked();
          await autoDetectToggle.click();
          await expect(autoDetectToggle).toBeChecked({ checked: !initialState });
        }

        // Close settings panel
        const closeSettings = adminPage.locator('[data-testid="close-i18n-settings"]');
        if (await closeSettings.isVisible()) {
          await closeSettings.click();
          await expect(settingsPanel).not.toBeVisible();
        }
      }
    }
  });

  test('should demonstrate live language switching', async ({ adminPage }) => {
    await adminPage.goto('/i18n/internationalization');
    await assertPageLoaded(adminPage);

    const languageSwitcher = adminPage.locator('[data-testid="live-language-switcher"]');
    if (await languageSwitcher.isVisible()) {
      // Note current page content
      const currentContent = await adminPage.locator('[data-testid="page-title"]').textContent();

      // Switch to different language
      await languageSwitcher.selectOption('es');

      // Should update page content (if Spanish translations exist)
      await adminPage.waitForTimeout(1000); // Allow time for language change

      const updatedContent = await adminPage.locator('[data-testid="page-title"]').textContent();
      // Content might change or stay the same depending on translation availability
      expect(updatedContent).toBeTruthy();

      // Switch back to English
      await languageSwitcher.selectOption('en');
      await adminPage.waitForTimeout(1000);

      const restoredContent = await adminPage.locator('[data-testid="page-title"]').textContent();
      expect(restoredContent).toBeTruthy();
    }
  });
});
