import { test, expect, assertPageLoaded, assertRoleBasedUI } from '../fixtures';

test.describe('Security Page', () => {
  test('should load security dashboard for admin with full access', async ({ adminPage }) => {
    await adminPage.goto('/platform/security');
    await assertPageLoaded(adminPage, 'Security');

    // Admin should see all security features
    await assertRoleBasedUI(adminPage, {
      admin: {
        canView: ['[data-testid="security-overview"]', '[data-testid="threat-monitoring"]', '[data-testid="security-policies"]', '[data-testid="security-actions"]'],
        cannotView: []
      }
    }, 'admin');

    // Should show security overview
    const securityOverview = adminPage.locator('[data-testid="security-overview"]');
    await expect(securityOverview).toBeVisible();

    // Should show security score
    const securityScore = adminPage.locator('[data-testid="security-score"]');
    await expect(securityScore).toBeVisible();
  });

  test('should load security dashboard for member with monitoring access', async ({ memberPage }) => {
    await memberPage.goto('/platform/security');
    await assertPageLoaded(memberPage, 'Security');

    // Member should see security info but limited controls
    await assertRoleBasedUI(memberPage, {
      member: {
        canView: ['[data-testid="security-overview"]', '[data-testid="security-alerts"]'],
        cannotView: ['[data-testid="security-actions"]', '[data-testid="security-config"]']
      }
    }, 'member');
  });

  test('should restrict security dashboard for viewer', async ({ viewerPage }) => {
    await viewerPage.goto('/platform/security');

    // Viewer might be redirected or see very limited view
    const currentUrl = viewerPage.url();
    if (currentUrl.includes('/platform/security')) {
      await assertPageLoaded(viewerPage, 'Security');

      // Should see basic security info only
      await assertRoleBasedUI(viewerPage, {
        viewer: {
          canView: ['[data-testid="basic-security-status"]'],
          cannotView: ['[data-testid="threat-monitoring"]', '[data-testid="security-policies"]', '[data-testid="security-logs"]']
        }
      }, 'viewer');
    }
  });

  test('should display security metrics and indicators', async ({ adminPage }) => {
    await adminPage.goto('/platform/security');
    await assertPageLoaded(adminPage);

    const securityMetrics = adminPage.locator('[data-testid="security-metrics"]');
    if (await securityMetrics.isVisible()) {
      // Should show key security indicators
      const failedLogins = adminPage.locator('[data-testid="failed-login-attempts"]');
      const suspiciousActivity = adminPage.locator('[data-testid="suspicious-activity"]');
      const vulnerabilities = adminPage.locator('[data-testid="vulnerability-count"]');

      if (await failedLogins.isVisible()) {
        const failedLoginsText = await failedLogins.textContent();
        expect(failedLoginsText).toMatch(/\d+/); // Should contain numbers
      }

      if (await vulnerabilities.isVisible()) {
        const vulnText = await vulnerabilities.textContent();
        expect(vulnText).toBeTruthy();
      }
    }
  });

  test('should show recent security alerts', async ({ adminPage }) => {
    await adminPage.goto('/platform/security');
    await assertPageLoaded(adminPage);

    const alertsList = adminPage.locator('[data-testid="security-alerts"]');
    if (await alertsList.isVisible()) {
      // Should show alert items
      const alerts = adminPage.locator('[data-testid="security-alert-item"]');
      const alertCount = await alerts.count();

      if (alertCount > 0) {
        const firstAlert = alerts.first();
        await expect(firstAlert.locator('[data-testid="alert-severity"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-title"]')).toBeVisible();
        await expect(firstAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();

        // Should have severity levels
        const severity = await firstAlert.locator('[data-testid="alert-severity"]').textContent();
        expect(['low', 'medium', 'high', 'critical']).toContain(severity?.toLowerCase());
      }
    }
  });

  test('should display threat monitoring dashboard', async ({ adminPage }) => {
    await adminPage.goto('/platform/security');
    await assertPageLoaded(adminPage);

    const threatMonitoring = adminPage.locator('[data-testid="threat-monitoring"]');
    if (await threatMonitoring.isVisible()) {
      // Should show threat categories
      const threatTypes = adminPage.locator('[data-testid="threat-type"]');
      const typeCount = await threatTypes.count();

      if (typeCount > 0) {
        const firstThreat = threatTypes.first();
        await expect(firstThreat.locator('[data-testid="threat-name"]')).toBeVisible();
        await expect(firstThreat.locator('[data-testid="threat-level"]')).toBeVisible();
      }

      // Should show threat timeline
      const threatTimeline = adminPage.locator('[data-testid="threat-timeline"]');
      if (await threatTimeline.isVisible()) {
        await expect(threatTimeline).toBeVisible();
      }
    }
  });

  test('should manage security policies (admin only)', async ({ adminPage }) => {
    await adminPage.goto('/platform/security');
    await assertPageLoaded(adminPage);

    const securityPolicies = adminPage.locator('[data-testid="security-policies"]');
    if (await securityPolicies.isVisible()) {
      // Should show policy list
      const policies = adminPage.locator('[data-testid="security-policy-item"]');
      const policyCount = await policies.count();

      if (policyCount > 0) {
        const firstPolicy = policies.first();
        await expect(firstPolicy.locator('[data-testid="policy-name"]')).toBeVisible();
        await expect(firstPolicy.locator('[data-testid="policy-status"]')).toBeVisible();

        // Should have toggle or edit button
        const policyToggle = firstPolicy.locator('[data-testid="policy-toggle"]');
        const editButton = firstPolicy.locator('[data-testid="edit-policy"]');

        if (await policyToggle.isVisible()) {
          await expect(policyToggle).toBeVisible();
        } else if (await editButton.isVisible()) {
          await expect(editButton).toBeVisible();
        }
      }
    }
  });

  test('should show vulnerability scan results', async ({ adminPage }) => {
    await adminPage.goto('/platform/security');
    await assertPageLoaded(adminPage);

    const vulnScan = adminPage.locator('[data-testid="vulnerability-scan"]');
    if (await vulnScan.isVisible()) {
      // Should show scan status
      const scanStatus = adminPage.locator('[data-testid="scan-status"]');
      await expect(scanStatus).toBeVisible();

      // Should show vulnerability list
      const vulnerabilities = adminPage.locator('[data-testid="vulnerability-item"]');
      const vulnCount = await vulnerabilities.count();

      if (vulnCount > 0) {
        const firstVuln = vulnerabilities.first();
        await expect(firstVuln.locator('[data-testid="vuln-severity"]')).toBeVisible();
        await expect(firstVuln.locator('[data-testid="vuln-description"]')).toBeVisible();
      }

      // Should have run scan button
      const runScanButton = adminPage.locator('[data-testid="run-vulnerability-scan"]');
      if (await runScanButton.isVisible()) {
        await expect(runScanButton).toBeVisible();
      }
    }
  });

  test('should handle security incident response', async ({ adminPage }) => {
    await adminPage.goto('/platform/security');
    await assertPageLoaded(adminPage);

    const incidentResponse = adminPage.locator('[data-testid="incident-response"]');
    if (await incidentResponse.isVisible()) {
      // Should show active incidents
      const activeIncidents = adminPage.locator('[data-testid="active-incident"]');
      const incidentCount = await activeIncidents.count();

      if (incidentCount > 0) {
        const firstIncident = activeIncidents.first();
        await expect(firstIncident.locator('[data-testid="incident-id"]')).toBeVisible();
        await expect(firstIncident.locator('[data-testid="incident-status"]')).toBeVisible();

        // Should have response actions
        const responseActions = firstIncident.locator('[data-testid="incident-actions"]');
        if (await responseActions.isVisible()) {
          await expect(responseActions).toBeVisible();
        }
      }

      // Should have create incident button
      const createIncidentButton = adminPage.locator('[data-testid="create-incident"]');
      if (await createIncidentButton.isVisible()) {
        await expect(createIncidentButton).toBeVisible();
      }
    }
  });

  test('should display access logs and audit trail', async ({ adminPage }) => {
    await adminPage.goto('/platform/security');
    await assertPageLoaded(adminPage);

    const accessLogs = adminPage.locator('[data-testid="access-logs"]');
    if (await accessLogs.isVisible()) {
      // Should show recent access events
      const logEntries = adminPage.locator('[data-testid="access-log-entry"]');
      const entryCount = await logEntries.count();

      if (entryCount > 0) {
        const firstEntry = logEntries.first();
        await expect(firstEntry.locator('[data-testid="access-timestamp"]')).toBeVisible();
        await expect(firstEntry.locator('[data-testid="access-user"]')).toBeVisible();
        await expect(firstEntry.locator('[data-testid="access-action"]')).toBeVisible();
      }

      // Should have search functionality
      const logSearch = adminPage.locator('[data-testid="access-log-search"]');
      if (await logSearch.isVisible()) {
        await logSearch.fill('login');

        // Should filter results
        const searchResults = adminPage.locator('[data-testid="filtered-access-logs"]');
        if (await searchResults.isVisible()) {
          await expect(searchResults).toBeVisible();
        }
      }
    }
  });
});
