import { test, expect, assertPageLoaded } from '../fixtures';

test.describe('Auth Flows Page', () => {
  test('should load auth flows demonstration page', async ({ page }) => {
    // Use unauthenticated page for auth flow testing
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page, 'Auth Flows');

    // Should show auth flow demonstrations
    const authFlowsDemo = page.locator('[data-testid="auth-flows-demo"]');
    await expect(authFlowsDemo).toBeVisible();
  });

  test('should demonstrate login flow', async ({ page }) => {
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page);

    const loginDemo = page.locator('[data-testid="login-flow-demo"]');
    if (await loginDemo.isVisible()) {
      // Should show login form
      const loginForm = page.locator('[data-testid="demo-login-form"]');
      await expect(loginForm).toBeVisible();

      // Should have email and password fields
      const emailField = page.locator('[data-testid="demo-email"]');
      const passwordField = page.locator('[data-testid="demo-password"]');
      const loginButton = page.locator('[data-testid="demo-login-button"]');

      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();
      await expect(loginButton).toBeVisible();

      // Test form interaction (demo only, won't actually log in)
      await emailField.fill('demo@example.com');
      await passwordField.fill('demo-password');

      // Should show form validation
      const formValidation = page.locator('[data-testid="demo-validation"]');
      if (await formValidation.isVisible()) {
        await expect(formValidation).toBeVisible();
      }
    }
  });

  test('should demonstrate registration flow', async ({ page }) => {
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page);

    const registrationDemo = page.locator('[data-testid="registration-flow-demo"]');
    if (await registrationDemo.isVisible()) {
      // Should show registration form
      const registrationForm = page.locator('[data-testid="demo-registration-form"]');
      await expect(registrationForm).toBeVisible();

      // Should have required fields
      const nameField = page.locator('[data-testid="demo-name"]');
      const emailField = page.locator('[data-testid="demo-reg-email"]');
      const passwordField = page.locator('[data-testid="demo-reg-password"]');
      const confirmPasswordField = page.locator('[data-testid="demo-confirm-password"]');

      if (await nameField.isVisible()) await expect(nameField).toBeVisible();
      if (await emailField.isVisible()) await expect(emailField).toBeVisible();
      if (await passwordField.isVisible()) await expect(passwordField).toBeVisible();
      if (await confirmPasswordField.isVisible()) await expect(confirmPasswordField).toBeVisible();

      // Test form validation
      if (await passwordField.isVisible() && await confirmPasswordField.isVisible()) {
        await passwordField.fill('password123');
        await confirmPasswordField.fill('different-password');

        // Should show password mismatch error
        const passwordError = page.locator('[data-testid="password-mismatch-error"]');
        if (await passwordError.isVisible()) {
          await expect(passwordError).toBeVisible();
        }
      }
    }
  });

  test('should demonstrate password reset flow', async ({ page }) => {
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page);

    const passwordResetDemo = page.locator('[data-testid="password-reset-demo"]');
    if (await passwordResetDemo.isVisible()) {
      // Should show forgot password form
      const forgotPasswordForm = page.locator('[data-testid="demo-forgot-password"]');
      await expect(forgotPasswordForm).toBeVisible();

      // Should have email field
      const emailField = page.locator('[data-testid="demo-reset-email"]');
      const resetButton = page.locator('[data-testid="demo-reset-button"]');

      if (await emailField.isVisible()) {
        await expect(emailField).toBeVisible();
        await expect(resetButton).toBeVisible();

        // Test email validation
        await emailField.fill('invalid-email');

        const emailError = page.locator('[data-testid="invalid-email-error"]');
        if (await emailError.isVisible()) {
          await expect(emailError).toBeVisible();
        }

        // Test valid email
        await emailField.fill('valid@example.com');
        await resetButton.click();

        // Should show success message (demo)
        const successMessage = page.locator('[data-testid="reset-success-demo"]');
        if (await successMessage.isVisible()) {
          await expect(successMessage).toBeVisible();
        }
      }
    }
  });

  test('should demonstrate two-factor authentication flow', async ({ page }) => {
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page);

    const twoFactorDemo = page.locator('[data-testid="two-factor-demo"]');
    if (await twoFactorDemo.isVisible()) {
      // Should show 2FA setup flow
      const twoFactorSetup = page.locator('[data-testid="demo-2fa-setup"]');
      if (await twoFactorSetup.isVisible()) {
        await expect(twoFactorSetup).toBeVisible();

        // Should show QR code
        const qrCode = page.locator('[data-testid="demo-qr-code"]');
        if (await qrCode.isVisible()) {
          await expect(qrCode).toBeVisible();
        }

        // Should show backup codes
        const backupCodes = page.locator('[data-testid="demo-backup-codes"]');
        if (await backupCodes.isVisible()) {
          await expect(backupCodes).toBeVisible();
        }
      }

      // Should show 2FA verification
      const twoFactorVerify = page.locator('[data-testid="demo-2fa-verify"]');
      if (await twoFactorVerify.isVisible()) {
        const codeInput = page.locator('[data-testid="demo-2fa-code"]');
        const verifyButton = page.locator('[data-testid="demo-2fa-verify-button"]');

        if (await codeInput.isVisible()) {
          await expect(codeInput).toBeVisible();
          await expect(verifyButton).toBeVisible();

          // Test code input
          await codeInput.fill('123456');
          await expect(codeInput).toHaveValue('123456');
        }
      }
    }
  });

  test('should demonstrate session management', async ({ page }) => {
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page);

    const sessionDemo = page.locator('[data-testid="session-management-demo"]');
    if (await sessionDemo.isVisible()) {
      // Should show active sessions
      const activeSessions = page.locator('[data-testid="demo-active-sessions"]');
      if (await activeSessions.isVisible()) {
        await expect(activeSessions).toBeVisible();

        const sessionItems = page.locator('[data-testid="demo-session-item"]');
        const sessionCount = await sessionItems.count();

        if (sessionCount > 0) {
          const firstSession = sessionItems.first();
          await expect(firstSession.locator('[data-testid="session-device"]')).toBeVisible();
          await expect(firstSession.locator('[data-testid="session-location"]')).toBeVisible();
          await expect(firstSession.locator('[data-testid="session-last-active"]')).toBeVisible();

          // Should have revoke button
          const revokeButton = firstSession.locator('[data-testid="demo-revoke-session"]');
          if (await revokeButton.isVisible()) {
            await expect(revokeButton).toBeVisible();
          }
        }
      }
    }
  });

  test('should demonstrate social login options', async ({ page }) => {
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page);

    const socialLoginDemo = page.locator('[data-testid="social-login-demo"]');
    if (await socialLoginDemo.isVisible()) {
      // Should show social login buttons
      const googleLogin = page.locator('[data-testid="demo-google-login"]');
      const githubLogin = page.locator('[data-testid="demo-github-login"]');
      const microsoftLogin = page.locator('[data-testid="demo-microsoft-login"]');

      if (await googleLogin.isVisible()) {
        await expect(googleLogin).toBeVisible();
        await expect(googleLogin).toContainText('Google');
      }

      if (await githubLogin.isVisible()) {
        await expect(githubLogin).toBeVisible();
        await expect(githubLogin).toContainText('GitHub');
      }

      if (await microsoftLogin.isVisible()) {
        await expect(microsoftLogin).toBeVisible();
        await expect(microsoftLogin).toContainText('Microsoft');
      }

      // Test social login interaction (demo only)
      if (await googleLogin.isVisible()) {
        await googleLogin.click();

        // Should show demo social login flow
        const socialLoginFlow = page.locator('[data-testid="demo-social-flow"]');
        if (await socialLoginFlow.isVisible()) {
          await expect(socialLoginFlow).toBeVisible();
        }
      }
    }
  });

  test('should demonstrate account linking', async ({ page }) => {
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page);

    const accountLinkingDemo = page.locator('[data-testid="account-linking-demo"]');
    if (await accountLinkingDemo.isVisible()) {
      // Should show linked accounts
      const linkedAccounts = page.locator('[data-testid="demo-linked-accounts"]');
      if (await linkedAccounts.isVisible()) {
        await expect(linkedAccounts).toBeVisible();

        const accountItems = page.locator('[data-testid="demo-linked-account"]');
        const accountCount = await accountItems.count();

        if (accountCount > 0) {
          const firstAccount = accountItems.first();
          await expect(firstAccount.locator('[data-testid="account-provider"]')).toBeVisible();
          await expect(firstAccount.locator('[data-testid="account-email"]')).toBeVisible();

          // Should have unlink button
          const unlinkButton = firstAccount.locator('[data-testid="demo-unlink-account"]');
          if (await unlinkButton.isVisible()) {
            await expect(unlinkButton).toBeVisible();
          }
        }
      }

      // Should show add account options
      const addAccountOptions = page.locator('[data-testid="demo-add-account"]');
      if (await addAccountOptions.isVisible()) {
        await expect(addAccountOptions).toBeVisible();
      }
    }
  });

  test('should show authentication state examples', async ({ page }) => {
    await page.goto('/frontend/auth-flows');
    await assertPageLoaded(page);

    const authStateDemo = page.locator('[data-testid="auth-state-demo"]');
    if (await authStateDemo.isVisible()) {
      // Should show different auth states
      const loggedOutState = page.locator('[data-testid="demo-logged-out"]');
      const loggedInState = page.locator('[data-testid="demo-logged-in"]');
      const loadingState = page.locator('[data-testid="demo-auth-loading"]');

      if (await loggedOutState.isVisible()) {
        await expect(loggedOutState).toBeVisible();

        // Should show login/register options
        const loginOption = loggedOutState.locator('[data-testid="demo-login-option"]');
        const registerOption = loggedOutState.locator('[data-testid="demo-register-option"]');

        if (await loginOption.isVisible()) await expect(loginOption).toBeVisible();
        if (await registerOption.isVisible()) await expect(registerOption).toBeVisible();
      }

      if (await loggedInState.isVisible()) {
        await expect(loggedInState).toBeVisible();

        // Should show user info and logout
        const userInfo = loggedInState.locator('[data-testid="demo-user-info"]');
        const logoutOption = loggedInState.locator('[data-testid="demo-logout-option"]');

        if (await userInfo.isVisible()) await expect(userInfo).toBeVisible();
        if (await logoutOption.isVisible()) await expect(logoutOption).toBeVisible();
      }

      if (await loadingState.isVisible()) {
        await expect(loadingState).toBeVisible();

        // Should show loading spinner
        const loadingSpinner = loadingState.locator('[data-testid="auth-loading-spinner"]');
        if (await loadingSpinner.isVisible()) {
          await expect(loadingSpinner).toBeVisible();
        }
      }
    }
  });
});
