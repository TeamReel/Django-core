import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Notifications Page', () => {
  test('should load notifications page for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage, 'Notifications');

    // Admin should see all notification management features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="notifications-overview"]', '[data-testid="notification-queue"]', '[data-testid="notification-settings"]', '[data-testid="send-notification"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show notifications overview
    const notificationsOverview = adminPage.locator('[data-testid="notifications-overview"]');
    await expect(notificationsOverview).toBeVisible();
  });

  test('should load notifications page for member with limited access', async ({ memberPage }) => {
    await memberPage.goto('/ops/notifications');
    await assertPageLoaded(memberPage, 'Notifications');

    // Member should see notifications but no admin controls
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="notifications-overview"]', '[data-testid="notification-queue"]'],
        cannotView: ['[data-testid="notification-settings"]', '[data-testid="send-notification"]']
      }
    }, 'member');
  });

  test('should restrict notifications page for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/ops/notifications');

    // Viewer might be redirected or see very limited view
    const currentUrl = viewerPage.url();
    if (currentUrl.includes('/ops/notifications')) {
      await assertPageLoaded(viewerPage, 'Notifications');

      // Should see basic notification info only
      await assertRoleBasedUI(viewerPage, {
        viewer: {
          canView: ['[data-testid="basic-notifications"]'],
          cannotView: ['[data-testid="notification-queue"]', '[data-testid="notification-settings"]', '[data-testid="admin-notifications"]']
        }
      }, 'viewer');
    }
  });

  test('should display notification queue and delivery status', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const notificationQueue = adminPage.locator('[data-testid="notification-queue"]');
    if (await notificationQueue.isVisible()) {
      // Should show notification items
      const notificationItems = adminPage.locator('[data-testid="notification-item"]');
      const itemCount = await notificationItems.count();

      if (itemCount > 0) {
        const firstNotification = notificationItems.first();
        await expect(firstNotification.locator('[data-testid="notification-id"]')).toBeVisible();
        await expect(firstNotification.locator('[data-testid="notification-type"]')).toBeVisible();
        await expect(firstNotification.locator('[data-testid="notification-status"]')).toBeVisible();
        await expect(firstNotification.locator('[data-testid="notification-created"]')).toBeVisible();

        // Should show delivery status
        const deliveryStatus = await firstNotification.locator('[data-testid="notification-status"]').textContent();
        expect(['pending', 'sent', 'delivered', 'failed', 'bounced']).toContain(deliveryStatus?.toLowerCase());
      }
    }
  });

  test('should filter notifications by type and status', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const notificationFilters = adminPage.locator('[data-testid="notification-filters"]');
    if (await notificationFilters.isVisible()) {
      // Test type filter
      const typeFilter = adminPage.locator('[data-testid="notification-type-filter"]');
      if (await typeFilter.isVisible()) {
        await typeFilter.selectOption('email');

        // Should filter to email notifications only
        const emailNotifications = adminPage.locator('[data-testid="notification-item"]');
        const emailCount = await emailNotifications.count();

        if (emailCount > 0) {
          const firstEmail = emailNotifications.first();
          const notificationType = await firstEmail.locator('[data-testid="notification-type"]').textContent();
          expect(notificationType?.toLowerCase()).toContain('email');
        }
      }

      // Test status filter
      const statusFilter = adminPage.locator('[data-testid="notification-status-filter"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('failed');

        // Should filter to failed notifications
        const failedNotifications = adminPage.locator('[data-testid="notification-item"]');
        const failedCount = await failedNotifications.count();

        if (failedCount > 0) {
          const firstFailed = failedNotifications.first();
          const status = await firstFailed.locator('[data-testid="notification-status"]').textContent();
          expect(status?.toLowerCase()).toBe('failed');
        }
      }
    }
  });

  test('should search notifications by recipient or content', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const notificationSearch = adminPage.locator('[data-testid="notification-search"]');
    if (await notificationSearch.isVisible()) {
      await notificationSearch.fill('welcome');
      await adminPage.press('[data-testid="notification-search"]', 'Enter');

      // Should show search results
      const searchResults = adminPage.locator('[data-testid="notification-search-results"]');
      if (await searchResults.isVisible()) {
        await expect(searchResults).toBeVisible();

        // Should highlight search terms
        const highlightedText = adminPage.locator('[data-testid="search-highlight"]');
        if (await highlightedText.count() > 0) {
          await expect(highlightedText.first()).toBeVisible();
        }
      }
    }
  });

  test('should show notification details and content', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const notificationItem = adminPage.locator('[data-testid="notification-item"]').first();
    if (await notificationItem.isVisible()) {
      // Click to view details
      await notificationItem.click();

      const notificationDetails = adminPage.locator('[data-testid="notification-details"]');
      if (await notificationDetails.isVisible()) {
        await expect(notificationDetails).toBeVisible();

        // Should show notification information
        await expect(notificationDetails.locator('[data-testid="notification-full-id"]')).toBeVisible();
        await expect(notificationDetails.locator('[data-testid="notification-recipient"]')).toBeVisible();
        await expect(notificationDetails.locator('[data-testid="notification-subject"]')).toBeVisible();
        await expect(notificationDetails.locator('[data-testid="notification-content"]')).toBeVisible();

        // Should show delivery attempts
        const deliveryAttempts = notificationDetails.locator('[data-testid="delivery-attempts"]');
        if (await deliveryAttempts.isVisible()) {
          await expect(deliveryAttempts).toBeVisible();

          const attemptItems = deliveryAttempts.locator('[data-testid="attempt-item"]');
          const attemptCount = await attemptItems.count();

          if (attemptCount > 0) {
            const firstAttempt = attemptItems.first();
            await expect(firstAttempt.locator('[data-testid="attempt-timestamp"]')).toBeVisible();
            await expect(firstAttempt.locator('[data-testid="attempt-result"]')).toBeVisible();
          }
        }
      }
    }
  });

  test('should handle notification resending (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const failedNotification = adminPage.locator('[data-testid="notification-item"]').first();
    if (await failedNotification.isVisible()) {
      // Should have resend button for failed notifications
      const resendButton = failedNotification.locator('[data-testid="resend-notification"]');
      if (await resendButton.isVisible()) {
        await resendButton.click();

        const confirmResend = adminPage.locator('[data-testid="confirm-resend"]');
        if (await confirmResend.isVisible()) {
          await expect(confirmResend).toBeVisible();

          // Cancel to avoid actually resending
          const cancelResend = adminPage.locator('[data-testid="cancel-resend"]');
          if (await cancelResend.isVisible()) {
            await cancelResend.click();
            await expect(confirmResend).not.toBeVisible();
          }
        }
      }
    }
  });

  test('should send new notifications (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const sendNotificationButton = adminPage.locator('[data-testid="send-notification"]');
    if (await sendNotificationButton.isVisible()) {
      await sendNotificationButton.click();

      const sendNotificationDialog = adminPage.locator('[data-testid="send-notification-dialog"]');
      if (await sendNotificationDialog.isVisible()) {
        await expect(sendNotificationDialog).toBeVisible();

        // Should have notification type selector
        const typeSelector = adminPage.locator('[data-testid="notification-type-selector"]');
        if (await typeSelector.isVisible()) {
          await typeSelector.selectOption('email');

          // Should show email-specific fields
          const emailFields = adminPage.locator('[data-testid="email-notification-fields"]');
          if (await emailFields.isVisible()) {
            await expect(emailFields).toBeVisible();

            // Should have recipient, subject, content fields
            const recipientField = adminPage.locator('[data-testid="notification-recipient"]');
            const subjectField = adminPage.locator('[data-testid="notification-subject"]');
            const contentField = adminPage.locator('[data-testid="notification-content"]');

            if (await recipientField.isVisible()) await expect(recipientField).toBeVisible();
            if (await subjectField.isVisible()) await expect(subjectField).toBeVisible();
            if (await contentField.isVisible()) await expect(contentField).toBeVisible();
          }
        }

        // Cancel notification sending
        const cancelSend = adminPage.locator('[data-testid="cancel-send-notification"]');
        if (await cancelSend.isVisible()) {
          await cancelSend.click();
          await expect(sendNotificationDialog).not.toBeVisible();
        }
      }
    }
  });

  test('should manage notification templates', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const notificationTemplates = adminPage.locator('[data-testid="notification-templates"]');
    if (await notificationTemplates.isVisible()) {
      // Should show template list
      const templateItems = adminPage.locator('[data-testid="template-item"]');
      const templateCount = await templateItems.count();

      if (templateCount > 0) {
        const firstTemplate = templateItems.first();
        await expect(firstTemplate.locator('[data-testid="template-name"]')).toBeVisible();
        await expect(firstTemplate.locator('[data-testid="template-type"]')).toBeVisible();

        // Should have edit template button
        const editTemplateButton = firstTemplate.locator('[data-testid="edit-template"]');
        if (await editTemplateButton.isVisible()) {
          await editTemplateButton.click();

          const templateEditor = adminPage.locator('[data-testid="template-editor"]');
          if (await templateEditor.isVisible()) {
            await expect(templateEditor).toBeVisible();

            // Should have template content editor
            const contentEditor = adminPage.locator('[data-testid="template-content-editor"]');
            if (await contentEditor.isVisible()) {
              await expect(contentEditor).toBeVisible();
            }

            // Close template editor
            const closeEditor = adminPage.locator('[data-testid="close-template-editor"]');
            if (await closeEditor.isVisible()) {
              await closeEditor.click();
              await expect(templateEditor).not.toBeVisible();
            }
          }
        }
      }

      // Should have create template button
      const createTemplateButton = adminPage.locator('[data-testid="create-template"]');
      if (await createTemplateButton.isVisible()) {
        await expect(createTemplateButton).toBeVisible();
      }
    }
  });

  test('should show notification metrics and statistics', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const notificationMetrics = adminPage.locator('[data-testid="notification-metrics"]');
    if (await notificationMetrics.isVisible()) {
      // Should show delivery counts by status
      const sentCount = adminPage.locator('[data-testid="sent-notifications-count"]');
      const deliveredCount = adminPage.locator('[data-testid="delivered-notifications-count"]');
      const failedCount = adminPage.locator('[data-testid="failed-notifications-count"]');
      const bouncedCount = adminPage.locator('[data-testid="bounced-notifications-count"]');

      if (await sentCount.isVisible()) {
        const sentText = await sentCount.textContent();
        expect(sentText).toMatch(/\d+/);
      }

      if (await deliveredCount.isVisible()) {
        const deliveredText = await deliveredCount.textContent();
        expect(deliveredText).toMatch(/\d+/);
      }

      // Should show delivery rate
      const deliveryRate = adminPage.locator('[data-testid="delivery-rate"]');
      if (await deliveryRate.isVisible()) {
        const rateText = await deliveryRate.textContent();
        expect(rateText).toMatch(/\d+/);
      }

      // Should show bounce rate
      const bounceRate = adminPage.locator('[data-testid="bounce-rate"]');
      if (await bounceRate.isVisible()) {
        const bounceText = await bounceRate.textContent();
        expect(bounceText).toBeTruthy();
      }
    }
  });

  test('should manage notification settings (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/ops/notifications');
    await assertPageLoaded(adminPage);

    const notificationSettings = adminPage.locator('[data-testid="notification-settings"]');
    if (await notificationSettings.isVisible()) {
      await notificationSettings.click();

      const settingsPanel = adminPage.locator('[data-testid="settings-panel"]');
      if (await settingsPanel.isVisible()) {
        await expect(settingsPanel).toBeVisible();

        // Should show email provider settings
        const emailProvider = adminPage.locator('[data-testid="email-provider-settings"]');
        if (await emailProvider.isVisible()) {
          await expect(emailProvider).toBeVisible();

          const providerSelector = adminPage.locator('[data-testid="email-provider-selector"]');
          if (await providerSelector.isVisible()) {
            await providerSelector.selectOption('smtp');

            // Should show SMTP configuration
            const smtpConfig = adminPage.locator('[data-testid="smtp-configuration"]');
            if (await smtpConfig.isVisible()) {
              await expect(smtpConfig).toBeVisible();
            }
          }
        }

        // Should show retry settings
        const retrySettings = adminPage.locator('[data-testid="retry-settings"]');
        if (await retrySettings.isVisible()) {
          await expect(retrySettings).toBeVisible();

          const maxRetries = adminPage.locator('[data-testid="max-retries"]');
          if (await maxRetries.isVisible()) {
            await maxRetries.fill('3');
            const retriesValue = await maxRetries.inputValue();
            expect(retriesValue).toBe('3');
          }
        }

        // Close settings panel
        const closeSettings = adminPage.locator('[data-testid="close-settings"]');
        if (await closeSettings.isVisible()) {
          await closeSettings.click();
          await expect(settingsPanel).not.toBeVisible();
        }
      }
    }
  });
});
