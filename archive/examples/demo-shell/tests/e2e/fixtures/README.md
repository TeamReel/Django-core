# Test Fixtures for E2E File Management Tests

This directory contains test files used in the Playwright E2E tests for the file management demo.

## Test Files

- `test-image.jpg` - Small JPEG image for upload testing
- `test-document.pdf` - PDF document for testing document uploads
- `large-file.jpg` - Large image file (>10MB) for size validation testing
- `test-script.js` - JavaScript file for testing file type validation

## Creating Test Files

To create the test fixtures, run:

```bash
# Create a small test image (requires ImageMagick)
convert -size 100x100 xc:red test-image.jpg

# Create a test PDF (requires pandoc or similar)
echo "Test document content" | pandoc -o test-document.pdf

# Create a large file for size testing
dd if=/dev/zero of=large-file.jpg bs=1M count=11

# Create a test script file
echo "console.log('test');" > test-script.js
```

## Windows PowerShell Alternative

```powershell
# Create small test files
"Test content" | Out-File -FilePath "test-document.txt" -Encoding UTF8
"console.log('test');" | Out-File -FilePath "test-script.js" -Encoding UTF8

# For image files, you may need to download sample images or use online generators
# Place a small JPEG file named test-image.jpg in this directory
# Place a large file (>10MB) named large-file.jpg in this directory
```

## Notes

- These files are used only for testing and should not contain sensitive data
- The large file is used to test the 10MB upload limit
- File types are tested to ensure only allowed formats can be uploaded
- All test files should be committed to the repository for consistent testing
