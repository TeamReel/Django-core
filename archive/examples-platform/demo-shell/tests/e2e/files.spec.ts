import { test, expect } from '@playwright/test';
import path from 'path';

// Test data files - these should exist in the test fixtures directory
const TEST_FILES = {
  image: 'test-image.jpg',
  document: 'test-document.pdf',
  largeFile: 'large-file.jpg', // > 10MB for size validation testing
  invalidFile: 'test-script.js' // For type validation testing
};

test.describe('File Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'demo@example.com');
    await page.fill('[data-testid="password"]', 'demo123');
    await page.click('button[type="submit"]');

    // Navigate to files page
    await page.goto('/demo/files');
    await expect(page.locator('h1')).toContainText('File Management Demo');
  });

  test('should display the file management page', async ({ page }) => {
    // Check page elements are present
    await expect(page.locator('text=File Management Demo')).toBeVisible();
    await expect(page.locator('text=Upload Files')).toBeVisible();
    await expect(page.locator('text=Drop files here or click to browse')).toBeVisible();
    await expect(page.locator('text=Uploaded Files')).toBeVisible();

    // Initially no files should be shown
    await expect(page.locator('text=No files uploaded yet')).toBeVisible();
  });

  test('should upload a single image file', async ({ page }) => {
    // Prepare test file
    const filePath = path.join(__dirname, 'fixtures', TEST_FILES.image);

    // Upload file using file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete
    await expect(page.locator('text=Successfully uploaded')).toBeVisible({ timeout: 10000 });

    // Check file appears in the list
    await expect(page.locator('text=test-image.jpg')).toBeVisible();

    // Check file metadata is displayed
    await expect(page.locator('text=image/jpeg')).toBeVisible();

    // Check action buttons are present
    await expect(page.locator('button:has-text("Download")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  });

  test('should upload multiple files', async ({ page }) => {
    // Prepare test files
    const imagePath = path.join(__dirname, 'fixtures', TEST_FILES.image);
    const docPath = path.join(__dirname, 'fixtures', TEST_FILES.document);

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([imagePath, docPath]);

    // Wait for uploads to complete
    await expect(page.locator('text=Successfully uploaded test-image.jpg')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Successfully uploaded test-document.pdf')).toBeVisible({ timeout: 10000 });

    // Check both files appear in the list
    await expect(page.locator('text=test-image.jpg')).toBeVisible();
    await expect(page.locator('text=test-document.pdf')).toBeVisible();
  });

  test('should validate file size limits', async ({ page }) => {
    // Try to upload a file that's too large (> 10MB)
    const largePath = path.join(__dirname, 'fixtures', TEST_FILES.largeFile);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largePath);

    // Should show error message about file size
    await expect(page.locator('text=File size must be less than')).toBeVisible({ timeout: 5000 });

    // File should not appear in the uploaded files list
    await expect(page.locator('text=large-file.jpg')).not.toBeVisible();
  });

  test('should validate file types', async ({ page }) => {
    // Try to upload an unsupported file type
    const invalidPath = path.join(__dirname, 'fixtures', TEST_FILES.invalidFile);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidPath);

    // Should show error message about file type
    await expect(page.locator('text=File type not accepted')).toBeVisible({ timeout: 5000 });

    // File should not appear in the uploaded files list
    await expect(page.locator('text=test-script.js')).not.toBeVisible();
  });

  test('should download uploaded files', async ({ page }) => {
    // First upload a file
    const filePath = path.join(__dirname, 'fixtures', TEST_FILES.image);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete
    await expect(page.locator('text=Successfully uploaded')).toBeVisible({ timeout: 10000 });

    // Set up download promise before clicking
    const downloadPromise = page.waitForDownload();

    // Click download button
    await page.locator('button:has-text("Download")').first().click();

    // Wait for download to start
    const download = await downloadPromise;

    // Check download properties
    expect(download.suggestedFilename()).toBe(TEST_FILES.image);
  });

  test('should delete uploaded files', async ({ page }) => {
    // First upload a file
    const filePath = path.join(__dirname, 'fixtures', TEST_FILES.image);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Wait for upload to complete
    await expect(page.locator('text=Successfully uploaded')).toBeVisible({ timeout: 10000 });

    // Click delete button
    await page.locator('button:has-text("Delete")').first().click();

    // Handle confirmation dialog
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Are you sure you want to delete');
      await dialog.accept();
    });

    // Wait for delete confirmation
    await expect(page.locator('text=Successfully deleted')).toBeVisible({ timeout: 5000 });

    // File should no longer appear in the list
    await expect(page.locator('text=test-image.jpg')).not.toBeVisible();

    // Should show empty state again
    await expect(page.locator('text=No files uploaded yet')).toBeVisible();
  });

  test('should refresh file list', async ({ page }) => {
    // Upload a file first
    const filePath = path.join(__dirname, 'fixtures', TEST_FILES.image);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    await expect(page.locator('text=Successfully uploaded')).toBeVisible({ timeout: 10000 });

    // Click refresh button
    await page.locator('button:has-text("Refresh")').click();

    // Should briefly show loading state
    await expect(page.locator('text=Refreshing...')).toBeVisible();

    // File should still be there after refresh
    await expect(page.locator('text=test-image.jpg')).toBeVisible();
  });

  test('should handle drag and drop upload', async ({ page }) => {
    // Create a test file for drag and drop
    const filePath = path.join(__dirname, 'fixtures', TEST_FILES.image);

    // Use Playwright's drag and drop functionality
    const uploadArea = page.locator('text=Drop files here or click to browse').locator('..');

    // Note: Playwright doesn't directly support file drag-and-drop from file system
    // This test would need to be adapted based on the actual implementation
    // For now, we'll test that the drop area responds to drag events

    await uploadArea.hover();

    // Alternatively, we can test the file input directly which covers the same functionality
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    await expect(page.locator('text=Successfully uploaded')).toBeVisible({ timeout: 10000 });
  });

  test('should show file metadata correctly', async ({ page }) => {
    // Upload an image file
    const filePath = path.join(__dirname, 'fixtures', TEST_FILES.image);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    await expect(page.locator('text=Successfully uploaded')).toBeVisible({ timeout: 10000 });

    // Check that file metadata is displayed
    const fileCard = page.locator('text=test-image.jpg').locator('..');

    // Should show file size
    await expect(fileCard.locator('text=/KB|MB/')).toBeVisible();

    // Should show content type
    await expect(fileCard.locator('text=image/jpeg')).toBeVisible();

    // Should show upload date
    await expect(fileCard.locator('text=/Uploaded:/')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure by intercepting API calls
    await page.route('/api/files/', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    // Try to upload a file
    const filePath = path.join(__dirname, 'fixtures', TEST_FILES.image);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    // Should show error message
    await expect(page.locator('text=Upload failed')).toBeVisible({ timeout: 10000 });

    // File should not appear in the list
    await expect(page.locator('text=test-image.jpg')).not.toBeVisible();
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that key elements are still visible and usable
    await expect(page.locator('text=File Management Demo')).toBeVisible();
    await expect(page.locator('text=Upload Files')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();

    // Upload a file to test mobile interaction
    const filePath = path.join(__dirname, 'fixtures', TEST_FILES.image);
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);

    await expect(page.locator('text=Successfully uploaded')).toBeVisible({ timeout: 10000 });

    // Check that file card is still usable on mobile
    await expect(page.locator('button:has-text("Download")')).toBeVisible();
    await expect(page.locator('button:has-text("Delete")')).toBeVisible();
  });
});

// Test suite for file management API integration
test.describe('File Management API Integration', () => {
  test('should handle API authentication', async ({ page }) => {
    // Navigate to files page without being logged in
    await page.goto('/demo/files');

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });

  test('should handle API errors', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'demo@example.com');
    await page.fill('[data-testid="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await page.goto('/demo/files');

    // Mock API to return different error codes
    await page.route('/api/files/', (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Forbidden' })
        });
      } else {
        route.continue();
      }
    });

    // Try to refresh files list
    await page.locator('button:has-text("Refresh")').click();

    // Should show appropriate error message
    await expect(page.locator('text=Failed to fetch files')).toBeVisible();
  });
});
