# File Management - Visual Test Guide

## 🎯 Test Overview
- **Feature**: File upload/download/management systeem
- **Time**: 10-15 minuten
- **Prerequisites**: Demo shell running, user authenticated
- **Test Data**: Verschillende bestandstypen (images, PDFs, documents)

## 🚀 Quick Access
- **Direct URL**: http://localhost:3000/demo/files
- **Navigation**: Sidebar → Frontend Resources → "📁 File Management Demo"
- **Keyboard**: Navigate using Tab key for accessibility

## 📋 Visual Test Scenarios

### Scenario 1: Page Load & Interface
**Steps**:
1. Navigate to File Management Demo via sidebar
2. Check page loads completely
3. Inspect interface components

**Expected Results**:
- ✅ "File Management Demo" title is visible
- ✅ File upload component shows "Drop files here or click to browse"
- ✅ Files list section is present (may show "No files uploaded yet")
- ✅ Page styling is consistent with demo shell theme

**Visual Checklist**:
- [ ] Upload dropzone is clearly defined
- [ ] Files list area is visible
- [ ] No layout overflow or broken styling
- [ ] Responsive design on current screen size

**Pass/Fail**:
- [ ] Pass: Interface loads cleanly
- [ ] Fail: Missing components or styling issues

### Scenario 2: File Upload - Drag & Drop
**Steps**:
1. Open file explorer/finder
2. Select a small image file (JPG/PNG, < 5MB)
3. Drag file over the upload dropzone
4. Drop the file

**Expected Results**:
- ✅ Dropzone highlights when file is dragged over
- ✅ Upload progress indicator appears
- ✅ Success message shows: "Successfully uploaded [filename]"
- ✅ File appears in files list with correct details

**Visual Checklist**:
- [ ] Drag hover state is clearly visible
- [ ] Upload progress is shown (spinner/progress bar)
- [ ] Success feedback is clear and prominent
- [ ] File card shows in files list with proper formatting

**Pass/Fail**:
- [ ] Pass: Smooth drag & drop upload
- [ ] Fail: Upload fails or poor visual feedback

### Scenario 3: File Upload - Click to Browse
**Steps**:
1. Click on the upload dropzone area
2. Select multiple files from file dialog (mix of types)
3. Confirm selection
4. Observe upload process

**Expected Results**:
- ✅ File dialog opens correctly
- ✅ Multiple files can be selected
- ✅ All files upload successfully
- ✅ Each file shows in list with proper metadata

**Visual Checklist**:
- [ ] File picker dialog opens
- [ ] Multiple selection works
- [ ] Progress shown for each file
- [ ] File cards show: name, size, upload date, file type

**Pass/Fail**:
- [ ] Pass: Click upload works for multiple files
- [ ] Fail: Dialog issues or upload failures

### Scenario 4: File List Display
**Steps**:
1. After uploading several files, examine the files list
2. Check file information display
3. Test list interactions

**Expected Results**:
- ✅ Files listed with most recent first
- ✅ Each file shows: filename, file size, upload timestamp
- ✅ File type icons or thumbnails (if implemented)
- ✅ Download and Delete buttons are visible per file

**Visual Checklist**:
- [ ] File cards are well-formatted
- [ ] Information is clearly readable
- [ ] Action buttons are accessible
- [ ] List scrolls properly if many files

**Pass/Fail**:
- [ ] Pass: File list displays clearly
- [ ] Fail: Missing information or poor formatting

### Scenario 5: File Download
**Steps**:
1. Click "Download" button on an uploaded file
2. Check browser download behavior
3. Verify downloaded file

**Expected Results**:
- ✅ Download starts immediately
- ✅ File downloads with original filename
- ✅ Downloaded file can be opened
- ✅ File content matches original

**Visual Checklist**:
- [ ] Download button is clearly labeled
- [ ] Browser shows download progress
- [ ] Downloaded file appears in downloads folder
- [ ] File opens correctly with appropriate application

**Pass/Fail**:
- [ ] Pass: Download works correctly
- [ ] Fail: Download fails or corrupted file

### Scenario 6: File Deletion
**Steps**:
1. Click "Delete" button on an uploaded file
2. Handle confirmation dialog (if present)
3. Verify file removal

**Expected Results**:
- ✅ Confirmation dialog appears (good UX practice)
- ✅ File is removed from list after confirmation
- ✅ Success message: "Successfully deleted [filename]"
- ✅ File no longer accessible

**Visual Checklist**:
- [ ] Delete button is clearly marked (red color/icon)
- [ ] Confirmation dialog is clear and actionable
- [ ] File disappears from list smoothly
- [ ] Success feedback is provided

**Pass/Fail**:
- [ ] Pass: Safe deletion with confirmation
- [ ] Fail: Accidental deletion or removal fails

### Scenario 7: File Validation
**Steps**:
1. Try uploading a very large file (>10MB)
2. Try uploading unsupported file type (.exe, .dmg)
3. Check validation messages

**Expected Results**:
- ✅ Clear error message for oversized files
- ✅ Clear error message for unsupported types
- ✅ Validation happens before upload attempt
- ✅ Other valid files can still be uploaded

**Visual Checklist**:
- [ ] Error messages are prominent and clear
- [ ] Validation feedback is immediate
- [ ] Error states don't break the interface
- [ ] Help text explains file requirements

**Pass/Fail**:
- [ ] Pass: Proper validation with clear feedback
- [ ] Fail: Poor validation or confusing error messages

### Scenario 8: Error Handling
**Steps**:
1. Stop Django backend server
2. Try to upload a file
3. Try to refresh files list
4. Restart backend and test recovery

**Expected Results**:
- ✅ Clear error message when backend is unavailable
- ✅ Interface remains functional (doesn't crash)
- ✅ Operations work again when backend is restored
- ✅ User can retry failed operations

**Visual Checklist**:
- [ ] Network error messages are user-friendly
- [ ] Interface doesn't show technical error details
- [ ] Retry mechanisms are available
- [ ] Graceful degradation when offline

**Pass/Fail**:
- [ ] Pass: Graceful error handling
- [ ] Fail: Poor error messages or interface crashes

## 🐛 Troubleshooting

### Upload Fails
- **Check**: Django server is running on correct port
- **Check**: User is authenticated (check login status)
- **Check**: File size and type within limits
- **Check**: Browser console for JavaScript errors
- **Check**: Network tab in dev tools for failed requests

### Files Don't Appear
- **Try**: Refresh page or click refresh button
- **Check**: Upload actually succeeded (look for success message)
- **Check**: API endpoint `/api/files/` returns data
- **Check**: User permissions for file access

### Download Issues
- **Check**: File still exists on server
- **Check**: Browser allows downloads (popup blocker)
- **Check**: Download API endpoint is working
- **Check**: File permissions on server

### Styling Problems
- **Check**: Design system CSS is loaded
- **Check**: Theme system is working correctly
- **Check**: No CSS conflicts in browser dev tools

## 📊 Test Results

**Template**:
```
Date tested: [TODAY'S DATE]
Browser: [Chrome/Firefox/Safari/Edge + version]
Backend status: [Running/Stopped/Errors]
Test files used: [List file types and sizes]
Status: [ ] ✅ Pass / [ ] ❌ Fail / [ ] ⚠️ Partial

Upload Tests:
- [ ] Drag & drop: ✅ Pass / ❌ Fail
- [ ] Click upload: ✅ Pass / ❌ Fail
- [ ] Multiple files: ✅ Pass / ❌ Fail
- [ ] File validation: ✅ Pass / ❌ Fail

Management Tests:
- [ ] File display: ✅ Pass / ❌ Fail
- [ ] Download: ✅ Pass / ❌ Fail
- [ ] Delete: ✅ Pass / ❌ Fail
- [ ] Error handling: ✅ Pass / ❌ Fail

Performance:
- Upload time (small file): [X seconds]
- Upload time (large file): [X seconds]
- Page load time: [X seconds]

Issues found:
- [List with screenshots if possible]

User Experience Notes:
- [Feedback on interface usability]
- [Suggestions for improvement]

Accessibility Notes:
- [ ] Keyboard navigation works
- [ ] Screen reader compatibility (if tested)
- [ ] Color contrast is sufficient
- [ ] Focus indicators are visible
```

## ✅ Success Criteria

Dit test is succesvol als:
- Upload werkt via beide methoden (drag/drop + click)
- File validation voorkomt ongeldige uploads
- Files worden correct getoond in de lijst
- Download en delete functies werken betrouwbaar
- Error handling is graceful en user-friendly
- Interface is responsive en toegankelijk

**Next Steps**:
- Voor theme integration: run [theme-system.md](theme-system.md)
- Voor responsive testing: run [responsive-design.md](responsive-design.md)
- Voor API integration: run [api-endpoints.md](api-endpoints.md)
