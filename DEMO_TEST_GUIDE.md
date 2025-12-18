# File Management Demo - Manual Test Guide

This guide provides step-by-step instructions for manually testing the File & Media Management feature in the demo shell.

## Prerequisites

1. **Backend Setup**:
   - Django server running with the `files` app installed
   - Database migrations applied
   - User authentication working
   - API endpoints available at `/api/files/`

2. **Frontend Setup**:
   - Demo shell running (usually at `http://localhost:5173`)
   - User logged in to the demo shell
   - Access to `/demo/files` route

## Test Scenarios

### 1. Access File Management Page

**Steps**:
1. Navigate to `http://localhost:5173/demo/files` in your browser
2. Ensure you are logged in (if not, you'll be redirected to login)

**Expected Results**:
- ✅ Page loads successfully with "File Management Demo" title
- ✅ File upload component is visible
- ✅ Empty file list shows "No files uploaded yet" message
- ✅ Page layout is responsive and well-formatted

### 2. File Upload - Single File

**Steps**:
1. Click the "Drop files here or click to browse" area
2. Select a single image file (JPG, PNG, GIF) under 10MB
3. Observe the upload process

**Expected Results**:
- ✅ File picker dialog opens
- ✅ Selected file appears in the upload component
- ✅ File uploads successfully (progress indication)
- ✅ Success message appears: "Successfully uploaded [filename]"
- ✅ File appears in the files list below
- ✅ File shows correct name, size, and upload date

### 3. File Upload - Multiple Files

**Steps**:
1. Select multiple files at once (mix of images and documents)
2. Observe the upload process for each file

**Expected Results**:
- ✅ Multiple files can be selected
- ✅ All files upload successfully
- ✅ Progress is shown for each file
- ✅ All files appear in the files list
- ✅ Files are ordered with most recent first

### 4. File Upload - Drag and Drop

**Steps**:
1. Open a file explorer/finder window
2. Drag a file from the explorer to the upload area
3. Drop the file on the upload area

**Expected Results**:
- ✅ Drop zone highlights when dragging over it
- ✅ File uploads after dropping
- ✅ Same success behavior as click upload

### 5. File Validation - Size Limit

**Steps**:
1. Try to upload a file larger than 10MB
2. Observe the validation behavior

**Expected Results**:
- ✅ Error message appears about file size limit
- ✅ File is rejected and not uploaded
- ✅ Other valid files can still be uploaded

### 6. File Validation - File Type

**Steps**:
1. Try to upload an unsupported file type (e.g., .exe, .dmg)
2. Observe the validation behavior

**Expected Results**:
- ✅ Error message appears about unsupported file type
- ✅ File is rejected and not uploaded
- ✅ Only supported types are accepted

### 7. File Download

**Steps**:
1. Upload a file successfully
2. Click the "Download" button on the uploaded file
3. Check your browser's download folder

**Expected Results**:
- ✅ Download starts immediately
- ✅ File downloads with original filename
- ✅ Downloaded file opens correctly
- ✅ File content matches uploaded file

### 8. File Deletion

**Steps**:
1. Upload a file successfully
2. Click the "Delete" button on the uploaded file
3. Confirm deletion in the dialog

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ File is removed from the list after confirmation
- ✅ Success message appears: "Successfully deleted [filename]"
- ✅ File is no longer accessible

### 9. File List Refresh

**Steps**:
1. Upload some files
2. Click the "Refresh" button in the files list section
3. Observe the files list

**Expected Results**:
- ✅ Files list reloads from server
- ✅ Button shows "Refreshing..." state briefly
- ✅ All files are still present and correctly displayed

### 10. Thumbnail Display (if implemented)

**Steps**:
1. Upload an image file
2. Wait for thumbnail generation (may require page refresh)
3. Check if thumbnail appears in the file card

**Expected Results**:
- ✅ Thumbnail appears for image files (if backend processing is working)
- ✅ Non-image files show appropriate file type icon
- ✅ Thumbnails load properly and are correctly sized

### 11. Error Handling - Network Issues

**Steps**:
1. Disconnect from internet or stop the Django server
2. Try to upload a file
3. Try to refresh the file list

**Expected Results**:
- ✅ Clear error messages appear for failed operations
- ✅ UI remains functional and doesn't crash
- ✅ Error messages can be dismissed
- ✅ Operations work again when connectivity is restored

### 12. Responsive Design

**Steps**:
1. Test the page on different screen sizes
2. Resize the browser window
3. Test on mobile device or mobile emulation

**Expected Results**:
- ✅ Layout adapts to different screen sizes
- ✅ File grid adjusts number of columns
- ✅ Upload component remains usable on mobile
- ✅ All buttons and interactions work on touch devices

## Common Issues & Troubleshooting

### Upload Fails
- **Check**: Django server is running
- **Check**: User is authenticated
- **Check**: File size and type are within limits
- **Check**: Network connectivity
- **Check**: Browser console for error details

### Files Don't Appear in List
- **Try**: Refresh the page or click "Refresh" button
- **Check**: Files were uploaded successfully (check success message)
- **Check**: API endpoint `/api/files/` is accessible
- **Check**: User has permission to view files

### Download Doesn't Work
- **Check**: File still exists on server
- **Check**: Download API endpoint `/api/files/{id}/download/` is working
- **Check**: Browser allows downloads
- **Check**: User has permission to download files

### Thumbnails Don't Show
- **Note**: Thumbnail generation is asynchronous
- **Try**: Wait a few seconds and refresh the page
- **Check**: Celery workers are running for background processing
- **Check**: Image processing dependencies are installed

## Test Data Recommendations

Use a variety of test files:
- **Images**: JPG, PNG, GIF of different sizes
- **Documents**: PDF, DOC, DOCX, TXT
- **Size variants**: Small files (<1MB), medium files (1-5MB), large files (5-10MB)
- **Edge cases**: Files with special characters, very long names, non-ASCII characters

## Completion Checklist

- [ ] All upload scenarios work correctly
- [ ] File validation behaves as expected
- [ ] Download functionality works for all file types
- [ ] Delete functionality works with confirmation
- [ ] Error handling is user-friendly
- [ ] Responsive design works on all screen sizes
- [ ] Performance is acceptable (uploads complete in reasonable time)
- [ ] UI feedback is clear and helpful

## Notes

- This is a demo implementation for testing the File & Media Management system
- In production, additional security measures should be considered
- The interface can be customized based on specific application needs
- Consider implementing additional features like bulk operations, file organization, or sharing capabilities based on requirements
