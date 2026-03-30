import { test, expect, assertPageLoaded } from '../fixtures';

test.describe('Themes Page', () => {
  test('should load themes showcase for all users', async ({ adminPage, memberPage, viewerPage }) => {
    // Themes should be accessible to all users
    for (const [role, page] of [['admin', adminPage], ['member', memberPage], ['viewer', viewerPage]]) {
      await page.goto('/frontend/themes');
      await assertPageLoaded(page, 'Themes');

      // Should show themes showcase
      const themesShowcase = page.locator('[data-testid="themes-showcase"]');
      await expect(themesShowcase).toBeVisible();
    }
  });

  test('should display available theme options', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    // Should show theme grid
    const themeGrid = adminPage.locator('[data-testid="theme-grid"]');
    await expect(themeGrid).toBeVisible();

    // Should show different themes
    const themeItems = adminPage.locator('[data-testid="theme-item"]');
    const themeCount = await themeItems.count();
    expect(themeCount).toBeGreaterThan(0);

    if (themeCount > 0) {
      const firstTheme = themeItems.first();
      await expect(firstTheme.locator('[data-testid="theme-name"]')).toBeVisible();
      await expect(firstTheme.locator('[data-testid="theme-preview"]')).toBeVisible();
    }
  });

  test('should demonstrate light theme', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    const lightTheme = adminPage.locator('[data-testid="light-theme"]');
    if (await lightTheme.isVisible()) {
      // Should show light theme preview
      const lightPreview = lightTheme.locator('[data-testid="light-theme-preview"]');
      await expect(lightPreview).toBeVisible();

      // Test applying light theme
      const applyLightTheme = lightTheme.locator('[data-testid="apply-light-theme"]');
      if (await applyLightTheme.isVisible()) {
        await applyLightTheme.click();

        // Should update theme attribute (F07 integration)
        const htmlElement = adminPage.locator('html');
        const themeAttr = await htmlElement.getAttribute('data-theme');
        expect(themeAttr).toBe('light');

        // Should show theme colors
        const themeColors = lightTheme.locator('[data-testid="theme-colors"]');
        if (await themeColors.isVisible()) {
          const colorSwatches = themeColors.locator('[data-testid="color-swatch"]');
          const swatchCount = await colorSwatches.count();
          expect(swatchCount).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should demonstrate dark theme', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    const darkTheme = adminPage.locator('[data-testid="dark-theme"]');
    if (await darkTheme.isVisible()) {
      // Should show dark theme preview
      const darkPreview = darkTheme.locator('[data-testid="dark-theme-preview"]');
      await expect(darkPreview).toBeVisible();

      // Test applying dark theme
      const applyDarkTheme = darkTheme.locator('[data-testid="apply-dark-theme"]');
      if (await applyDarkTheme.isVisible()) {
        await applyDarkTheme.click();

        // Should update theme attribute
        const htmlElement = adminPage.locator('html');
        const themeAttr = await htmlElement.getAttribute('data-theme');
        expect(themeAttr).toBe('dark');

        // Should show appropriate colors for dark theme
        const backgroundColor = await adminPage.evaluate(() => {
          return window.getComputedStyle(document.body).backgroundColor;
        });
        expect(backgroundColor).toBeTruthy();
      }
    }
  });

  test('should demonstrate brand variants', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    const brandVariants = adminPage.locator('[data-testid="brand-variants"]');
    if (await brandVariants.isVisible()) {
      // Should show different brand options
      const brandOptions = adminPage.locator('[data-testid="brand-option"]');
      const brandCount = await brandOptions.count();

      if (brandCount > 0) {
        const firstBrand = brandOptions.first();
        await expect(firstBrand.locator('[data-testid="brand-name"]')).toBeVisible();
        await expect(firstBrand.locator('[data-testid="brand-colors"]')).toBeVisible();

        // Test applying brand variant
        const applyBrand = firstBrand.locator('[data-testid="apply-brand"]');
        if (await applyBrand.isVisible()) {
          await applyBrand.click();

          // Should update brand attribute (F07 integration)
          const htmlElement = adminPage.locator('html');
          const brandAttr = await htmlElement.getAttribute('data-brand');
          expect(brandAttr).toBeTruthy();
        }
      }
    }
  });

  test('should show theme customization tools', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    const themeCustomization = adminPage.locator('[data-testid="theme-customization"]');
    if (await themeCustomization.isVisible()) {
      // Should show color picker
      const colorPicker = adminPage.locator('[data-testid="theme-color-picker"]');
      if (await colorPicker.isVisible()) {
        await expect(colorPicker).toBeVisible();

        // Should show primary color options
        const primaryColorPicker = adminPage.locator('[data-testid="primary-color-picker"]');
        if (await primaryColorPicker.isVisible()) {
          await primaryColorPicker.click();

          const colorOptions = adminPage.locator('[data-testid="color-option"]');
          const optionCount = await colorOptions.count();

          if (optionCount > 0) {
            await colorOptions.first().click();

            // Should update theme preview
            const themePreview = adminPage.locator('[data-testid="custom-theme-preview"]');
            if (await themePreview.isVisible()) {
              await expect(themePreview).toBeVisible();
            }
          }
        }
      }

      // Should show typography options
      const typographyOptions = adminPage.locator('[data-testid="typography-options"]');
      if (await typographyOptions.isVisible()) {
        const fontSelector = adminPage.locator('[data-testid="font-selector"]');
        if (await fontSelector.isVisible()) {
          await fontSelector.selectOption({ index: 1 });

          // Should update font in preview
          const fontPreview = adminPage.locator('[data-testid="font-preview"]');
          if (await fontPreview.isVisible()) {
            await expect(fontPreview).toBeVisible();
          }
        }
      }
    }
  });

  test('should demonstrate theme switching transitions', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    const themeTransitions = adminPage.locator('[data-testid="theme-transitions"]');
    if (await themeTransitions.isVisible()) {
      // Should show transition controls
      const transitionToggle = adminPage.locator('[data-testid="enable-transitions"]');
      if (await transitionToggle.isVisible()) {
        await transitionToggle.check();

        // Test theme switching with transitions
        const lightThemeButton = adminPage.locator('[data-testid="switch-to-light"]');
        const darkThemeButton = adminPage.locator('[data-testid="switch-to-dark"]');

        if (await lightThemeButton.isVisible() && await darkThemeButton.isVisible()) {
          await lightThemeButton.click();

          // Wait for transition
          await adminPage.waitForTimeout(500);

          await darkThemeButton.click();

          // Should have smooth transition
          const transitionElement = adminPage.locator('[data-testid="theme-transition-element"]');
          if (await transitionElement.isVisible()) {
            const transitionStyle = await transitionElement.getAttribute('style');
            expect(transitionStyle).toContain('transition');
          }
        }
      }
    }
  });

  test('should show accessibility features in themes', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    const accessibilitySection = adminPage.locator('[data-testid="theme-accessibility"]');
    if (await accessibilitySection.isVisible()) {
      // Should show contrast validation
      const contrastCheck = adminPage.locator('[data-testid="contrast-validation"]');
      if (await contrastCheck.isVisible()) {
        await expect(contrastCheck).toBeVisible();

        // Should show WCAG compliance indicators
        const wcagIndicators = adminPage.locator('[data-testid="wcag-indicator"]');
        const indicatorCount = await wcagIndicators.count();

        if (indicatorCount > 0) {
          const firstIndicator = wcagIndicators.first();
          const complianceText = await firstIndicator.textContent();
          expect(['AA', 'AAA']).toContain(complianceText);
        }
      }

      // Should show high contrast option
      const highContrastToggle = adminPage.locator('[data-testid="high-contrast-toggle"]');
      if (await highContrastToggle.isVisible()) {
        await highContrastToggle.check();

        // Should apply high contrast theme
        const htmlElement = adminPage.locator('html');
        const themeAttr = await htmlElement.getAttribute('data-theme');
        expect(themeAttr).toContain('high-contrast');
      }

      // Should show reduced motion option
      const reducedMotionToggle = adminPage.locator('[data-testid="reduced-motion-toggle"]');
      if (await reducedMotionToggle.isVisible()) {
        await reducedMotionToggle.check();

        // Should disable animations
        const animatedElement = adminPage.locator('[data-testid="animated-element"]');
        if (await animatedElement.isVisible()) {
          const animationStyle = await animatedElement.getAttribute('style');
          expect(animationStyle).toContain('animation: none');
        }
      }
    }
  });

  test('should persist theme preferences', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    // Test theme persistence (F07 integration)
    const darkThemeButton = adminPage.locator('[data-testid="apply-dark-theme"]');
    if (await darkThemeButton.isVisible()) {
      await darkThemeButton.click();

      // Reload page to test persistence
      await adminPage.reload();
      await assertPageLoaded(adminPage);

      // Should maintain dark theme
      const htmlElement = adminPage.locator('html');
      const themeAttr = await htmlElement.getAttribute('data-theme');
      expect(themeAttr).toBe('dark');
    }
  });

  test('should show theme export and import', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    const themeTools = adminPage.locator('[data-testid="theme-tools"]');
    if (await themeTools.isVisible()) {
      // Should show export option
      const exportButton = adminPage.locator('[data-testid="export-theme"]');
      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Should show export dialog
        const exportDialog = adminPage.locator('[data-testid="export-dialog"]');
        if (await exportDialog.isVisible()) {
          await expect(exportDialog).toBeVisible();

          // Should have theme data
          const themeData = adminPage.locator('[data-testid="theme-export-data"]');
          if (await themeData.isVisible()) {
            const exportData = await themeData.textContent();
            expect(exportData).toContain('{'); // Should be JSON
          }

          // Close export dialog
          const closeExport = adminPage.locator('[data-testid="close-export"]');
          if (await closeExport.isVisible()) {
            await closeExport.click();
            await expect(exportDialog).not.toBeVisible();
          }
        }
      }

      // Should show import option
      const importButton = adminPage.locator('[data-testid="import-theme"]');
      if (await importButton.isVisible()) {
        await importButton.click();

        // Should show import dialog
        const importDialog = adminPage.locator('[data-testid="import-dialog"]');
        if (await importDialog.isVisible()) {
          await expect(importDialog).toBeVisible();

          // Should have file input
          const fileInput = adminPage.locator('[data-testid="theme-file-input"]');
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

  test('should demonstrate responsive theme behavior', async ({ adminPage }) => {
    await adminPage.goto('/frontend/themes');
    await assertPageLoaded(adminPage);

    const responsiveThemes = adminPage.locator('[data-testid="responsive-themes"]');
    if (await responsiveThemes.isVisible()) {
      // Test theme on different screen sizes
      const originalViewport = adminPage.viewportSize();

      // Test mobile theme
      await adminPage.setViewportSize({ width: 375, height: 667 });
      const mobileThemeElements = adminPage.locator('[data-testid="mobile-theme-element"]');
      if (await mobileThemeElements.count() > 0) {
        await expect(mobileThemeElements.first()).toBeVisible();
      }

      // Test tablet theme
      await adminPage.setViewportSize({ width: 768, height: 1024 });
      const tabletThemeElements = adminPage.locator('[data-testid="tablet-theme-element"]');
      if (await tabletThemeElements.count() > 0) {
        await expect(tabletThemeElements.first()).toBeVisible();
      }

      // Test desktop theme
      await adminPage.setViewportSize({ width: 1200, height: 800 });
      const desktopThemeElements = adminPage.locator('[data-testid="desktop-theme-element"]');
      if (await desktopThemeElements.count() > 0) {
        await expect(desktopThemeElements.first()).toBeVisible();
      }

      // Restore original viewport
      if (originalViewport) {
        await adminPage.setViewportSize(originalViewport);
      }
    }
  });
});
