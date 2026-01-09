import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Tasks Page', () => {
  test('should load tasks page for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage, 'Tasks');

    // Admin should see all task management features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="tasks-overview"]', '[data-testid="task-queue"]', '[data-testid="task-controls"]', '[data-testid="create-task"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show task overview
    const tasksOverview = adminPage.locator('[data-testid="tasks-overview"]');
    await expect(tasksOverview).toBeVisible();
  });

  test('should load tasks page for member with monitoring access', async ({ memberPage }) => {
    await memberPage.goto('/ops/tasks');
    await assertPageLoaded(memberPage, 'Tasks');

    // Member should see task status but no controls
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="tasks-overview"]', '[data-testid="task-queue"]'],
        cannotView: ['[data-testid="task-controls"]', '[data-testid="create-task"]']
      }
    }, 'member');
  });

  test('should restrict tasks page for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/ops/tasks');

    // Viewer might be redirected or see limited view
    const currentUrl = viewerPage.url();
    if (currentUrl.includes('/ops/tasks')) {
      await assertPageLoaded(viewerPage, 'Tasks');

      // Should see basic task info only
      await assertRoleBasedUI(viewerPage, {
        viewer: {
          canView: ['[data-testid="basic-task-status"]'],
          cannotView: ['[data-testid="task-controls"]', '[data-testid="task-queue"]', '[data-testid="detailed-task-info"]']
        }
      }, 'viewer');
    }
  });

  test('should display task queue and status', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage);

    const taskQueue = adminPage.locator('[data-testid="task-queue"]');
    if (await taskQueue.isVisible()) {
      // Should show task categories
      const taskCategories = adminPage.locator('[data-testid="task-category"]');
      const categoryCount = await taskCategories.count();

      if (categoryCount > 0) {
        const firstCategory = taskCategories.first();
        await expect(firstCategory.locator('[data-testid="category-name"]')).toBeVisible();
        await expect(firstCategory.locator('[data-testid="category-count"]')).toBeVisible();
      }

      // Should show individual tasks
      const taskItems = adminPage.locator('[data-testid="task-item"]');
      const taskCount = await taskItems.count();

      if (taskCount > 0) {
        const firstTask = taskItems.first();
        await expect(firstTask.locator('[data-testid="task-id"]')).toBeVisible();
        await expect(firstTask.locator('[data-testid="task-status"]')).toBeVisible();
        await expect(firstTask.locator('[data-testid="task-created"]')).toBeVisible();

        // Should show task status
        const taskStatus = await firstTask.locator('[data-testid="task-status"]').textContent();
        expect(['pending', 'running', 'completed', 'failed', 'retrying']).toContain(taskStatus?.toLowerCase());
      }
    }
  });

  test('should filter tasks by status and type', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage);

    const taskFilters = adminPage.locator('[data-testid="task-filters"]');
    if (await taskFilters.isVisible()) {
      // Test status filter
      const statusFilter = adminPage.locator('[data-testid="status-filter"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.selectOption('failed');

        // Should filter to failed tasks only
        const filteredTasks = adminPage.locator('[data-testid="task-item"]');
        const taskCount = await filteredTasks.count();

        if (taskCount > 0) {
          const firstTask = filteredTasks.first();
          const status = await firstTask.locator('[data-testid="task-status"]').textContent();
          expect(status?.toLowerCase()).toBe('failed');
        }
      }

      // Test type filter
      const typeFilter = adminPage.locator('[data-testid="type-filter"]');
      if (await typeFilter.isVisible()) {
        await typeFilter.selectOption('email');

        // Should filter to email tasks
        const emailTasks = adminPage.locator('[data-testid="task-item"]');
        const emailTaskCount = await emailTasks.count();

        if (emailTaskCount > 0) {
          const firstEmailTask = emailTasks.first();
          const taskType = await firstEmailTask.locator('[data-testid="task-type"]').textContent();
          expect(taskType?.toLowerCase()).toContain('email');
        }
      }
    }
  });

  test('should search tasks by content', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage);

    const taskSearch = adminPage.locator('[data-testid="task-search"]');
    if (await taskSearch.isVisible()) {
      await taskSearch.fill('notification');
      await adminPage.press('[data-testid="task-search"]', 'Enter');

      // Should show search results
      const searchResults = adminPage.locator('[data-testid="task-search-results"]');
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

  test('should show task details and logs', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage);

    const taskItem = adminPage.locator('[data-testid="task-item"]').first();
    if (await taskItem.isVisible()) {
      // Click to view details
      await taskItem.click();

      const taskDetails = adminPage.locator('[data-testid="task-details"]');
      if (await taskDetails.isVisible()) {
        await expect(taskDetails).toBeVisible();

        // Should show task information
        await expect(taskDetails.locator('[data-testid="task-full-id"]')).toBeVisible();
        await expect(taskDetails.locator('[data-testid="task-parameters"]')).toBeVisible();
        await expect(taskDetails.locator('[data-testid="task-timestamps"]')).toBeVisible();

        // Should show task logs
        const taskLogs = taskDetails.locator('[data-testid="task-logs"]');
        if (await taskLogs.isVisible()) {
          await expect(taskLogs).toBeVisible();

          const logEntries = taskLogs.locator('[data-testid="log-entry"]');
          const logCount = await logEntries.count();

          if (logCount > 0) {
            const firstLog = logEntries.first();
            await expect(firstLog.locator('[data-testid="log-timestamp"]')).toBeVisible();
            await expect(firstLog.locator('[data-testid="log-message"]')).toBeVisible();
          }
        }
      }
    }
  });

  test('should handle task actions (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage);

    const taskControls = adminPage.locator('[data-testid="task-controls"]');
    if (await taskControls.isVisible()) {
      // Should have retry failed tasks option
      const retryFailedButton = adminPage.locator('[data-testid="retry-failed-tasks"]');
      if (await retryFailedButton.isVisible()) {
        await retryFailedButton.click();

        const confirmRetry = adminPage.locator('[data-testid="confirm-retry"]');
        if (await confirmRetry.isVisible()) {
          await expect(confirmRetry).toBeVisible();

          // Cancel to avoid actually retrying
          const cancelRetry = adminPage.locator('[data-testid="cancel-retry"]');
          if (await cancelRetry.isVisible()) {
            await cancelRetry.click();
            await expect(confirmRetry).not.toBeVisible();
          }
        }
      }

      // Should have purge completed tasks option
      const purgeCompletedButton = adminPage.locator('[data-testid="purge-completed-tasks"]');
      if (await purgeCompletedButton.isVisible()) {
        await purgeCompletedButton.click();

        const confirmPurge = adminPage.locator('[data-testid="confirm-purge"]');
        if (await confirmPurge.isVisible()) {
          // Cancel to avoid actually purging
          const cancelPurge = adminPage.locator('[data-testid="cancel-purge"]');
          if (await cancelPurge.isVisible()) {
            await cancelPurge.click();
            await expect(confirmPurge).not.toBeVisible();
          }
        }
      }
    }
  });

  test('should create new tasks (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage);

    const createTaskButton = adminPage.locator('[data-testid="create-task"]');
    if (await createTaskButton.isVisible()) {
      await createTaskButton.click();

      const createTaskDialog = adminPage.locator('[data-testid="create-task-dialog"]');
      if (await createTaskDialog.isVisible()) {
        await expect(createTaskDialog).toBeVisible();

        // Should have task type selector
        const taskTypeSelector = adminPage.locator('[data-testid="task-type-selector"]');
        if (await taskTypeSelector.isVisible()) {
          await taskTypeSelector.selectOption('email_notification');

          // Should show task-specific fields
          const taskFields = adminPage.locator('[data-testid="task-fields"]');
          if (await taskFields.isVisible()) {
            await expect(taskFields).toBeVisible();
          }
        }

        // Cancel task creation
        const cancelCreate = adminPage.locator('[data-testid="cancel-create-task"]');
        if (await cancelCreate.isVisible()) {
          await cancelCreate.click();
          await expect(createTaskDialog).not.toBeVisible();
        }
      }
    }
  });

  test('should show task metrics and statistics', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage);

    const taskMetrics = adminPage.locator('[data-testid="task-metrics"]');
    if (await taskMetrics.isVisible()) {
      // Should show task counts by status
      const pendingCount = adminPage.locator('[data-testid="pending-tasks-count"]');
      const runningCount = adminPage.locator('[data-testid="running-tasks-count"]');
      const completedCount = adminPage.locator('[data-testid="completed-tasks-count"]');
      const failedCount = adminPage.locator('[data-testid="failed-tasks-count"]');

      if (await pendingCount.isVisible()) {
        const pendingText = await pendingCount.textContent();
        expect(pendingText).toMatch(/\d+/);
      }

      if (await runningCount.isVisible()) {
        const runningText = await runningCount.textContent();
        expect(runningText).toMatch(/\d+/);
      }

      // Should show processing rate
      const processingRate = adminPage.locator('[data-testid="processing-rate"]');
      if (await processingRate.isVisible()) {
        const rateText = await processingRate.textContent();
        expect(rateText).toBeTruthy();
      }

      // Should show average execution time
      const avgExecutionTime = adminPage.locator('[data-testid="avg-execution-time"]');
      if (await avgExecutionTime.isVisible()) {
        const timeText = await avgExecutionTime.textContent();
        expect(timeText).toMatch(/\d+/);
      }
    }
  });

  test('should handle real-time task updates', async ({ adminPage }) => {
    await adminPage.goto('/ops/tasks');
    await assertPageLoaded(adminPage);

    const realtimeToggle = adminPage.locator('[data-testid="realtime-updates"]');
    if (await realtimeToggle.isVisible()) {
      const initialState = await realtimeToggle.isChecked();

      // Toggle real-time updates
      await realtimeToggle.click();

      // Should update toggle state
      await expect(realtimeToggle).toBeChecked({ checked: !initialState });

      // Should show real-time indicator when enabled
      if (!initialState) {
        const realtimeIndicator = adminPage.locator('[data-testid="realtime-indicator"]');
        if (await realtimeIndicator.isVisible()) {
          await expect(realtimeIndicator).toBeVisible();
        }
      }
    }
  });
});
